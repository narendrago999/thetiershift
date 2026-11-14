import os

os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
os.environ.setdefault("CLERK_PUBLISHABLE_KEY", "pk_test_placeholder")
os.environ.setdefault("CLERK_SECRET_KEY", "sk_test_placeholder")
os.environ.setdefault("CLERK_ISSUER", "https://example.clerk.accounts.dev")
os.environ.setdefault("CLERK_JWKS_URL", "https://example.clerk.accounts.dev/.well-known/jwks.json")
os.environ.setdefault("APP_ENV", "test")
