from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import create_access_token, hash_password, verify_password
from app.config import get_settings
from app.database import get_db
from app.deps import CurrentUser, get_current_user
from app.models import Role, User
from app.schemas.auth import LoginRequest, UserSummary

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=UserSummary)
async def login(
    body: LoginRequest,
    response: Response,
    db: AsyncSession = Depends(get_db),
) -> UserSummary:
    result = await db.execute(
        select(User)
        .where(User.username == body.username.strip(), User.is_active.is_(True))
        .options(selectinload(User.roles).selectinload(Role.permissions))
    )
    user = result.scalar_one_or_none()
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="帳號或密碼錯誤")

    from app.models import TeamMember

    memberships = await db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user.id))
    team_ids = [row[0] for row in memberships.all()]

    role_codes = [role.code for role in user.roles]
    permissions = sorted({perm.code for role in user.roles for perm in role.permissions})

    token = create_access_token(
        {
            "sub": str(user.id),
            "username": user.username,
            "roles": role_codes,
            "permissions": permissions,
            "team_ids": [str(tid) for tid in team_ids],
        }
    )

    settings = get_settings()
    response.set_cookie(
        key=settings.jwt_cookie_name,
        value=token,
        httponly=True,
        samesite="lax",
        secure=settings.cookie_secure,
        max_age=settings.jwt_expire_minutes * 60,
        path="/",
    )

    return UserSummary(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=role_codes,
        permissions=permissions,
        team_ids=team_ids,
    )


@router.post("/logout")
async def logout(response: Response) -> dict[str, str]:
    settings = get_settings()
    response.delete_cookie(key=settings.jwt_cookie_name, path="/")
    return {"status": "ok"}


@router.get("/me", response_model=UserSummary)
async def me(user: CurrentUser = Depends(get_current_user)) -> UserSummary:
    return UserSummary(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=user.roles,
        permissions=user.permissions,
        team_ids=user.team_ids,
    )
