from datetime import datetime
from decimal import Decimal
from math import ceil
from uuid import UUID

from pydantic import BaseModel, field_validator


class TradeRequest(BaseModel):
    ticker: str
    side: str
    quantity: int

    @field_validator("ticker")
    @classmethod
    def ticker_normalise(cls, v: str) -> str:
        v = v.strip().upper()
        if not v:
            raise ValueError("Ticker is required")
        return v

    @field_validator("side")
    @classmethod
    def side_validate(cls, v: str) -> str:
        v = v.strip().upper()
        if v not in ("BUY", "SELL"):
            raise ValueError("Side must be BUY or SELL")
        return v

    @field_validator("quantity")
    @classmethod
    def quantity_positive(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("Quantity must be a positive whole number")
        return v


class TradeHistoryItem(BaseModel):
    id: UUID
    ticker: str
    side: str
    quantity: int
    price: Decimal
    total_value: Decimal
    executed_at: datetime
    realized_pnl: Decimal | None

    model_config = {"from_attributes": True}


class TradeResponse(TradeHistoryItem):
    """Returned immediately after execution; includes updated cash balance."""

    cash_balance: Decimal


class TradesPage(BaseModel):
    items: list[TradeHistoryItem]
    total: int
    page: int
    limit: int
    pages: int


class PositionDetail(BaseModel):
    """Lightweight position info for the trade ticket (no live price fetch)."""

    ticker: str
    quantity: int
    average_cost: Decimal

    model_config = {"from_attributes": True}


class PositionSnapshot(BaseModel):
    """Full position snapshot with live market valuation."""

    ticker: str
    quantity: int
    average_cost: Decimal
    current_price: Decimal
    market_value: Decimal
    unrealized_pnl: Decimal
    unrealized_pnl_pct: Decimal


class PortfolioSnapshot(BaseModel):
    cash_balance: Decimal
    positions: list[PositionSnapshot]
    total_positions_value: Decimal
    total_portfolio_value: Decimal
    total_return: Decimal
    total_return_pct: Decimal
