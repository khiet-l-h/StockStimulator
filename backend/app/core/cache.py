import json
import logging
from typing import Any

import redis

from app.core.config import settings

logger = logging.getLogger(__name__)

_pool: redis.ConnectionPool | None = None


def _client() -> redis.Redis:  # type: ignore[type-arg]
    global _pool
    if _pool is None:
        _pool = redis.ConnectionPool.from_url(settings.REDIS_URL, decode_responses=True)
    return redis.Redis(connection_pool=_pool)


def _stale_key(key: str) -> str:
    return f"stale:{key}"


def _stale_ttl(primary_ttl: int) -> int:
    """Stale entries live much longer so they can serve as fallback when the provider rate-limits."""
    return max(primary_ttl * 48, 86_400)  # at least 1 day


def cache_get(key: str) -> Any | None:
    try:
        raw = _client().get(key)
        return json.loads(raw) if raw is not None else None
    except redis.RedisError as exc:
        logger.warning("Redis GET failed (%s): %s", key, exc)
        return None
    except (json.JSONDecodeError, TypeError) as exc:
        logger.warning("Redis cache corrupt (%s): %s", key, exc)
        return None


def cache_set(key: str, value: Any, ttl: int) -> None:
    try:
        serialized = json.dumps(value, default=str)
        client = _client()
        client.setex(key, ttl, serialized)
        # Write a long-lived stale copy used as provider-error fallback
        client.setex(_stale_key(key), _stale_ttl(ttl), serialized)
    except redis.RedisError as exc:
        logger.warning("Redis SET failed (%s): %s", key, exc)


def cache_get_stale(key: str) -> Any | None:
    """Return stale (potentially expired primary) data for graceful degradation."""
    try:
        raw = _client().get(_stale_key(key))
        if raw is None:
            return None
        logger.info("Serving stale cache for key: %s", key)
        return json.loads(raw)
    except redis.RedisError as exc:
        logger.warning("Redis STALE GET failed (%s): %s", key, exc)
        return None
    except (json.JSONDecodeError, TypeError):
        return None
