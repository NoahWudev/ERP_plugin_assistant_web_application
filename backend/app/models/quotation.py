from __future__ import annotations

import uuid
from typing import TYPE_CHECKING, Any

from sqlalchemy import ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, new_uuid

if TYPE_CHECKING:
    from app.models.team import Team
    from app.models.user import User


class Quotation(Base, TimestampMixin):
    __tablename__ = "quotations"
    __table_args__ = (
        Index("ix_quotations_team_status", "team_id", "status"),
        Index("ix_quotations_team_no", "team_id", "quotation_no"),
        Index("ix_quotations_owner", "owner_user_id"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=new_uuid)
    team_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("teams.id", ondelete="CASCADE"))
    owner_user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="RESTRICT"))
    updated_by_user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    quotation_no: Mapped[str] = mapped_column(String(50), nullable=False)
    date: Mapped[str] = mapped_column(String(10), nullable=False)
    valid_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    payment_terms: Mapped[str] = mapped_column(Text, nullable=False, default="")

    sales_name: Mapped[str] = mapped_column(String(100), nullable=False)
    sales_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    sales_email: Mapped[str | None] = mapped_column(String(255), nullable=True)

    customer_name: Mapped[str] = mapped_column(String(255), nullable=False, default="")
    customer_contact: Mapped[str] = mapped_column(String(100), nullable=False, default="")
    customer_phone: Mapped[str] = mapped_column(String(50), nullable=False, default="")
    customer_tax_id: Mapped[str] = mapped_column(String(20), nullable=False, default="")
    customer_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    customer_address: Mapped[str | None] = mapped_column(Text, nullable=True)

    items: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, nullable=False, default=list)
    currency: Mapped[str] = mapped_column(String(3), nullable=False, default="TWD")
    discount: Mapped[float] = mapped_column(Numeric(18, 2), nullable=False, default=0)
    tax_type: Mapped[str] = mapped_column(String(20), nullable=False, default="TAXABLE")
    remark: Mapped[str] = mapped_column(Text, nullable=False, default="")
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")

    team: Mapped[Team] = relationship(back_populates="quotations")
    owner: Mapped[User] = relationship(back_populates="owned_quotations", foreign_keys=[owner_user_id])
