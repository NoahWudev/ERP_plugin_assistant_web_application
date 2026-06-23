from __future__ import annotations

from uuid import UUID

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=1)


class UserSummary(BaseModel):
    id: UUID
    username: str
    display_name: str
    roles: list[str]
    permissions: list[str]
    team_ids: list[UUID]
    is_active: bool = True
    phone: str | None = None
    email: str | None = None


class CreateUserRequest(BaseModel):
    username: str = Field(min_length=3, max_length=50)
    password: str = Field(min_length=8)
    display_name: str = Field(min_length=1, max_length=100)
    phone: str | None = None
    email: str | None = None
    role_codes: list[str] = Field(default_factory=list)


class UpdateUserRequest(BaseModel):
    display_name: str | None = Field(default=None, min_length=1, max_length=100)
    phone: str | None = None
    email: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role_codes: list[str] | None = None
    is_active: bool | None = None


class RoleSummary(BaseModel):
    code: str
    name: str
    permissions: list[str]


class CreateTeamRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)


class AddTeamMemberRequest(BaseModel):
    user_id: UUID
    role_in_team: str = Field(default="assistant", pattern="^(lead|assistant)$")
