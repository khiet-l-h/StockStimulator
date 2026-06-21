from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.schemas.news import EventsResponse, NewsArticle
from app.schemas.recommendation import RecommendationResponse
from app.schemas.stocks import CompanyOverview, PriceBar, Quote, SearchResult
from app.services.events import DEFAULT_THRESHOLD_PCT, detect_significant_moves
from app.services.market_data import (
    MarketDataUnavailableError,
    TickerNotFoundError,
    get_daily_history,
    get_overview,
    get_quote,
    search_symbols,
)
from app.services.news_data import get_recent_news
from app.services.recommendation import RecommendationUnavailableError, get_recommendation

router = APIRouter(prefix="/api/stocks", tags=["stocks"])

_TICKER_PATTERN = r"^[A-Za-z0-9\.\-\^]{1,10}$"


@router.get("/search", response_model=list[SearchResult])
def search(
    q: str = Query(..., min_length=1, max_length=30),
    _: User = Depends(get_current_user),
) -> list[SearchResult]:
    try:
        return search_symbols(q)
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc


@router.get("/{ticker}/quote", response_model=Quote)
def quote(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    _: User = Depends(get_current_user),
) -> Quote:
    try:
        return get_quote(ticker)
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc


@router.get("/{ticker}/history", response_model=list[PriceBar])
def history(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    time_range: str = Query("1Y", alias="range", pattern="^(1M|6M|1Y|5Y)$"),
    _: User = Depends(get_current_user),
) -> list[PriceBar]:
    try:
        return get_daily_history(ticker, time_range)
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc


@router.get("/{ticker}/overview", response_model=CompanyOverview)
def overview(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    _: User = Depends(get_current_user),
) -> CompanyOverview:
    try:
        return get_overview(ticker)
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc


@router.get("/{ticker}/news", response_model=list[NewsArticle])
def news(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    limit: int = Query(20, ge=1, le=50),
    _: User = Depends(get_current_user),
) -> list[NewsArticle]:
    company_name: str | None = None
    try:
        company_name = get_overview(ticker).name
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError:
        pass

    return get_recent_news(ticker.upper(), company_name, limit)


@router.get("/{ticker}/events", response_model=EventsResponse)
def events(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    time_range: str = Query("1Y", alias="range", pattern="^(1M|6M|1Y|5Y)$"),
    threshold: float = Query(DEFAULT_THRESHOLD_PCT, ge=1.0, le=50.0),
    _: User = Depends(get_current_user),
) -> EventsResponse:
    try:
        return detect_significant_moves(ticker, time_range, threshold)
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc


@router.get("/{ticker}/recommendation", response_model=RecommendationResponse)
def recommendation(
    ticker: str = Path(..., pattern=_TICKER_PATTERN),
    refresh: bool = Query(False, description="Bypass cache and generate a fresh recommendation"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> RecommendationResponse:
    try:
        return get_recommendation(ticker, current_user.id, db, force_refresh=refresh)
    except TickerNotFoundError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Market data temporarily unavailable. Please try again shortly.",
        ) from exc
    except RecommendationUnavailableError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
