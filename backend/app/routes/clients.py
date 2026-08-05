import re
"""
Clients CRUD routes.
Manages ISP clients, including auto-ID generation, payment tracking, and history logging.
"""

from datetime import datetime, date
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
from app.database import get_db
from app.models import Client, Plan, Payment, Setting, CashMovement, History, User
from app.auth import get_current_user, require_admin
from app.schemas import (
    ClientCreate, ClientUpdate, ClientResponse, ClientListResponse,
    PaymentCreate, PaymentResponse,
)


def _normalize_phone(phone: str) -> str:
    """Normalize phone number to WhatsApp format: 521XXXXXXXXXX (13 digits)."""
    if not phone:
        return ""
    digits = re.sub(r'[^0-9]', '', phone)
    if digits.startswith('00'):
        digits = digits[2:]
    # If has 52 prefix with more than 12 digits, strip 52
    if digits.startswith('52') and len(digits) >= 12:
        digits = digits[2:]
    # Remove leading 1 if 11 digits
    if digits.startswith('1') and len(digits) == 11:
        digits = digits[1:]
    # Now should have 10 digits, add 521 prefix
    if len(digits) == 10:
        digits = '521' + digits
    return digits


router = APIRouter()


def _generate_client_id(db: Session) -> str:
    """
    Auto-generate a sequential client ID in format CLI-XXXX.
    Finds the highest existing number and increments by 1.
    """
    last_client = db.query(Client).order_by(Client.id.desc()).first()
    if last_client:
        last_num = int(last_client.client_id.split("-")[1])
        new_num = last_num + 1
    else:
        new_num = 1
    return f"CLI-{new_num:04d}"


def _calculate_annual_cost(contract_date: date, monthly_cost: float) -> float:
    """Calculate annual payment: 12 months × monthly cost."""
    return 12 * monthly_cost


def _add_history_entry(
    db: Session,
    type: str,
    description: str,
    amount: Optional[float] = None,
    username: str = "admin",
):
    """Add an entry to the general history log."""
    now = datetime.utcnow()
    # Get current cash funds for balance
    cash_setting = db.query(Setting).filter(Setting.key == "cash_funds").first()
    base = float(cash_setting.value) if cash_setting and cash_setting.value else 0.0
    total_income = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "ingreso").scalar()
    total_expenses = db.query(func.coalesce(func.sum(CashMovement.amount), 0))\
        .filter(CashMovement.type == "egreso").scalar()
    balance = base + float(total_income) - float(total_expenses)

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


def _update_cash_funds(db: Session, amount: float):
    """Update the cash_funds setting."""
    setting = db.query(Setting).filter(Setting.key == "cash_funds").first()
    if setting:
        current = float(setting.value) if setting.value else 0.0
        setting.value = str(current + amount)
        db.commit()


# ============ CLIENTS CRUD ============


@router.get("/", response_model=List[ClientListResponse])
def list_clients(
    search: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all active clients with optional search and status filter."""
    query = db.query(Client).filter(Client.is_active == True)

    if search:
        query = query.filter(
            Client.name.ilike(f"%{search}%") |
            Client.client_id.ilike(f"%{search}%") |
            Client.phone.ilike(f"%{search}%")
        )

    if status_filter:
        query = query.filter(Client.status == status_filter)

    clients = query.order_by(Client.client_id).all()

    result = []
    for c in clients:
        result.append(ClientListResponse(
            id=c.id,
            client_id=c.client_id,
            name=c.name,
            phone=c.phone,
            plan_name=c.plan.name if c.plan else "",
            monthly_cost=c.monthly_cost,
            status=c.status,
            cutoff_day=c.cutoff_day,
        ))
    return result


@router.get("/{client_id}", response_model=ClientResponse)
def get_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get a single client by internal ID."""
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")
    return client


@router.post("/", response_model=ClientResponse, status_code=status.HTTP_201_CREATED)
def create_client(data: ClientCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Create a new client with auto-generated ID and calculated costs."""
    # Verify plan exists
    plan = db.query(Plan).filter(Plan.id == data.plan_id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan no encontrado")

    # Calculate monthly cost from plan
    monthly_cost = plan.monthly_price

    # Calculate annual cost based on contract month
    annual_cost = _calculate_annual_cost(data.contract_date, monthly_cost)

    # Generate client ID
    client_id_str = _generate_client_id(db)

    client = Client(
        client_id=client_id_str,
        name=data.name,
        ine=data.ine or "",
        address=data.address or "",
        phone=data.phone or "",
        email=data.email or "",
        contract_date=data.contract_date,
        service_start_date=data.service_start_date or data.contract_date,
        cutoff_day=data.cutoff_day,
        plan_id=data.plan_id,
        monthly_cost=monthly_cost,
        annual_cost=annual_cost,
        status=data.status,
        notes=data.notes or "",
        is_active=True,
    )
    db.add(client)
    db.commit()
    db.refresh(client)

    # Log to history
    _add_history_entry(
        db, "alta_cliente",
        f"Alta de cliente {client.client_id} - {client.name} - Plan: {plan.name} - ${monthly_cost:.2f}/mes",
        amount=0,
        username=current_user.username,
    )

    return client


@router.put("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    data: ClientUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update client information. Recalculates costs if plan or contract date changes."""
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    update_data = data.model_dump(exclude_unset=True)

    # If plan changed, recalculate monthly cost
    if "plan_id" in update_data and update_data["plan_id"] != client.plan_id:
        plan = db.query(Plan).filter(Plan.id == update_data["plan_id"]).first()
        if not plan:
            raise HTTPException(status_code=404, detail="Plan no encontrado")
        client.monthly_cost = plan.monthly_price

    # If contract date changed or plan changed, recalculate annual cost
    contract_date = update_data.get("contract_date", client.contract_date)
    if "plan_id" in update_data or "contract_date" in update_data:
        client.annual_cost = _calculate_annual_cost(contract_date, client.monthly_cost)

    # Apply remaining updates
    for key, value in update_data.items():
        if key not in ("plan_id",):
            setattr(client, key, value)

    db.commit()
    db.refresh(client)

    # Send SMS notification if status changed to 'suspendido' (fire-and-forget)
    if "status" in update_data and update_data["status"] == "suspendido":
        try:
            from ..sms_client import get_sms_client, format_message

            sms_client = get_sms_client()
            suspension_enabled = db.query(Setting).filter(Setting.key == "sms_suspension_enabled").first()

            if sms_client and suspension_enabled and suspension_enabled.value.lower() == "true":
                phone_norm = _normalize_phone(client.phone)
                if phone_norm:
                    msg_setting = db.query(Setting).filter(Setting.key == "sms_message_suspension").first()
                    template = msg_setting.value if msg_setting else "Su servicio ha sido suspendido por falta de pago."

                    plan = db.query(Plan).filter(Plan.id == client.plan_id).first() if client.plan_id else None

                    message = format_message(template, {
                        "name": client.name,
                        "phone": phone_norm,
                        "monthly_cost": client.monthly_cost,
                        "plan_name": plan.name if plan else "",
                        "plan_speed": plan.speed if plan else "",
                        "status": client.status,
                    })

                    import httpx as _httpx
                    try:
                        with _httpx.Client(timeout=10.0) as _c:
                            _c.post(
                                f"{sms_client.base_url}/api/v1/external/messages/send",
                                headers=sms_client.headers,
                                json={"phone": phone_norm, "message": message},
                            )
                    except Exception:
                        pass
        except Exception as e:
            print(f"SMS suspension notification failed: {e}")

    # Log to history
    _add_history_entry(
        db, "edicion",
        f"Edición de cliente {client.client_id} - {client.name}",
        amount=0,
        username=current_user.username,
    )

    return client


@router.delete("/{client_id}")
def delete_client(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(require_admin)):
    """Soft-delete a client (marks as inactive, keeps history)."""
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    client.is_active = False
    db.commit()

    _add_history_entry(
        db, "eliminacion",
        f"Eliminación de cliente {client.client_id} - {client.name}",
        amount=0,
        username=current_user.username,
    )

    return {"message": "Cliente eliminado correctamente"}


# ============ PAYMENTS ============


@router.get("/{client_id}/payments", response_model=List[PaymentResponse])
def list_client_payments(client_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """Get all payments for a specific client."""
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    return db.query(Payment)\
        .filter(Payment.client_id == client_id)\
        .order_by(Payment.date.desc())\
        .all()


@router.post("/{client_id}/payments", response_model=PaymentResponse, status_code=status.HTTP_201_CREATED)
def record_payment(
    client_id: int,
    data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Record a payment for a client.
    Automatically updates cash funds, creates history entry.
    """
    client = db.query(Client).filter(Client.id == client_id, Client.is_active == True).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente no encontrado")

    # Create payment record
    payment = Payment(
        client_id=client_id,
        date=data.date,
        amount=data.amount,
        method=data.method,
        status="pagado",
        notes=data.notes or "",
    )
    db.add(payment)

    # Automatically add to cash as income
    cash_movement = CashMovement(
        date=data.date,
        type="ingreso",
        concept=f"Pago de cliente {client.client_id} - {client.name}",
        amount=data.amount,
        notes=data.notes or "",
    )
    db.add(cash_movement)
    db.commit()

    # Log to history
    _add_history_entry(
        db, "pago_cliente",
        f"Pago de {client.client_id} - {client.name}: ${data.amount:.2f} ({data.method})",
        amount=data.amount,
        username=current_user.username,
    )

    db.refresh(payment)

    # Send payment confirmation SMS (fire-and-forget)
    try:
        from ..sms_client import get_sms_client, format_message
        from ..models import Setting

        sms_client = get_sms_client()
        payment_enabled_setting = db.query(Setting).filter(Setting.key == "sms_payment_enabled").first()


        if sms_client and payment_enabled_setting and payment_enabled_setting.value.lower() == "true":
            # Get plan info
            plan = db.query(Plan).filter(Plan.id == client.plan_id).first() if client.plan_id else None

            # Get message template
            msg_setting = db.query(Setting).filter(Setting.key == "sms_message_payment").first()
            template = msg_setting.value if msg_setting else "Hemos recibido su pago de ${monto}. Gracias."

            # Format message
            phone_norm = _normalize_phone(client.phone)
            message = format_message(template, {
                "name": client.name,
                "phone": phone_norm,
                "monthly_cost": client.monthly_cost,
                "plan_name": plan.name if plan else "",
                "plan_speed": plan.speed if plan else "",
            })

            import httpx as _httpx
            try:
                with _httpx.Client(timeout=10.0) as _c:
                    _c.post(
                        f"{sms_client.base_url}/api/v1/external/messages/send",
                        headers=sms_client.headers,
                        json={"phone": phone_norm, "message": message},
                    )
            except Exception:
                pass
    except Exception as e:
        print(f"SMS payment confirmation failed: {e}")

    return payment
