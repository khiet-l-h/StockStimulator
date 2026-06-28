from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, EmailStr, field_validator


class SignupRequest(BaseModel):
    email: EmailStr
    password: str

    @field_validator("password")
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class GoogleAuthRequest(BaseModel):
    access_token: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    is_active: bool

    model_config = {"from_attributes": True}


class MeResponse(BaseModel):
    id: UUID
    email: str
    is_active: bool
    cash_balance: Decimal

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
