"""
Expenses routes.
Recurring operational expenses with payment frequency and history.
"""

from datetime import datetime, date, timedelta
from dateutil.relativedelta import relativedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List
from app.database import get_db
from app.models import Expense, ExpensePayment, CashMovement, User
from app.auth import get_current_user, require_admin
from app.helpers import add_history_entry
from app.schemas import (
    ExpenseCreate, ExpenseUpdate, ExpenseResponse, ExpenseWithNext,
    ExpensePaymentCreate, ExpensePaymentResponse, ExpenseSummary,
)

router = APIRouter()


# Frequency map: months between payments
FREQUENCY_MONTHS = {
    "mensual": 1,
    "trimestral": 3,
    "semestral": 6,
    "anual": 12,
    "18meses": 18,
    "unico_pago": 0,
}


def calc_next_due(start_date: date, last_paid_date: date | None, frequency: str) -> date | None:
    """Calculate the next due date based on frequency."""
    if frequency == "unico_pago":
        return None if last_paid_date else start_date
    months = FREQUENCY_MONTHS.get(frequency, 1)
    base = last_paid_date or start_date
    next_due = base + relativedelta(months=months)
    return next_due


def is_overdue(next_due: date | None) -> bool:
    """Check if a due date is in the past."""
    if not next_due:
        return False
    return next_due < date.today()


def enrich_expense(expense: Expense) -> dict:
    """Add computed fields to an expense."""
    months = FREQUENCY_MONTHS.get(expense.frequency, 1)
    next_due = calc_next_due(expense.start_date, expense.last_paid_date, expense.frequency)
    overdue = is_overdue(next_due)

    total_paid = expense.payments and sum(p.amount for p in expense.payments) or 0
    payment_count = len(expense.payments) if expense.payments else 0

    return {
        "id": expense.id,
        "concept": expense.concept,
        "category": expense.category,
        "provider": expense.provider or "",
        "amount": expense.amount,
        "frequency": expense.frequency,
        "payment_day": expense.payment_day,
        "start_date": expense.start_date,
        "last_paid_date": expense.last_paid_date,
        "notes": expense.notes or "",
        "is_active": expense.is_active,
        "created_at": expense.created_at,
        "updated_at": expense.updated_at,
        "next_due_date": next_due,
        "is_overdue": overdue,
        "total_paid": total_paid,
        "payment_count": payment_count,
    }


@router.get("/", response_model=List[ExpenseWithNext])
def get_expenses(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all expenses with computed next due date."""
    expenses = db.query(Expense).order_by(Expense.id).all()
    return [enrich_expense(e) for e in expenses]


@router.get("/summary", response_model=ExpenseSummary)
def get_summary(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get expense summary statistics."""
    expenses = db.query(Expense).filter(Expense.is_active == True).all()

    total_monthly = 0
    categories = {}
    for e in expenses:
        months = FREQUENCY_MONTHS.get(e.frequency, 1)
        if months > 0:
            monthly_equiv = e.amount / months
            total_monthly += monthly_equiv
            cat = e.category or "Sin categoría"
            categories[cat] = categories.get(cat, 0) + monthly_equiv

    overdue_count = sum(1 for e in expenses if is_overdue(calc_next_due(e.start_date, e.last_paid_date, e.frequency)))

    # Total paid this year
    year_start = date(date.today().year, 1, 1)
    total_paid_year = db.query(func.coalesce(func.sum(ExpensePayment.amount), 0))\
        .filter(ExpensePayment.date >= year_start).scalar()

    return ExpenseSummary(
        total_monthly=round(total_monthly, 2),
        total_active=len(expenses),
        total_overdue=overdue_count,
        total_paid_year=float(total_paid_year),
        categories=categories,
    )


@router.get("/categories")
def get_categories():
    """Get available expense categories."""
    return [
        "Servicios (luz, agua, gas, internet)",
        "Renta",
        "Mantenimiento",
        "Suministros de oficina",
        "Refacciones",
        "Sueldos y nómina",
        "Impuestos y contribuciones",
        "Seguros",
        "Telecomunicaciones",
        "Transporte",
        "Capacitación",
        "Otros",
    ]


@router.get("/frequencies")
def get_frequencies():
    """Get available payment frequencies."""
    return [
        {"value": "mensual", "label": "Mensual", "months": 1},
        {"value": "trimestral", "label": "Trimestral (cada 3 meses)", "months": 3},
        {"value": "semestral", "label": "Semestral (cada 6 meses)", "months": 6},
        {"value": "anual", "label": "Anual", "months": 12},
        {"value": "18meses", "label": "Cada 18 meses", "months": 18},
        {"value": "unico_pago", "label": "Unico Pago", "months": 0},
    ]


@router.post("/", response_model=ExpenseWithNext, status_code=status.HTTP_201_CREATED)
def create_expense(data: ExpenseCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new recurring expense."""
    expense = Expense(
        concept=data.concept,
        category=data.category,
        provider=data.provider or "",
        amount=data.amount,
        frequency=data.frequency,
        payment_day=data.payment_day,
        start_date=data.start_date,
        notes=data.notes or "",
    )
    db.add(expense)
    db.commit()
    db.refresh(expense)

    add_history_entry(
        db, "gasto",
        f"Gasto registrado: {data.concept} (${data.amount:.2f}/{data.frequency})",
        amount=0,
        username=current_user.username,
    )

    return enrich_expense(expense)


@router.put("/{expense_id}", response_model=ExpenseWithNext)
def update_expense(expense_id: int, data: ExpenseUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(expense, key, value)

    expense.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(expense)
    return enrich_expense(expense)


@router.delete("/{expense_id}")
def delete_expense(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an expense and its payment history."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    db.delete(expense)
    db.commit()
    return {"message": "Gasto eliminado correctamente"}


@router.post("/{expense_id}/payments", response_model=ExpensePaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(expense_id: int, data: ExpensePaymentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Record a payment for an expense. Updates last_paid_date and optionally creates cash movement."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a cero")

    payment = ExpensePayment(
        expense_id=expense_id,
        date=data.date,
        amount=data.amount,
        method=data.method,
        concept=data.concept or expense.concept,
        notes=data.notes or "",
    )
    db.add(payment)

    # Update last_paid_date
    expense.last_paid_date = data.date
    expense.updated_at = datetime.utcnow()

    # Register as cash movement (egreso)
    cash_movement = CashMovement(
        date=data.date,
        type="egreso",
        concept=f"Gasto: {expense.concept}",
        amount=data.amount,
        notes=f"Método: {data.method}",
    )
    db.add(cash_movement)

    db.commit()
    db.refresh(payment)

    add_history_entry(
        db, "egreso",
        f"Pago gasto: {expense.concept} - ${data.amount:.2f}",
        amount=-data.amount,
        username=current_user.username,
    )

    return payment


@router.get("/{expense_id}/payments", response_model=List[ExpensePaymentResponse])
def get_expense_payments(expense_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all payments for an expense."""
    expense = db.query(Expense).filter(Expense.id == expense_id).first()
    if not expense:
        raise HTTPException(status_code=404, detail="Gasto no encontrado")

    payments = db.query(ExpensePayment)\
        .filter(ExpensePayment.expense_id == expense_id)\
        .order_by(ExpensePayment.date.desc()).all()
    return payments


@router.delete("/payments/{payment_id}")
def delete_payment(payment_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete an expense payment record."""
    payment = db.query(ExpensePayment).filter(ExpensePayment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Pago no encontrado")

    db.delete(payment)
    db.commit()
    return {"message": "Pago eliminado correctamente"}


@router.get("/upcoming", response_model=List[ExpenseWithNext])
def get_upcoming(days: int = 30, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get expenses due within the next N days."""
    expenses = db.query(Expense).filter(Expense.is_active == True).all()
    cutoff = date.today() + timedelta(days=days)
    upcoming = []
    for e in expenses:
        next_due = calc_next_due(e.start_date, e.last_paid_date, e.frequency)
        if next_due and next_due <= cutoff:
            enriched = enrich_expense(e)
            upcoming.append(enriched)
    upcoming.sort(key=lambda x: x["next_due_date"] or date.max)
    return upcoming
