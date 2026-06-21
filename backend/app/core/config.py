import json
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_DEFAULT_CORS = "http://localhost:5173"


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # Stored as str so pydantic-settings never tries to JSON-decode it before our validator runs.
    # Accepts comma-separated values OR a JSON array string.
    CORS_ORIGINS: str = _DEFAULT_CORS

    # Market data
    ALPHA_VANTAGE_API_KEY: str

    # News
    NEWS_API_KEY: str = ""  # newsapi.org — optional; news features return empty when unset

    # AI recommendations (Google Gemini — free at aistudio.google.com)
    GEMINI_API_KEY: str = ""  # optional; recommendation endpoint returns 503 when unset
    GEMINI_MODEL: str = "gemini-2.0-flash"  # override to gemini-2.5-pro for deeper reasoning

    # Cache
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @property
    def cors_origins_list(self) -> List[str]:
        raw = self.CORS_ORIGINS.strip()
        if not raw:
            return [_DEFAULT_CORS]
        if raw.startswith("["):
            return json.loads(raw)
        return [o.strip() for o in raw.split(",") if o.strip()]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def coerce_cors_origins(cls, v: object) -> str:
        if v is None or (isinstance(v, str) and not v.strip()):
            return _DEFAULT_CORS
        if isinstance(v, list):
            return ",".join(str(o) for o in v)
        return str(v)


settings = Settings()
