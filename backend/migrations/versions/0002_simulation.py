"""Virtual meter telemetry and unified investigation workflow."""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("simulation_streams",
        sa.Column("consumer_id", sa.String(128), sa.ForeignKey("consumers.consumer_id"), primary_key=True),
        sa.Column("config", sa.JSON(), nullable=False))
    op.create_table("meter_readings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consumer_id", sa.String(128), sa.ForeignKey("consumers.consumer_id"), nullable=False),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=False),
        sa.Column("received_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("signals", sa.JSON(), nullable=False))
    op.create_index("ix_meter_consumer_latest", "meter_readings", ["consumer_id", "id"])
    op.create_table("investigations",
        sa.Column("consumer_id", sa.String(128), sa.ForeignKey("consumers.consumer_id"), primary_key=True),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False))


def downgrade():
    op.drop_table("investigations")
    op.drop_table("meter_readings")
    op.drop_table("simulation_streams")
