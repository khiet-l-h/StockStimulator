from datetime import datetime

from pydantic import BaseModel


class NewsArticle(BaseModel):
    title: str
    source: str
    url: str
    published_at: datetime
    description: str | None = None


class SignificantMoveEvent(BaseModel):
    date: str                          # YYYY-MM-DD; from OHLCV bar date
    percent_change: float              # rounded to 2 dp
    direction: str                     # "up" | "down"
    close_price: float                 # rounded to 2 dp
    news_available: bool               # False when date is outside the news provider window
    news_unavailable_reason: str | None = None
    headlines: list[NewsArticle]       # empty when news_available=False


class EventsResponse(BaseModel):
    ticker: str
    time_range: str
    threshold_pct: float
    events: list[SignificantMoveEvent]
