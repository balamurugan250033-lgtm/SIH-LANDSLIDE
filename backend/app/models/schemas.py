from pydantic import BaseModel, Field, model_validator
from typing import Optional, List
from datetime import datetime

class RegionBase(BaseModel):
    name: str
    latitude: float
    longitude: float

class RegionCreate(RegionBase):
    pass

class Region(RegionBase):
    id: int
    class Config:
        from_attributes = True

class ObservationBase(BaseModel):
    rainfall_mm: Optional[float] = None
    soil_moisture_percent: Optional[float] = None
    slope_angle: Optional[float] = None

class ObservationCreate(ObservationBase):
    region_id: int

class Observation(ObservationBase):
    id: int
    region_id: int
    timestamp: datetime
    is_stale: bool
    data_quality_score: float
    class Config:
        from_attributes = True

class CitizenReportCreate(BaseModel):
    region_id: int
    hazard_types: List[str] = Field(min_length=1, max_length=10)
    description: str = Field(min_length=3, max_length=500)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    media_path: Optional[str] = None
    media_content_type: Optional[str] = None

class CitizenReport(BaseModel):
    id: int
    region_id: int
    hazard_types: List[str] = []
    description: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    photo_url: Optional[str] = None
    media_path: Optional[str] = None
    media_content_type: Optional[str] = None
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True

    @model_validator(mode='before')
    @classmethod
    def extract_hazard_types(cls, data):
        if isinstance(data, dict):
            return data
        hazard_type_str = getattr(data, 'hazard_type', '') or ''
        data_dict = {
            'id': getattr(data, 'id', None),
            'region_id': getattr(data, 'region_id', None),
            'hazard_types': [h.strip() for h in hazard_type_str.split(',') if h.strip()],
            'description': getattr(data, 'description', ''),
            'latitude': getattr(data, 'latitude', None),
            'longitude': getattr(data, 'longitude', None),
            'photo_url': getattr(data, 'media_path', None),
            'media_path': getattr(data, 'media_path', None),
            'media_content_type': getattr(data, 'media_content_type', None),
            'timestamp': getattr(data, 'timestamp', None),
            'status': getattr(data, 'status', ''),
        }
        return data_dict

class AlertBase(BaseModel):
    region_id: int
    risk_level: str
    risk_score: Optional[float] = None
    reason: str
    delivery_status: Optional[str] = "pending"
    delivery_channel: Optional[str] = "system"
    sent_count: Optional[int] = 0
    failed_count: Optional[int] = 0
    delivery_details: Optional[str] = None

class Alert(AlertBase):
    id: int
    timestamp: datetime
    class Config:
        from_attributes = True

class SourceHealth(BaseModel):
    source_name: str
    status: str
    last_sync: datetime
    class Config:
        from_attributes = True

class RiskStatusResponse(BaseModel):
    region: Region
    current_alert: Optional[Alert]
    latest_observation: Optional[Observation]
    data_status: str # LIVE, STALE, OFFLINE

class UserCreate(BaseModel):
    email: Optional[str] = None
    username: Optional[str] = None
    password: str = Field(min_length=8, max_length=128)
    role: Optional[str] = None  # Defaults to "citizen" if not specified
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = "en"
    region_id: Optional[int] = None

    @model_validator(mode="after")
    def require_email_or_username(self):
        if not self.email and not self.username:
            raise ValueError("email is required")
        return self

    @property
    def identifier(self) -> str:
        return (self.email or self.username).strip().lower()

class UserResponse(BaseModel):
    id: int
    username: str
    email: Optional[str] = None
    role: str
    phone_number: Optional[str] = None
    preferred_language: Optional[str] = "en"
    region_id: Optional[int] = None
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[str] = None

class NotificationBase(BaseModel):
    region_id: int
    risk_level: str
    title: str
    message: str
    language: str = "en"
    channel: str = "web"

class NotificationCreate(NotificationBase):
    pass

class Notification(NotificationBase):
    id: int
    status: str
    delivery_status: Optional[str] = "pending"
    delivery_details: Optional[str] = None
    sent_at: Optional[datetime] = None
    created_at: datetime
    created_by: Optional[str] = None
    class Config:
        from_attributes = True


class RoadStatusBase(BaseModel):
    region_id: int
    road_name: str
    status: str
    reason: Optional[str] = None
    alternative_route: Optional[str] = None

class RoadStatusCreate(RoadStatusBase):
    pass

class RoadStatus(RoadStatusBase):
    id: int
    updated_at: datetime
    class Config:
        from_attributes = True


class AdminLogin(BaseModel):
    username: str
    password: str


class AdminStats(BaseModel):
    total_regions: int
    total_alerts: int
    total_notifications: int
    active_users: int


class RegionDetail(BaseModel):
    region_id: int
    name: str
    latitude: float
    longitude: float
    rainfall_mm: Optional[float] = None
    soil_saturation: Optional[float] = None
    slope_angle: Optional[float] = None
    vibration: Optional[bool] = False
    alert_message: Optional[str] = None
    risk_level: Optional[str] = "LOW"


class RegionUpdate(BaseModel):
    name: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    rainfall_mm: Optional[float] = None
    soil_saturation: Optional[float] = None
    slope_angle: Optional[float] = None
    vibration: Optional[bool] = None
    alert_message: Optional[str] = None
    risk_level: Optional[str] = None


class AlertCreate(BaseModel):
    region_id: int
    severity: str
    alert_type: str = "LANDSLIDE_WARNING"
    reason: str
    risk_level: Optional[str] = None
    rainfall_mm: Optional[float] = None
    soil_saturation: Optional[float] = None
    vibration: Optional[bool] = False


class NotificationSend(BaseModel):
    region_id: int
    channel: str = "SMS"
    message: str
    recipients: List[str] = []
    language: str = "en"
