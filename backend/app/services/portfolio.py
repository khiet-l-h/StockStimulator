"""
Portfolio valuation service.

Builds a full snapshot by fetching live (Redis-cached) prices for each open
position. Falls back to average_cost if a quote is temporarily unavailable so
the dashboard always loads even when the market data service is degraded.
"""

import logging
from decimal import ROUND_HALF_UP, Decimal
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.trade import Position
from app.models.user import Portfolio
from app.schemas.trades import PortfolioSnapshot, PositionSnapshot
from app.services.market_data import get_quote

logger = logging.getLogger(__name__)

_CENT = Decimal("0.01")
_INITIAL_BALANCE = Decimal("100000.00")


def get_portfolio_snapshot(db: Session, portfolio_id: UUID) -> PortfolioSnapshot:
    portfolio = db.query(Portfolio).filter(Portfolio.id == portfolio_id).first()
    if not portfolio:
        raise ValueError("Portfolio not found")

    positions: list[Position] = (
        db.query(Position).filter(Position.portfolio_id == portfolio_id).all()
    )

    position_snapshots: list[PositionSnapshot] = []
    total_positions_value = Decimal("0")

    for pos in positions:
        try:
            current_price = get_quote(pos.ticker).price.quantize(_CENT, rounding=ROUND_HALF_UP)
        except Exception:
            # Stale cache served by get_quote when provider is down; if that also
            # fails, fall back to cost basis so the page still renders.
            logger.warning("Could not fetch price for %s — using average cost", pos.ticker)
            current_price = pos.average_cost.quantize(_CENT, rounding=ROUND_HALF_UP)

        market_value = (current_price * pos.quantity).quantize(_CENT, rounding=ROUND_HALF_UP)
        unrealized_pnl = (
            (current_price - pos.average_cost) * pos.quantity
        ).quantize(_CENT, rounding=ROUND_HALF_UP)

        cost_basis = pos.average_cost
        if cost_basis != 0:
            unrealized_pnl_pct = (
                (current_price - cost_basis) / cost_basis * 100
            ).quantize(_CENT, rounding=ROUND_HALF_UP)
        else:
            unrealized_pnl_pct = Decimal("0.00")

        total_positions_value += market_value

        position_snapshots.append(
            PositionSnapshot(
                ticker=pos.ticker,
                quantity=pos.quantity,
                average_cost=pos.average_cost.quantize(_CENT, rounding=ROUND_HALF_UP),
                current_price=current_price,
                market_value=market_value,
                unrealized_pnl=unrealized_pnl,
                unrealized_pnl_pct=unrealized_pnl_pct,
            )
        )

    cash_balance = portfolio.cash_balance
    total_positions_value = total_positions_value.quantize(_CENT, rounding=ROUND_HALF_UP)
    total_portfolio_value = (cash_balance + total_positions_value).quantize(_CENT, rounding=ROUND_HALF_UP)
    total_return = (total_portfolio_value - _INITIAL_BALANCE).quantize(_CENT, rounding=ROUND_HALF_UP)
    total_return_pct = (
        (total_return / _INITIAL_BALANCE) * 100
    ).quantize(_CENT, rounding=ROUND_HALF_UP)

    return PortfolioSnapshot(
        cash_balance=cash_balance,
        positions=position_snapshots,
        total_positions_value=total_positions_value,
        total_portfolio_value=total_portfolio_value,
        total_return=total_return,
        total_return_pct=total_return_pct,
    )
