from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.deps import CurrentUser, require_permission, resolve_primary_team_id
from app.models import CustomerPreset, Quotation
from app.schemas.quotation import LocalMigrateRequest
from app.services.quotation_mapper import apply_quotation_payload

router = APIRouter(prefix="/api/migrate", tags=["migrate"])


@router.post("/local")
async def migrate_local_storage(
    body: LocalMigrateRequest,
    user: CurrentUser = Depends(require_permission("quotation:write")),
    db: AsyncSession = Depends(get_db),
) -> dict[str, int]:
    team_id = resolve_primary_team_id(user)
    imported_quotations = 0
    imported_customers = 0

    for draft in body.drafts_history:
        payload = _normalize_legacy_quotation(draft)
        row = Quotation(team_id=team_id, owner_user_id=user.id, updated_by_user_id=user.id)
        apply_quotation_payload(row, payload, user.id)
        db.add(row)
        imported_quotations += 1

    if body.current_quotation and (
        _normalize_legacy_quotation(body.current_quotation).get("customer_name")
        or _normalize_legacy_quotation(body.current_quotation).get("quotation_no")
    ):
        payload = _normalize_legacy_quotation(body.current_quotation)
        if payload.get("quotation_no"):
            row = Quotation(team_id=team_id, owner_user_id=user.id, updated_by_user_id=user.id)
            apply_quotation_payload(row, payload, user.id)
            db.add(row)
            imported_quotations += 1

    for item in body.customer_presets:
        db.add(
            CustomerPreset(
                team_id=team_id,
                company_name=item.get("companyName", ""),
                contact_name=item.get("contactName", ""),
                phone=item.get("phone", ""),
                email=item.get("email"),
                tax_id=item.get("taxId", ""),
                address=item.get("address"),
            )
        )
        imported_customers += 1

    await db.commit()
    return {
        "quotations": imported_quotations,
        "customer_presets": imported_customers,
    }


def _normalize_legacy_quotation(data: dict) -> dict:
    def pick(*keys: str, default=None):
        for key in keys:
            if key in data and data[key] is not None:
                return data[key]
        return default

    return {
        "quotation_no": pick("quotation_no", "quotationNo", default=""),
        "date": pick("date", default=""),
        "valid_days": pick("valid_days", "validDays", default=30),
        "payment_terms": pick("payment_terms", "paymentTerms", default=""),
        "sales_name": pick("sales_name", "salesName", default=""),
        "sales_phone": pick("sales_phone", "salesPhone"),
        "sales_email": pick("sales_email", "salesEmail"),
        "customer_name": pick("customer_name", "customerName", default=""),
        "customer_contact": pick("customer_contact", "customerContact", default=""),
        "customer_phone": pick("customer_phone", "customerPhone", default=""),
        "customer_tax_id": pick("customer_tax_id", "customerTaxId", default=""),
        "customer_email": pick("customer_email", "customerEmail"),
        "customer_address": pick("customer_address", "customerAddress"),
        "items": pick("items", default=[]),
        "currency": pick("currency", default="TWD"),
        "discount": pick("discount", default=0),
        "tax_type": pick("tax_type", "taxType", default="TAXABLE"),
        "remark": pick("remark", default=""),
        "status": pick("status", default="DRAFT"),
    }
