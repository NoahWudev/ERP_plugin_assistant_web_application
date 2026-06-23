from __future__ import annotations

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

from ly_erp.config import ROOT_DIR, load_env_file


class AppSettings(BaseSettings):
    model_config = SettingsConfigDict(extra="ignore")

    database_url: str = "postgresql+asyncpg://erp:erp@localhost:5432/erp_assistant"
    jwt_secret: str = "dev-only-change-me"
    jwt_expire_minutes: int = 480
    jwt_cookie_name: str = "access_token"
    cookie_secure: bool = False


@lru_cache(maxsize=1)
def get_settings() -> AppSettings:
    load_env_file(ROOT_DIR / ".env")
    return AppSettings(
        database_url=_env("DATABASE_URL", "postgresql+asyncpg://erp:erp@localhost:5432/erp_assistant"),
        jwt_secret=_env("JWT_SECRET", "dev-only-change-me"),
        jwt_expire_minutes=int(_env("JWT_EXPIRE_MINUTES", "480")),
        jwt_cookie_name=_env("JWT_COOKIE_NAME", "access_token"),
        cookie_secure=_env("COOKIE_SECURE", "false").lower() in ("1", "true", "yes"),
    )


def _env(key: str, default: str) -> str:
    import os

    return os.environ.get(key, default).strip() or default
