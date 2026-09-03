from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, timedelta
import os

from app.database import get_db
from app.models import models, schemas
from app.core.config import settings
from app.core.security import verify_password, get_password_hash, create_access_token, get_current_user, require_admin
from app.services.validation import validate_environmental_data
from app.services.decision import evaluate_warning_decision
from app.services.ingestion import fetch_imd_rainfall_data
from app.services.alerting import alert_service

router = APIRouter()

@router.get("/health", response_model=List[schemas.SourceHealth])
def check_health(db: Session = Depends(get_db)):
    from app.ml.inference import MODEL_PATH
    imd_configured = bool(settings.IMD_API_URL and settings.IMD_API_KEY)
    imd_status = "CONNECTED" if imd_configured else "UNCONFIGURED"
    imd_health = db.query(models.SourceHealth).filter(models.SourceHealth.source_name == "IMD_API").first()
    if not imd_health:
        imd_health = models.SourceHealth(source_name="IMD_API")
        db.add(imd_health)
    imd_health.status = imd_status
    imd_health.last_sync = datetime.utcnow()
    ml_configured = os.path.exists(MODEL_PATH)
    ml_status = "CONNECTED" if ml_configured else "OFFLINE"
    ml_health = db.query(models.SourceHealth).filter(models.SourceHealth.source_name == "ML_SERVICE").first()
    if not ml_health:
        ml_health = models.SourceHealth(source_name="ML_SERVICE")
        db.add(ml_health)
    ml_health.status = ml_status
    ml_health.last_sync = datetime.utcnow()
    db.commit()
    return [imd_health, ml_health]

# Auth Endpoints
@router.post("/auth/register", response_model=schemas.UserResponse)
def register(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    if user_in.username:
        db_user = db.query(models.User).filter(models.User.username == user_in.username).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Username already registered")
    if user_in.email:
        db_user = db.query(models.User).filter(models.User.email == user_in.email).first()
        if db_user:
            raise HTTPException(status_code=400, detail="Email already registered")
    hashed_pwd = get_password_hash(user_in.password)
    user_role = user_in.role if user_in.role == "admin" else "citizen"
    new_user = models.User(
        username=user_in.username, email=user_in.email, hashed_password=hashed_pwd,
        role=user_role, phone_number=user_in.phone_number,
        preferred_language=user_in.preferred_language or "en", region_id=user_in.region_id
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/auth/login", response_model=schemas.Token)
def login(user_in: schemas.UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == user_in.username).first()
    if not user or not verify_password(user_in.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(user.username, user.role)
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/admin/login", response_model=schemas.Token)
def admin_login(credentials: schemas.AdminLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == credentials.username).first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Administrator access required")
    access_token = create_access_token(user.username, user.role)
    return {"access_token": access_token, "token_type": "bearer"}

# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/stats")
def get_admin_stats(admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    total_regions = db.query(models.Region).count()
    total_alerts = db.query(models.Alert).count()
    total_notifications = db.query(models.Notification).count()
    active_users = db.query(models.User).filter(models.User.role == "citizen").count()
    return {
        "total_regions": total_regions,
        "total_alerts": total_alerts,
        "total_notifications": total_notifications,
        "active_users": active_users,
    }

# Regions
@router.get("/admin/regions", response_model=List[schemas.RegionDetail])
def list_admin_regions(admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    regions = db.query(models.Region).all()
    result = []
    for region in regions:
        obs = db.query(models.Observation).filter(models.Observation.region_id == region.id).order_by(models.Observation.timestamp.desc()).first()
        alert = db.query(models.Alert).filter(models.Alert.region_id == region.id).order_by(models.Alert.timestamp.desc()).first()
        result.append({
            "region_id": region.id,
            "name": region.name,
            "latitude": region.latitude,
            "longitude": region.longitude,
            "rainfall_mm": obs.rainfall_mm if obs else None,
            "soil_saturation": obs.soil_moisture_percent if obs else None,
            "slope_angle": obs.slope_angle if obs else None,
            "vibration": False,
            "alert_message": alert.reason if alert else None,
            "risk_level": alert.risk_level if alert else "LOW",
        })
    return result

@router.post("/admin/regions", response_model=schemas.Region)
def create_region(region: schemas.RegionCreate, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    db_region = models.Region(**region.model_dump())
    db.add(db_region)
    db.commit()
    db.refresh(db_region)
    return db_region

@router.put("/admin/regions/{region_id}", response_model=schemas.RegionDetail)
def update_region(region_id: int, update: schemas.RegionUpdate, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    if update.name is not None: region.name = update.name
    if update.latitude is not None: region.latitude = update.latitude
    if update.longitude is not None: region.longitude = update.longitude
    db.commit()
    db.refresh(region)
    obs = db.query(models.Observation).filter(models.Observation.region_id == region.id).order_by(models.Observation.timestamp.desc()).first()
    alert = db.query(models.Alert).filter(models.Alert.region_id == region.id).order_by(models.Alert.timestamp.desc()).first()
    if update.rainfall_mm is not None and obs:
        obs.rainfall_mm = update.rainfall_mm
        db.commit()
    if update.soil_saturation is not None and obs:
        obs.soil_moisture_percent = update.soil_saturation
        db.commit()
    if update.slope_angle is not None and obs:
        obs.slope_angle = update.slope_angle
        db.commit()
    if update.alert_message is not None and alert:
        alert.reason = update.alert_message
        db.commit()
    if update.risk_level is not None and alert:
        alert.risk_level = update.risk_level
        db.commit()
    return {
        "region_id": region.id, "name": region.name, "latitude": region.latitude, "longitude": region.longitude,
        "rainfall_mm": obs.rainfall_mm if obs else None, "soil_saturation": obs.soil_moisture_percent if obs else None,
        "slope_angle": obs.slope_angle if obs else None, "vibration": False,
        "alert_message": alert.reason if alert else None, "risk_level": alert.risk_level if alert else "LOW",
    }

@router.delete("/admin/regions/{region_id}")
def delete_region(region_id: int, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    db.delete(region)
    db.commit()
    return {"message": "Region deleted"}

# Alerts
@router.get("/admin/alerts", response_model=List[schemas.Alert])
def list_admin_alerts(admin_user: models.User = Depends(require_admin), skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()

@router.post("/admin/alerts", response_model=schemas.Alert)
def create_alert(alert_in: schemas.AlertCreate, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == alert_in.region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    db_alert = models.Alert(
        region_id=alert_in.region_id,
        risk_level=alert_in.risk_level or alert_in.severity,
        risk_score=None,
        timestamp=datetime.utcnow(),
        reason=alert_in.reason,
        delivery_status="pending",
        delivery_channel="system",
    )
    db.add(db_alert)
    db.commit()
    db.refresh(db_alert)
    if alert_in.rainfall_mm is not None or alert_in.soil_saturation is not None:
        obs = db.query(models.Observation).filter(models.Observation.region_id == alert_in.region_id).order_by(models.Observation.timestamp.desc()).first()
        if obs:
            if alert_in.rainfall_mm is not None: obs.rainfall_mm = alert_in.rainfall_mm
            if alert_in.soil_saturation is not None: obs.soil_moisture_percent = alert_in.soil_saturation
            db.commit()
    return db_alert

# Notifications
@router.get("/admin/notifications", response_model=List[schemas.Notification])
def list_admin_notifications(admin_user: models.User = Depends(require_admin), skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Notification).order_by(models.Notification.created_at.desc()).offset(skip).limit(limit).all()

@router.post("/admin/notifications", response_model=schemas.Notification)
def create_and_send_notification(notification_in: schemas.NotificationSend, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == notification_in.region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    db_notification = models.Notification(
        region_id=notification_in.region_id,
        risk_level="MODERATE",
        title=f"Landslide Alert - {region.name}",
        message=notification_in.message,
        language=notification_in.language,
        channel=notification_in.channel.lower(),
        status="sent",
        delivery_status="pending",
        created_by=admin_user.username,
        sent_at=datetime.utcnow(),
    )
    db.add(db_notification)
    db.commit()
    db.refresh(db_notification)
    if notification_in.channel.upper() in ["SMS", "ALL", "MESH"]:
        try:
            alert_service.dispatch_notification_sms(db, db_notification)
        except Exception:
            pass
    db_notification.delivery_status = "sent"
    db_notification.delivery_details = f"Delivered via {notification_in.channel}"
    db.commit()
    db.refresh(db_notification)
    return db_notification

# Citizen Endpoints
@router.get("/citizen/regions", response_model=List[schemas.RegionDetail])
def get_citizen_regions(db: Session = Depends(get_db)):
    regions = db.query(models.Region).all()
    result = []
    for region in regions:
        obs = db.query(models.Observation).filter(models.Observation.region_id == region.id).order_by(models.Observation.timestamp.desc()).first()
        alert = db.query(models.Alert).filter(models.Alert.region_id == region.id).order_by(models.Alert.timestamp.desc()).first()
        result.append({
            "region_id": region.id,
            "name": region.name,
            "latitude": region.latitude,
            "longitude": region.longitude,
            "rainfall_mm": obs.rainfall_mm if obs else None,
            "soil_saturation": obs.soil_moisture_percent if obs else None,
            "slope_angle": obs.slope_angle if obs else None,
            "vibration": False,
            "alert_message": alert.reason if alert else None,
            "risk_level": alert.risk_level if alert else "LOW",
        })
    return result

@router.get("/citizen/alerts", response_model=List[schemas.Alert])
def get_citizen_alerts(region_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.Alert).filter(models.Alert.timestamp >= datetime.utcnow() - timedelta(hours=24))
    if region_id:
        query = query.filter(models.Alert.region_id == region_id)
    return query.order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()

@router.post("/citizen/reports", response_model=schemas.CitizenReport)
def submit_citizen_report(report: schemas.CitizenReportCreate, db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == report.region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    db_report = models.CitizenReport(
        region_id=report.region_id,
        hazard_type=", ".join(report.hazard_types),
        description=report.description,
        latitude=report.latitude,
        longitude=report.longitude,
        media_path=report.photo_url or report.media_path,
        media_content_type=report.media_content_type,
        status="Submitted",
        timestamp=datetime.utcnow()
    )
    db.add(db_report)
    db.commit()
    db.refresh(db_report)
    return db_report

@router.get("/citizen/notifications", response_model=List[schemas.Notification])
def get_citizen_notifications(region_id: Optional[int] = None, skip: int = 0, limit: int = 50, db: Session = Depends(get_db)):
    query = db.query(models.Notification).filter(models.Notification.status == "sent")
    if region_id:
        query = query.filter(models.Notification.region_id == region_id)
    return query.order_by(models.Notification.sent_at.desc()).offset(skip).limit(limit).all()

# Regions (public)
@router.get("/regions", response_model=List[schemas.Region])
def read_regions(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Region).offset(skip).limit(limit).all()

# Risk Status
@router.get("/risk/{region_id}", response_model=schemas.RiskStatusResponse)
def get_risk_status(region_id: int, db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    observation = db.query(models.Observation).filter(models.Observation.region_id == region_id).order_by(models.Observation.timestamp.desc()).first()
    alert = db.query(models.Alert).filter(models.Alert.region_id == region_id, models.Alert.timestamp >= datetime.utcnow() - timedelta(hours=24)).order_by(models.Alert.timestamp.desc()).first()
    data_status = "UNAVAILABLE"
    if observation:
        data_status = "STALE" if observation.is_stale else "LIVE"
    return schemas.RiskStatusResponse(region=region, current_alert=alert, latest_observation=observation, data_status=data_status)

# Environmental Ingestion
@router.post("/environment/observations", response_model=schemas.Observation)
def create_observation(observation: schemas.ObservationCreate, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == observation.region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    data_dict = observation.model_dump()
    data_dict["timestamp"] = datetime.utcnow()
    validation_res = validate_environmental_data(data_dict)
    if not validation_res["is_valid"]:
        raise HTTPException(status_code=400, detail=f"Validation failed: {', '.join(validation_res['errors'])}")
    db_observation = models.Observation(
        region_id=observation.region_id, timestamp=data_dict["timestamp"],
        rainfall_mm=observation.rainfall_mm, soil_moisture_percent=observation.soil_moisture_percent,
        slope_angle=observation.slope_angle, is_stale=validation_res["is_stale"], data_quality_score=validation_res["data_quality_score"]
    )
    db.add(db_observation)
    db.commit()
    db.refresh(db_observation)
    decision = evaluate_warning_decision(db_observation)
    if decision:
        db_alert = models.Alert(
            region_id=db_observation.region_id, risk_level=decision["risk_level"], risk_score=decision["risk_score"],
            timestamp=datetime.utcnow(), reason=decision["reason"], delivery_status="pending", delivery_channel="sms"
        )
        db.add(db_alert)
        db.commit()
        db.refresh(db_alert)
        alert_service.dispatch_alert_sms(db, db_alert, region.name)
    return db_observation

@router.post("/environment/ingest")
def trigger_ingest(admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    regions = db.query(models.Region).all()
    ingested_count = 0
    check_health(admin_user, db)
    for region in regions:
        rainfall_data = fetch_imd_rainfall_data(region.name)
        if rainfall_data:
            prev_obs = db.query(models.Observation).filter(models.Observation.region_id == region.id).order_by(models.Observation.timestamp.desc()).first()
            prev_moisture = prev_obs.soil_moisture_percent if prev_obs else 35.0
            prev_slope = prev_obs.slope_angle if prev_obs else 25.0
            data_dict = {
                "region_id": region.id, "rainfall_mm": rainfall_data.get("rainfall_mm", 0.0),
                "soil_moisture_percent": prev_moisture, "slope_angle": prev_slope, "timestamp": datetime.utcnow()
            }
            validation_res = validate_environmental_data(data_dict)
            if validation_res["is_valid"]:
                db_observation = models.Observation(
                    region_id=region.id, timestamp=data_dict["timestamp"], rainfall_mm=data_dict["rainfall_mm"],
                    soil_moisture_percent=data_dict["soil_moisture_percent"], slope_angle=data_dict["slope_angle"],
                    is_stale=validation_res["is_stale"], data_quality_score=validation_res["data_quality_score"]
                )
                db.add(db_observation)
                db.commit()
                db.refresh(db_observation)
                decision = evaluate_warning_decision(db_observation)
                if decision:
                    db_alert = models.Alert(
                        region_id=region.id, risk_level=decision["risk_level"], risk_score=decision["risk_score"],
                        timestamp=datetime.utcnow(), reason=decision["reason"], delivery_status="pending", delivery_channel="sms"
                    )
                    db.add(db_alert)
                    db.commit()
                    db.refresh(db_alert)
                    alert_service.dispatch_alert_sms(db, db_alert, region.name)
                ingested_count += 1
    return {"message": f"Ingestion process completed. Ingested data for {ingested_count} regions."}

# Reports (admin)
@router.get("/reports", response_model=List[schemas.CitizenReport])
def read_reports(admin_user: models.User = Depends(require_admin), skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.CitizenReport).order_by(models.CitizenReport.timestamp.desc()).offset(skip).limit(limit).all()

# Alerts (public)
@router.get("/alerts", response_model=List[schemas.Alert])
def read_alerts(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(models.Alert).order_by(models.Alert.timestamp.desc()).offset(skip).limit(limit).all()

@router.post("/admin/alerts/{alert_id}/dispatch-sms")
def trigger_alert_sms(alert_id: int, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    alert = db.query(models.Alert).filter(models.Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    result = alert_service.dispatch_alert_sms(db, alert)
    return result

# Road Status
@router.post("/admin/road-statuses", response_model=schemas.RoadStatus)
def create_road_status(road: schemas.RoadStatusCreate, admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    region = db.query(models.Region).filter(models.Region.id == road.region_id).first()
    if not region:
        raise HTTPException(status_code=404, detail="Region not found")
    existing = db.query(models.RoadStatus).filter(models.RoadStatus.region_id == road.region_id, models.RoadStatus.road_name == road.road_name).first()
    if existing:
        existing.status = road.status
        existing.reason = road.reason
        existing.alternative_route = road.alternative_route
        existing.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(existing)
        return existing
    db_road = models.RoadStatus(**road.model_dump())
    db.add(db_road)
    db.commit()
    db.refresh(db_road)
    return db_road

@router.get("/admin/road-statuses", response_model=List[schemas.RoadStatus])
def list_road_statuses(admin_user: models.User = Depends(require_admin), db: Session = Depends(get_db)):
    return db.query(models.RoadStatus).order_by(models.RoadStatus.updated_at.desc()).all()

@router.get("/citizen/road-statuses", response_model=List[schemas.RoadStatus])
def get_citizen_road_statuses(region_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(models.RoadStatus)
    if region_id:
        query = query.filter(models.RoadStatus.region_id == region_id)
    return query.order_by(models.RoadStatus.updated_at.desc()).all()
