"""
Database configuration and session management.
SQLite with SQLAlchemy ORM - auto-creates tables on first run.
"""

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# Database file path - stored in backend directory
DB_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(DB_DIR, "isp_manager.db")

# SQLite connection URL with check_same_thread=False for FastAPI multi-threading
DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False,  # Set to True for SQL query logging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables if they don't exist. Called on startup."""
    import app.models  # noqa: F401 - Import models to register them with Base
    Base.metadata.create_all(bind=engine)
