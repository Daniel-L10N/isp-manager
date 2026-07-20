"""
WhatsApp integration routes.
Proxies requests to the WhatsApp service (whatsapp-web.js) for sending
automated payment reminders to clients.
"""

import calendar
import httpx
from datetime import datetime, date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Client, Plan, Setting, User, Payment
from app.auth import get_current_user
from app.schemas import ClientListResponse

router = APIRouter()

# WhatsApp service runs on port 3001 (same host)
WHATSAPP_SERVICE_URL = "http://127.0.0.1:3001"


# ============ SCHEMAS ============

class SendReminderRequest(BaseModel):
    client_id: int
    override_phone: Optional[str] = None  # Use client's phone or override

class SendBulkReminderRequest(BaseModel):
    days_before: int = 3  # 3, 2, or 1 days before cutoff

class SendMessageRequest(BaseModel):
    phone: str
    message: str

class WhatsAppStatusResponse(BaseModel):
    connected: bool
    phone: Optional[str] = None
    name: Optional[str] = None

class ReminderPreview(BaseModel):
    client_id: str
    client_name: str
    phone: str
    username: str  # PPPoE username (email field)
    amount: float
    cutoff_day: int
    days_until_cutoff: int
    message: str

class AutomationSettings(BaseModel):
    reminder_days_before: int = 3  # Default: 3 days
    reminder_enabled: bool = True
    isp_whatsapp_number: str = ""  # ISP's WhatsApp number


# ============ HELPER FUNCTIONS ============

def _get_automation_settings(db: Session) -> AutomationSettings:
    """Load automation settings from the database."""
    settings = db.query(Setting).filter(
        Setting.key.in_([
            "reminder_days_before",
            "reminder_enabled",
            "isp_whatsapp_number",
        ])
    ).all()

    settings_dict = {s.key: s.value for s in settings}

    return AutomationSettings(
        reminder_days_before=int(settings_dict.get("reminder_days_before", "3")),
        reminder_enabled=settings_dict.get("reminder_enabled", "true") == "true",
        isp_whatsapp_number=settings_dict.get("isp_whatsapp_number", ""),
    )


def _save_automation_settings(db: Session, data: AutomationSettings):
    """Save automation settings to the database."""
    updates = {
        "reminder_days_before": str(data.reminder_days_before),
        "reminder_enabled": "true" if data.reminder_enabled else "false",
        "isp_whatsapp_number": data.isp_whatsapp_number,
    }

    for key, value in updates.items():
        setting = db.query(Setting).filter(Setting.key == key).first()
        if setting:
            setting.value = value
        else:
            setting = Setting(key=key, value=value)
            db.add(setting)

    db.commit()


def _get_next_cutoff_date(cutoff_day: int) -> tuple[date, int]:
    """
    Calculate the next cutoff date and days remaining.
    Returns (cutoff_date, days_until_cutoff).
    """
    today = date.today()
    current_year = today.year
    current_month = today.month

    try:
        cutoff_date = date(current_year, current_month, cutoff_day)
    except ValueError:
        last_day = calendar.monthrange(current_year, current_month)[1]
        cutoff_day = min(cutoff_day, last_day)
        cutoff_date = date(current_year, current_month, cutoff_day)

    days_until = (cutoff_date - today).days

    # If cutoff already passed, check next month
    if days_until < 0:
        next_month = current_month + 1
        next_year = current_year
        if next_month > 12:
            next_month = 1
            next_year += 1

        try:
            cutoff_date = date(next_year, next_month, cutoff_day)
        except ValueError:
            last_day = calendar.monthrange(next_year, next_month)[1]
            cutoff_day = min(cutoff_day, last_day)
            cutoff_date = date(next_year, next_month, cutoff_day)

        days_until = (cutoff_date - today).days

    return cutoff_date, days_until


def _format_reminder_message(
    client_name: str,
    pppoe_username: str,
    amount: float,
    cutoff_day: int,
    days_until: int,
) -> str:
    """Format the WhatsApp reminder message."""
    if days_until == 0:
        urgency = "Hoy es el día de corte."
    elif days_until == 1:
        urgency = "Mañana es el día de corte."
    else:
        urgency = f"Faltan {days_until} días para el día de corte."

    message = (
        f"Estimado/a {client_name}:\n\n"
        f"{urgency}\n\n"
        f"Su pago correspondiente es de ${amount:.2f}.\n"
        f"Usuario PPPoE: {pppoe_username}\n"
        f"Día de corte: {cutoff_day} de cada mes.\n\n"
        f"Realice su pago a tiempo para evitar la suspensión del servicio.\n\n"
        f"¡Gracias por su preferencia!"
    )
    return message


def _get_pending_reminders(db: Session, days_before: int) -> List[ReminderPreview]:
    """Get clients that need reminders based on cutoff days."""
    automation = _get_automation_settings(db)
    reminders = []

    clients = db.query(Client).filter(
        Client.is_active == True,
        Client.status == "activo",
    ).all()

    for client in clients:
        cutoff_date, days_until = _get_next_cutoff_date(client.cutoff_day)

        # Check if this client needs a reminder (within the days_before window)
        if 0 <= days_until <= days_before:
            # Check if they already paid for this month
            current_month = date.today().month
            current_year = date.today().year
            paid = db.query(Payment).filter(
                Payment.client_id == client.id,
                func.extract("month", Payment.date) == current_month,
                func.extract("year", Payment.date) == current_year,
                Payment.status == "pagado",
            ).first()

            if not paid:
                message = _format_reminder_message(
                    client_name=client.name,
                    pppoe_username=client.email or "",
                    amount=client.monthly_cost,
                    cutoff_day=client.cutoff_day,
                    days_until=days_until,
                )
                reminders.append(ReminderPreview(
                    client_id=client.client_id,
                    client_name=client.name,
                    phone=client.phone or "",
                    username=client.email or "",
                    amount=client.monthly_cost,
                    cutoff_day=client.cutoff_day,
                    days_until_cutoff=days_until,
                    message=message,
                ))

    return reminders


# ============ ROUTES ============

@router.get("/status", response_model=WhatsAppStatusResponse)
async def get_whatsapp_status(current_user: User = Depends(get_current_user)):
    """Check if the WhatsApp service is connected."""
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/status")
            if response.status_code == 200:
                data = response.json()
                return WhatsAppStatusResponse(
                    connected=data.get("isReady", False) or data.get("connected", False),
                    phone=data.get("phone"),
                    name=data.get("name") or data.get("client"),
                )
    except httpx.RequestError:
        pass

    return WhatsAppStatusResponse(connected=False)


@router.post("/send")
async def send_message(data: SendMessageRequest, current_user: User = Depends(get_current_user)):
    """Send a WhatsApp message to a phone number."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={
                    "phone": data.phone,
                    "message": data.message,
                },
            )
            if response.status_code == 200:
                return response.json()
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json().get("error", "Error sending message"),
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"WhatsApp service no disponible: {str(e)}",
        )


@router.post("/send-reminder")
async def send_reminder(data: SendReminderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send a payment reminder to a specific client."""
    # Get client
    client_obj = db.query(Client).filter(
        Client.id == data.client_id,
        Client.is_active == True,
    ).first()
    if not client_obj:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    phone = data.override_phone or client_obj.phone
    if not phone:
        raise HTTPException(status_code=400, detail="Cliente no tiene número de teléfono")

    # Calculate days until cutoff
    _, days_until = _get_next_cutoff_date(client_obj.cutoff_day)

    # Format message
    message = _format_reminder_message(
        client_name=client_obj.name,
        pppoe_username=client_obj.email or "",
        amount=client_obj.monthly_cost,
        cutoff_day=client_obj.cutoff_day,
        days_until=days_until,
    )

    # Send via WhatsApp service
    try:
        async with httpx.AsyncClient(timeout=30.0) as http_client:
            response = await http_client.post(
                f"{WHATSAPP_SERVICE_URL}/send",
                json={"phone": phone, "message": message},
            )
            if response.status_code == 200:
                return {
                    "success": True,
                    "client_id": client_obj.client_id,
                    "phone": phone,
                    "days_until_cutoff": days_until,
                    "message": message,
                }
            else:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=response.json().get("error", "Error sending message"),
                )
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"WhatsApp service no disponible: {str(e)}",
        )


@router.post("/send-bulk-reminders")
async def send_bulk_reminders(data: SendBulkReminderRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Send reminders to all clients with upcoming cutoffs."""
    automation = _get_automation_settings(db)

    if not automation.reminder_enabled:
        return {"success": False, "message": "Las automatizaciones están deshabilitadas"}

    reminders = _get_pending_reminders(db, data.days_before)

    results = []
    errors = []

    for reminder in reminders:
        if not reminder.phone:
            errors.append({
                "client_id": reminder.client_id,
                "error": "Sin número de teléfono",
            })
            continue

        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{WHATSAPP_SERVICE_URL}/send",
                    json={"phone": reminder.phone, "message": reminder.message},
                )
                if response.status_code == 200:
                    results.append({
                        "client_id": reminder.client_id,
                        "phone": reminder.phone,
                        "success": True,
                    })
                else:
                    errors.append({
                        "client_id": reminder.client_id,
                        "error": response.json().get("error", "Error sending"),
                    })
        except httpx.RequestError as e:
            errors.append({
                "client_id": reminder.client_id,
                "error": str(e),
            })

    return {
        "success": True,
        "sent": len(results),
        "errors": len(errors),
        "details": results,
        "error_details": errors,
    }


@router.get("/reminders/pending", response_model=List[ReminderPreview])
async def get_pending_reminders(
    days_before: int = 3,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Preview which clients will receive reminders."""
    return _get_pending_reminders(db, days_before)


@router.get("/automation-settings", response_model=AutomationSettings)
async def get_automation_settings(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get WhatsApp automation settings."""
    return _get_automation_settings(db)


@router.put("/automation-settings", response_model=AutomationSettings)
async def update_automation_settings(data: AutomationSettings, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Update WhatsApp automation settings."""
    _save_automation_settings(db, data)
    return _get_automation_settings(db)


# ============ QR AND LOGOUT ============

@router.get("/qr")
async def get_qr(current_user: User = Depends(get_current_user)):
    """Get the WhatsApp QR code for scanning."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{WHATSAPP_SERVICE_URL}/qr")
            if response.status_code == 200:
                data = response.json()
                # The WhatsApp service returns {qr: '...'} or {status: 'connected'}
                if "qr" in data and data["qr"]:
                    return {"qr": data["qr"], "connected": False}
                elif data.get("status") == "connected" or data.get("isReady"):
                    return {"qr": None, "connected": True, "message": "Already authenticated"}
                else:
                    return {"qr": None, "connected": False, "message": "No QR available yet"}
    except httpx.RequestError:
        pass

    return {"qr": None, "connected": False, "message": "WhatsApp service unavailable"}


@router.post("/logout")
async def logout_whatsapp(current_user: User = Depends(get_current_user)):
    """Disconnect WhatsApp session."""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(f"{WHATSAPP_SERVICE_URL}/logout")
            if response.status_code == 200:
                return {"success": True, "message": "Sesión de WhatsApp cerrada"}
            else:
                return {"success": False, "message": "Error al cerrar sesión"}
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503,
            detail=f"WhatsApp service no disponible: {str(e)}",
        )
