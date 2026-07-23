"""
Authentication module.
Handles JWT token creation, verification, and password hashing.
Default credentials: admin / L10Nstad
Second user: trabajo / Trabajo*123 (role: user)
"""

from datetime import datetime, timedelta
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User

SECRET_KEY = "isp-manager-secret-key-change-in-production"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o expirado",
            headers={"WWW-Authenticate": "Bearer"},
        )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db),
) -> User:
    payload = verify_token(credentials.credentials)
    username = payload.get("sub")
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido",
        )
    user = db.query(User).filter(User.username == username, User.is_active == True).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Usuario no encontrado",
        )
    return user


def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency that requires admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requieren permisos de administrador",
        )
    return current_user


def init_default_user(db: Session):
    """Create default users if none exist."""
    user = db.query(User).first()
    if user is None:
        # Admin user
        admin_user = User(
            username="admin",
            hashed_password=hash_password("L10Nstad"),
            is_active=True,
            role="admin",
        )
        db.add(admin_user)
        # Normal user
        normal_user = User(
            username="trabajo",
            hashed_password=hash_password("Trabajo*123"),
            is_active=True,
            role="user",
        )
        db.add(normal_user)
        db.commit()


def init_default_settings(db: Session):
    """Create default settings if none exist."""
    from app.models import Setting
    defaults = {
        "company_name": "Mi ISP",
        "company_logo": "",
        "company_address": "",
        "company_phone": "",
        "company_email": "",
        "currency": "MXN",
    }
    for key, value in defaults.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing is None:
            setting = Setting(key=key, value=value)
            db.add(setting)

    sms_defaults = {
        "sms_enabled": "false",
        "sms_url": "http://localhost:3000",
        "sms_api_key": "",
        "sms_reminders_enabled": "false",
        "sms_cutoff_enabled": "false",
        "sms_suspension_enabled": "false",
        "sms_payment_enabled": "false",
        "sms_reminder_days": "3",
        "sms_message_reminder": "Estimado {nombre}, le recordamos que su pago de ${monto} vence el día {fecha_corte}. Tiene {dias_restantes} días para regularizar. Su plan: {plan} ({velocidad}).",
        "sms_message_cutoff": "{nombre}, su servicio será cortado mañana por falta de pago. Monto: ${monto}. Plan: {plan} ({velocidad}). Para evitar la suspensión, realice su pago hoy.",
        "sms_message_suspension": "{nombre}, su servicio ha sido suspendido por falta de pago. Monto adeudado: ${monto}. Plan: {plan} ({velocidad}). Para reactivar su servicio, contacte atención al cliente.",
        "sms_message_payment": "{nombre}, hemos recibido su pago de ${monto}. Su servicio está activo. Gracias por su preferencia.",
    }
    for key, value in sms_defaults.items():
        existing = db.query(Setting).filter(Setting.key == key).first()
        if existing is None:
            setting = Setting(key=key, value=value)
            db.add(setting)

    db.commit()
