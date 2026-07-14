"""
History routes.
Provides the general activity log with pagination.
"""

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import History, User
from app.auth import get_current_user
from app.schemas import HistoryResponse

router = APIRouter()


@router.get("/", response_model=List[HistoryResponse])
def get_history(
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    type_filter: Optional[str] = Query(None, alias="type"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get history entries with pagination and optional type filter."""
    query = db.query(History)

    if type_filter:
        query = query.filter(History.type == type_filter)

    total = query.count()
    entries = query.order_by(History.id.desc()).offset(offset).limit(limit).all()

    return entries


@router.get("/types")
def get_history_types(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get distinct history types for filtering."""
    types = db.query(History.type).distinct().all()
    return [t[0] for t in types]
