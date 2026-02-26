"""
One-time seed: one LMS user and one mapping to EduMind student_id.
Run from project root: python scripts/seed_one_user.py
"""
import sys
from pathlib import Path

# So we can import app
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.core.database import SessionLocal, init_db
from app.models import User, UserEdumindMapping

# Simple hash for demo only (use proper hashing in Phase 3)
def simple_hash(password: str) -> str:
    return password + "_hashed"

def main():
    init_db()
    db = SessionLocal()
    try:
        # Create user if not exists
        user = db.query(User).filter(User.username == "student1").first()
        if not user:
            user = User(
                username="student1",
                password_hash=simple_hash("password123"),
                display_name="Student One",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
            print(f"Created user: id={user.id}, username={user.username}")
        else:
            print(f"User exists: id={user.id}, username={user.username}")

        # Create mapping if not exists
        mapping = db.query(UserEdumindMapping).filter(UserEdumindMapping.lms_user_id == user.id).first()
        if not mapping:
            mapping = UserEdumindMapping(
                lms_user_id=user.id,
                edumind_student_id="STU0001",
            )
            db.add(mapping)
            db.commit()
            print(f"Created mapping: LMS user {user.id} -> EduMind STU0001")
        else:
            print(f"Mapping exists: LMS user {user.id} -> {mapping.edumind_student_id}")
    finally:
        db.close()

if __name__ == "__main__":
    main()