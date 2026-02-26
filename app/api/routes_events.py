from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import UserEdumindMapping
from app.schemas import EventCreate, EventType
from app.services.engagement_forwarder import send_event_to_engagement_tracker

router = APIRouter(prefix="/events", tags=["Events"])


@router.post("/", status_code=status.HTTP_201_CREATED)
def record_event(event: EventCreate, db: Session = Depends(get_db)):
    """
    Receive an event from the LMS frontend and forward it to EduMind Engagement Tracker.

    How we decide the student id to send:
    - If event.student_id is provided: use it directly (already an EduMind student_id).
    - Else if event.lms_user_id is provided: look up mapping to get edumind_student_id.
    - Else: return 400 (we don't know who the student is).
    """
    student_id: str | None = None

    if event.student_id:
        student_id = event.student_id
    elif event.lms_user_id is not None:
        mapping = (
            db.query(UserEdumindMapping)
            .filter(UserEdumindMapping.lms_user_id == event.lms_user_id)
            .first()
        )
        if not mapping:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"No EduMind mapping found for LMS user id {event.lms_user_id}",
            )
        student_id = mapping.edumind_student_id

    if not student_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either student_id or lms_user_id must be provided.",
        )

    # Forward to engagement-tracker
    try:
        et_response = send_event_to_engagement_tracker(
            student_id=student_id,
            event_type=event.event_type.value,
            event_timestamp=event.event_timestamp,
            session_id=event.session_id,
            event_data=event.event_data,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to send event to engagement tracker: {e}",
        )

    return {
        "status": "success",
        "student_id": student_id,
        "forwarded_to": "engagement-tracker",
        "engagement_tracker_response": et_response,
    }