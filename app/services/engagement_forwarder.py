"""
Forward events from LMS to EduMind Engagement Tracker.
"""
from typing import Dict, Any
from datetime import datetime

import httpx

from app.core.config import settings


def send_event_to_engagement_tracker(
    student_id: str,
    event_type: str,
    event_timestamp: datetime,
    session_id: str | None = None,
    event_data: Dict[str, Any] | None = None,
    source_service: str = "minimal-lms",
) -> Dict[str, Any]:
    """
    Sends a single event to service-engagement-tracker's /api/v1/events/ingest endpoint.
    """
    if event_data is None:
        event_data = {}

    url = f"{settings.ENGAGEMENT_TRACKER_URL}/api/v1/events/ingest"

    payload = {
        "student_id": student_id,
        "event_type": event_type,
        "event_timestamp": event_timestamp.isoformat(),
        "session_id": session_id,
        "event_data": event_data,
        "source_service": source_service,
    }

    with httpx.Client(timeout=5.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()
        return resp.json()