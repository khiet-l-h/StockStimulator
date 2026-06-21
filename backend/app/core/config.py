from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    DATABASE_URL: str
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # Market data
    ALPHA_VANTAGE_API_KEY: str

    # News
    NEWS_API_KEY: str = ""  # newsapi.org — optional; news features return empty when unset

    # AI recommendations (Google Gemini — free at aistudio.google.com)
    GEMINI_API_KEY: str = ""  # optional; recommendation endpoint returns 503 when unset
    GEMINI_MODEL: str = "gemini-1.5-flash"  # override to gemini-1.5-pro for deeper reasoning

    # Cache
    REDIS_URL: str = "redis://localhost:6379/0"

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> List[str]:
        if isinstance(v, str):
            # Support both JSON array and comma-separated values
            stripped = v.strip()
            if stripped.startswith("["):
                import json
                return json.loads(stripped)
            return [origin.strip() for origin in stripped.split(",")]
        return v  # type: ignore[return-value]


settings = Settings()
