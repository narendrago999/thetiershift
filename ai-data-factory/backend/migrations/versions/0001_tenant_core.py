"""Initial tenant, identity, project and audit schema."""
from alembic import op
from app.database import Base
from app import models  # noqa: F401

revision = "0001_tenant_core"
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    Base.metadata.create_all(bind=op.get_bind())

def downgrade():
    Base.metadata.drop_all(bind=op.get_bind())
