from datetime import date
from decimal import Decimal

from sqlalchemy import BigInteger, Date, Index, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PriceBar(Base):
    """
    Persistent price bar cache — second layer behind Redis.
    Composite PK (ticker, date) makes upserts idempotent.
    Wired up in the trading chunk when analytics need reliable bar history.
    """

    __tablename__ = "price_bars"
    __table_args__ = (Index("ix_price_bars_ticker_date", "ticker", "date"),)

    ticker: Mapped[str] = mapped_column(String(20), primary_key=True, nullable=False)
    date: Mapped[date] = mapped_column(Date, primary_key=True, nullable=False)
    open: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    high: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    low: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    close: Mapped[Decimal] = mapped_column(Numeric(20, 6), nullable=False)
    volume: Mapped[int] = mapped_column(BigInteger, nullable=False)
