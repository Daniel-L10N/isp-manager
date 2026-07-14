"""
Plans CRUD routes.
Manages internet service plans (name, speed, price, etc.).
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models import Plan, User
from app.auth import get_current_user
from app.schemas import PlanCreate, PlanUpdate, PlanResponse

router = APIRouter()


@router.get("/", response_model=List[PlanResponse])
def list_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all plans, ordered by name."""
    return db.query(Plan).order_by(Plan.name).all()


@router.get("/active", response_model=List[PlanResponse])
def list_active_plans(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get only active plans."""
    return db.query(Plan).filter(Plan.is_active == True).order_by(Plan.name).all()


@router.get("/{plan_id}", response_model=PlanResponse)
def get_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single plan by ID."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")
    return plan


@router.post("/", response_model=PlanResponse, status_code=status.HTTP_201_CREATED)
def create_plan(data: PlanCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new internet plan."""
    plan = Plan(**data.model_dump())
    db.add(plan)
    db.commit()
    db.refresh(plan)
    return plan


@router.put("/{plan_id}", response_model=PlanResponse)
def update_plan(plan_id: int, data: PlanUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update an existing plan."""
    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan


@router.delete("/{plan_id}")
def delete_plan(plan_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Delete a plan if no clients are assigned to it."""
    from app.models import Client
    client_count = db.query(Client).filter(Client.plan_id == plan_id, Client.is_active == True).count()
    if client_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"No se puede eliminar el plan: {client_count} cliente(s) aún lo tienen contratado",
        )

    plan = db.query(Plan).filter(Plan.id == plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    db.delete(plan)
    db.commit()
    return {"message": "Plan eliminado correctamente"}
