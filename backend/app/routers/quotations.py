from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, require_permission, resolve_primary_team_id
from app.models import Quotation
from app.schemas.quotation import QuotationCreateRequest, QuotationSchema, QuotationUpdateRequest
from app.services.quotation_mapper import apply_quotation_payload, quotation_to_schema

router = APIRouter(prefix="/api/quotations", tags=["quotations"])


def _quotation_query_for_user(user: CurrentUser):
    stmt = select(Quotation).order_by(Quotation.updated_at.desc())
    if "admin" in user.roles:
        return stmt
    if user.team_ids:
        return stmt.where(Quotation.team_id.in_(user.team_ids))
    return stmt.where(False)


@router.get("", response_model=list[QuotationSchema])
async def list_quotations(
    user: CurrentUser = Depends(require_permission("quotation:read")),
    db: AsyncSession = Depends(get_db),
) -> list[QuotationSchema]:
    result = await db.execute(_quotation_query_for_user(user))
    rows = result.scalars().all()
    return [quotation_to_schema(row) for row in rows]


@router.post("", response_model=QuotationSchema, status_code=status.HTTP_201_CREATED)
async def create_quotation(
    body: QuotationCreateRequest,
    user: CurrentUser = Depends(require_permission("quotation:write")),
    db: AsyncSession = Depends(get_db),
) -> QuotationSchema:
    team_id = resolve_primary_team_id(user)
    row = Quotation(team_id=team_id, owner_user_id=user.id, updated_by_user_id=user.id)
    apply_quotation_payload(row, body.model_dump(), user.id)
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return quotation_to_schema(row)


@router.get("/{quotation_id}", response_model=QuotationSchema)
async def get_quotation(
    quotation_id: UUID,
    user: CurrentUser = Depends(require_permission("quotation:read")),
    db: AsyncSession = Depends(get_db),
) -> QuotationSchema:
    row = await _get_accessible_quotation(db, user, quotation_id)
    return quotation_to_schema(row)


@router.put("/{quotation_id}", response_model=QuotationSchema)
async def update_quotation(
    quotation_id: UUID,
    body: QuotationUpdateRequest,
    user: CurrentUser = Depends(require_permission("quotation:write")),
    db: AsyncSession = Depends(get_db),
) -> QuotationSchema:
    row = await _get_accessible_quotation(db, user, quotation_id)
    apply_quotation_payload(row, body.model_dump(), user.id)
    await db.commit()
    await db.refresh(row)
    return quotation_to_schema(row)


@router.delete("/{quotation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_quotation(
    quotation_id: UUID,
    user: CurrentUser = Depends(require_permission("quotation:delete")),
    db: AsyncSession = Depends(get_db),
) -> None:
    row = await _get_accessible_quotation(db, user, quotation_id)
    await db.delete(row)
    await db.commit()


async def _get_accessible_quotation(db: AsyncSession, user: CurrentUser, quotation_id: UUID) -> Quotation:
    result = await db.execute(_quotation_query_for_user(user).where(Quotation.id == quotation_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到報價單")
    return row
