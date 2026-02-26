from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime
from enum import Enum


class EventType(str, Enum):
    LOGIN = "login"
    LOGOUT = "logout"
    PAGE_VIEW = "page_view"
    VIDEO_PLAY = "video_play"
    VIDEO_COMPLETE = "video_complete"
    QUIZ_START = "quiz_start"
    QUIZ_SUBMIT = "quiz_submit"
    ASSIGNMENT_SUBMIT = "assignment_submit"
    FORUM_POST = "forum_post"
    FORUM_REPLY = "forum_reply"
    RESOURCE_DOWNLOAD = "resource_download"
    CONTENT_INTERACTION = "content_interaction"


class EventCreate(BaseModel):
    """
    Event from LMS frontend → LMS backend.
    We can either send student_id directly, or send lms_user_id and let backend
    look up the mapped EduMind student_id.
    """
    event_type: EventType
    event_timestamp: datetime
    session_id: Optional[str] = None
    event_data: Dict[str, Any] = Field(default_factory=dict)

    # One of these must be provided:
    student_id: Optional[str] = Field(
        default=None, description="EduMind student_id (e.g. STU0001)"
    )
    lms_user_id: Optional[int] = Field(
        default=None, description="LMS user id (we will map to EduMind student_id)"
    )