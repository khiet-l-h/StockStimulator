"""allow null hashed_password for google oauth users

Revision ID: d4e5f6a7b2c3
Revises: c3d4e5f6a1b2
Create Date: 2026-06-28 00:00:00.000000

"""
import sqlalchemy as sa
from alembic import op

revision = "d4e5f6a7b2c3"
down_revision = "c3d4e5f6a1b2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column("users", "hashed_password", nullable=True)


def downgrade() -> None:
    op.execute("UPDATE users SET hashed_password = '' WHERE hashed_password IS NULL")
    op.alter_column("users", "hashed_password", nullable=False)
