"""3

Revision ID: 2469a985576e
Revises: 4b610162aa9f
Create Date: 2025-12-13 03:14:28.124577

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2469a985576e'
down_revision: Union[str, Sequence[str], None] = '4b610162aa9f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
