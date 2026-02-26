from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models import Course
from app.schemas import CourseCreate, CourseResponse, CourseList

router = APIRouter(prefix="/courses", tags=["Courses"])


@router.post("/", response_model=CourseResponse, status_code=status.HTTP_201_CREATED)
def create_course(course_in: CourseCreate, db: Session = Depends(get_db)):
    """
    Create a course (for now, no auth).
    Use Postman to seed a few demo courses.
    """
    db_course = Course(title=course_in.title, description=course_in.description)
    db.add(db_course)
    db.commit()
    db.refresh(db_course)
    return db_course


@router.get("/", response_model=CourseList)
def list_courses(skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    """
    List all courses (paged).
    """
    query = db.query(Course)
    total = query.count()
    items = query.offset(skip).limit(limit).all()
    return CourseList(
        courses=[CourseResponse.model_validate(c) for c in items],
        total=total,
    )


@router.get("/{course_id}", response_model=CourseResponse)
def get_course(course_id: int, db: Session = Depends(get_db)):
    """
    Get a single course by id.
    """
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Course {course_id} not found",
        )
    return course