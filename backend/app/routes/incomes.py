"""
Income routes — Register client payments, linked to CashMovement.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import Income, Client, CashMovement, User
from app.auth import get_current_user
from app.helpers import add_history_entry
from app.schemas import IncomeCreate, IncomeResponse

router = APIRouter()


@router.get("/", response_model=List[IncomeResponse])
def get_incomes(
    client_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all incomes, optionally filtered by client."""
    q = db.query(Income).order_by(Income.date.desc(), Income.id.desc())
    if client_id:
        q = q.filter(Income.client_id == client_id)
    return q.all()


@router.get("/clients")
def get_clients_for_income(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get active clients for income dropdown."""
    clients = db.query(Client).filter(Client.is_active == True).order_by(Client.name).all()
    return [{"id": c.id, "name": c.name, "monthly_cost": c.monthly_cost} for c in clients]


@router.get("/summary")
def get_income_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get income summary for current month and year."""
    from datetime import date
    today = date.today()
    month_start = today.replace(day=1)
    year_start = today.replace(month=1, day=1)

    month_total = db.query(func.coalesce(func.sum(Income.amount), 0))\
        .filter(Income.date >= month_start, Income.date <= today).scalar()
    year_total = db.query(func.coalesce(func.sum(Income.amount), 0))\
        .filter(Income.date >= year_start, Income.date <= today).scalar()
    total_all = db.query(func.coalesce(func.sum(Income.amount), 0)).scalar()
    count = db.query(func.count(Income.id)).scalar()

    return {
        "month_total": float(month_total),
        "year_total": float(year_total),
        "total_all": float(total_all),
        "total_records": count,
    }


@router.post("/", response_model=IncomeResponse, status_code=status.HTTP_201_CREATED)
def create_income(data: IncomeCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Register an income from a client payment. Creates CashMovement automatically."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    # Get client name if client_id provided
    client_name = data.client_name or ""
    if data.client_id and not client_name:
        client = db.query(Client).filter(Client.id == data.client_id).first()
        if client:
            client_name = client.name

    # Create CashMovement (ingreso)
    cm = CashMovement(
        date=data.date,
        type="ingreso",
        concept=f"Pago cliente: {client_name}" + (f" - {data.concept}" if data.concept else ""),
        amount=data.amount,
        notes=f"Método: {data.method}",
    )
    db.add(cm)
    db.flush()  # get cm.id

    # Create Income record
    income = Income(
        date=data.date,
        client_id=data.client_id,
        client_name=client_name,
        amount=data.amount,
        concept=data.concept or "",
        method=data.method,
        cash_movement_id=cm.id,
        notes=data.notes or "",
    )
    db.add(income)
    db.commit()
    db.refresh(income)

    add_history_entry(
        db, "ingreso",
        f"Pago cliente: {client_name} - ${data.amount:.2f}",
        amount=data.amount,
        username=current_user.username,
    )

    return income


@router.delete("/{income_id}")
def delete_income(income_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an income and its linked CashMovement."""
    income = db.query(Income).filter(Income.id == income_id).first()
    if not income:
        raise HTTPException(status_code=404, detail="Ingreso no encontrado")

    # Delete linked CashMovement
    if income.cash_movement_id:
        cm = db.query(CashMovement).filter(CashMovement.id == income.cash_movement_id).first()
        if cm:
            db.delete(cm)

    db.delete(income)
    db.commit()
    return {"message": "Ingreso eliminado correctamente"}
