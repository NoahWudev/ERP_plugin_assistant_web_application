from __future__ import annotations

from uuid import UUID

from app.models import CustomerPreset, Quotation
from app.schemas.quotation import (
    CustomerPresetSchema,
    QuotationItemSchema,
    QuotationSchema,
)


def quotation_to_schema(row: Quotation) -> QuotationSchema:
    items = [QuotationItemSchema.model_validate(item) for item in (row.items or [])]
    return QuotationSchema(
        id=row.id,
        team_id=row.team_id,
        owner_user_id=row.owner_user_id,
        quotation_no=row.quotation_no,
        date=row.date,
        valid_days=row.valid_days,
        payment_terms=row.payment_terms,
        sales_name=row.sales_name,
        sales_phone=row.sales_phone,
        sales_email=row.sales_email,
        customer_name=row.customer_name,
        customer_contact=row.customer_contact,
        customer_phone=row.customer_phone,
        customer_tax_id=row.customer_tax_id,
        customer_email=row.customer_email,
        customer_address=row.customer_address,
        items=items,
        currency=row.currency,  # type: ignore[arg-type]
        discount=float(row.discount),
        tax_type=row.tax_type,  # type: ignore[arg-type]
        remark=row.remark,
        status=row.status,  # type: ignore[arg-type]
    )


def customer_preset_to_schema(row: CustomerPreset) -> CustomerPresetSchema:
    return CustomerPresetSchema(
        id=row.id,
        company_name=row.company_name,
        contact_name=row.contact_name,
        phone=row.phone,
        email=row.email,
        tax_id=row.tax_id,
        address=row.address,
    )


def apply_quotation_payload(row: Quotation, payload: dict, user_id: UUID | None = None) -> None:
    row.quotation_no = payload["quotation_no"]
    row.date = payload["date"]
    row.valid_days = payload.get("valid_days", 30)
    row.payment_terms = payload.get("payment_terms", "")
    row.sales_name = payload["sales_name"]
    row.sales_phone = payload.get("sales_phone")
    row.sales_email = payload.get("sales_email")
    row.customer_name = payload.get("customer_name", "")
    row.customer_contact = payload.get("customer_contact", "")
    row.customer_phone = payload.get("customer_phone", "")
    row.customer_tax_id = payload.get("customer_tax_id", "")
    row.customer_email = payload.get("customer_email")
    row.customer_address = payload.get("customer_address")
    row.items = payload.get("items", [])
    row.currency = payload.get("currency", "TWD")
    row.discount = payload.get("discount", 0)
    row.tax_type = payload.get("tax_type", "TAXABLE")
    row.remark = payload.get("remark", "")
    row.status = payload.get("status", "DRAFT")
    if user_id is not None:
        row.updated_by_user_id = user_id
