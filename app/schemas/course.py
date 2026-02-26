from pydantic import BaseModel, Field
from typing import Optional, List


class CourseCreate(BaseModel):
    title: str = Field(..., max_length=200)
    description: Optional[str] = None


class CourseResponse(BaseModel):
    id: int
    title: str
    description: Optional[str] = None

    class Config:
        from_attributes = True


class CourseList(BaseModel):
    courses: List[CourseResponse]
    total: int