"""2

Revision ID: 4b610162aa9f
Revises: 53b9ab91bc29
Create Date: 2025-12-13 03:06:23.710208

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4b610162aa9f'
down_revision: Union[str, Sequence[str], None] = '53b9ab91bc29'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
