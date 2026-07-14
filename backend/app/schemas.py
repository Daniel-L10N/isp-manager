"""
Pydantic schemas for request/response validation.
Separated by domain for clarity.
"""

from datetime import date, datetime
from typing import Optional, List
from pydantic import BaseModel, Field


# ============ AUTH ============

class LoginRequest(BaseModel):
    username: str
    password: str

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    username: str


# ============ PLANS ============

class PlanBase(BaseModel):
    name: str
    speed: str
    monthly_price: float
    description: Optional[str] = ""
    is_active: bool = True

class PlanCreate(PlanBase):
    pass

class PlanUpdate(BaseModel):
    name: Optional[str] = None
    speed: Optional[str] = None
    monthly_price: Optional[float] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None

class PlanResponse(PlanBase):
    id: int
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ CLIENTS ============

class ClientBase(BaseModel):
    name: str
    ine: Optional[str] = ""
    address: Optional[str] = ""
    phone: Optional[str] = ""
    email: Optional[str] = ""
    contract_date: date
    service_start_date: Optional[date] = None
    cutoff_day: int = 15
    plan_id: int
    status: str = "activo"
    notes: Optional[str] = ""

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    name: Optional[str] = None
    ine: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    contract_date: Optional[date] = None
    service_start_date: Optional[date] = None
    cutoff_day: Optional[int] = None
    plan_id: Optional[int] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    client_id: str
    monthly_cost: float
    annual_cost: Optional[float] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    plan: Optional[PlanResponse] = None

    class Config:
        from_attributes = True

class ClientListResponse(BaseModel):
    id: int
    client_id: str
    name: str
    phone: Optional[str] = ""
    plan_name: Optional[str] = ""
    monthly_cost: float
    status: str
    cutoff_day: int

    class Config:
        from_attributes = True


# ============ PAYMENTS ============

class PaymentBase(BaseModel):
    date: date
    amount: float
    method: str = "efectivo"  # efectivo, transferencia, tarjeta
    status: str = "pagado"  # pagado, pendiente, vencido
    notes: Optional[str] = ""

class PaymentCreate(PaymentBase):
    pass

class PaymentResponse(PaymentBase):
    id: int
    client_id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ ASSETS ============

class AssetBase(BaseModel):
    name: str
    description: Optional[str] = ""
    acquisition_date: date
    approximate_value: float
    status: str = "bueno"  # nuevo, bueno, regular, malo
    notes: Optional[str] = ""

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    acquisition_date: Optional[date] = None
    approximate_value: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class AssetResponse(AssetBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ CASH ============

class CashMovementBase(BaseModel):
    date: date
    type: str  # ingreso, egreso
    concept: str
    amount: float
    notes: Optional[str] = ""

class CashMovementCreate(CashMovementBase):
    type: str = ""  # Auto-set by route (ingreso/egreso)

class CashMovementResponse(CashMovementBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class CashRegisterResponse(BaseModel):
    current_funds: float
    movements: List[CashMovementResponse]


# ============ HISTORY ============

class HistoryResponse(BaseModel):
    id: int
    date: date
    time: str
    user: str
    type: str
    description: str
    amount: Optional[float] = None
    balance_after: Optional[float] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ SETTINGS ============

class SettingResponse(BaseModel):
    company_name: str = "Mi ISP"
    company_logo: str = ""
    company_address: str = ""
    company_phone: str = ""
    company_email: str = ""
    currency: str = "MXN"

class SettingUpdate(BaseModel):
    company_name: Optional[str] = None
    company_logo: Optional[str] = None
    company_address: Optional[str] = None
    company_phone: Optional[str] = None
    company_email: Optional[str] = None
    currency: Optional[str] = None


# ============ DASHBOARD ============

class UpcomingPayment(BaseModel):
    client_id: str
    client_name: str
    cutoff_day: int
    amount: float
    days_remaining: int

class DashboardResponse(BaseModel):
    cash_funds: float
    monthly_income: float
    yearly_income: float
    total_assets: float
    total_capital: float
    active_clients: int
    suspended_clients: int
    delinquent_clients: int
    total_clients: int
    upcoming_payments: List[UpcomingPayment]
