from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import hash_password
from app.database import get_db
from app.deps import CurrentUser, require_admin
from app.models import Role, Team, TeamMember, User
from app.schemas.auth import (
    AddTeamMemberRequest,
    CreateTeamRequest,
    CreateUserRequest,
    RoleSummary,
    UpdateUserRequest,
    UserSummary,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])


async def _team_ids_for_user(db: AsyncSession, user_id: UUID) -> list[UUID]:
    result = await db.execute(select(TeamMember.team_id).where(TeamMember.user_id == user_id))
    return [row[0] for row in result.all()]


def _user_summary(user: User, team_ids: list[UUID]) -> UserSummary:
    permissions = sorted({perm.code for role in user.roles for perm in role.permissions})
    return UserSummary(
        id=user.id,
        username=user.username,
        display_name=user.display_name,
        roles=[role.code for role in user.roles],
        permissions=permissions,
        team_ids=team_ids,
        is_active=user.is_active,
        phone=user.phone,
        email=user.email,
    )


async def _load_user(db: AsyncSession, user_id: UUID) -> User | None:
    result = await db.execute(
        select(User).where(User.id == user_id).options(selectinload(User.roles).selectinload(Role.permissions))
    )
    return result.scalar_one_or_none()


@router.get("/roles", response_model=list[RoleSummary])
async def list_roles(
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> list[RoleSummary]:
    result = await db.execute(select(Role).options(selectinload(Role.permissions)).order_by(Role.code))
    return [
        RoleSummary(
            code=role.code,
            name=role.name,
            permissions=sorted(perm.code for perm in role.permissions),
        )
        for role in result.scalars().all()
    ]


@router.get("/users", response_model=list[UserSummary])
async def list_users(
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> list[UserSummary]:
    result = await db.execute(select(User).options(selectinload(User.roles).selectinload(Role.permissions)))
    summaries: list[UserSummary] = []
    for user in result.scalars().all():
        team_ids = await _team_ids_for_user(db, user.id)
        summaries.append(_user_summary(user, team_ids))
    return summaries


@router.post("/users", response_model=UserSummary, status_code=status.HTTP_201_CREATED)
async def create_user(
    body: CreateUserRequest,
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> UserSummary:
    existing = await db.execute(select(User).where(User.username == body.username.strip()))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="帳號已存在")

    user = User(
        username=body.username.strip(),
        password_hash=hash_password(body.password),
        display_name=body.display_name.strip(),
        phone=body.phone,
        email=body.email,
    )

    if body.role_codes:
        roles_result = await db.execute(select(Role).where(Role.code.in_(body.role_codes)))
        roles = list(roles_result.scalars().all())
        if len(roles) != len(set(body.role_codes)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="含有無效角色代碼")
        user.roles = roles

    db.add(user)
    await db.commit()
    user = await _load_user(db, user.id)
    assert user is not None
    team_ids = await _team_ids_for_user(db, user.id)
    return _user_summary(user, team_ids)


@router.patch("/users/{user_id}", response_model=UserSummary)
async def update_user(
    user_id: UUID,
    body: UpdateUserRequest,
    current: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> UserSummary:
    user = await _load_user(db, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到使用者")

    if body.display_name is not None:
        user.display_name = body.display_name.strip()
    if body.phone is not None:
        user.phone = body.phone or None
    if body.email is not None:
        user.email = body.email or None
    if body.password is not None:
        user.password_hash = hash_password(body.password)
    if body.is_active is not None:
        if user.id == current.id and not body.is_active:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="無法停用自己的帳號")
        user.is_active = body.is_active
    if body.role_codes is not None:
        roles_result = await db.execute(select(Role).where(Role.code.in_(body.role_codes)))
        roles = list(roles_result.scalars().all())
        if len(roles) != len(set(body.role_codes)):
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="含有無效角色代碼")
        user.roles = roles

    await db.commit()
    user = await _load_user(db, user_id)
    assert user is not None
    team_ids = await _team_ids_for_user(db, user.id)
    return _user_summary(user, team_ids)


@router.get("/teams", response_model=list[dict])
async def list_teams(
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(select(Team).order_by(Team.name))
    teams = result.scalars().all()
    output: list[dict] = []
    for team in teams:
        members_result = await db.execute(
            select(TeamMember, User)
            .join(User, User.id == TeamMember.user_id)
            .where(TeamMember.team_id == team.id)
        )
        members = [
            {
                "user_id": str(user.id),
                "username": user.username,
                "display_name": user.display_name,
                "role_in_team": member.role_in_team,
            }
            for member, user in members_result.all()
        ]
        output.append({"id": str(team.id), "name": team.name, "members": members})
    return output


@router.post("/teams", response_model=dict, status_code=status.HTTP_201_CREATED)
async def create_team(
    body: CreateTeamRequest,
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> dict:
    team = Team(name=body.name.strip())
    db.add(team)
    await db.commit()
    await db.refresh(team)
    return {"id": str(team.id), "name": team.name}


@router.post("/teams/{team_id}/members", status_code=status.HTTP_201_CREATED)
async def add_team_member(
    team_id: UUID,
    body: AddTeamMemberRequest,
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> dict[str, str]:
    team = await db.get(Team, team_id)
    if team is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到小組")

    user = await db.get(User, body.user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到使用者")

    existing = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == body.user_id)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="成員已在該小組")

    member = TeamMember(team_id=team_id, user_id=body.user_id, role_in_team=body.role_in_team)
    db.add(member)
    await db.commit()
    return {"status": "ok"}


@router.delete("/teams/{team_id}/members/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_team_member(
    team_id: UUID,
    user_id: UUID,
    _: CurrentUser = Depends(require_admin()),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(TeamMember).where(TeamMember.team_id == team_id, TeamMember.user_id == user_id)
    )
    member = result.scalar_one_or_none()
    if member is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到小組成員")
    await db.delete(member)
    await db.commit()
