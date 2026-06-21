from math import ceil

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.trade import Trade
from app.models.user import User
from app.schemas.trades import TradeHistoryItem, TradeRequest, TradeResponse, TradesPage
from app.services.market_data import MarketDataUnavailableError, TickerNotFoundError
from app.services.trading import (
    InsufficientFundsError,
    InsufficientSharesError,
    NoPositionError,
    TradingError,
    execute_buy,
    execute_sell,
)

router = APIRouter(prefix="/api/trades", tags=["trades"])


@router.post("", response_model=TradeResponse, status_code=status.HTTP_201_CREATED)
def create_trade(
    body: TradeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TradeResponse:
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=500, detail="Portfolio not found")

    try:
        if body.side == "BUY":
            trade, new_cash = execute_buy(db, portfolio.id, body.ticker, body.quantity)
        else:
            trade, new_cash = execute_sell(db, portfolio.id, body.ticker, body.quantity)
        db.commit()
    except (InsufficientFundsError, InsufficientSharesError, NoPositionError) as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except TickerNotFoundError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Ticker not found: {exc.ticker}",
        ) from exc
    except MarketDataUnavailableError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not fetch a current price. Trade rejected — please try again shortly.",
        ) from exc
    except TradingError as exc:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return TradeResponse(
        id=trade.id,
        ticker=trade.ticker,
        side=trade.side.value,
        quantity=trade.quantity,
        price=trade.price,
        total_value=trade.total_value,
        executed_at=trade.executed_at,
        realized_pnl=trade.realized_pnl,
        cash_balance=new_cash,
    )


@router.get("", response_model=TradesPage)
def list_trades(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> TradesPage:
    portfolio = current_user.portfolio
    if not portfolio:
        raise HTTPException(status_code=500, detail="Portfolio not found")

    offset = (page - 1) * limit
    total: int = db.query(Trade).filter(Trade.portfolio_id == portfolio.id).count()
    trades: list[Trade] = (
        db.query(Trade)
        .filter(Trade.portfolio_id == portfolio.id)
        .order_by(Trade.executed_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )

    return TradesPage(
        items=[
            TradeHistoryItem(
                id=t.id,
                ticker=t.ticker,
                side=t.side.value,
                quantity=t.quantity,
                price=t.price,
                total_value=t.total_value,
                executed_at=t.executed_at,
                realized_pnl=t.realized_pnl,
            )
            for t in trades
        ],
        total=total,
        page=page,
        limit=limit,
        pages=ceil(total / limit) if total > 0 else 1,
    )
