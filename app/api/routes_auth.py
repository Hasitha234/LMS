from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import User, UserEdumindMapping
from app.schemas import LoginRequest, LoginResponse, UserResponse

router = APIRouter(prefix="/auth", tags=["Auth"])


def hash_password(password: str) -> str:
    """
    Demo hash – MUST match what you used in scripts/seed_one_user.py.
    There we stored password_hash = password + "_hashed".
    """
    return password + "_hashed"


@router.post("/login", response_model=LoginResponse)
def login(credentials: LoginRequest, db: Session = Depends(get_db)):
    """
    Simple login:
    - Checks username + password.
    - Returns user info + mapped EduMind student_id (if mapping exists).
    """
    user = db.query(User).filter(User.username == credentials.username).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if user.password_hash != hash_password(credentials.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    mapping = (
        db.query(UserEdumindMapping)
        .filter(UserEdumindMapping.lms_user_id == user.id)
        .first()
    )
    edumind_student_id = mapping.edumind_student_id if mapping else None

    return LoginResponse(
        user=UserResponse.model_validate(user),
        edumind_student_id=edumind_student_id,
    )


@router.get("/users", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    """
    Helper endpoint to see all users (dev only).
    """
    users = db.query(User).all()
    return [UserResponse.model_validate(u) for u in users]