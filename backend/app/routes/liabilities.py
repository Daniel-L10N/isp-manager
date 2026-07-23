"""
Liabilities routes.
Handles CRUD for company debts, loans, and financial obligations.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import Liability, User
from app.auth import get_current_user
from app.helpers import add_history_entry
from app.schemas import LiabilityCreate, LiabilityUpdate, LiabilityResponse, LiabilitySummary

router = APIRouter()


@router.get("/", response_model=List[LiabilityResponse])
def get_liabilities(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all active liabilities."""
    liabilities = db.query(Liability).filter(Liability.is_active == True)\
        .order_by(Liability.created_at.desc()).all()
    return liabilities


@router.get("/summary", response_model=LiabilitySummary)
def get_liabilities_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get summary of all active liabilities."""
    total_debt = db.query(func.coalesce(func.sum(Liability.total_amount), 0))\
        .filter(Liability.is_active == True).scalar()
    total_paid = db.query(func.coalesce(func.sum(Liability.paid_amount), 0))\
        .filter(Liability.is_active == True).scalar()
    active_count = db.query(func.count(Liability.id))\
        .filter(Liability.is_active == True).scalar()

    return LiabilitySummary(
        total_debt=float(total_debt),
        total_paid=float(total_paid),
        total_remaining=float(total_debt) - float(total_paid),
        active_count=active_count or 0,
    )


@router.post("/", response_model=LiabilityResponse, status_code=status.HTTP_201_CREATED)
def create_liability(data: LiabilityCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new liability."""
    if data.total_amount <= 0:
        raise HTTPException(status_code=400, detail="El monto total debe ser mayor a cero")

    liability = Liability(
        concept=data.concept,
        creditor=data.creditor or "",
        total_amount=data.total_amount,
        paid_amount=data.paid_amount,
        monthly_payment=data.monthly_payment,
        due_date=data.due_date,
        interest_rate=data.interest_rate,
        status=data.status,
        notes=data.notes or "",
    )
    db.add(liability)
    db.commit()
    db.refresh(liability)

    add_history_entry(
        db, "egreso",
        f"Nuevo pasivo: {data.concept} - ${data.total_amount:.2f}",
        amount=None,
        username=current_user.username,
    )

    return liability


@router.get("/{liability_id}", response_model=LiabilityResponse)
def get_liability(liability_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific liability."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.is_active == True).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Pasivo no encontrado")
    return liability


@router.put("/{liability_id}", response_model=LiabilityResponse)
def update_liability(liability_id: int, data: LiabilityUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update a liability."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.is_active == True).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Pasivo no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(liability, key, value)

    # Auto-mark as paid if fully paid
    if liability.paid_amount >= liability.total_amount:
        liability.status = "pagado"

    liability.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(liability)

    return liability


@router.delete("/{liability_id}")
def delete_liability(liability_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Soft-delete a liability."""
    liability = db.query(Liability).filter(Liability.id == liability_id, Liability.is_active == True).first()
    if not liability:
        raise HTTPException(status_code=404, detail="Pasivo no encontrado")

    liability.is_active = False
    liability.updated_at = datetime.utcnow()
    db.commit()

    return {"message": "Pasivo eliminado correctamente"}
