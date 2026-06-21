"""
Event correlation service — detects significant price moves and attaches news.

Uses OHLCV data already available from the market data service (no new provider).
"""

import logging
from datetime import date, timedelta

from app.schemas.news import EventsResponse, SignificantMoveEvent
from app.services.market_data import (
    MarketDataUnavailableError,
    TickerNotFoundError,
    get_daily_history,
    get_overview,
)
from app.services.news_data import NEWS_WINDOW_DAYS, get_company_news, news_available_from

logger = logging.getLogger(__name__)

DEFAULT_THRESHOLD_PCT = 5.0   # |daily % change| that qualifies as a significant move
_TOP_N = 10                   # maximum events returned to keep the response manageable
_NEWS_BEFORE_DAYS = 1         # include headlines from this many days before the move
_NEWS_AFTER_DAYS = 2          # include headlines from this many days after the move

_NEWS_UNAVAILABLE_REASON = (
    f"Historical news headlines are not available for this period. "
    f"The current data plan (NewsAPI free tier) only covers approximately "
    f"the last {NEWS_WINDOW_DAYS} days."
)


def detect_significant_moves(
    ticker: str,
    range_: str = "1Y",
    threshold_pct: float = DEFAULT_THRESHOLD_PCT,
) -> EventsResponse:
    """
    Identify the largest daily price moves for a ticker over the given range.

    For moves within the news window, real headlines are attached.
    For older moves, the event is included but news_available=False is set with
    an honest explanation — no fabrication, no silent omission.

    Raises:
        TickerNotFoundError  — propagated from market data service
        MarketDataUnavailableError — propagated from market data service
    """
    ticker = ticker.upper()

    bars = get_daily_history(ticker, range_)

    if len(bars) < 2:
        return EventsResponse(
            ticker=ticker,
            time_range=range_,
            threshold_pct=threshold_pct,
            events=[],
        )

    # Best-effort company name fetch for richer news search queries.
    # Non-fatal: if overview is unavailable, the ticker string alone is used.
    company_name: str | None = None
    try:
        company_name = get_overview(ticker).name
    except (TickerNotFoundError, MarketDataUnavailableError):
        logger.debug("Could not fetch overview for %s; ticker used for news query", ticker)

    # Compute daily % changes and collect qualifying moves
    candidates: list[tuple[float, str, float]] = []  # (pct, date_str, close)
    for i in range(1, len(bars)):
        prev_close = bars[i - 1].close
        curr_close = bars[i].close
        if prev_close == 0:
            continue
        pct = (curr_close - prev_close) / prev_close * 100.0
        if abs(pct) >= threshold_pct:
            candidates.append((pct, bars[i].date, curr_close))

    # Rank by magnitude; keep only the top N most significant moves
    candidates.sort(key=lambda x: abs(x[0]), reverse=True)
    top = candidates[:_TOP_N]

    # Return newest-first so the consumer sees recent history at the top
    top.sort(key=lambda x: x[1], reverse=True)

    cutoff = news_available_from()
    events: list[SignificantMoveEvent] = []

    for pct, date_str, close_price in top:
        event_date = date.fromisoformat(date_str)
        direction = "up" if pct > 0 else "down"

        if event_date >= cutoff:
            from_date = event_date - timedelta(days=_NEWS_BEFORE_DAYS)
            to_date = event_date + timedelta(days=_NEWS_AFTER_DAYS)
            headlines = get_company_news(ticker, company_name, from_date, to_date)
            events.append(
                SignificantMoveEvent(
                    date=date_str,
                    percent_change=round(pct, 2),
                    direction=direction,
                    close_price=round(close_price, 2),
                    news_available=True,
                    headlines=headlines,
                )
            )
        else:
            events.append(
                SignificantMoveEvent(
                    date=date_str,
                    percent_change=round(pct, 2),
                    direction=direction,
                    close_price=round(close_price, 2),
                    news_available=False,
                    news_unavailable_reason=_NEWS_UNAVAILABLE_REASON,
                    headlines=[],
                )
            )

    return EventsResponse(
        ticker=ticker,
        time_range=range_,
        threshold_pct=threshold_pct,
        events=events,
    )
