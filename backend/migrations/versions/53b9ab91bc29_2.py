"""2

Revision ID: 53b9ab91bc29
Revises: ecbf2f788522
Create Date: 2025-12-13 03:04:34.959853

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '53b9ab91bc29'
down_revision: Union[str, Sequence[str], None] = 'ecbf2f788522'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
