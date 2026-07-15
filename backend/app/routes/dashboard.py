"""
Dashboard routes.
Provides aggregated data for the main dashboard view.
"""

from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Client, Payment, Asset, Setting, CashMovement
from app.auth import get_current_user
from app.models import User
from app.schemas import DashboardResponse, UpcomingPayment

router = APIRouter()


def _calculate_cash_funds(db: Session) -> float:
    """Calculate current cash funds from settings and cash movements."""
    setting = db.query(Setting).filter(Setting.key == "cash_funds").first()
    base = float(setting.value) if setting and setting.value else 0.0

    # Sum all cash movements
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()

    return base + float(total_income) - float(total_expenses)


@router.get("/", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all dashboard aggregated data."""
    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year
    today = date.today()

    # Cash funds
    cash_funds = _calculate_cash_funds(db)

    # Monthly income - sum of payments in current month
    monthly_income = db.query(func.coalesce(func.sum(Payment.amount), 0))\
        .filter(
            func.extract("month", Payment.date) == current_month,
            func.extract("year", Payment.date) == current_year,
            Payment.status == "pagado",
        ).scalar()

    # Yearly income - sum of payments in current year
    yearly_income = db.query(func.coalesce(func.sum(Payment.amount), 0))\
        .filter(
            func.extract("year", Payment.date) == current_year,
            Payment.status == "pagado",
        ).scalar()

    # Expected monthly income - sum of monthly_cost from all active clients
    expected_monthly_income = db.query(func.coalesce(func.sum(Client.monthly_cost), 0))\
        .filter(
            Client.is_active == True,
            Client.status == "activo",
        ).scalar()

    # Expected yearly income - 12 * expected monthly
    expected_yearly_income = float(expected_monthly_income) * 12

    # Total assets value
    total_assets = db.query(func.coalesce(func.sum(Asset.approximate_value), 0))\
        .filter(Asset.is_active == True).scalar()

    # Total capital
    total_capital = cash_funds + float(total_assets)

    # Client counts
    active_clients = db.query(func.count(Client.id))\
        .filter(Client.status == "activo", Client.is_active == True).scalar()
    suspended_clients = db.query(func.count(Client.id))\
        .filter(Client.status == "suspendido", Client.is_active == True).scalar()
    total_clients = db.query(func.count(Client.id))\
        .filter(Client.is_active == True).scalar()

    # Delinquent clients - clients who have not paid this month
    delinquent_clients = db.query(func.count(Client.id))\
        .filter(
            Client.is_active == True,
            Client.status == "activo",
            ~Client.id.in_(
                db.query(Payment.client_id).filter(
                    func.extract("month", Payment.date) == current_month,
                    func.extract("year", Payment.date) == current_year,
                    Payment.status == "pagado",
                )
            ),
        ).scalar()

    # Upcoming payments - clients whose cutoff is within next 5 days
    upcoming = []
    clients_due = db.query(Client).filter(
        Client.is_active == True,
        Client.status == "activo",
    ).all()

    for client in clients_due:
        cutoff = client.cutoff_day
        try:
            cutoff_date_this_month = date(current_year, current_month, cutoff)
        except ValueError:
            import calendar
            last_day = calendar.monthrange(current_year, current_month)[1]
            cutoff_day = min(cutoff, last_day)
            cutoff_date_this_month = date(current_year, current_month, cutoff_day)

        days_until_cutoff = (cutoff_date_this_month - today).days

        if days_until_cutoff < 0:
            next_month = current_month + 1
            next_year = current_year
            if next_month > 12:
                next_month = 1
                next_year += 1
            try:
                cutoff_date_next = date(next_year, next_month, cutoff)
            except ValueError:
                import calendar
                last_day = calendar.monthrange(next_year, next_month)[1]
                cutoff_day = min(cutoff, last_day)
                cutoff_date_next = date(next_year, next_month, cutoff_day)
            days_until_cutoff = (cutoff_date_next - today).days

        if 0 <= days_until_cutoff <= 5:
            paid = db.query(Payment).filter(
                Payment.client_id == client.id,
                func.extract("month", Payment.date) == current_month,
                func.extract("year", Payment.date) == current_year,
                Payment.status == "pagado",
            ).first()
            if not paid:
                upcoming.append(UpcomingPayment(
                    client_id=client.client_id,
                    client_name=client.name,
                    cutoff_day=client.cutoff_day,
                    amount=client.monthly_cost,
                    days_remaining=days_until_cutoff,
                ))

    return DashboardResponse(
        cash_funds=cash_funds,
        monthly_income=float(monthly_income),
        yearly_income=float(yearly_income),
        expected_monthly_income=float(expected_monthly_income),
        expected_yearly_income=float(expected_yearly_income),
        total_assets=float(total_assets),
        total_capital=float(total_capital),
        active_clients=active_clients or 0,
        suspended_clients=suspended_clients or 0,
        delinquent_clients=delinquent_clients or 0,
        total_clients=total_clients or 0,
        upcoming_payments=upcoming,
    )
