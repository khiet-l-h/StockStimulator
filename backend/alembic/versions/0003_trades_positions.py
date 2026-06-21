"""add trades and positions tables

Revision ID: c3d4e5f6a1b2
Revises: b2c3d4e5f6a1
Create Date: 2026-06-20 00:02:00.000000

"""
import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision = "c3d4e5f6a1b2"
down_revision = "b2c3d4e5f6a1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # PostgreSQL ENUM type for trade side
    tradeside = postgresql.ENUM("BUY", "SELL", name="tradeside")
    tradeside.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "trades",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("side", sa.Enum("BUY", "SELL", name="tradeside", create_type=False), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("price", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("total_value", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("executed_at", sa.DateTime(), nullable=False),
        sa.Column("realized_pnl", sa.Numeric(precision=20, scale=6), nullable=True),
        sa.ForeignKeyConstraint(["portfolio_id"], ["portfolios.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_trades_portfolio_executed", "trades", ["portfolio_id", "executed_at"])

    op.create_table(
        "positions",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("portfolio_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("average_cost", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.ForeignKeyConstraint(["portfolio_id"], ["portfolios.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("portfolio_id", "ticker", name="uq_position_portfolio_ticker"),
    )


def downgrade() -> None:
    op.drop_table("positions")
    op.drop_index("ix_trades_portfolio_executed", table_name="trades")
    op.drop_table("trades")
    sa.Enum(name="tradeside").drop(op.get_bind(), checkfirst=True)
