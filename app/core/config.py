"""
Configuration for Minimal LMS.
Reads from environment variables or .env file.
"""
from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    """Application settings."""

    # Server
    PORT: int = 8010

    # EduMind Engagement Tracker – where we send events
    ENGAGEMENT_TRACKER_URL: str = "http://localhost:8005"

    # Database – SQLite by default (use .env for PostgreSQL later)
    DATABASE_URL: str = "sqlite:///./lms.db"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()