"""
AI recommendation service — assembles evidence and calls the Gemini API.

The LLM reasons ONLY over data the app has computed and fetched.
It must not invent statistics, price levels, or news not present in the evidence package.
"""

import json
import logging
from datetime import datetime, timezone
from uuid import UUID

import google.generativeai as genai
from sqlalchemy.orm import Session

from app.core.cache import cache_get, cache_set
from app.core.config import settings
from app.models.trade import Position
from app.models.user import Portfolio
from app.schemas.news import NewsArticle, SignificantMoveEvent
from app.schemas.recommendation import (
    EvidenceSummary,
    KeyFactor,
    RecommendationResponse,
)
from app.services.events import detect_significant_moves
from app.services.indicators import compute_indicators
from app.services.market_data import (
    MarketDataUnavailableError,
    TickerNotFoundError,
    get_daily_history,
    get_overview,
    get_quote,
)
from app.services.news_data import get_recent_news

logger = logging.getLogger(__name__)

_TTL_REC = 30 * 60    # 30 min — balances freshness vs LLM cost
_MIN_BARS = 15        # fewer than this → return error rather than waste an LLM call
_MAX_EVENTS = 5       # top events to include in evidence
_MAX_HEADLINES = 10   # recent headlines to include


class RecommendationUnavailableError(Exception):
    """LLM or configuration error that prevents recommendation generation."""


# ---------------------------------------------------------------------------
# System prompt — enforces grounding and structured output
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """\
You are an investment-research assistant for FinSim, an educational paper-trading simulation.
This is NOT real financial advice. You assist users in understanding market data for learning purposes only.

CRITICAL RULES — follow without exception:
1. Reason ONLY over the evidence package in the user message. Never use your training-memory knowledge about this company, its products, industry trends, or past events not mentioned in the evidence.
2. Do NOT invent or estimate any statistics, price levels, dates, earnings figures, or news that are not explicitly stated in the evidence.
3. If a data point is marked "unavailable", treat it as truly unknown — do not assume, guess, or interpolate.
4. If the available evidence is thin (short history, missing indicators, no news), say so clearly in the rationale. "Limited data available" is correct and honest — never overstate confidence.
5. Every factual claim in the rationale must trace to a specific value stated in the evidence package.
6. Return ONLY a JSON object — no prose, no markdown, no explanation outside the JSON.\
"""

_JSON_SCHEMA_HINT = """\

Return a JSON object with exactly these fields (no extra fields, no markdown):
{
  "recommendation": "BUY" | "SELL" | "HOLD",
  "confidence": "LOW" | "MEDIUM" | "HIGH",
  "rationale": "2-5 sentences in plain English, citing specific values from the evidence above",
  "key_factors": [
    {"factor": "indicator name", "value": "exact value from evidence", "signal": "bullish" | "bearish" | "neutral"},
    ... (between 1 and 6 items)
  ]
}\
"""

_VALID_SIGNALS = {"bullish", "bearish", "neutral"}


# ---------------------------------------------------------------------------
# Evidence text builder
# ---------------------------------------------------------------------------

def _fmt_pct(value: float | None) -> str:
    if value is None:
        return "unavailable"
    sign = "+" if value > 0 else ""
    return f"{sign}{value:.2f}%"


def _build_evidence_text(
    ticker: str,
    company_name: str | None,
    quote_price: float,
    quote_change_pct: float,
    bars_available: int,
    rsi_14: float | None,
    sma50: float | None,
    sma200: float | None,
    price_vs_sma50_pct: float | None,
    price_vs_sma200_pct: float | None,
    golden_cross: bool | None,
    trend_1m_pct: float | None,
    trend_3m_pct: float | None,
    trend_6m_pct: float | None,
    volatility_30d: float | None,
    events: list[SignificantMoveEvent],
    headlines: list[NewsArticle],
    position_qty: int | None,
    position_avg_cost: str | None,
    position_pnl: str | None,
    position_pnl_pct: str | None,
) -> str:
    lines: list[str] = [
        "EVIDENCE PACKAGE — you may ONLY reference values stated below:",
        "",
        f"Ticker: {ticker}",
        f"Company: {company_name or 'Unknown (use only the data below)'}",
        f"Current price: ${quote_price:.4f}",
        f"1-day change: {_fmt_pct(quote_change_pct)}",
        f"Trading days of history available: {bars_available}",
        "",
        "[TECHNICAL INDICATORS]",
    ]

    # RSI
    if rsi_14 is not None:
        interpretation = ""
        if rsi_14 < 30:
            interpretation = " — oversold territory"
        elif rsi_14 > 70:
            interpretation = " — overbought territory"
        elif rsi_14 > 60:
            interpretation = " — approaching overbought"
        elif rsi_14 < 40:
            interpretation = " — approaching oversold"
        lines.append(f"RSI(14): {rsi_14:.1f}{interpretation}")
    else:
        lines.append("RSI(14): unavailable (insufficient history)")

    # SMAs
    if sma50 is not None:
        lines.append(
            f"SMA50: ${sma50:.4f} — price is {_fmt_pct(price_vs_sma50_pct)} "
            f"{'above' if (price_vs_sma50_pct or 0) >= 0 else 'below'} SMA50"
        )
    else:
        lines.append("SMA50: unavailable (need at least 50 bars)")

    if sma200 is not None:
        lines.append(
            f"SMA200: ${sma200:.4f} — price is {_fmt_pct(price_vs_sma200_pct)} "
            f"{'above' if (price_vs_sma200_pct or 0) >= 0 else 'below'} SMA200"
        )
    else:
        lines.append("SMA200: unavailable (need at least 200 bars)")

    if golden_cross is not None:
        label = (
            "GOLDEN CROSS (SMA50 > SMA200)" if golden_cross
            else "DEATH CROSS (SMA50 < SMA200)"
        )
        lines.append(f"MA signal: {label}")

    lines += [
        f"1-month return (≈21 trading days): {_fmt_pct(trend_1m_pct)}",
        f"3-month return (≈63 trading days): {_fmt_pct(trend_3m_pct)}",
        f"6-month return (≈126 trading days): {_fmt_pct(trend_6m_pct)}",
        f"30-day annualized volatility: {'unavailable' if volatility_30d is None else f'{volatility_30d:.1f}%'}",
        "",
    ]

    # Events
    lines.append(
        f"[SIGNIFICANT PRICE EVENTS — top {len(events)} by magnitude over the last year, ≥5% single-day move]"
    )
    if not events:
        lines.append("No single-day moves ≥5% found in the available history.")
    else:
        for i, ev in enumerate(events, 1):
            direction = "UP" if ev.direction == "up" else "DOWN"
            lines.append(
                f"Event {i}: {ev.date}, {direction} {ev.percent_change:+.2f}%, "
                f"close ${ev.close_price:.2f}"
            )
            if not ev.news_available:
                lines.append(f"  [News: {ev.news_unavailable_reason or 'not available — outside provider window'}]")
            elif not ev.headlines:
                lines.append("  [News: no headlines found for this date]")
            else:
                for h in ev.headlines[:3]:  # cap at 3 per event to control token usage
                    lines.append(f'  - "{h.title}" ({h.source})')

    # Headlines
    lines += ["", f"[RECENT NEWS — {len(headlines)} latest headlines (last ~30 days)]"]
    if not headlines:
        lines.append("No recent news available.")
    else:
        for i, h in enumerate(headlines, 1):
            lines.append(f'{i}. "{h.title}" — {h.source}')

    # Position
    lines += ["", "[USER'S CURRENT POSITION IN THIS STOCK]"]
    if position_qty and position_qty > 0:
        lines.append(f"Holding {position_qty} shares at average cost ${position_avg_cost}")
        lines.append(f"Unrealized P&L: ${position_pnl} ({position_pnl_pct}%)")
    else:
        lines.append("No current position.")

    return "\n".join(lines)


# ---------------------------------------------------------------------------
# Gemini API call
# ---------------------------------------------------------------------------

def _call_llm(evidence_text: str) -> dict:  # type: ignore[type-arg]
    """
    Call the Gemini API in JSON mode. Retries once on transient errors.
    Returns a validated dict with recommendation, confidence, rationale, key_factors.
    """
    if not settings.GEMINI_API_KEY:
        raise RecommendationUnavailableError(
            "GEMINI_API_KEY is not configured. "
            "Get a free key at aistudio.google.com and set it in your .env file."
        )

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel(
        model_name=settings.GEMINI_MODEL,
        system_instruction=_SYSTEM_PROMPT,
        generation_config=genai.types.GenerationConfig(
            temperature=0.2,
            response_mime_type="application/json",
        ),
    )

    prompt = evidence_text + "\n" + _JSON_SCHEMA_HINT
    last_exc: Exception = RuntimeError("Unknown error")

    for attempt in range(2):
        try:
            response = model.generate_content(prompt)
            result: dict = json.loads(response.text)  # type: ignore[arg-type]

            # Validate required enum fields — coerce invalid values rather than crash
            if result.get("recommendation") not in ("BUY", "SELL", "HOLD"):
                raise ValueError(f"Invalid recommendation value: {result.get('recommendation')!r}")
            if result.get("confidence") not in ("LOW", "MEDIUM", "HIGH"):
                raise ValueError(f"Invalid confidence value: {result.get('confidence')!r}")
            if not isinstance(result.get("rationale"), str) or not result["rationale"].strip():
                raise ValueError("Missing or empty rationale")

            key_factors = result.get("key_factors")
            if not isinstance(key_factors, list) or len(key_factors) < 1:
                raise ValueError("key_factors must be a non-empty list")
            for kf in key_factors:
                if kf.get("signal") not in _VALID_SIGNALS:
                    kf["signal"] = "neutral"  # safe coercion for unexpected signal values

            return result

        except Exception as exc:
            logger.warning("LLM call failed (attempt %d/2): %s", attempt + 1, exc)
            last_exc = exc

    raise RecommendationUnavailableError(
        f"AI service temporarily unavailable after 2 attempts: {last_exc}"
    ) from last_exc


# ---------------------------------------------------------------------------
# Public interface
# ---------------------------------------------------------------------------

def _position_fingerprint(position: Position | None) -> str:
    if position is None:
        return "none"
    return f"{position.quantity}@{position.average_cost}"


def get_recommendation(
    ticker: str,
    user_id: UUID,
    db: Session,
    force_refresh: bool = False,
) -> RecommendationResponse:
    """
    Assemble an evidence package from all data sources and call the Gemini API
    to generate a grounded, structured recommendation.

    Cache key encodes the user's position fingerprint so any trade in this ticker
    automatically invalidates the cached recommendation for that user.

    Raises:
        TickerNotFoundError            — propagated from market data service
        MarketDataUnavailableError     — propagated from market data service
        RecommendationUnavailableError — LLM or config error
    """
    ticker = ticker.upper()

    # Load user's current position (DB read — needed for cache key and evidence)
    portfolio = db.query(Portfolio).filter(Portfolio.user_id == user_id).first()
    position: Position | None = None
    if portfolio:
        position = (
            db.query(Position)
            .filter(
                Position.portfolio_id == portfolio.id,
                Position.ticker == ticker,
            )
            .first()
        )

    pos_fp = _position_fingerprint(position)
    cache_key = f"finsim:rec:{ticker}:{str(user_id)[:12]}:{pos_fp}"

    if not force_refresh:
        cached = cache_get(cache_key)
        if cached:
            cached["cached"] = True
            return RecommendationResponse(**cached)

    # ── Gather evidence ────────────────────────────────────────────────────

    # 5Y bars give SMA200 enough data; these are already cached by the market data service
    bars = get_daily_history(ticker, "5Y")

    if len(bars) < _MIN_BARS:
        raise RecommendationUnavailableError(
            f"Insufficient price history for {ticker} "
            f"({len(bars)} trading days available; need at least {_MIN_BARS}). "
            "Try again after more data is available."
        )

    quote = get_quote(ticker)

    company_name: str | None = None
    try:
        company_name = get_overview(ticker).name
    except (TickerNotFoundError, MarketDataUnavailableError):
        pass  # non-fatal; LLM uses ticker alone

    indicators = compute_indicators(ticker, bars)

    # Top 5 events from last year; news is attached for recent events (cached)
    events_resp = detect_significant_moves(ticker, "1Y", 5.0)
    top_events = events_resp.events[:_MAX_EVENTS]

    headlines = get_recent_news(ticker, company_name, _MAX_HEADLINES)

    # Position arithmetic (display only — use floats; no Decimal accounting here)
    pos_qty: int | None = None
    pos_avg: str | None = None
    pos_pnl: str | None = None
    pos_pnl_pct: str | None = None
    if position and position.quantity > 0:
        pos_qty = position.quantity
        pos_avg = f"{float(str(position.average_cost)):.4f}"
        price_f = float(str(quote.price))
        avg_f = float(str(position.average_cost))
        unrealized = (price_f - avg_f) * position.quantity
        unrealized_pct = (price_f - avg_f) / avg_f * 100.0 if avg_f != 0 else 0.0
        pos_pnl = f"{unrealized:+.2f}"
        pos_pnl_pct = f"{unrealized_pct:+.2f}"

    # ── Build evidence text ────────────────────────────────────────────────
    ma = indicators.moving_averages
    evidence_text = _build_evidence_text(
        ticker=ticker,
        company_name=company_name,
        quote_price=float(str(quote.price)),
        quote_change_pct=float(str(quote.change_pct)),
        bars_available=indicators.bars_available,
        rsi_14=indicators.rsi_14,
        sma50=ma.sma50,
        sma200=ma.sma200,
        price_vs_sma50_pct=ma.price_vs_sma50_pct,
        price_vs_sma200_pct=ma.price_vs_sma200_pct,
        golden_cross=ma.golden_cross,
        trend_1m_pct=indicators.trend_1m_pct,
        trend_3m_pct=indicators.trend_3m_pct,
        trend_6m_pct=indicators.trend_6m_pct,
        volatility_30d=indicators.volatility_30d_annualized,
        events=top_events,
        headlines=headlines,
        position_qty=pos_qty,
        position_avg_cost=pos_avg,
        position_pnl=pos_pnl,
        position_pnl_pct=pos_pnl_pct,
    )

    # ── Call LLM ──────────────────────────────────────────────────────────
    llm_result = _call_llm(evidence_text)

    # ── Build response ────────────────────────────────────────────────────
    evidence_summary = EvidenceSummary(
        current_price=float(str(quote.price)),
        rsi_14=indicators.rsi_14,
        sma50=ma.sma50,
        sma200=ma.sma200,
        trend_1m_pct=indicators.trend_1m_pct,
        trend_3m_pct=indicators.trend_3m_pct,
        trend_6m_pct=indicators.trend_6m_pct,
        volatility_30d=indicators.volatility_30d_annualized,
        events_analyzed=len(top_events),
        headlines_analyzed=len(headlines),
        position_included=position is not None and position.quantity > 0,
        bars_available=indicators.bars_available,
    )

    rec = RecommendationResponse(
        ticker=ticker,
        recommendation=llm_result["recommendation"],
        confidence=llm_result["confidence"],
        rationale=llm_result["rationale"],
        key_factors=[KeyFactor(**kf) for kf in llm_result.get("key_factors", [])],
        evidence_summary=evidence_summary,
        generated_at=datetime.now(timezone.utc),
        cached=False,
    )

    cache_set(cache_key, rec.model_dump(mode="json"), _TTL_REC)
    return rec
