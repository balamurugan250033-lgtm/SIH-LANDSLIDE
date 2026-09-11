"""Replicate real ingestion records to Supabase without blocking local alerts."""
from __future__ import annotations

import logging
from typing import Any

import requests

from app.core.config import settings

logger = logging.getLogger(__name__)


def _enabled() -> bool:
    return bool(settings.SUPABASE_SYNC_ENABLED and settings.SUPABASE_URL and settings.SUPABASE_PUBLISHABLE_KEY)


def _headers() -> dict[str, str]:
    return {
        "apikey": settings.SUPABASE_PUBLISHABLE_KEY,
        "Authorization": f"Bearer {settings.SUPABASE_PUBLISHABLE_KEY}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates,return=minimal",
    }


def _upsert(table: str, record: dict[str, Any]) -> None:
    response = requests.post(
        f"{settings.SUPABASE_URL.rstrip('/')}/rest/v1/{table}",
        params={"on_conflict": "id"},
        headers=_headers(),
        json=record,
        timeout=12,
    )
    response.raise_for_status()


def sync_ingestion(region: Any, observation: Any) -> bool:
    """Upsert the exact region and just-ingested reading into Supabase."""
    if not _enabled():
        return False
    try:
        _upsert("regions", {
            "id": region.id, "name": region.name,
            "latitude": region.latitude, "longitude": region.longitude,
        })
        _upsert("observations", {
            "id": observation.id, "region_id": observation.region_id,
            "timestamp": observation.timestamp.isoformat(),
            "rainfall_mm": observation.rainfall_mm,
            "soil_moisture_percent": observation.soil_moisture_percent,
            "slope_angle": observation.slope_angle,
            "is_stale": observation.is_stale,
            "data_quality_score": observation.data_quality_score,
        })
        return True
    except requests.RequestException:
        logger.exception("Supabase ingestion sync failed; local record remains safely stored")
        return False
