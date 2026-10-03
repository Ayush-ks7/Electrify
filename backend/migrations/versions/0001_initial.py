"""Initial consumer, daily reading and immutable prediction tables."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("consumers",
        sa.Column("consumer_id", sa.String(128), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False))
    op.create_table("daily_readings",
        sa.Column("consumer_id", sa.String(128), sa.ForeignKey("consumers.consumer_id"), primary_key=True),
        sa.Column("date", sa.Date(), primary_key=True),
        sa.Column("consumption", sa.Float(), nullable=True))
    op.create_table("predictions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("consumer_id", sa.String(128), sa.ForeignKey("consumers.consumer_id"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("model_version", sa.String(128), nullable=False),
        sa.Column("source", sa.String(32), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("score", sa.JSON(), nullable=False))
    op.create_index("ix_predictions_consumer_latest", "predictions", ["consumer_id", "id"])


def downgrade():
    op.drop_table("predictions")
    op.drop_table("daily_readings")
    op.drop_table("consumers")
