from __future__ import annotations

from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field


QuotationStatus = Literal["DRAFT", "SENT", "ACCEPTED", "REJECTED"]
TaxType = Literal["TAXABLE", "TAX_FREE", "ZERO_TAX"]
QuotationCurrency = Literal["TWD", "USD"]


class QuotationItemSchema(BaseModel):
    id: str
    name: str
    spec: str = ""
    qty: float
    unit: str = "件"
    price: float = 0
    subtotal: float = 0
    remark: str | None = None


class QuotationSchema(BaseModel):
    id: UUID
    team_id: UUID | None = None
    owner_user_id: UUID | None = None
    quotation_no: str
    date: str
    valid_days: int
    payment_terms: str
    sales_name: str
    sales_phone: str | None = None
    sales_email: str | None = None
    customer_name: str
    customer_contact: str
    customer_phone: str
    customer_tax_id: str
    customer_email: str | None = None
    customer_address: str | None = None
    items: list[QuotationItemSchema]
    currency: QuotationCurrency
    discount: float
    tax_type: TaxType
    remark: str
    status: QuotationStatus


class QuotationCreateRequest(BaseModel):
    quotation_no: str
    date: str
    valid_days: int = 30
    payment_terms: str = ""
    sales_name: str
    sales_phone: str | None = None
    sales_email: str | None = None
    customer_name: str = ""
    customer_contact: str = ""
    customer_phone: str = ""
    customer_tax_id: str = ""
    customer_email: str | None = None
    customer_address: str | None = None
    items: list[dict[str, Any]] = Field(default_factory=list)
    currency: QuotationCurrency = "TWD"
    discount: float = 0
    tax_type: TaxType = "TAXABLE"
    remark: str = ""
    status: QuotationStatus = "DRAFT"


class QuotationUpdateRequest(QuotationCreateRequest):
    pass


class CustomerPresetSchema(BaseModel):
    id: UUID
    company_name: str
    contact_name: str
    phone: str
    email: str | None = None
    tax_id: str
    address: str | None = None


class CustomerPresetCreateRequest(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: str | None = None
    tax_id: str = ""
    address: str | None = None


class LocalMigrateRequest(BaseModel):
    current_quotation: dict[str, Any] | None = None
    customer_presets: list[dict[str, Any]] = Field(default_factory=list)
    drafts_history: list[dict[str, Any]] = Field(default_factory=list)
