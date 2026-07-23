"""
SQLAlchemy models for the ISP Management System.
Each class represents a database table.
"""

from datetime import datetime, date
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, Date, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    """System user for authentication."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    role = Column(String(20), default="admin")  # admin, user
    created_at = Column(DateTime, default=datetime.utcnow)


class Plan(Base):
    """Internet service plans offered by the ISP."""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    speed = Column(String(50), nullable=False)
    monthly_price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    clients = relationship("Client", back_populates="plan")


class Client(Base):
    """ISP clients with service details."""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(20), unique=True, nullable=False)
    name = Column(String(200), nullable=False)
    ine = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    contract_date = Column(Date, nullable=False)
    service_start_date = Column(Date, nullable=True)
    cutoff_day = Column(Integer, nullable=False, default=15)
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    monthly_cost = Column(Float, nullable=False)
    annual_cost = Column(Float, nullable=True)
    status = Column(String(20), default="activo")
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    plan = relationship("Plan", back_populates="clients")
    payments = relationship("Payment", back_populates="client", cascade="all, delete-orphan")


class Payment(Base):
    """Client payment records."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(20), nullable=False)
    status = Column(String(20), default="pagado")
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", back_populates="payments")


class Asset(Base):
    """Company assets (equipment, vehicles, etc.) — focus on value tracking."""
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    acquisition_date = Column(Date, nullable=False)
    purchase_price = Column(Float, nullable=False)  # price paid
    sale_price = Column(Float, nullable=True)  # approximate current sale value
    useful_life_years = Column(Integer, nullable=True)  # expected useful life in years
    quantity = Column(Integer, default=1)
    unit = Column(String(50), default="piezas")
    category = Column(String(100), nullable=True)  # Equipo de red, Herramienta, Vehiculo, etc.
    status = Column(String(20), default="bueno")
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Liability(Base):
    """Company liabilities (debts, loans, obligations)."""
    __tablename__ = "liabilities"

    id = Column(Integer, primary_key=True, index=True)
    concept = Column(String(200), nullable=False)
    creditor = Column(String(200), nullable=True)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0)
    monthly_payment = Column(Float, nullable=True)
    due_date = Column(Date, nullable=True)
    interest_rate = Column(Float, nullable=True)
    status = Column(String(20), default="activo")  # activo, pagado, vencido
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)



class CashMovement(Base):
    """Cash register movements (income and expenses)."""
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)
    concept = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class History(Base):
    """General history log tracking all system movements."""
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    time = Column(String(10), nullable=False)
    user = Column(String(50), nullable=False)
    type = Column(String(30), nullable=False)
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=True)
    balance_after = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class ProviderPayment(Base):
    """Payments made to providers/suppliers, linked to liabilities."""
    __tablename__ = "provider_payments"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    creditor = Column(String(200), nullable=False)
    liability_id = Column(Integer, nullable=True)
    amount = Column(Float, nullable=False)
    concept = Column(String(300), nullable=True)
    method = Column(String(20), default="efectivo")
    status = Column(String(20), default="pagado")
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)



class Setting(Base):
    """System settings and configuration."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Expense(Base):
    """Recurring operational expenses (gastos fijos programados)."""
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True, index=True)
    concept = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)  # Servicios, Mantenimiento, Suministros, etc.
    provider = Column(String(200), nullable=True)
    amount = Column(Float, nullable=False)
    frequency = Column(String(20), nullable=False)  # mensual, trimestral, semestral, anual,18meses
    payment_day = Column(Integer, nullable=True)  # day of month (1-31)
    start_date = Column(Date, nullable=False)
    last_paid_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    payments = relationship("ExpensePayment", back_populates="expense", cascade="all, delete-orphan")


class ExpensePayment(Base):
    """Individual payment record for an expense (gasto registrado/pagado)."""
    __tablename__ = "expense_payments"

    id = Column(Integer, primary_key=True, index=True)
    expense_id = Column(Integer, ForeignKey("expenses.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(20), default="efectivo")  # efectivo, transferencia, tarjeta
    concept = Column(String(300), nullable=True)
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    expense = relationship("Expense", back_populates="payments")


class Income(Base):
    """Income records — tracks which client paid, linked to CashMovement."""
    __tablename__ = "incomes"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=True)  # which client paid
    client_name = Column(String(200), nullable=True)  # denormalized for quick display
    amount = Column(Float, nullable=False)
    concept = Column(String(300), nullable=True)  # what the payment is for
    method = Column(String(20), default="efectivo")  # efectivo, transferencia, tarjeta
    cash_movement_id = Column(Integer, nullable=True)  # linked CashMovement
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    client = relationship("Client", foreign_keys=[client_id])


class InventoryItem(Base):
    """Inventory items — stock control with min/max tracking."""
    __tablename__ = "inventory_items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    category = Column(String(100), nullable=True)  # Router, ONT, Cable, Herramienta, Suministro
    sku = Column(String(50), nullable=True)  # internal code
    unit = Column(String(50), default="piezas")
    current_stock = Column(Integer, default=0)
    min_stock = Column(Integer, default=0)
    max_stock = Column(Integer, nullable=True)
    unit_cost = Column(Float, default=0)
    location = Column(String(200), nullable=True)  # where stored
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    movements = relationship("InventoryMovement", back_populates="item", cascade="all, delete-orphan")


class InventoryMovement(Base):
    """Stock movements — entries and exits for inventory items."""
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    item_id = Column(Integer, ForeignKey("inventory_items.id"), nullable=False)
    type = Column(String(20), nullable=False)  # entrada, salida
    quantity = Column(Integer, nullable=False)
    date = Column(Date, nullable=False)
    concept = Column(String(300), nullable=True)
    reference = Column(String(200), nullable=True)  # invoice #, work order, etc.
    notes = Column(Text, nullable=True)
    cash_movement_id = Column(Integer, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    item = relationship("InventoryItem", back_populates="movements")
