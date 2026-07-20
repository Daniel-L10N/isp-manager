"""
ISP Management System - Main Application Entry Point
FastAPI application with CORS, auth, and all route registrations.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import init_db, SessionLocal
from app.auth import init_default_user, init_default_settings
from app.scheduler import start_scheduler, shutdown_scheduler

app = FastAPI(
    title="ISP Manager",
    description="Sistema de Administración para Empresas de Internet",
    version="1.0.0",
)

# CORS configuration - allows frontend to access the API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    """Initialize database, default user, and default settings on startup."""
    init_db()
    db = SessionLocal()
    try:
        init_default_user(db)
        init_default_settings(db)
    finally:
        db.close()
    start_scheduler()


@app.on_event("shutdown")
def on_shutdown():
    """Shut down the SMS reminder scheduler on application shutdown."""
    shutdown_scheduler()


# Register route modules
from app.routes import auth, dashboard, clients, plans, assets, cash, history, settings, whatsapp, sms

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(clients.router, prefix="/api/clients", tags=["Clients"])
app.include_router(plans.router, prefix="/api/plans", tags=["Plans"])
app.include_router(assets.router, prefix="/api/assets", tags=["Assets"])
app.include_router(cash.router, prefix="/api/cash", tags=["Cash"])
app.include_router(history.router, prefix="/api/history", tags=["History"])
app.include_router(settings.router, prefix="/api/settings", tags=["Settings"])
app.include_router(whatsapp.router, prefix="/api/whatsapp", tags=["WhatsApp"])
app.include_router(sms.router, prefix="/api/sms", tags=["SMS"])


@app.get("/api/health")
def health_check():
    """Health check endpoint."""
    return {"status": "ok"}
