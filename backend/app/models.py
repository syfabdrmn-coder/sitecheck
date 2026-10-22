from datetime import date, datetime

from sqlalchemy import CheckConstraint, Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

# These tables match database/schema.sql. Keep the two in sync if you change one.


class Site(Base):
    __tablename__ = "sites"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    location: Mapped[str] = mapped_column(String(120))
    contractor: Mapped[str] = mapped_column(String(120), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    inspections: Mapped[list["Inspection"]] = relationship(
        back_populates="site", cascade="all, delete-orphan", passive_deletes=True
    )


class Inspection(Base):
    __tablename__ = "inspections"
    __table_args__ = (
        CheckConstraint(
            "category IN ('safety', 'structural', 'electrical', 'plumbing')", name="inspections_category_check"
        ),
        CheckConstraint("result IN ('pass', 'fail')", name="inspections_result_check"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    site_id: Mapped[int] = mapped_column(ForeignKey("sites.id", ondelete="CASCADE"), index=True)
    inspector: Mapped[str] = mapped_column(String(120))
    category: Mapped[str] = mapped_column(String(20))
    result: Mapped[str] = mapped_column(String(10))
    notes: Mapped[str] = mapped_column(Text, default="")
    inspected_on: Mapped[date] = mapped_column(Date, server_default=func.current_date())
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    site: Mapped[Site] = relationship(back_populates="inspections")
