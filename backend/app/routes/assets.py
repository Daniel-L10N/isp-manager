"""
Assets CRUD routes.
Manages company assets (equipment, vehicles, etc.).
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Asset, User
from app.auth import get_current_user
from app.helpers import add_history_entry
from app.schemas import AssetCreate, AssetUpdate, AssetResponse

router = APIRouter()


@router.get("/", response_model=List[AssetResponse])
def list_assets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all active assets."""
    return db.query(Asset).filter(Asset.is_active == True).order_by(Asset.name).all()


@router.get("/{asset_id}", response_model=AssetResponse)
def get_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single asset by ID."""
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Bien no encontrado")
    return asset


@router.post("/", response_model=AssetResponse, status_code=status.HTTP_201_CREATED)
def create_asset(data: AssetCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new asset and log to history."""
    asset = Asset(**data.model_dump(), is_active=True)
    db.add(asset)
    db.commit()
    db.refresh(asset)

    add_history_entry(
        db, "compra_bien",
        f"Registro de bien: {asset.name} - Valor: ${asset.purchase_price:.2f}",
        amount=asset.purchase_price,
        username=current_user.username,
    )

    return asset


@router.put("/{asset_id}", response_model=AssetResponse)
def update_asset(asset_id: int, data: AssetUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Bien no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(asset, key, value)

    db.commit()
    db.refresh(asset)

    add_history_entry(
        db, "edicion",
        f"Edición de bien: {asset.name}",
        amount=asset.purchase_price,
        username=current_user.username,
    )

    return asset


@router.delete("/{asset_id}")
def delete_asset(asset_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Soft-delete an asset."""
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.is_active == True).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Bien no encontrado")

    asset.is_active = False
    db.commit()

    add_history_entry(
        db, "eliminacion",
        f"Eliminación de bien: {asset.name}",
        amount=asset.purchase_price,
        username=current_user.username,
    )

    return {"message": "Bien eliminado correctamente"}
