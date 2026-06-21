"""add price_bars table

Revision ID: b2c3d4e5f6a1
Revises: a1b2c3d4e5f6
Create Date: 2026-06-20 00:01:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "b2c3d4e5f6a1"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "price_bars",
        sa.Column("ticker", sa.String(20), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("open", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("high", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("low", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("close", sa.Numeric(precision=20, scale=6), nullable=False),
        sa.Column("volume", sa.BigInteger(), nullable=False),
        sa.PrimaryKeyConstraint("ticker", "date"),
    )
    op.create_index("ix_price_bars_ticker_date", "price_bars", ["ticker", "date"])


def downgrade() -> None:
    op.drop_index("ix_price_bars_ticker_date", table_name="price_bars")
    op.drop_table("price_bars")
