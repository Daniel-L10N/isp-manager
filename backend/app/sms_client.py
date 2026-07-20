"""
SMS Client module for ISP Manager.
Provides an HTTP client to connect to SMS Manager's external API.
Configuration is loaded from the settings table (key-value pairs).
"""

import logging
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


class SMSClient:
    """HTTP client for SMS Manager external API."""

    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.headers = {
            "X-API-Key": api_key,
            "Content-Type": "application/json",
        }

    async def health_check(self) -> dict:
        """Check if SMS Manager is reachable and healthy."""
        try:
            async with httpx.AsyncClient(timeout=5.0) as client:
                response = await client.get(
                    f"{self.base_url}/api/v1/external/health",
                    headers=self.headers,
                )
                if response.status_code == 200:
                    return {"success": True, "data": response.json()}
                return {"success": False, "error": f"HTTP {response.status_code}"}
        except Exception as e:
            logger.error("SMS health check failed: %s", e)
            return {"success": False, "error": str(e)}

    async def send(self, phone: str, message: str) -> dict:
        """Send an immediate SMS message.

        Returns:
            dict with keys: success, message_id (on success), error (on failure)
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/external/messages/send",
                    headers=self.headers,
                    json={"phone": phone, "message": message},
                )
                return response.json()
        except Exception as e:
            logger.error("SMS send failed to %s: %s", phone, e)
            return {"success": False, "error": str(e)}

    async def schedule(self, phone: str, message: str, scheduled_at: str) -> dict:
        """Schedule an SMS for later delivery.

        Args:
            phone: Recipient phone number.
            message: SMS body text.
            scheduled_at: ISO 8601 datetime string (e.g. '2026-07-20T09:00:00').

        Returns:
            dict with keys: success, job_id (on success), error (on failure)
        """
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/external/messages/schedule",
                    headers=self.headers,
                    json={
                        "phone": phone,
                        "message": message,
                        "scheduled_at": scheduled_at,
                    },
                )
                return response.json()
        except Exception as e:
            logger.error("SMS schedule failed to %s: %s", phone, e)
            return {"success": False, "error": str(e)}


def get_sms_client() -> Optional[SMSClient]:
    """Get an SMS client instance from database configuration.

    Reads sms_url and sms_api_key from the settings table.
    Returns None if not configured or if required values are missing.

    Note: Configuration is read fresh on each call so that changes
    made in the Settings UI take effect immediately.
    """
    from .database import SessionLocal
    from .models import Setting

    db = SessionLocal()
    try:
        url_setting = db.query(Setting).filter(Setting.key == "sms_url").first()
        key_setting = db.query(Setting).filter(Setting.key == "sms_api_key").first()

        if not url_setting or not key_setting or not key_setting.value:
            return None

        return SMSClient(base_url=url_setting.value, api_key=key_setting.value)
    finally:
        db.close()


def format_message(template: str, client_data: dict) -> str:
    """Replace variables in message template with client data.

    Supported variables:
        {nombre}        - Client name
        {telefono}      - Client phone number
        {monto}         - Monthly cost
        {fecha_corte}   - Cutoff day
        {dias_restantes} - Days until cutoff
        {plan}          - Plan name
        {velocidad}     - Plan speed
        {estado}        - Client status
    """
    return template.format(
        nombre=client_data.get("name", ""),
        telefono=client_data.get("phone", ""),
        monto=client_data.get("monthly_cost", 0),
        fecha_corte=client_data.get("cutoff_day", ""),
        dias_restantes=client_data.get("days_until_cutoff", ""),
        plan=client_data.get("plan_name", ""),
        velocidad=client_data.get("plan_speed", ""),
        estado=client_data.get("status", ""),
    )
