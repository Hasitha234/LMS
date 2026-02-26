"""Maps LMS user id to EduMind student_id (for sending events)."""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey
from sqlalchemy.sql import func

from app.core.database import Base


class UserEdumindMapping(Base):
    __tablename__ = "user_edumind_mapping"

    id = Column(Integer, primary_key=True, autoincrement=True)
    lms_user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, unique=True)
    edumind_student_id = Column(String(50), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())