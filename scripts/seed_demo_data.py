"""
Seed demo data: users, courses, and realistic activity events.

Events are sent through the LMS API -> engagement tracker -> auto-aggregation,
so after running this the EduMind dashboard will have real data.

Usage:
    cd C:\\Projects\\edumind\\LMS
    venv\\Scripts\\activate
    python scripts/seed_demo_data.py
"""
import sys
import random
from pathlib import Path
from datetime import datetime, timedelta

import httpx

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, init_db
from app.models import User, Course, UserEdumindMapping

LMS_API = "http://localhost:8010/api"
ENGAGEMENT_API = "http://localhost:8005"

STUDENTS = [
    {"username": "student1", "display": "Alice Fernando", "edumind": "STU0001", "password": "password123"},
    {"username": "student2", "display": "Bob Perera",     "edumind": "STU0002", "password": "password123"},
    {"username": "student3", "display": "Carol Silva",    "edumind": "STU0003", "password": "password123"},
    {"username": "student4", "display": "David Kumar",    "edumind": "STU0004", "password": "password123"},
    {"username": "student5", "display": "Eva Rajapaksha", "edumind": "STU0005", "password": "password123"},
]

COURSES = [
    {"title": "Introduction to Programming", "description": "Learn Python basics, variables, loops, and functions."},
    {"title": "Data Structures & Algorithms", "description": "Arrays, linked lists, trees, sorting, and searching."},
    {"title": "Database Management Systems",  "description": "SQL, normalization, indexing, and transactions."},
]

EVENT_TYPES = [
    "login", "page_view", "page_view", "page_view",
    "video_play", "video_complete",
    "quiz_start", "quiz_submit",
    "forum_post", "forum_reply",
    "assignment_submit", "resource_download", "content_interaction",
]


def simple_hash(password: str) -> str:
    return password + "_hashed"


def seed_users_and_courses():
    """Create LMS users, courses, and EduMind mappings in the LMS database."""
    init_db()
    db = SessionLocal()
    try:
        for s in STUDENTS:
            user = db.query(User).filter(User.username == s["username"]).first()
            if not user:
                user = User(username=s["username"], password_hash=simple_hash(s["password"]), display_name=s["display"])
                db.add(user)
                db.commit()
                db.refresh(user)
                print(f"  Created user: {user.username} (id={user.id})")
            else:
                print(f"  User exists: {user.username} (id={user.id})")

            mapping = db.query(UserEdumindMapping).filter(UserEdumindMapping.lms_user_id == user.id).first()
            if not mapping:
                mapping = UserEdumindMapping(lms_user_id=user.id, edumind_student_id=s["edumind"])
                db.add(mapping)
                db.commit()
                print(f"    Mapped -> {s['edumind']}")

        for c in COURSES:
            course = db.query(Course).filter(Course.title == c["title"]).first()
            if not course:
                course = Course(title=c["title"], description=c["description"])
                db.add(course)
                db.commit()
                print(f"  Created course: {course.title}")
            else:
                print(f"  Course exists: {course.title}")
    finally:
        db.close()


def send_event_direct(student_id: str, event_type: str, ts: datetime, session_id: str):
    """Send event directly to the engagement tracker API (bypasses LMS backend)."""
    url = f"{ENGAGEMENT_API}/api/v1/events/ingest"
    payload = {
        "student_id": student_id,
        "event_type": event_type,
        "event_timestamp": ts.isoformat(),
        "session_id": session_id,
        "event_data": {"source": "seed_script"},
        "source_service": "minimal-lms",
    }
    with httpx.Client(timeout=10.0) as client:
        resp = client.post(url, json=payload)
        resp.raise_for_status()


def generate_events(days: int = 14):
    """Generate realistic activity events for all students across the past N days."""
    now = datetime.utcnow()
    total = 0

    for s in STUDENTS:
        sid = s["edumind"]
        # Give each student a different activity level
        activity_level = random.uniform(0.4, 1.0)

        for day_offset in range(days, 0, -1):
            day = now - timedelta(days=day_offset)
            # Some students skip some days
            if random.random() > activity_level + 0.2:
                continue

            session_id = f"sess-{sid}-{day.strftime('%Y%m%d')}"
            base_hour = random.randint(8, 20)
            events_today = random.randint(3, 15)

            # Always start with a login
            ts = day.replace(hour=base_hour, minute=0, second=0, microsecond=0)
            try:
                send_event_direct(sid, "login", ts, session_id)
                total += 1
            except Exception as e:
                print(f"  WARN: failed sending login for {sid} on {day.date()}: {e}")
                continue

            for i in range(events_today - 1):
                ts = ts + timedelta(minutes=random.randint(1, 15))
                etype = random.choice(EVENT_TYPES)
                try:
                    send_event_direct(sid, etype, ts, session_id)
                    total += 1
                except Exception as e:
                    print(f"  WARN: event failed: {e}")

        print(f"  {sid} ({s['display']}): events sent")

    print(f"\nTotal events sent: {total}")


def trigger_aggregation():
    """Call the backfill endpoint so all events get aggregated."""
    url = f"{ENGAGEMENT_API}/api/v1/aggregation/process-all?days=14"
    print("\nTriggering aggregation backfill...")
    try:
        with httpx.Client(timeout=60.0) as client:
            resp = client.post(url)
            resp.raise_for_status()
            data = resp.json()
            print(f"  Processed: {data.get('processed', 0)}, Errors: {data.get('errors', 0)}")
    except Exception as e:
        print(f"  Aggregation call failed: {e}")
        print("  (You can run it manually later: POST http://localhost:8005/api/v1/aggregation/process-all?days=14)")


def trigger_learning_style_sync():
    """Sync engagement data into the learning-style service for each student."""
    ls_api = "http://localhost:8006"
    print("\nSyncing learning-style behavior data...")
    for s in STUDENTS:
        sid = s["edumind"]
        url = f"{ls_api}/api/v1/sync/from-engagement/{sid}?days=14"
        try:
            with httpx.Client(timeout=15.0) as client:
                resp = client.post(url)
                resp.raise_for_status()
                data = resp.json()
                print(f"  {sid}: {data.get('behaviour_rows_written', 0)} rows synced")
        except Exception as e:
            print(f"  {sid}: sync failed ({e})")


if __name__ == "__main__":
    print("=" * 60)
    print("  DEMO DATA SEEDER")
    print("=" * 60)

    print("\n1. Seeding LMS users, courses, and mappings...")
    seed_users_and_courses()

    print("\n2. Generating activity events (14 days)...")
    print("   (Requires engagement-tracker running on :8005)")
    try:
        generate_events(days=14)
    except Exception as e:
        print(f"  Event generation failed: {e}")
        print("  Make sure the engagement-tracker service is running on port 8005.")
        sys.exit(1)

    print("\n3. Triggering aggregation backfill...")
    trigger_aggregation()

    print("\n4. Syncing to learning-style service...")
    print("   (Requires learning-style service running on :8006)")
    trigger_learning_style_sync()

    print("\n" + "=" * 60)
    print("  DONE! Your demo data is ready.")
    print("=" * 60)
    print("\nNext steps:")
    print("  - Open LMS:     http://localhost:8010/frontend/index.html")
    print("  - Open EduMind: http://localhost:5174")
    print("  - Admin login:  admin / admin")
    print("  - Student login: STU0001 (or any STU000x)")
