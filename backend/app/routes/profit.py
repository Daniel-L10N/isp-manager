"""
Profit / Utilidad Neta routes.
Shows income vs expenses for any time period.
Enriches data with Income client info and Expense category/provider.
"""

from datetime import date, datetime
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, extract
from typing import Optional
from app.database import get_db
from app.models import CashMovement, Income, ExpensePayment, Expense, User
from app.auth import get_current_user
from app.schemas import ProfitResponse, ProfitDetailItem

router = APIRouter()


def _get_date_range(period: str, start: Optional[date], end: Optional[date]):
    """Resolve date range from period name or custom dates."""
    today = date.today()
    if start and end:
        return start, end

    if period == "mes":
        return today.replace(day=1), today
    elif period == "trimestre":
        month = today.month
        quarter_start_month = ((month - 1) // 3) * 3 + 1
        return today.replace(month=quarter_start_month, day=1), today
    elif period == "semestre":
        month = today.month
        semi_start_month = 1 if month <= 6 else 7
        return today.replace(month=semi_start_month, day=1), today
    elif period == "ano":
        return today.replace(month=1, day=1), today
    elif period == "todos":
        return date(2020, 1, 1), today
    else:  # default: this month
        return today.replace(day=1), today


@router.get("/", response_model=ProfitResponse)
def get_profit(
    period: str = Query("mes", description="mes, trimestre, semestre, ano, todos"),
    start_date: Optional[date] = Query(None, description="Custom start date"),
    end_date: Optional[date] = Query(None, description="Custom end date"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get profit/loss report for a period with enriched detail."""
    start, end = _get_date_range(period, start_date, end_date)

    # Build a lookup of Income records by cash_movement_id for enrichment
    income_lookup = {}
    incomes = db.query(Income).filter(
        and_(Income.date >= start, Income.date <= end)
    ).all()
    for inc in incomes:
        if inc.cash_movement_id:
            income_lookup[inc.cash_movement_id] = inc

    # Build a lookup of ExpensePayment -> Expense for enrichment
    expense_lookup = {}
    exp_payments = db.query(ExpensePayment).filter(
        and_(ExpensePayment.date >= start, ExpensePayment.date <= end)
    ).all()
    for ep in exp_payments:
        expense = db.query(Expense).filter(Expense.id == ep.expense_id).first()
        expense_lookup[ep.id] = {
            "category": expense.category if expense else "",
            "provider": expense.provider if expense else "",
            "expense_concept": expense.concept if expense else "",
        }

    # Query all cash movements in range
    # Include: all expenses (formal + direct) and only formal incomes
    # Exclude: direct income from caja (personal loans / admin deposits)
    movements = db.query(CashMovement).filter(
        and_(
            CashMovement.date >= start,
            CashMovement.date <= end,
            or_(
                CashMovement.type == "egreso",                          # All expenses count
                CashMovement.source == "income_module",                  # Only formal incomes
            ),
        )
    ).all()

    # Separate income and expenses with enrichment
    income_items = []
    expense_items = []
    total_income = 0.0
    total_expenses = 0.0

    for m in movements:
        if m.type == "ingreso":
            # Try to enrich from Income table
            inc = income_lookup.get(m.id)
            client_name = ""
            method = ""
            if inc:
                client_name = inc.client_name or ""
                method = inc.method or ""

            item = ProfitDetailItem(
                date=m.date,
                concept=m.concept,
                amount=m.amount,
                notes=m.notes or "",
                client_name=client_name,
                category="",
                method=method,
            )
            income_items.append(item)
            total_income += m.amount

        elif m.type == "egreso":
            # Try to enrich from ExpensePayment table
            # Match by date + amount since there's no direct cash_movement_id link
            ep_match = None
            for ep in exp_payments:
                if ep.date == m.date and abs(ep.amount - m.amount) < 0.01:
                    ep_match = ep
                    break

            category = ""
            provider = ""
            method = ""
            if ep_match:
                lookup = expense_lookup.get(ep_match.id, {})
                category = lookup.get("category", "")
                provider = lookup.get("provider", "")
                method = ep_match.method or ""

            # Build concept with provider info
            concept = m.concept
            if provider and provider not in concept:
                concept = f"{concept} ({provider})"

            item = ProfitDetailItem(
                date=m.date,
                concept=concept,
                amount=m.amount,
                notes=m.notes or "",
                client_name="",
                category=category,
                method=method,
            )
            expense_items.append(item)
            total_expenses += m.amount

    net_profit = total_income - total_expenses
    margin = (net_profit / total_income * 100) if total_income > 0 else 0

    return ProfitResponse(
        period=period,
        start_date=start,
        end_date=end,
        total_income=round(total_income, 2),
        total_expenses=round(total_expenses, 2),
        net_profit=round(net_profit, 2),
        margin_percent=round(margin, 1),
        income_count=len(income_items),
        expense_count=len(expense_items),
        income_items=income_items,
        expense_items=expense_items,
    )


@router.get("/monthly", response_model=list)
def get_monthly_profit(
    year: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get monthly profit breakdown for a year (12 months)."""
    if not year:
        year = date.today().year

    results = []
    for month in range(1, 13):
        start = date(year, month, 1)
        if month == 12:
            end = date(year, 12, 31)
        else:
            import calendar
            last_day = calendar.monthrange(year, month)[1]
            end = date(year, month, last_day)

        income = db.query(func.coalesce(func.sum(CashMovement.amount), 0)).filter(
            and_(
                CashMovement.type == "ingreso",
                CashMovement.source == "income_module",
                CashMovement.date >= start,
                CashMovement.date <= end,
            )
        ).scalar()

        expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0)).filter(
            and_(
                CashMovement.type == "egreso",
                CashMovement.date >= start,
                CashMovement.date <= end,
            )
        ).scalar()

        inc = float(income)
        exp = float(expenses)
        results.append({
            "month": month,
            "month_name": start.strftime("%B").capitalize(),
            "income": round(inc, 2),
            "expenses": round(exp, 2),
            "profit": round(inc - exp, 2),
        })

    return results
