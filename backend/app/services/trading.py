"""
Trade execution service.

Design principles:
  - Quote is fetched BEFORE acquiring the DB lock to keep the lock window short.
  - A single DB transaction covers the cash update, trade insert, and position update.
  - Row-level lock (SELECT FOR UPDATE) on Portfolio prevents concurrent double-spend.
  - SELLs also lock the Position row to prevent oversell races.
  - All money math uses Decimal with explicit quantization. Never float.
"""

from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.trade import Position, Trade, TradeSide
from app.models.user import Portfolio
from app.services.market_data import get_quote

_CENT = Decimal("0.01")
_MICRO = Decimal("0.000001")


# ---------------------------------------------------------------------------
# Domain errors (API layer maps these to HTTP status codes)
# ---------------------------------------------------------------------------


class InsufficientFundsError(Exception):
    pass


class InsufficientSharesError(Exception):
    pass


class NoPositionError(Exception):
    pass


class TradingError(Exception):
    pass


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _lock_portfolio(db: Session, portfolio_id: UUID) -> Portfolio:
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id)
        .with_for_update()
        .first()
    )
    if not portfolio:
        raise TradingError("Portfolio not found")
    return portfolio


def _lock_position(db: Session, portfolio_id: UUID, ticker: str) -> Position | None:
    return (
        db.query(Position)
        .filter(Position.portfolio_id == portfolio_id, Position.ticker == ticker)
        .with_for_update()
        .first()
    )


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def execute_buy(
    db: Session, portfolio_id: UUID, ticker: str, quantity: int
) -> tuple[Trade, Decimal]:
    """
    Execute a BUY trade.

    Returns (trade, new_cash_balance).
    Raises: InsufficientFundsError | TickerNotFoundError | MarketDataUnavailableError
    """
    # Fetch fresh price BEFORE locking — keeps critical section tight
    quote = get_quote(ticker)
    price = quote.price.quantize(_CENT, rounding=ROUND_HALF_UP)
    total_cost = price * quantity  # Decimal × int = Decimal, exact

    # Acquire row-level lock — no concurrent buy/sell can pass balance check
    portfolio = _lock_portfolio(db, portfolio_id)

    if total_cost > portfolio.cash_balance:
        raise InsufficientFundsError(
            f"Insufficient funds. "
            f"Cost: ${total_cost:,.2f}, Available: ${portfolio.cash_balance:,.2f}"
        )

    portfolio.cash_balance = (portfolio.cash_balance - total_cost).quantize(_CENT, rounding=ROUND_HALF_UP)

    trade = Trade(
        portfolio_id=portfolio_id,
        ticker=ticker,
        side=TradeSide.BUY,
        quantity=quantity,
        price=price,
        total_value=total_cost,
    )
    db.add(trade)

    # Upsert position — weighted average cost basis
    position = _lock_position(db, portfolio_id, ticker)
    if position:
        new_qty = position.quantity + quantity
        new_avg = (
            (position.quantity * position.average_cost + quantity * price) / new_qty
        ).quantize(_MICRO, rounding=ROUND_HALF_UP)
        position.quantity = new_qty
        position.average_cost = new_avg
    else:
        db.add(
            Position(
                portfolio_id=portfolio_id,
                ticker=ticker,
                quantity=quantity,
                average_cost=price.quantize(_MICRO, rounding=ROUND_HALF_UP),
            )
        )

    db.flush()
    return trade, portfolio.cash_balance


def execute_sell(
    db: Session, portfolio_id: UUID, ticker: str, quantity: int
) -> tuple[Trade, Decimal]:
    """
    Execute a SELL trade.

    Returns (trade, new_cash_balance).
    Raises: InsufficientSharesError | NoPositionError | TickerNotFoundError | MarketDataUnavailableError
    """
    # Fetch fresh price before locking
    quote = get_quote(ticker)
    price = quote.price.quantize(_CENT, rounding=ROUND_HALF_UP)

    # Acquire row-level locks on both portfolio and position
    portfolio = _lock_portfolio(db, portfolio_id)
    position = _lock_position(db, portfolio_id, ticker)

    if position is None:
        raise NoPositionError(f"No position held in {ticker}")

    if quantity > position.quantity:
        raise InsufficientSharesError(
            f"Cannot sell {quantity} share(s) of {ticker}: only {position.quantity} held"
        )

    proceeds = price * quantity
    realized_pnl = (price - position.average_cost) * quantity

    portfolio.cash_balance = (portfolio.cash_balance + proceeds).quantize(_CENT, rounding=ROUND_HALF_UP)

    trade = Trade(
        portfolio_id=portfolio_id,
        ticker=ticker,
        side=TradeSide.SELL,
        quantity=quantity,
        price=price,
        total_value=proceeds.quantize(_MICRO, rounding=ROUND_HALF_UP),
        realized_pnl=realized_pnl.quantize(_MICRO, rounding=ROUND_HALF_UP),
    )
    db.add(trade)

    new_qty = position.quantity - quantity
    if new_qty == 0:
        db.delete(position)  # closed position — remove the row entirely
    else:
        position.quantity = new_qty
        # average_cost is unchanged on sells (cost basis stays with remaining shares)

    db.flush()
    return trade, portfolio.cash_balance
