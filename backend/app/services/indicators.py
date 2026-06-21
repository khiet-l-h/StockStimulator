"""
Technical indicators — pure computation from historical OHLCV bars.

No external I/O: every value here is a derived fact, not a forecast.
These serve as the grounded, auditable evidence base for the AI recommendation.
"""

import math
import statistics

from app.schemas.recommendation import MovingAverages, TechnicalIndicators
from app.schemas.stocks import PriceBar


def _sma(closes: list[float], period: int) -> float | None:
    if len(closes) < period:
        return None
    return sum(closes[-period:]) / period


def _rsi(closes: list[float], period: int = 14) -> float | None:
    """RSI with Wilder's smoothing. Returns None if fewer than period+1 bars available."""
    if len(closes) < period + 1:
        return None

    gains: list[float] = []
    losses: list[float] = []
    for i in range(1, len(closes)):
        delta = closes[i] - closes[i - 1]
        gains.append(max(delta, 0.0))
        losses.append(max(-delta, 0.0))

    # Seed: simple average of the first `period` changes
    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    # Wilder's exponential smoothing over remaining bars
    for i in range(period, len(gains)):
        avg_gain = (avg_gain * (period - 1) + gains[i]) / period
        avg_loss = (avg_loss * (period - 1) + losses[i]) / period

    if avg_loss == 0:
        return 100.0
    return 100.0 - (100.0 / (1.0 + avg_gain / avg_loss))


def _trend(closes: list[float], bars_back: int) -> float | None:
    """% change from `bars_back` periods ago to today. None if not enough history."""
    if len(closes) <= bars_back:
        return None
    past = closes[-(bars_back + 1)]
    current = closes[-1]
    if past == 0:
        return None
    return (current - past) / past * 100.0


def _annualized_volatility(closes: list[float], window: int = 30) -> float | None:
    """
    Standard deviation of daily log returns over `window` bars, annualized to a year.
    Returns a percentage (e.g., 24.3 means 24.3% annualized volatility).
    """
    if len(closes) < window + 1:
        return None
    recent = closes[-(window + 1):]
    log_returns = [
        math.log(recent[i] / recent[i - 1])
        for i in range(1, len(recent))
        if recent[i - 1] > 0 and recent[i] > 0
    ]
    if len(log_returns) < 2:
        return None
    return statistics.stdev(log_returns) * math.sqrt(252) * 100.0


def compute_indicators(ticker: str, bars: list[PriceBar]) -> TechnicalIndicators:
    """
    Compute the full indicator set from a list of OHLCV bars (oldest → newest).
    All values are rounded to a reasonable precision for display and LLM consumption.
    Returns partial indicators when history is insufficient (None for unavailable fields).
    """
    closes = [b.close for b in bars]

    if not closes:
        return TechnicalIndicators(
            ticker=ticker,
            current_price=0.0,
            moving_averages=MovingAverages(),
            bars_available=0,
        )

    current_price = closes[-1]

    sma50 = _sma(closes, 50)
    sma200 = _sma(closes, 200)

    p_vs_50 = ((current_price - sma50) / sma50 * 100.0) if sma50 is not None else None
    p_vs_200 = ((current_price - sma200) / sma200 * 100.0) if sma200 is not None else None
    golden_cross = (sma50 > sma200) if (sma50 is not None and sma200 is not None) else None

    rsi_val = _rsi(closes)
    trend_1m = _trend(closes, 21)    # ~1 month of trading days
    trend_3m = _trend(closes, 63)    # ~3 months
    trend_6m = _trend(closes, 126)   # ~6 months
    vol = _annualized_volatility(closes, 30)

    return TechnicalIndicators(
        ticker=ticker,
        current_price=round(current_price, 4),
        moving_averages=MovingAverages(
            sma50=round(sma50, 4) if sma50 is not None else None,
            sma200=round(sma200, 4) if sma200 is not None else None,
            price_vs_sma50_pct=round(p_vs_50, 2) if p_vs_50 is not None else None,
            price_vs_sma200_pct=round(p_vs_200, 2) if p_vs_200 is not None else None,
            golden_cross=golden_cross,
        ),
        rsi_14=round(rsi_val, 2) if rsi_val is not None else None,
        trend_1m_pct=round(trend_1m, 2) if trend_1m is not None else None,
        trend_3m_pct=round(trend_3m, 2) if trend_3m is not None else None,
        trend_6m_pct=round(trend_6m, 2) if trend_6m is not None else None,
        volatility_30d_annualized=round(vol, 2) if vol is not None else None,
        bars_available=len(closes),
    )
