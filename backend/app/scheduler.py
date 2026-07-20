"""
SMS Reminder Scheduler for ISP Manager.
Runs a daily job to send payment reminder SMS to clients approaching their cutoff day.
"""

import asyncio
import logging
from datetime import datetime

from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.cron import CronTrigger
from zoneinfo import ZoneInfo

from app.database import SessionLocal
from app.models import Client, Setting, Plan
from app.sms_client import get_sms_client, format_message

logger = logging.getLogger(__name__)

scheduler = BackgroundScheduler(timezone=ZoneInfo("America/Mexico_City"))


def _get_setting_value(db, key: str, default: str = "") -> str:
    """Read a setting value from the database."""
    setting = db.query(Setting).filter(Setting.key == key).first()
    if setting is None:
        return default
    return setting.value or default


def _send_reminders():
    """Core job: check settings and send reminder SMS to eligible clients."""
    db = SessionLocal()
    try:
        sms_enabled = _get_setting_value(db, "sms_enabled", "false")
        if sms_enabled.lower() != "true":
            logger.info("SMS reminders skipped: sms_enabled is false")
            return

        reminders_enabled = _get_setting_value(db, "sms_reminders_enabled", "false")
        if reminders_enabled.lower() != "true":
            logger.info("SMS reminders skipped: sms_reminders_enabled is false")
            return

        sms_client = get_sms_client()
        if sms_client is None:
            logger.warning("SMS reminders skipped: SMS client not configured")
            return

        reminder_days_str = _get_setting_value(db, "sms_reminder_days", "3")
        try:
            reminder_days = int(reminder_days_str)
        except (ValueError, TypeError):
            reminder_days = 3

        reminder_template = _get_setting_value(db, "sms_message_reminder", "")
        if not reminder_template:
            logger.warning("SMS reminders skipped: sms_message_reminder template is empty")
            return

        today = datetime.now().day
        clients = db.query(Client).filter(Client.status == "activo", Client.is_active == True).all()

        loop = asyncio.new_event_loop()
        try:
            for client in clients:
                if not client.phone:
                    continue

                cutoff_day = client.cutoff_day or 15
                days_until_cutoff = (cutoff_day - today) % 30

                if 0 < days_until_cutoff <= reminder_days:
                    plan = db.query(Plan).filter(Plan.id == client.plan_id).first()
                    client_data = {
                        "name": client.name,
                        "phone": client.phone,
                        "monthly_cost": client.monthly_cost,
                        "cutoff_day": cutoff_day,
                        "days_until_cutoff": days_until_cutoff,
                        "plan_name": plan.name if plan else "",
                        "plan_speed": plan.speed if plan else "",
                        "status": client.status,
                    }
                    message = format_message(reminder_template, client_data)
                    result = loop.run_until_complete(
                        sms_client.send(phone=client.phone, message=message)
                    )
                    if result.get("success"):
                        logger.info("Reminder sent to %s (%s)", client.name, client.phone)
                    else:
                        logger.warning(
                            "Failed to send reminder to %s: %s",
                            client.name,
                            result.get("error"),
                        )
        finally:
            loop.close()
    except Exception:
        logger.exception("Error in SMS reminder job")
    finally:
        db.close()


def start_scheduler():
    """Initialize and start the APScheduler with the daily SMS reminder job."""
    scheduler.add_job(
        _send_reminders,
        trigger=CronTrigger(hour=9, minute=0, timezone=ZoneInfo("America/Mexico_City")),
        id="sms_daily_reminders",
        name="Daily SMS Payment Reminders",
        replace_existing=True,
    )
    scheduler.start()
    logger.info("SMS reminder scheduler started (daily at 09:00 Mexico City)")


def shutdown_scheduler():
    """Gracefully shut down the scheduler."""
    if scheduler.running:
        scheduler.shutdown(wait=False)
        logger.info("SMS reminder scheduler stopped")
