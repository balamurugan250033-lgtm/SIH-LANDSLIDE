import os
from pydantic import model_validator
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Landslide Early Warning & Risk Monitoring System"
    API_V1_STR: str = "/api/v1"
    
    # Database
    DATABASE_URL: str = "sqlite:///./landslide.db"
    
    # External APIs (Placeholders - MUST NOT use fake data, actual APIs must be configured here)
    # WEATHER_API_KEY supports third-party weather providers while preserving
    # compatibility with deployments that already use IMD_API_KEY.
    WEATHER_API_KEY: str = os.getenv("WEATHER_API_KEY", "")
    IMD_API_KEY: str = ""
    IMD_API_URL: str = "https://weather.indianapi.in/india/weather"
    
    # Twilio (SMS)
    TWILIO_ACCOUNT_SID: str = os.getenv("TWILIO_ACCOUNT_SID", "")
    TWILIO_AUTH_TOKEN: str = os.getenv("TWILIO_AUTH_TOKEN", "")
    TWILIO_FROM_NUMBER: str = os.getenv("TWILIO_FROM_NUMBER", "")

    # Auth Settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "sih2026_landslide_secret_key_change_me_in_prod")
    ALGORITHM: str = os.getenv("ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Configurable Thresholds
    STALE_DATA_THRESHOLD_MINUTES: int = 120

    class Config:
        env_file = ".env"

    @model_validator(mode="after")
    def use_weather_key_when_imd_key_is_unset(self):
        if not self.IMD_API_KEY:
            self.IMD_API_KEY = self.WEATHER_API_KEY
        return self

settings = Settings()
