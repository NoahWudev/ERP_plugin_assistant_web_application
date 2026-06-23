#!/usr/bin/env python3
"""建立角色、權限與初始 admin 帳號。"""

from __future__ import annotations

import asyncio
import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import hash_password
from app.database import async_session_factory, engine
from app.models import Permission, Role, Team, TeamMember, User
from ly_erp.config import load_env_file

load_env_file(ROOT / ".env")

ROLES = [
    ("sales", "業務"),
    ("sales_assistant", "業務助理"),
    ("procurement", "採購"),
    ("finance", "財務"),
    ("engineering", "工程部"),
    ("admin", "管理員"),
]

PERMISSIONS = [
    ("quotation:read", "讀取報價單"),
    ("quotation:write", "建立與編輯報價單"),
    ("quotation:delete", "刪除報價單"),
    ("quotation:export", "匯出報價單"),
    ("preset:read", "讀取快選資料"),
    ("preset:write", "編輯快選資料"),
    ("erp:search", "搜尋凌越貨品"),
    ("user:manage", "管理使用者"),
    ("team:manage", "管理業務小組"),
]

SALES_PERMISSIONS = {
    "quotation:read",
    "quotation:write",
    "quotation:delete",
    "quotation:export",
    "preset:read",
    "preset:write",
    "erp:search",
}

ADMIN_PERMISSIONS = {code for code, _ in PERMISSIONS}


async def seed() -> None:
    admin_password = os.environ.get("ADMIN_INITIAL_PASSWORD", "admin12345")
    admin_username = os.environ.get("ADMIN_INITIAL_USERNAME", "admin")
    admin_display = os.environ.get("ADMIN_INITIAL_DISPLAY_NAME", "系統管理員")

    async with async_session_factory() as db:
        perm_map: dict[str, Permission] = {}
        for code, description in PERMISSIONS:
            existing = await db.execute(select(Permission).where(Permission.code == code))
            perm = existing.scalar_one_or_none()
            if perm is None:
                perm = Permission(code=code, description=description)
                db.add(perm)
            perm_map[code] = perm

        role_map: dict[str, Role] = {}
        for code, name in ROLES:
            existing = await db.execute(
                select(Role).where(Role.code == code).options(selectinload(Role.permissions))
            )
            role = existing.scalar_one_or_none()
            if role is None:
                role = Role(code=code, name=name)
                db.add(role)
            role_map[code] = role

        await db.flush()

        async def load_role(code: str) -> Role:
            result = await db.execute(
                select(Role).where(Role.code == code).options(selectinload(Role.permissions))
            )
            return result.scalar_one()

        for code in ("sales", "sales_assistant"):
            role = await load_role(code)
            role.permissions = [perm_map[p] for p in SALES_PERMISSIONS if p in perm_map]

        admin_role = await load_role("admin")
        admin_role.permissions = [perm_map[p] for p in ADMIN_PERMISSIONS if p in perm_map]

        result = await db.execute(select(User).where(User.username == admin_username))
        admin_user = result.scalar_one_or_none()
        if admin_user is None:
            admin_user = User(
                username=admin_username,
                password_hash=hash_password(admin_password),
                display_name=admin_display,
                is_active=True,
            )
            admin_user.roles = [admin_role]
            db.add(admin_user)
            await db.flush()

            demo_team = Team(name="示範業務組")
            db.add(demo_team)
            await db.flush()
            db.add(TeamMember(team_id=demo_team.id, user_id=admin_user.id, role_in_team="lead"))

        await db.commit()
        print(f"Seed 完成。admin 帳號：{admin_username}")


async def main() -> None:
    await seed()
    await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
