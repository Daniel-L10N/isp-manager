"""
Provider payments routes.
Tracks payments to suppliers/providers linked to liabilities.
Creates CashMovement automatically so payments appear in Caja and Utilidad.
"""

from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from typing import List
from app.database import get_db
from app.models import ProviderPayment, Liability, CashMovement, User
from app.auth import get_current_user
from app.helpers import add_history_entry
from app.schemas import ProviderPaymentCreate, ProviderPaymentResponse

router = APIRouter()


@router.get("/creditors", response_model=List[str])
def get_creditors(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get unique creditor names from active liabilities."""
    creditors = db.query(distinct(Liability.creditor))\
        .filter(Liability.is_active == True, Liability.creditor != None, Liability.creditor != "")\
        .order_by(Liability.creditor).all()
    return [c[0] for c in creditors]


@router.get("/creditor/{creditor}/liabilities")
def get_liabilities_by_creditor(creditor: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get active liabilities filtered by creditor name."""
    liabilities = db.query(Liability)\
        .filter(Liability.is_active == True, Liability.creditor == creditor)\
        .order_by(Liability.id).all()
    return [
        {
            "id": l.id,
            "concept": l.concept,
            "total_amount": l.total_amount,
            "paid_amount": l.paid_amount,
            "remaining": l.total_amount - l.paid_amount,
            "monthly_payment": l.monthly_payment,
            "status": l.status,
        }
        for l in liabilities
    ]


@router.get("/", response_model=List[ProviderPaymentResponse])
def get_payments(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all provider payments ordered by date desc."""
    payments = db.query(ProviderPayment).order_by(
        ProviderPayment.date.desc(), ProviderPayment.id.desc()
    ).all()
    return payments


@router.post("/", response_model=ProviderPaymentResponse, status_code=status.HTTP_201_CREATED)
def create_payment(data: ProviderPaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new provider payment. Creates CashMovement automatically."""
    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    # Verify liability exists if linked
    if data.liability_id:
        liability = db.query(Liability).filter(
            Liability.id == data.liability_id,
            Liability.is_active == True
        ).first()
        if not liability:
            raise HTTPException(status_code=404, detail="Pasivo no encontrado")

    # Create CashMovement (egreso) — money leaving the cash register
    concept = f"Pago proveedor: {data.creditor}"
    if data.concept:
        concept += f" - {data.concept}"

    cm = CashMovement(
        date=data.date,
        type="egreso",
        concept=concept,
        amount=data.amount,
        notes=f"Metodo: {data.method}",
    )
    db.add(cm)
    db.flush()  # get cm.id

    # Create ProviderPayment linked to CashMovement
    payment = ProviderPayment(
        date=data.date,
        creditor=data.creditor,
        liability_id=data.liability_id,
        amount=data.amount,
        concept=data.concept or "",
        method=data.method,
        status=data.status,
        notes=data.notes or "",
        cash_movement_id=cm.id,
    )
    db.add(payment)
    db.commit()
    db.refresh(payment)

    # Update liability paid_amount if linked
    if data.liability_id:
        liability = db.query(Liability).filter(Liability.id == data.liability_id).first()
        if liability:
            liability.paid_amount = float(liability.paid_amount or 0) + data.amount
            if liability.paid_amount >= liability.total_amount:
                liability.status = "pagado"
            liability.updated_at = datetime.utcnow()
            db.commit()

    add_history_entry(
        db, "egreso",
        f"Pago proveedor: {data.creditor} - ${data.amount:.2f}",
        amount=-data.amount,
        username=current_user.username,
    )

    return payment


@router.get("/{payment_id}", response_model=ProviderPaymentResponse)
def get_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a specific provider payment."""
    payment = db.query(ProviderPayment).filter(ProviderPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")
    return payment


@router.delete("/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a provider payment and its linked CashMovement."""
    payment = db.query(ProviderPayment).filter(ProviderPayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    # Delete linked CashMovement
    if payment.cash_movement_id:
        cm = db.query(CashMovement).filter(CashMovement.id == payment.cash_movement_id).first()
        if cm:
            db.delete(cm)

    # Reverse liability paid_amount if linked
    if payment.liability_id:
        liability = db.query(Liability).filter(Liability.id == payment.liability_id).first()
        if liability:
            liability.paid_amount = max(0, float(liability.paid_amount or 0) - payment.amount)
            if liability.status == "pagado" and liability.paid_amount < liability.total_amount:
                liability.status = "activo"
            liability.updated_at = datetime.utcnow()

    db.delete(payment)
    db.commit()

    return {"message": "Pago eliminado correctamente"}
