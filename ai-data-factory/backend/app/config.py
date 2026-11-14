from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")
    @field_validator("database_url", mode="before")
    @classmethod
    def normalize_database_url(cls, value):
        value = str(value)
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql+psycopg://", 1)
        if value.startswith("postgresql://"):
            return value.replace("postgresql://", "postgresql+psycopg://", 1)
        return value

    app_env: str = "development"
    app_base_url: str = "http://localhost:5500"
    api_base_url: str = "http://localhost:8000"
    database_url: str
    clerk_publishable_key: str
    clerk_secret_key: str
    clerk_issuer: str
    clerk_jwks_url: str
    cors_origins: str = "http://localhost:5500"
    invitation_token_ttl_hours: int = 168
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_username: str | None = None
    smtp_password: str | None = None
    smtp_from_email: str | None = None
    smtp_use_tls: bool = True

    @property
    def allowed_origins(self) -> list[str]:
        return [v.strip() for v in self.cors_origins.split(",") if v.strip()]

    @property
    def smtp_ready(self) -> bool:
        return bool(self.smtp_host and self.smtp_from_email)

@lru_cache
def get_settings() -> Settings:
    return Settings()
