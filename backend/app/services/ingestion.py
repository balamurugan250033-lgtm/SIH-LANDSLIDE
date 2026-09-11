import requests
import logging
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
from app.core.config import settings

logger = logging.getLogger(__name__)

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

def fetch_mosdac_data(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """Fetch optional MOSDAC data from a server-configured endpoint."""
    if not settings.MOSDAC_ENABLED or not settings.MOSDAC_API_URL or not settings.MOSDAC_API_KEY:
        return None
    try:
        response = requests.get(
            settings.MOSDAC_API_URL,
            params={"latitude": latitude, "longitude": longitude},
            headers={"Authorization": f"Bearer {settings.MOSDAC_API_KEY}", "X-API-Key": settings.MOSDAC_API_KEY},
            timeout=20,
        )
        response.raise_for_status()
        payload = response.json()
        data = payload.get("data", payload) if isinstance(payload, dict) else {}
        return {
            "rainfall_mm": data.get("rainfall_24h", data.get("rainfall_mm")),
            "rainfall_72h": data.get("rainfall_72h"),
            "soil_moisture_percent": data.get("soil_moisture", data.get("soil_moisture_percent")),
            "elevation": data.get("elevation"),
            "slope_angle": data.get("slope", data.get("slope_angle")),
            "soil_type": data.get("soil_type"),
            "geology": data.get("geology"),
            "previous_landslide": data.get("previous_landslide"),
            "temperature": data.get("temperature"),
        }
    except (requests.RequestException, ValueError) as error:
        logger.warning("MOSDAC data unavailable: %s", error)
        return None

def fetch_openmeteo_data(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Fetch real-time weather and soil data from Open-Meteo (free, no API key).
    Returns rainfall_mm (summed over last 24h), soil_moisture_percent (avg),
    and soil_temperature from the forecast.
    """
    try:
        response = requests.get(
            OPEN_METEO_URL,
            params={
                "latitude": latitude,
                "longitude": longitude,
                "hourly": "rain,soil_moisture_0_to_1cm,soil_moisture_3_to_9cm,soil_moisture_9_to_27cm,soil_moisture_27_to_81cm,soil_temperature_54cm",
                "forecast_days": 1,
                "past_days": 1,
            },
            timeout=15
        )
        if response.status_code != 200:
            logger.warning(f"Open-Meteo returned status {response.status_code}")
            return None
        payload = response.json()
        hourly = payload.get("hourly", {})

        # Sum rainfall over the last 24 hours
        rain_values = hourly.get("rain", []) or []
        rainfall_mm = sum(float(v) for v in rain_values[-24:]) if rain_values else 0.0

        # Average soil moisture across depth layers (convert m³/m³ to %)
        soil_keys = ["soil_moisture_0_to_1cm", "soil_moisture_3_to_9cm",
                      "soil_moisture_9_to_27cm", "soil_moisture_27_to_81cm"]
        all_moisture = []
        for key in soil_keys:
            vals = hourly.get(key, []) or []
            all_moisture.extend(float(v) for v in vals if v is not None)
        soil_moisture_percent = (sum(all_moisture) / len(all_moisture) * 100) if all_moisture else 0.0

        # Soil temperature (latest reading)
        soil_temp_values = hourly.get("soil_temperature_54cm", []) or []
        soil_temp = float(soil_temp_values[-1]) if soil_temp_values else None

        return {
            "rainfall_mm": round(rainfall_mm, 2),
            "soil_moisture_percent": round(soil_moisture_percent, 2),
            "soil_temperature": soil_temp,
        }
    except requests.RequestException as e:
        logger.error(f"Open-Meteo API request failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Open-Meteo data parsing failed: {str(e)}")
        return None

def fetch_windy_data(latitude: float, longitude: float) -> Optional[Dict[str, Any]]:
    """
    Fetch real-time weather and soil data from Windy API.
    Returns rainfall_mm (24h sum), soil_moisture_percent, and soil_temperature.
    """
    if not settings.WINDY_API_KEY:
        return None

    try:
        payload = {
            "lat": latitude,
            "lon": longitude,
            "model": "gfs",
            "parameters": ["windU", "windV", "windGust", "temp", "rh", "pressure", "precip", "soilT", "soilMoisture"],
            "levels": ["surface", "50m", "850h"],
            "key": settings.WINDY_API_KEY,
        }
        response = requests.post(
            "https://api.windy.com/api/point-forecast/v2",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        if response.status_code != 200:
            logger.warning(f"Windy API returned status {response.status_code}")
            return None

        data = response.json()
        ts = data.get("ts", [])
        precip = data.get("precip", []) or []
        soil_moisture = data.get("soilMoisture", []) or []
        soil_temp = data.get("soilT", []) or []

        # Sum last 24 hours of precipitation (hourly-ish steps)
        recent_precip = [float(v) for v in precip[-24:] if v is not None]
        rainfall_mm = sum(recent_precip) if recent_precip else 0.0

        # Average soil moisture across available depth layers
        all_moisture = []
        for layer in soil_moisture:
            vals = layer if isinstance(layer, list) else [layer]
            all_moisture.extend(float(v) for v in vals if v is not None)
        soil_moisture_percent = (sum(all_moisture) / len(all_moisture) * 100) if all_moisture else 0.0

        # Soil temperature from deepest available layer
        soil_temp_values = []
        for layer in soil_temp:
            vals = layer if isinstance(layer, list) else [layer]
            soil_temp_values.extend(float(v) for v in vals if v is not None)
        soil_temp_c = soil_temp_values[-1] if soil_temp_values else None

        return {
            "rainfall_mm": round(rainfall_mm, 2),
            "soil_moisture_percent": round(soil_moisture_percent, 2),
            "soil_temperature": soil_temp_c,
        }
    except requests.RequestException as e:
        logger.error(f"Windy API request failed: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Windy data parsing failed: {str(e)}")
        return None

def get_supported_cities() -> Optional[List[str]]:
    if not settings.IMD_API_KEY:
        logger.warning("IMD API key not configured. Cannot fetch city list.")
        return None
    
    try:
        # Call the /india/cities endpoint to get supported cities
        response = requests.get(
            "https://weather.indianapi.in/india/cities",
            headers={"x-api-key": settings.IMD_API_KEY},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            # Extract city list - exact structure depends on API response
            cities = data.get("cities", [])
            return [city.lower() for city in cities] if cities else None
        else:
            logger.warning(f"Failed to fetch city list from IndianAPI. Status: {response.status_code}")
            return None
    except requests.RequestException as e:
        logger.error(f"Failed to connect to IndianAPI cities endpoint: {str(e)}")
        return None

def fetch_imd_rainfall_data(region_name: str) -> Optional[Dict[str, Any]]:
    """
    Fetches real rainfall data from IndianAPI's Indian Weather endpoint.
    
    Before calling the weather API, validates that the city is supported.
    If the city is not in the supported list, logs a clear warning and returns None.
    If the API is unconfigured or fails, returns None. No fake data is generated.
    """
    if not settings.IMD_API_URL or not settings.IMD_API_KEY:
        logger.warning("IMD API is not configured. Cannot fetch rainfall data.")
        return None
    
    try:
        # Extract city name from region (format: "CityName, State")
        city = region_name.split(",", maxsplit=1)[0].strip()
        city_lower = city.lower()
        
        # Get supported cities list
        supported_cities = get_supported_cities()
        if supported_cities and city_lower not in supported_cities:
            logger.warning(f"City '{city}' is not in the list of supported cities. Falling back to nearest supported city or skipping.")
            # In a production system, you could implement fallback logic here
            # For now, we just return None to avoid incorrect data
            return None
        
        # Call weather API for the city
        response = requests.get(
            settings.IMD_API_URL,
            params={"city": city},
            headers={"x-api-key": settings.IMD_API_KEY},
            timeout=10
        )
        
        if response.status_code == 200:
            payload = response.json()
            rainfall = payload.get("weather", {}).get("current", {}).get("rainfall")
            if rainfall is None:
                logger.info("IndianAPI returned no rainfall reading for %s.", city)
                return None
            try:
                return {"rainfall_mm": float(rainfall)}
            except (TypeError, ValueError):
                logger.warning("IndianAPI returned a non-numeric rainfall reading for %s.", city)
                return None
        elif response.status_code == 404:
            logger.warning(f"City '{city}' not found in IndianAPI. Verify city name and spelling.")
            return None
        else:
            logger.error(f"IMD API returned status code {response.status_code} for city {city}")
            return None
    except requests.RequestException as e:
        logger.error(f"Failed to connect to IMD API: {str(e)}")
        return None

