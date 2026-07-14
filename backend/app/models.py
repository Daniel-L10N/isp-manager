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
    created_at = Column(DateTime, default=datetime.utcnow)


class Plan(Base):
    """Internet service plans offered by the ISP."""
    __tablename__ = "plans"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    speed = Column(String(50), nullable=False)  # e.g., "50 Mbps"
    monthly_price = Column(Float, nullable=False)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    clients = relationship("Client", back_populates="plan")


class Client(Base):
    """ISP clients with service details."""
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(String(20), unique=True, nullable=False)  # Auto-generated: CLI-0001
    name = Column(String(200), nullable=False)
    ine = Column(String(50), nullable=True)
    address = Column(Text, nullable=True)
    phone = Column(String(20), nullable=True)
    email = Column(String(100), nullable=True)
    contract_date = Column(Date, nullable=False)
    service_start_date = Column(Date, nullable=True)
    cutoff_day = Column(Integer, nullable=False, default=15)  # Day of month for billing
    plan_id = Column(Integer, ForeignKey("plans.id"), nullable=False)
    monthly_cost = Column(Float, nullable=False)
    annual_cost = Column(Float, nullable=True)
    status = Column(String(20), default="activo")  # activo, suspendido, cancelado
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)  # Soft delete flag
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    plan = relationship("Plan", back_populates="clients")
    payments = relationship("Payment", back_populates="client", cascade="all, delete-orphan")


class Payment(Base):
    """Client payment records."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    date = Column(Date, nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String(20), nullable=False)  # efectivo, transferencia, tarjeta
    status = Column(String(20), default="pagado")  # pagado, pendiente, vencido
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    client = relationship("Client", back_populates="payments")


class Asset(Base):
    """Company assets (equipment, vehicles, etc.)."""
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    acquisition_date = Column(Date, nullable=False)
    approximate_value = Column(Float, nullable=False)
    status = Column(String(20), default="bueno")  # nuevo, bueno, regular, malo
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)  # Soft delete flag
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class CashMovement(Base):
    """Cash register movements (income and expenses)."""
    __tablename__ = "cash_movements"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    type = Column(String(20), nullable=False)  # ingreso, egreso
    concept = Column(String(200), nullable=False)
    amount = Column(Float, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class History(Base):
    """General history log tracking all system movements."""
    __tablename__ = "history"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    time = Column(String(10), nullable=False)  # HH:MM format
    user = Column(String(50), nullable=False)
    type = Column(String(30), nullable=False)  # ingreso, egreso, pago_cliente, compra_bien, alta_cliente, edicion, eliminacion
    description = Column(Text, nullable=False)
    amount = Column(Float, nullable=True)
    balance_after = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Setting(Base):
    """System settings and configuration."""
    __tablename__ = "settings"

    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(100), unique=True, nullable=False)
    value = Column(Text, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
