"""Separate machine findings and human investigations."""
from alembic import op
import sqlalchemy as sa

revision = '0003_workspace'
down_revision = '0002'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('findings', sa.Column('id', sa.String(64), primary_key=True),
                    sa.Column('consumer_id', sa.String(128), nullable=False),
                    sa.Column('detected_at', sa.DateTime(timezone=True), nullable=False),
                    sa.Column('snapshot', sa.JSON(), nullable=False))
    op.create_table('cases', sa.Column('id', sa.String(64), primary_key=True),
                    sa.Column('anomaly_id', sa.String(64), sa.ForeignKey('findings.id'), unique=True, nullable=False),
                    sa.Column('status', sa.String(32), nullable=False), sa.Column('events', sa.JSON(), nullable=False),
                    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))

def downgrade():
    op.drop_table('cases')
    op.drop_table('findings')
