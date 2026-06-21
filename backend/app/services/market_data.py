"""
Market data service — Alpha Vantage adapter.

All other modules should import from here and never reference Alpha Vantage directly,
so swapping providers only requires changes to this file.
"""

import logging
from decimal import Decimal, InvalidOperation

import httpx

from app.core.cache import cache_get, cache_get_stale, cache_set
from app.core.config import settings
from app.schemas.stocks import CompanyOverview, PriceBar, Quote, SearchResult

logger = logging.getLogger(__name__)

_BASE_URL = "https://www.alphavantage.co/query"

# Cache TTLs (seconds)
_TTL_QUOTE = 60
_TTL_HISTORY = 6 * 3_600   # 6 h — daily bars don't change intraday
_TTL_OVERVIEW = 24 * 3_600  # 24 h
_TTL_SEARCH = 3_600          # 1 h

# Range label → number of most-recent trading-day bars to keep
_RANGE_BARS: dict[str, int] = {
    "1M": 30,
    "6M": 126,
    "1Y": 252,
    "5Y": 1_260,
}


# ---------------------------------------------------------------------------
# App-level exceptions (never expose raw provider errors to callers)
# ---------------------------------------------------------------------------


class TickerNotFoundError(Exception):
    def __init__(self, ticker: str) -> None:
        self.ticker = ticker
        super().__init__(f"Ticker not found: {ticker}")


class MarketDataUnavailableError(Exception):
    """Provider unreachable, rate-limited, or returned an unexpected error."""


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _fetch(params: dict[str, str]) -> dict:  # type: ignore[type-arg]
    """
    Call Alpha Vantage synchronously.
    Raises MarketDataUnavailableError on transport or rate-limit errors.
    Raises TickerNotFoundError when the API signals an invalid symbol.
    """
    params = {**params, "apikey": settings.ALPHA_VANTAGE_API_KEY}
    try:
        resp = httpx.get(_BASE_URL, params=params, timeout=10.0)
        resp.raise_for_status()
        data: dict = resp.json()  # type: ignore[assignment]
    except httpx.HTTPError as exc:
        raise MarketDataUnavailableError(f"HTTP error contacting provider: {exc}") from exc
    except Exception as exc:
        raise MarketDataUnavailableError(f"Unexpected provider error: {exc}") from exc

    # Alpha Vantage embeds errors in the body (HTTP status is always 200)
    if "Note" in data or "Information" in data:
        msg = data.get("Note") or data.get("Information", "rate limit")
        logger.warning("Alpha Vantage limit hit: %.80s", msg)
        raise MarketDataUnavailableError(msg)

    if "Error Message" in data:
        # Typically: invalid symbol for TIME_SERIES / OVERVIEW endpoints
        raise TickerNotFoundError(params.get("symbol", "UNKNOWN"))

    return data


def _to_decimal(raw: str | None) -> Decimal | None:
    if not raw:
        return None
    try:
        return Decimal(raw.replace(",", ""))
    except InvalidOperation:
        return None


def _to_int(raw: str | None) -> int | None:
    if not raw:
        return None
    try:
        return int(raw.replace(",", ""))
    except (ValueError, AttributeError):
        return None


# ---------------------------------------------------------------------------
# Public service functions
# ---------------------------------------------------------------------------


def get_quote(ticker: str) -> Quote:
    ticker = ticker.upper()
    cache_key = f"finsim:quote:{ticker}"

    cached = cache_get(cache_key)
    if cached:
        return Quote(**cached)

    try:
        data = _fetch({"function": "GLOBAL_QUOTE", "symbol": ticker})
    except MarketDataUnavailableError:
        stale = cache_get_stale(cache_key)
        if stale:
            return Quote(**stale)
        raise

    gq = data.get("Global Quote", {})
    if not gq or not gq.get("05. price"):
        # Empty object → symbol not found on GLOBAL_QUOTE
        raise TickerNotFoundError(ticker)

    pct_raw = gq.get("10. change percent", "0%").replace("%", "")
    quote = Quote(
        ticker=ticker,
        price=Decimal(gq["05. price"]),
        change=Decimal(gq.get("09. change", "0")),
        change_pct=Decimal(pct_raw),
        volume=int(gq.get("06. volume", "0")),
        latest_trading_day=gq.get("07. latest trading day", ""),
    )

    cache_set(cache_key, quote.model_dump(mode="json"), _TTL_QUOTE)
    return quote


def get_daily_history(ticker: str, range_: str = "1Y") -> list[PriceBar]:
    ticker = ticker.upper()
    if range_ not in _RANGE_BARS:
        range_ = "1Y"

    # Cache the FULL series under a single key; slice per-request in memory
    cache_key = f"finsim:history:{ticker}"

    all_bars_raw: list | None = cache_get(cache_key)

    if all_bars_raw is None:
        try:
            data = _fetch({
                "function": "TIME_SERIES_DAILY",
                "symbol": ticker,
                "outputsize": "compact",
            })
        except MarketDataUnavailableError:
            stale = cache_get_stale(cache_key)
            if stale:
                all_bars_raw = stale
            else:
                raise

        if all_bars_raw is None and data is not None:
            ts: dict = data.get("Time Series (Daily)", {})  # type: ignore[assignment]
            if not ts:
                raise TickerNotFoundError(ticker)

            # Sort oldest → newest so the chart renders left-to-right correctly
            all_bars_raw = [
                PriceBar(
                    date=d,
                    open=float(v["1. open"]),
                    high=float(v["2. high"]),
                    low=float(v["3. low"]),
                    close=float(v["4. close"]),
                    volume=int(v["5. volume"]),
                ).model_dump()
                for d, v in sorted(ts.items())
            ]
            cache_set(cache_key, all_bars_raw, _TTL_HISTORY)

    max_bars = _RANGE_BARS[range_]
    return [PriceBar(**b) for b in all_bars_raw[-max_bars:]]


def get_overview(ticker: str) -> CompanyOverview:
    ticker = ticker.upper()
    cache_key = f"finsim:overview:{ticker}"

    cached = cache_get(cache_key)
    if cached:
        return CompanyOverview(**cached)

    try:
        data = _fetch({"function": "OVERVIEW", "symbol": ticker})
    except MarketDataUnavailableError:
        stale = cache_get_stale(cache_key)
        if stale:
            return CompanyOverview(**stale)
        raise

    if not data.get("Symbol"):
        # OVERVIEW returns {} for unknown tickers (no "Error Message")
        raise TickerNotFoundError(ticker)

    overview = CompanyOverview(
        ticker=ticker,
        name=data.get("Name") or ticker,
        market_cap=_to_int(data.get("MarketCapitalization")),
        week_52_high=_to_decimal(data.get("52WeekHigh")),
        week_52_low=_to_decimal(data.get("52WeekLow")),
        description=data.get("Description") or None,
        sector=data.get("Sector") or None,
        industry=data.get("Industry") or None,
    )

    cache_set(cache_key, overview.model_dump(mode="json"), _TTL_OVERVIEW)
    return overview


def search_symbols(query: str) -> list[SearchResult]:
    query = query.strip()
    if not query:
        return []

    cache_key = f"finsim:search:{query.lower()}"

    cached = cache_get(cache_key)
    if cached is not None:
        return [SearchResult(**r) for r in cached]

    try:
        data = _fetch({"function": "SYMBOL_SEARCH", "keywords": query})
    except MarketDataUnavailableError:
        stale = cache_get_stale(cache_key)
        if stale:
            return [SearchResult(**r) for r in stale]
        raise

    results = [
        SearchResult(
            symbol=m["1. symbol"],
            name=m["2. name"],
            type=m["3. type"],
            region=m["4. region"],
        )
        for m in data.get("bestMatches", [])
    ]

    cache_set(cache_key, [r.model_dump() for r in results], _TTL_SEARCH)
    return results
