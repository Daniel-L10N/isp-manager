"""
SMS integration routes.
Proxies requests to the SMS Manager's external API for sending
automated messages to clients.
"""

import httpx
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.auth import get_current_user
from app.models import User, Setting
from app.sms_client import get_sms_client, SMSClient

router = APIRouter()


# ============ SCHEMAS ============

class SMSConfigUpdate(BaseModel):
    sms_enabled: Optional[bool] = None
    sms_url: Optional[str] = None
    sms_api_key: Optional[str] = None
    sms_reminders_enabled: Optional[bool] = None
    sms_cutoff_enabled: Optional[bool] = None
    sms_suspension_enabled: Optional[bool] = None
    sms_payment_enabled: Optional[bool] = None
    sms_reminder_days: Optional[int] = None
    sms_message_reminder: Optional[str] = None
    sms_message_cutoff: Optional[str] = None
    sms_message_suspension: Optional[str] = None
    sms_message_payment: Optional[str] = None


class SMSSendRequest(BaseModel):
    phone: str
    message: str


class SMSSendResponse(BaseModel):
    success: bool
    message_id: Optional[str] = None
    error: Optional[str] = None


class SMSScheduleResponse(BaseModel):
    success: bool
    job_id: Optional[str] = None
    error: Optional[str] = None


class ScheduleSMSRequest(BaseModel):
    phone: str
    message: str
    scheduled_at: str  # ISO 8601 datetime


# ============ HELPERS ============

def _get_sms_or_404() -> SMSClient:
    """Get SMS client or raise 503 if not configured."""
    sms = get_sms_client()
    if sms is None:
        raise HTTPException(
            status_code=503,
            detail="SMS Manager no está configurado. Configure sms_url y sms_api_key en Ajustes.",
        )
    return sms


# ============ ROUTES ============

@router.get("/config")
def get_sms_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all SMS configuration settings."""
    settings = db.query(Setting).filter(Setting.key.like("sms_%")).all()
    config = {s.key: s.value for s in settings}

    # Convert boolean strings to actual booleans
    for key in [
        "sms_enabled",
        "sms_reminders_enabled",
        "sms_cutoff_enabled",
        "sms_suspension_enabled",
        "sms_payment_enabled",
    ]:
        if key in config:
            config[key] = config[key].lower() == "true"

    # Convert integer strings to actual integers
    if "sms_reminder_days" in config:
        config["sms_reminder_days"] = int(config["sms_reminder_days"])

    return {"success": True, "data": config}


@router.put("/config")
def update_sms_config(
    update: SMSConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update SMS configuration settings (only provided fields)."""
    update_dict = update.model_dump(exclude_none=True)

    for key, value in update_dict.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = str(value).lower() if isinstance(value, bool) else str(value)
        else:
            db.add(
                Setting(
                    key=key,
                    value=str(value).lower() if isinstance(value, bool) else str(value),
                )
            )

    db.commit()
    return {"success": True, "message": "SMS config updated"}


@router.post("/test")
async def test_sms_connection(
    current_user: User = Depends(get_current_user),
):
    """Test connection to SMS Manager. Returns success/failure without raising."""
    client = get_sms_client()
    if not client:
        return {"success": False, "message": "SMS not configured. Set URL and API Key first."}
    result = await client.health_check()
    return result


@router.get("/health")
async def health_check(current_user: User = Depends(get_current_user)):
    """Check if the SMS Manager is reachable and healthy (raises on failure)."""
    sms = _get_sms_or_404()
    result = await sms.health_check()
    if result["success"]:
        return {"connected": True, "details": result.get("data")}
    raise HTTPException(status_code=503, detail=f"SMS Manager no disponible: {result.get('error')}")


@router.post("/send", response_model=SMSSendResponse)
async def send_sms(
    data: SMSSendRequest,
    current_user: User = Depends(get_current_user),
):
    """Send an immediate SMS message."""
    sms = _get_sms_or_404()
    result = await sms.send(phone=data.phone, message=data.message)
    # SMS Manager returns nested error: {success: false, error: {code, message}}
    if not result.get('success') and isinstance(result.get('error'), dict):
        result['error'] = result['error'].get('message', str(result['error']))
    return SMSSendResponse(**result)


@router.post("/schedule", response_model=SMSScheduleResponse)
async def schedule_sms(data: ScheduleSMSRequest, current_user: User = Depends(get_current_user)):
    """Schedule an SMS for later delivery."""
    sms = _get_sms_or_404()
    result = await sms.schedule(
        phone=data.phone,
        message=data.message,
        scheduled_at=data.scheduled_at,
    )
    return SMSScheduleResponse(**result)
