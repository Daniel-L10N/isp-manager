"""
Dashboard routes.
Provides aggregated data for the main dashboard view.
Uses CashMovement + Income for real cobros, not legacy Payment table.
"""

from datetime import datetime, date
import calendar
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models import Client, Asset, CashMovement, Income
from app.auth import get_current_user
from app.models import User
from app.schemas import DashboardResponse, UpcomingPayment

router = APIRouter()


def _calculate_cash_funds(db: Session) -> float:
    """Calculate current cash funds from movements only."""
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    return float(total_income) - float(total_expenses)


@router.get("/", response_model=DashboardResponse)
def get_dashboard(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all dashboard aggregated data."""
    now = datetime.utcnow()
    current_month = now.month
    current_year = now.year
    today = date.today()

    # Cash funds
    cash_funds = _calculate_cash_funds(db)

    # Monthly income (cobrado) - from Income table
    monthly_income = db.query(func.coalesce(func.sum(Income.amount), 0))\
        .filter(
            func.extract("month", Income.date) == current_month,
            func.extract("year", Income.date) == current_year,
        ).scalar()

    # Yearly income (cobrado)
    yearly_income = db.query(func.coalesce(func.sum(Income.amount), 0))\
        .filter(
            func.extract("year", Income.date) == current_year,
        ).scalar()

    # Expected monthly income - sum of monthly_cost from all active clients
    expected_monthly_income = db.query(func.coalesce(func.sum(Client.monthly_cost), 0))\
        .filter(
            Client.is_active == True,
            Client.status == "activo",
        ).scalar()

    # Expected yearly income - remaining months * expected monthly
    months_remaining = 12 - current_month
    expected_yearly_income = float(expected_monthly_income) * months_remaining

    # Total assets value
    total_assets = db.query(func.coalesce(func.sum(Asset.purchase_price * Asset.quantity), 0))\
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

    # Delinquent clients - active clients who have NOT paid this month
    paid_client_ids = db.query(Income.client_id).filter(
        func.extract("month", Income.date) == current_month,
        func.extract("year", Income.date) == current_year,
        Income.client_id.isnot(None),
    ).all()
    paid_ids = {row[0] for row in paid_client_ids if row[0] is not None}

    active_client_list = db.query(Client).filter(
        Client.is_active == True,
        Client.status == "activo",
    ).all()

    delinquent_clients = sum(1 for c in active_client_list if c.id not in paid_ids)

    # Upcoming payments (clients due in next 5 days who haven't paid)
    upcoming = []
    for client in active_client_list:
        cutoff = client.cutoff_day
        try:
            cutoff_date_this_month = date(current_year, current_month, cutoff)
        except ValueError:
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
                last_day = calendar.monthrange(next_year, next_month)[1]
                cutoff_day = min(cutoff, last_day)
                cutoff_date_next = date(next_year, next_month, cutoff_day)
            days_until_cutoff = (cutoff_date_next - today).days

        if 0 <= days_until_cutoff <= 5:
            if client.id not in paid_ids:
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
        total_capital=total_capital,
        active_clients=active_clients or 0,
        suspended_clients=suspended_clients or 0,
        delinquent_clients=delinquent_clients,
        total_clients=total_clients or 0,
        upcoming_payments=upcoming,
    )
