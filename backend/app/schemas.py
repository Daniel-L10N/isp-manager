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
    role: str = "user"


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
    purchase_price: float
    sale_price: Optional[float] = None
    useful_life_years: Optional[int] = None
    quantity: int = 1
    unit: str = "piezas"
    category: Optional[str] = ""
    status: str = "bueno"
    notes: Optional[str] = ""

class AssetCreate(AssetBase):
    pass

class AssetUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    acquisition_date: Optional[date] = None
    purchase_price: Optional[float] = None
    sale_price: Optional[float] = None
    useful_life_years: Optional[int] = None
    quantity: Optional[int] = None
    unit: Optional[str] = None
    category: Optional[str] = None
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




# ============ LIABILITIES ============

class LiabilityBase(BaseModel):
    concept: str
    creditor: Optional[str] = ""
    total_amount: float
    paid_amount: float = 0
    monthly_payment: Optional[float] = None
    due_date: Optional[date] = None
    interest_rate: Optional[float] = None
    status: str = "activo"
    notes: Optional[str] = ""

class LiabilityCreate(LiabilityBase):
    pass

class LiabilityUpdate(BaseModel):
    concept: Optional[str] = None
    creditor: Optional[str] = None
    total_amount: Optional[float] = None
    paid_amount: Optional[float] = None
    monthly_payment: Optional[float] = None
    due_date: Optional[date] = None
    interest_rate: Optional[float] = None
    status: Optional[str] = None
    notes: Optional[str] = None

class LiabilityResponse(LiabilityBase):
    id: int
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class LiabilitySummary(BaseModel):
    total_debt: float
    total_paid: float
    total_remaining: float
    active_count: int


# ============ PROVIDER PAYMENTS ============

class ProviderPaymentBase(BaseModel):
    date: date
    creditor: str
    liability_id: Optional[int] = None
    amount: float
    concept: Optional[str] = ""
    method: str = "efectivo"
    status: str = "pagado"
    notes: Optional[str] = ""

class ProviderPaymentCreate(ProviderPaymentBase):
    pass

class ProviderPaymentResponse(ProviderPaymentBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ EXPENSES ============

class ExpenseBase(BaseModel):
    concept: str
    category: str
    provider: Optional[str] = ""
    amount: float
    frequency: str  # mensual, trimestral, semestral, anual, 18meses
    payment_day: Optional[int] = None
    start_date: date
    notes: Optional[str] = ""

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseUpdate(BaseModel):
    concept: Optional[str] = None
    category: Optional[str] = None
    provider: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    payment_day: Optional[int] = None
    start_date: Optional[date] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

class ExpenseResponse(ExpenseBase):
    id: int
    last_paid_date: Optional[date] = None
    is_active: bool
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExpenseWithNext(ExpenseResponse):
    next_due_date: Optional[date] = None
    is_overdue: bool = False
    total_paid: float = 0
    payment_count: int = 0

class ExpensePaymentBase(BaseModel):
    expense_id: int
    date: date
    amount: float
    method: str = "efectivo"
    concept: Optional[str] = ""
    notes: Optional[str] = ""

class ExpensePaymentCreate(ExpensePaymentBase):
    pass

class ExpensePaymentResponse(ExpensePaymentBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExpenseSummary(BaseModel):
    total_monthly: float
    total_active: int
    total_overdue: int
    total_paid_year: float
    categories: dict

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
    expected_monthly_income: float
    expected_yearly_income: float
    total_assets: float
    total_capital: float
    active_clients: int
    suspended_clients: int
    delinquent_clients: int
    total_clients: int
    upcoming_payments: List[UpcomingPayment]


# ============ PROFIT / UTILIDAD ============

class ProfitDetailItem(BaseModel):
    client_name: str = ""
    category: str = ""
    method: str = ""
    date: date
    concept: str
    amount: float
    notes: str = ""

class ProfitResponse(BaseModel):
    period: str
    start_date: date
    end_date: date
    total_income: float
    total_expenses: float
    net_profit: float
    margin_percent: float
    income_count: int
    expense_count: int
    income_items: List[ProfitDetailItem]
    expense_items: List[ProfitDetailItem]


# ============ INCOMES (REGISTRO DE INGRESOS) ============

class IncomeBase(BaseModel):
    date: date
    client_id: Optional[int] = None
    client_name: Optional[str] = ""
    amount: float
    concept: Optional[str] = ""
    method: str = "efectivo"
    notes: Optional[str] = ""

class IncomeCreate(IncomeBase):
    pass

class IncomeResponse(IncomeBase):
    id: int
    cash_movement_id: Optional[int] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


# ============ INVENTORY ============

class InventoryItemBase(BaseModel):
    name: str
    description: Optional[str] = ""
    category: Optional[str] = ""
    sku: Optional[str] = ""
    unit: str = "piezas"
    current_stock: int = 0
    min_stock: int = 0
    max_stock: Optional[int] = None
    unit_cost: float = 0
    location: Optional[str] = ""
    notes: Optional[str] = ""

class InventoryItemCreate(InventoryItemBase):
    pass

class InventoryItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    sku: Optional[str] = None
    unit: Optional[str] = None
    min_stock: Optional[int] = None
    max_stock: Optional[int] = None
    unit_cost: Optional[float] = None
    location: Optional[str] = None
    notes: Optional[str] = None

class InventoryItemResponse(InventoryItemBase):
    id: int
    is_active: bool
    is_low: bool = False  # computed: current_stock <= min_stock
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InventoryMovementBase(BaseModel):
    item_id: int
    type: str  # entrada, salida
    quantity: int
    date: date
    concept: Optional[str] = ""
    reference: Optional[str] = ""
    notes: Optional[str] = ""

class InventoryMovementCreate(InventoryMovementBase):
    pass

class InventoryMovementResponse(InventoryMovementBase):
    id: int
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class InventorySummary(BaseModel):
    total_items: int
    total_stock_value: float
    low_stock_count: int
    total_movements_today: int
