from decimal import Decimal

from pydantic import BaseModel


class Quote(BaseModel):
    ticker: str
    price: Decimal
    change: Decimal
    change_pct: Decimal
    volume: int
    latest_trading_day: str


class PriceBar(BaseModel):
    date: str  # ISO date string — chart display only, floats acceptable here
    open: float
    high: float
    low: float
    close: float
    volume: int


class CompanyOverview(BaseModel):
    ticker: str
    name: str
    market_cap: int | None = None
    week_52_high: Decimal | None = None
    week_52_low: Decimal | None = None
    description: str | None = None
    sector: str | None = None
    industry: str | None = None


class SearchResult(BaseModel):
    symbol: str
    name: str
    type: str
    region: str
