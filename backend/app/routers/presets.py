from __future__ import annotations

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, require_permission, resolve_primary_team_id
from app.models import CustomerPreset
from app.schemas.quotation import (
    CustomerPresetCreateRequest,
    CustomerPresetSchema,
)
from app.services.quotation_mapper import customer_preset_to_schema

router = APIRouter(prefix="/api/presets", tags=["presets"])


@router.get("/customers", response_model=list[CustomerPresetSchema])
async def list_customer_presets(
    user: CurrentUser = Depends(require_permission("preset:read")),
    db: AsyncSession = Depends(get_db),
) -> list[CustomerPresetSchema]:
    team_id = resolve_primary_team_id(user)
    result = await db.execute(
        select(CustomerPreset).where(CustomerPreset.team_id == team_id).order_by(CustomerPreset.created_at.desc())
    )
    return [customer_preset_to_schema(row) for row in result.scalars().all()]


@router.post("/customers", response_model=CustomerPresetSchema, status_code=status.HTTP_201_CREATED)
async def create_customer_preset(
    body: CustomerPresetCreateRequest,
    user: CurrentUser = Depends(require_permission("preset:write")),
    db: AsyncSession = Depends(get_db),
) -> CustomerPresetSchema:
    team_id = resolve_primary_team_id(user)
    row = CustomerPreset(
        team_id=team_id,
        company_name=body.company_name,
        contact_name=body.contact_name,
        phone=body.phone,
        email=body.email,
        tax_id=body.tax_id,
        address=body.address,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return customer_preset_to_schema(row)


@router.delete("/customers/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_customer_preset(
    preset_id: UUID,
    user: CurrentUser = Depends(require_permission("preset:write")),
    db: AsyncSession = Depends(get_db),
) -> None:
    team_id = resolve_primary_team_id(user)
    result = await db.execute(
        select(CustomerPreset).where(CustomerPreset.id == preset_id, CustomerPreset.team_id == team_id)
    )
    row = result.scalar_one_or_none()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="找不到客戶快選")
    await db.delete(row)
    await db.commit()
