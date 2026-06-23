from __future__ import annotations

from dataclasses import dataclass, field
from uuid import UUID

from fastapi import Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import decode_access_token
from app.config import get_settings
from app.database import get_db
from app.models import Role, TeamMember, User


@dataclass
class CurrentUser:
    id: UUID
    username: str
    display_name: str
    roles: list[str] = field(default_factory=list)
    permissions: list[str] = field(default_factory=list)
    team_ids: list[UUID] = field(default_factory=list)

    def has_permission(self, code: str) -> bool:
        if "admin" in self.roles:
            return True
        return code in self.permissions

    def can_access_team(self, team_id: UUID) -> bool:
        if "admin" in self.roles:
            return True
        return team_id in self.team_ids


async def get_current_user(request: Request, db: AsyncSession = Depends(get_db)) -> CurrentUser:
    settings = get_settings()
    token = request.cookies.get(settings.jwt_cookie_name)
    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="未登入")

    try:
        payload = decode_access_token(token)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登入已失效") from exc

    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="登入已失效")

    result = await db.execute(
        select(User)
        .where(User.id == UUID(str(user_id)), User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="使用者不存在或已停用")

    memberships = await db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user.id))
    team_ids = [row[0] for row in memberships.all()]

    permissions: set[str] = set()
    role_codes: list[str] = []
    for role in user.roles:
        role_codes.append(role.code)
        for perm in role.permissions:
            permissions.add(perm.code)

    return CurrentUser(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=role_codes,
        permissions=sorted(permissions),
        team_ids=team_ids,
    )


def require_permission(code: str):
    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if not user.has_permission(code):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="權限不足")
        return user

    return _checker


def require_admin():
    async def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if "admin" not in user.roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="僅管理員可存取")
        return user

    return _checker


def resolve_primary_team_id(user: CurrentUser) -> UUID:
    if not user.team_ids:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="尚未指派業務小組，請聯絡管理員",
        )
    return user.team_ids[0]
