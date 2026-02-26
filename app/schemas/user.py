from pydantic import BaseModel, Field
from typing import Optional


class LoginRequest(BaseModel):
    username: str = Field(..., max_length=50)
    password: str = Field(..., min_length=3, max_length=100)


class UserResponse(BaseModel):
    id: int
    username: str
    display_name: Optional[str] = None

    class Config:
        from_attributes = True


class LoginResponse(BaseModel):
    user: UserResponse
    edumind_student_id: Optional[str] = None