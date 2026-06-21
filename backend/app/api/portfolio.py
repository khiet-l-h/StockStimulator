from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy.orm import Session

from app.core.security import get_current_user
from app.db.session import get_db
from app.models.trade import Position
from app.models.user import User
from app.schemas.trades import PortfolioSnapshot, PositionDetail
from app.services.portfolio import get_portfolio_snapshot

router = APIRouter(prefix="/api/portfolio", tags=["portfolio"])


@router.get("", response_model=PortfolioSnapshot)
def portfolio(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PortfolioSnapshot:
    if not current_user.portfolio:
        raise HTTPException(status_code=500, detail="Portfolio not found")
    return get_portfolio_snapshot(db, current_user.portfolio.id)


@router.get("/positions/{ticker}", response_model=PositionDetail | None)
def position_detail(
    ticker: str = Path(..., min_length=1, max_length=10),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PositionDetail | None:
    """
    Lightweight position lookup for the trade ticket.
    Returns null (204 body) if no position exists.
    """
    if not current_user.portfolio:
        raise HTTPException(status_code=500, detail="Portfolio not found")

    pos = (
        db.query(Position)
        .filter(
            Position.portfolio_id == current_user.portfolio.id,
            Position.ticker == ticker.upper(),
        )
        .first()
    )
    if pos is None:
        return None

    return PositionDetail(
        ticker=pos.ticker,
        quantity=pos.quantity,
        average_cost=pos.average_cost,
    )
