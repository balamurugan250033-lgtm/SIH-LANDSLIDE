import requests
import logging
from typing import Optional, Dict, Any, List
from app.core.config import settings

logger = logging.getLogger(__name__)

def get_supported_cities() -> Optional[List[str]]:
    """
    Fetch the list of supported cities from IndianAPI.
    Returns list of city names or None if API call fails.
    """
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

