from datetime import datetime

from pydantic import BaseModel


class MovingAverages(BaseModel):
    sma50: float | None = None
    sma200: float | None = None
    price_vs_sma50_pct: float | None = None   # (price - sma50) / sma50 * 100
    price_vs_sma200_pct: float | None = None
    golden_cross: bool | None = None           # SMA50 > SMA200


class TechnicalIndicators(BaseModel):
    ticker: str
    current_price: float
    moving_averages: MovingAverages
    rsi_14: float | None = None
    trend_1m_pct: float | None = None
    trend_3m_pct: float | None = None
    trend_6m_pct: float | None = None
    volatility_30d_annualized: float | None = None  # annualized, in percent
    bars_available: int


class KeyFactor(BaseModel):
    factor: str                # indicator or evidence name
    value: str                 # the actual value from the evidence ("62.4", "+8.2%")
    signal: str                # "bullish" | "bearish" | "neutral"


class EvidenceSummary(BaseModel):
    """The computed facts that were supplied to the LLM — makes the recommendation auditable."""
    current_price: float
    rsi_14: float | None = None
    sma50: float | None = None
    sma200: float | None = None
    trend_1m_pct: float | None = None
    trend_3m_pct: float | None = None
    trend_6m_pct: float | None = None
    volatility_30d: float | None = None
    events_analyzed: int
    headlines_analyzed: int
    position_included: bool
    bars_available: int


class RecommendationResponse(BaseModel):
    ticker: str
    recommendation: str       # "BUY" | "SELL" | "HOLD"
    confidence: str           # "LOW" | "MEDIUM" | "HIGH"
    rationale: str            # 2-5 sentence plain-English explanation
    key_factors: list[KeyFactor]
    evidence_summary: EvidenceSummary
    generated_at: datetime
    cached: bool = False
