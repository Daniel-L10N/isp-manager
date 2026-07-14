"""
Settings routes.
Manage company configuration (name, logo, address, etc.).
"""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import Setting, User
from app.auth import get_current_user
from app.schemas import SettingResponse, SettingUpdate

router = APIRouter()


@router.get("/", response_model=SettingResponse)
def get_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all system settings as a flat object."""
    settings = db.query(Setting).all()
    result = {
        "company_name": "Mi ISP",
        "company_logo": "",
        "company_address": "",
        "company_phone": "",
        "company_email": "",
        "currency": "MXN",
    }
    for s in settings:
        if s.key in result:
            result[s.key] = s.value or result[s.key]
    return result


@router.put("/", response_model=SettingResponse)
def update_settings(data: SettingUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update system settings."""
    update_data = data.model_dump(exclude_unset=True)

    for key, value in update_data.items():
        if value is not None:
            setting = db.query(Setting).filter(Setting.key == key).first()
            if setting:
                setting.value = str(value)
            else:
                setting = Setting(key=key, value=str(value))
                db.add(setting)

    db.commit()

    # Return updated settings
    return get_settings(db=db, current_user=current_user)
