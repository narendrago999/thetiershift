"""Enable PostgreSQL pgvector for later AI knowledge retrieval.

The extension is intentionally not removed on downgrade because other
objects or data may depend on it.
"""
from alembic import op

revision = "0002_enable_pgvector"
down_revision = "0001_tenant_core"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("CREATE EXTENSION IF NOT EXISTS vector")


def downgrade():
    # Keep the shared database extension installed; dropping it can break
    # other schemas and dependent objects.
    pass
