"""
Shared helper functions for ISP Manager routes.
Eliminates code duplication across route modules.
"""

from datetime import datetime
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import History, CashMovement


def add_history_entry(
    db: Session,
    type: str,
    description: str,
    amount: float = None,
    username: str = "admin",
):
    """Add an entry to the general history log.
    
    Calculates current balance from cash movements only (no settings dependency).
    """
    now = datetime.utcnow()
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    balance = float(total_income) - float(total_expenses)

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
