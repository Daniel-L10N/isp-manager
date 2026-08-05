"""
Cash register routes.
Handles income/expense registration and cash fund tracking.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import CashMovement, Setting, History, User
from app.auth import get_current_user
from app.schemas import CashMovementCreate, CashMovementResponse, CashRegisterResponse

router = APIRouter()


def _add_history_entry(db: Session, type: str, description: str, amount: float = None, username: str = "admin"):
    """Add an entry to the history log."""
    now = datetime.utcnow()
    cash_setting = db.query(Setting).filter(Setting.key == "cash_funds").first()
    base = float(cash_setting.value) if cash_setting and cash_setting.value else 0.0
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    balance = base + float(total_income) - float(total_expenses)

    entry = History(
        date=now.date(),
        time=now.strftime("%H:%M"),
        user=username,
        type=type,
        description=description,
        amount=amount,
        balance_after=balance,
    )
    db.add(entry)
    db.commit()


@router.get("/", response_model=CashRegisterResponse)
def get_cash_status(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get current cash funds and all movements."""
    # Calculate current funds
    setting = db.query(Setting).filter(Setting.key == "cash_funds").first()
    base = float(setting.value) if setting and setting.value else 0.0
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    current_funds = base + float(total_income) - float(total_expenses)

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
        source="cash_direct",
        notes=data.notes or "",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    _add_history_entry(
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
        source="cash_direct",
        notes=data.notes or "",
    )
    db.add(movement)
    db.commit()
    db.refresh(movement)

    _add_history_entry(
        db, "egreso",
        f"Egreso: {data.concept} - ${data.amount:.2f}",
        amount=-data.amount,
        username=current_user.username,
    )

    return movement
