"""
News data service — NewsAPI adapter.

All other modules import from here and never reference NewsAPI directly,
so swapping providers requires changes only to this file.
"""

import logging
from datetime import date, datetime, timedelta

import httpx

from app.core.cache import cache_get, cache_get_stale, cache_set
from app.core.config import settings
from app.schemas.news import NewsArticle

logger = logging.getLogger(__name__)

_BASE_URL = "https://newsapi.org/v2/everything"

# NewsAPI free tier covers approximately this many days of history.
# Exported so other services can check before attempting a range query.
NEWS_WINDOW_DAYS = 30

# Cache TTLs (seconds)
_TTL_RECENT = 30 * 60   # 30 min — recent news changes quickly
_TTL_RANGE = 60 * 60    # 60 min — past-week windows are more stable


def news_available_from() -> date:
    """Earliest date for which real headlines can be fetched on the current plan."""
    return date.today() - timedelta(days=NEWS_WINDOW_DAYS)


def _build_query(ticker: str, company_name: str | None) -> str:
    if company_name and company_name.lower() != ticker.lower():
        return f'"{company_name}" OR "{ticker} stock"'
    return f'"{ticker}" stock'


def _fetch_articles(
    ticker: str,
    company_name: str | None,
    from_date: date,
    to_date: date,
    page_size: int = 20,
) -> list[NewsArticle]:
    """
    Call NewsAPI /everything. Returns an empty list on any error — news is
    supplementary and non-critical, so we never raise from here.
    """
    if not settings.NEWS_API_KEY:
        logger.warning("NEWS_API_KEY not configured; news will be empty")
        return []

    params: dict[str, object] = {
        "q": _build_query(ticker, company_name),
        "from": from_date.isoformat(),
        "to": to_date.isoformat(),
        "sortBy": "publishedAt",
        "pageSize": min(page_size, 100),
        "language": "en",
        "apiKey": settings.NEWS_API_KEY,
    }

    try:
        resp = httpx.get(_BASE_URL, params=params, timeout=10.0)
        resp.raise_for_status()
        data: dict = resp.json()  # type: ignore[assignment]
    except httpx.HTTPError as exc:
        logger.warning("NewsAPI HTTP error for %s: %s", ticker, exc)
        return []
    except Exception as exc:
        logger.warning("NewsAPI unexpected error for %s: %s", ticker, exc)
        return []

    if data.get("status") != "ok":
        logger.warning(
            "NewsAPI returned error for %s: %s — %s",
            ticker,
            data.get("code", "unknown"),
            data.get("message", ""),
        )
        return []

    articles: list[NewsArticle] = []
    for item in data.get("articles", []):
        title = (item.get("title") or "").strip()
        url = (item.get("url") or "").strip()
        if not title or not url or title == "[Removed]":
            continue
        try:
            published_at = datetime.fromisoformat(
                item["publishedAt"].replace("Z", "+00:00")
            )
        except (KeyError, ValueError):
            continue

        articles.append(
            NewsArticle(
                title=title,
                source=item.get("source", {}).get("name") or "Unknown",
                url=url,
                published_at=published_at,
                description=(item.get("description") or "").strip() or None,
            )
        )

    return articles


def get_recent_news(
    ticker: str,
    company_name: str | None = None,
    limit: int = 20,
) -> list[NewsArticle]:
    """
    Latest N articles about the stock. Returns [] gracefully on any provider error.
    Serves stale cache if the provider is unavailable.
    """
    ticker = ticker.upper()
    cache_key = f"finsim:news:recent:{ticker}:{limit}"

    cached = cache_get(cache_key)
    if cached is not None:
        return [NewsArticle(**a) for a in cached]

    today = date.today()
    articles = _fetch_articles(ticker, company_name, news_available_from(), today, page_size=limit)

    if not articles:
        stale = cache_get_stale(cache_key)
        if stale:
            logger.info("Serving stale recent news for %s", ticker)
            return [NewsArticle(**a) for a in stale]
        # Cache empty result briefly so we don't spam the API on every request
        cache_set(cache_key, [], 5 * 60)
        return []

    serialized = [a.model_dump(mode="json") for a in articles]
    cache_set(cache_key, serialized, _TTL_RECENT)
    return articles


def get_company_news(
    ticker: str,
    company_name: str | None,
    from_date: date,
    to_date: date,
) -> list[NewsArticle]:
    """
    Fetch articles within a specific date range. Used by the events service to
    attach headlines to detected price moves.

    Returns [] gracefully on any error.
    Callers should verify the dates are within news_available_from() before calling,
    as older dates return no results on the free tier.
    """
    ticker = ticker.upper()
    cache_key = (
        f"finsim:news:range:{ticker}"
        f":{from_date.isoformat()}:{to_date.isoformat()}"
    )

    cached = cache_get(cache_key)
    if cached is not None:
        return [NewsArticle(**a) for a in cached]

    articles = _fetch_articles(ticker, company_name, from_date, to_date, page_size=10)

    if not articles:
        stale = cache_get_stale(cache_key)
        if stale:
            return [NewsArticle(**a) for a in stale]
        # Cache empty results so repeated calls for the same old window don't hit the API
        cache_set(cache_key, [], _TTL_RANGE)
        return []

    serialized = [a.model_dump(mode="json") for a in articles]
    cache_set(cache_key, serialized, _TTL_RANGE)
    return articles
