import enum
import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, Enum, ForeignKey, Index, Integer, Numeric, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class TradeSide(str, enum.Enum):
    BUY = "BUY"
    SELL = "SELL"


class Trade(Base):
    """Immutable ledger entry. Never updated after creation."""

    __tablename__ = "trades"
    __table_args__ = (Index("ix_trades_portfolio_executed", "portfolio_id", "executed_at"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    side: Mapped[TradeSide] = mapped_column(Enum(TradeSide, name="tradeside"), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    price: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    total_value: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    executed_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, nullable=False)
    realized_pnl: Mapped[Decimal | None] = mapped_column(Numeric(20, 6), nullable=True)


class Position(Base):
    """Maintained aggregate of open shares for one ticker in one portfolio."""

    __tablename__ = "positions"
    __table_args__ = (
        UniqueConstraint("portfolio_id", "ticker", name="uq_position_portfolio_ticker"),
    )

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    portfolio_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("portfolios.id"), nullable=False
    )
    ticker: Mapped[str] = mapped_column(String(20), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, nullable=False)
    # Weighted average cost basis per share — updated on every buy, unchanged on sells
    average_cost: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
