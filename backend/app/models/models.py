from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class Region(Base):
    __tablename__ = "regions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    latitude = Column(Float)
    longitude = Column(Float)
    
    observations = relationship("Observation", back_populates="region")
    alerts = relationship("Alert", back_populates="region")
    reports = relationship("CitizenReport", back_populates="region")
    subscribers = relationship("User", back_populates="region")

class Observation(Base):
    __tablename__ = "observations"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    timestamp = Column(DateTime, default=datetime.utcnow)
    
    # These must come from real data sources. No fake data.
    rainfall_mm = Column(Float, nullable=True)
    soil_moisture_percent = Column(Float, nullable=True)
    slope_angle = Column(Float, nullable=True)
    
    # Status flags based on data freshness
    is_stale = Column(Boolean, default=False)
    data_quality_score = Column(Float, default=1.0)
    
    region = relationship("Region", back_populates="observations")

class CitizenReport(Base):
    __tablename__ = "citizen_reports"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    hazard_type = Column(String)
    description = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    status = Column(String, default="Submitted") # Submitted, Under Review, Validated, Rejected
    latitude = Column(Float, nullable=True)
    longitude = Column(Float, nullable=True)
    media_path = Column(String, nullable=True)
    media_content_type = Column(String, nullable=True)
    
    region = relationship("Region", back_populates="reports")

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    risk_level = Column(String) # LOW, MODERATE, HIGH, CRITICAL, SEVERE
    risk_score = Column(Float, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    reason = Column(String)
    delivery_status = Column(String, default="pending") # pending, sent, failed, simulated, skipped
    delivery_channel = Column(String, default="system") # system, sms, push, all
    sent_count = Column(Integer, default=0)
    failed_count = Column(Integer, default=0)
    delivery_details = Column(String, nullable=True)
    
    region = relationship("Region", back_populates="alerts")

class SourceHealth(Base):
    __tablename__ = "source_health"
    id = Column(Integer, primary_key=True, index=True)
    source_name = Column(String, unique=True, index=True)
    status = Column(String) # CONNECTED, UNAVAILABLE, OFFLINE
    last_sync = Column(DateTime)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True, nullable=True)
    hashed_password = Column(String)
    role = Column(String, default="citizen")
    phone_number = Column(String, nullable=True)
    preferred_language = Column(String, default="en")
    region_id = Column(Integer, ForeignKey("regions.id"), nullable=True)

    region = relationship("Region", back_populates="subscribers")

class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    risk_level = Column(String)
    title = Column(String)
    message = Column(String)
    language = Column(String, default="en")
    channel = Column(String, default="web") # web, sms, push, all
    status = Column(String, default="draft") # draft, sent, failed
    delivery_status = Column(String, default="pending") # pending, sent, failed, simulated, skipped
    delivery_details = Column(String, nullable=True)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    created_by = Column(String, nullable=True)

    region = relationship("Region", back_populates="notifications")

class RoadStatus(Base):
    __tablename__ = "road_statuses"
    id = Column(Integer, primary_key=True, index=True)
    region_id = Column(Integer, ForeignKey("regions.id"))
    road_name = Column(String)
    status = Column(String) # open, at_risk, blocked
    reason = Column(String, nullable=True)
    alternative_route = Column(String, nullable=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    region = relationship("Region", back_populates="road_statuses")

Region.notifications = relationship("Notification", back_populates="region")
Region.road_statuses = relationship("RoadStatus", back_populates="region")

