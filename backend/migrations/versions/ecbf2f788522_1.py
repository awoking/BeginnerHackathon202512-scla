"""1

Revision ID: ecbf2f788522
Revises: f01df1f4a122
Create Date: 2025-12-13 03:02:52.266720

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'ecbf2f788522'
down_revision: Union[str, Sequence[str], None] = 'f01df1f4a122'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
