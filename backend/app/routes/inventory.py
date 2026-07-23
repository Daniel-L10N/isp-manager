"""
Inventory routes — Stock control with entries/exits, min stock alerts.
"""

from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import InventoryItem, InventoryMovement, User
from app.auth import get_current_user
from app.helpers import add_history_entry
from app.schemas import (
    InventoryItemCreate, InventoryItemUpdate, InventoryItemResponse,
    InventoryMovementCreate, InventoryMovementResponse, InventorySummary,
)

router = APIRouter()


@router.get("/", response_model=List[InventoryItemResponse])
def get_items(
    search: Optional[str] = None,
    category: Optional[str] = None,
    low_stock: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all inventory items with optional filters."""
    q = db.query(InventoryItem).filter(InventoryItem.is_active == True)

    if search:
        q = q.filter(
            InventoryItem.name.ilike(f"%{search}%") |
            InventoryItem.sku.ilike(f"%{search}%")
        )
    if category:
        q = q.filter(InventoryItem.category == category)
    if low_stock:
        q = q.filter(InventoryItem.current_stock <= InventoryItem.min_stock)

    items = q.order_by(InventoryItem.name).all()

    # Add computed is_low flag
    result = []
    for item in items:
        d = InventoryItemResponse.model_validate(item)
        d.is_low = item.current_stock <= item.min_stock
        result.append(d)

    return result


@router.get("/summary", response_model=InventorySummary)
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get inventory summary statistics."""
    items = db.query(InventoryItem).filter(InventoryItem.is_active == True).all()
    total_items = len(items)
    total_stock_value = sum(i.current_stock * i.unit_cost for i in items)
    low_stock_count = sum(1 for i in items if i.current_stock <= i.min_stock)

    today = date.today()
    movements_today = db.query(func.count(InventoryMovement.id))\
        .filter(InventoryMovement.date == today).scalar()

    return InventorySummary(
        total_items=total_items,
        total_stock_value=round(total_stock_value, 2),
        low_stock_count=low_stock_count,
        total_movements_today=movements_today,
    )


@router.get("/categories")
def get_categories():
    """Get available inventory categories."""
    return [
        "Router", "ONT", "Switch", "Antena", "Cable",
        "Herramienta", "Suministro", "Accesorio", "Otro",
    ]


@router.get("/low-stock", response_model=List[InventoryItemResponse])
def get_low_stock(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get items below minimum stock."""
    items = db.query(InventoryItem).filter(
        InventoryItem.is_active == True,
        InventoryItem.current_stock <= InventoryItem.min_stock,
    ).order_by(InventoryItem.name).all()

    result = []
    for item in items:
        d = InventoryItemResponse.model_validate(item)
        d.is_low = True
        result.append(d)
    return result


@router.post("/", response_model=InventoryItemResponse, status_code=status.HTTP_201_CREATED)
def create_item(data: InventoryItemCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new inventory item."""
    item = InventoryItem(**data.model_dump(), is_active=True)
    db.add(item)
    db.commit()
    db.refresh(item)

    add_history_entry(
        db, "inventario",
        f"Nuevo item: {item.name} (stock: {item.current_stock})",
        amount=item.current_stock * item.unit_cost,
        username=current_user.username,
    )

    d = InventoryItemResponse.model_validate(item)
    d.is_low = item.current_stock <= item.min_stock
    return d


@router.put("/{item_id}", response_model=InventoryItemResponse)
def update_item(item_id: int, data: InventoryItemUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an inventory item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)

    item.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(item)

    d = InventoryItemResponse.model_validate(item)
    d.is_low = item.current_stock <= item.min_stock
    return d


@router.delete("/{item_id}")
def delete_item(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Soft-delete an inventory item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id, InventoryItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    item.is_active = False
    db.commit()
    return {"message": "Item eliminado correctamente"}


# ============ MOVEMENTS ============

@router.get("/{item_id}/movements", response_model=List[InventoryMovementResponse])
def get_movements(item_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get movement history for an item."""
    item = db.query(InventoryItem).filter(InventoryItem.id == item_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    return db.query(InventoryMovement)\
        .filter(InventoryMovement.item_id == item_id)\
        .order_by(InventoryMovement.date.desc(), InventoryMovement.id.desc()).all()


@router.post("/movements", response_model=InventoryMovementResponse, status_code=status.HTTP_201_CREATED)
def create_movement(data: InventoryMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Register a stock movement (entrada or salida). Updates current_stock."""
    item = db.query(InventoryItem).filter(InventoryItem.id == data.item_id, InventoryItem.is_active == True).first()
    if not item:
        raise HTTPException(status_code=404, detail="Item no encontrado")

    if data.quantity <= 0:
        raise HTTPException(status_code=400, detail="La cantidad debe ser mayor a cero")

    # Update stock
    if data.type == "entrada":
        item.current_stock += data.quantity
    elif data.type == "salida":
        if item.current_stock < data.quantity:
            raise HTTPException(status_code=400, detail=f"Stock insuficiente. Disponible: {item.current_stock}")
        item.current_stock -= data.quantity
    else:
        raise HTTPException(status_code=400, detail="Tipo debe ser 'entrada' o 'salida'")

    item.updated_at = datetime.utcnow()

    # Create movement record
    movement = InventoryMovement(
        item_id=data.item_id,
        type=data.type,
        quantity=data.quantity,
        date=data.date,
        concept=data.concept or "",
        reference=data.reference or "",
        notes=data.notes or "",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    add_history_entry(
        db, "inventario",
        f"{'Entrada' if data.type == 'entrada' else 'Salida'}: {item.name} x{data.quantity} (stock: {item.current_stock})",
        amount=data.quantity * item.unit_cost,
        username=current_user.username,
    )

    return movement


@router.delete("/movements/{movement_id}")
def delete_movement(movement_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a movement and adjust stock accordingly."""
    movement = db.query(InventoryMovement).filter(InventoryMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    item = db.query(InventoryItem).filter(InventoryItem.id == movement.item_id).first()
    if item:
        # Reverse the stock change
        if movement.type == "entrada":
            item.current_stock -= movement.quantity
        elif movement.type == "salida":
            item.current_stock += movement.quantity
        item.updated_at = datetime.utcnow()

    db.delete(movement)
    db.commit()
    return {"message": "Movimiento eliminado correctamente"}
