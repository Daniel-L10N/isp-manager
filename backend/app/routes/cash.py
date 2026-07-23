"""
Cash register routes.
Handles income/expense registration, cash fund tracking, and admin deletion.
All cash is calculated from movements only - no base setting.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import CashMovement, Setting, History, User
from app.auth import get_current_user, require_admin
from app.helpers import add_history_entry
from app.schemas import CashMovementCreate, CashMovementResponse, CashRegisterResponse

router = APIRouter()


@router.get("/", response_model=CashRegisterResponse)
def get_cash_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current cash funds and all movements. Cash = income - expenses."""
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    current_funds = float(total_income) - float(total_expenses)

    movements = db.query(CashMovement).order_by(CashMovement.date.desc(), CashMovement.id.desc()).all()

    return CashRegisterResponse(current_funds=current_funds, movements=movements)


@router.post("/income", response_model=CashMovementResponse, status_code=status.HTTP_201_CREATED)
def register_income(data: CashMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Register a cash income movement."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    movement = CashMovement(
        date=data.date,
        type="ingreso",
        concept=data.concept,
        amount=data.amount,
        notes=data.notes or "",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    add_history_entry(
        db, "ingreso",
        f"Ingreso: {data.concept} - ${data.amount:.2f}",
        amount=data.amount,
        username=current_user.username,
    )

    return movement


@router.post("/expense", response_model=CashMovementResponse, status_code=status.HTTP_201_CREATED)
def register_expense(data: CashMovementCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Register a cash expense movement."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    movement = CashMovement(
        date=data.date,
        type="egreso",
        concept=data.concept,
        amount=data.amount,
        notes=data.notes or "",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    add_history_entry(
        db, "egreso",
        f"Egreso: {data.concept} - ${data.amount:.2f}",
        amount=-data.amount,
        username=current_user.username,
    )

    return movement


@router.delete("/{movement_id}", status_code=status.HTTP_200_OK)
def delete_movement(movement_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Delete a cash movement. Admin only."""
    movement = db.query(CashMovement).filter(CashMovement.id == movement_id).first()
    if not movement:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    concept = movement.concept
    amount = movement.amount
    movement_type = movement.type

    db.delete(movement)
    db.commit()

    add_history_entry(
        db, "eliminacion",
        f"Eliminado movimiento {movement_type}: {concept} - ${amount:.2f}",
        amount=None,
        username=current_user.username,
    )

    return {"message": "Movimiento eliminado correctamente"}
