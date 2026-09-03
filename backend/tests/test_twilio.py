import pytest
from unittest.mock import MagicMock
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

from app.database import Base, get_db
from app.main import app
from app.models import models
from app.core.security import get_password_hash
from app.services.alerting import TwilioAlertService, SMS_TEMPLATES, alert_service

# Isolated SQLite in-memory DB for test suite
SQLALCHEMY_DATABASE_URL = "sqlite://"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(name="session")
def session_fixture():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()

    # Seed test region
    region = models.Region(name="Guwahati Hills", latitude=26.1445, longitude=91.7362)
    db.add(region)
    db.commit()
    db.refresh(region)

    # Seed test users: admin + citizens with phone numbers and languages
    admin_user = models.User(
        username="admin_test",
        email="admin@test.com",
        hashed_password=get_password_hash("admin_password"),
        role="admin",
    )
    citizen_en = models.User(
        username="citizen_en",
        email="citizen_en@test.com",
        hashed_password=get_password_hash("citizen_password"),
        role="citizen",
        phone_number="+919876543210",
        preferred_language="en",
        region_id=region.id,
    )
    citizen_hi = models.User(
        username="citizen_hi",
        email="citizen_hi@test.com",
        hashed_password=get_password_hash("citizen_password"),
        role="citizen",
        phone_number="+919876543211",
        preferred_language="hi",
        region_id=region.id,
    )
    citizen_as = models.User(
        username="citizen_as",
        email="citizen_as@test.com",
        hashed_password=get_password_hash("citizen_password"),
        role="citizen",
        phone_number="+919876543212",
        preferred_language="as",
        region_id=region.id,
    )

    db.add_all([admin_user, citizen_en, citizen_hi, citizen_as])
    db.commit()

    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(name="client")
def client_fixture(session):
    def override_get_db():
        try:
            yield session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    yield TestClient(app)
    del app.dependency_overrides[get_db]


@pytest.fixture(name="admin_token")
def admin_token_fixture(client):
    login_data = {"username": "admin_test", "password": "admin_password"}
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    return response.json()["access_token"]


# ==================== UNIT TESTS FOR TWILIO SERVICE ====================


def test_format_message_all_languages_and_tiers():
    """Verify templates format correctly across all regional languages and severity tiers."""
    service = TwilioAlertService()
    languages = ["en", "hi", "as", "bn", "mni", "khasi", "mizo", "naga"]
    tiers = ["MODERATE", "HIGH", "CRITICAL", "SEVERE"]

    for lang in languages:
        for tier in tiers:
            msg = service.format_message("Munnar", tier, reason="Rainfall 120mm", language=lang)
            assert "Munnar" in msg
            assert len(msg) > 10


def test_send_sms_with_mocked_twilio_client():
    """Verify SMS sending calls Twilio client with proper arguments."""
    service = TwilioAlertService()
    service.account_sid = "AC_mock_sid"
    service.auth_token = "mock_auth_token"
    service.from_number = "+15005550006"

    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_test_mock_12345"
    mock_client.messages.create.return_value = mock_msg
    service.set_client(mock_client)

    result = service.send_sms("+919876543210", "Test emergency alert message")

    assert result["status"] == "sent"
    assert result["sid"] == "SM_test_mock_12345"
    assert result["to"] == "+919876543210"

    mock_client.messages.create.assert_called_once_with(
        to="+919876543210",
        from_="+15005550006",
        body="Test emergency alert message",
    )


def test_send_sms_retry_logic_on_transient_error():
    """Verify retry logic on temporary network/service errors."""
    service = TwilioAlertService()
    service.from_number = "+15005550006"

    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_retry_success"
    # First attempt raises exception, second attempt succeeds
    mock_client.messages.create.side_effect = [
        Exception("Transient connection timeout"),
        mock_msg,
    ]
    service.set_client(mock_client)

    result = service.send_sms("+919876543210", "Retry alert message", max_retries=2)

    assert result["status"] == "sent"
    assert result["sid"] == "SM_retry_success"
    assert mock_client.messages.create.call_count == 2


def test_send_sms_invalid_number():
    """Verify invalid phone numbers return failed status without crashing."""
    service = TwilioAlertService()
    result = service.send_sms("invalid-number-xyz", "Test message")
    assert result["status"] == "failed"
    assert "Invalid phone number" in result["error"]


def test_send_sms_simulation_mode_when_unconfigured():
    """Verify simulation mode when Twilio credentials are not provided."""
    service = TwilioAlertService()
    service.account_sid = ""
    service.auth_token = ""
    service.from_number = ""
    service.set_client(None)

    result = service.send_sms("+919876543210", "Simulation mode test")
    assert result["status"] == "simulated"
    assert result["sid"].startswith("SM_sim_")


def test_dispatch_alert_sms_to_region_subscribers(session):
    """Verify dispatching alert broadcasts to region subscribers with language customization."""
    region = session.query(models.Region).first()
    alert = models.Alert(
        region_id=region.id,
        risk_level="CRITICAL",
        risk_score=0.92,
        timestamp=datetime.utcnow(),
        reason="Critical rainfall 220mm detected",
        delivery_status="pending",
    )
    session.add(alert)
    session.commit()
    session.refresh(alert)

    service = TwilioAlertService()
    service.from_number = "+15005550006"
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_broadcast_test"
    mock_client.messages.create.return_value = mock_msg
    service.set_client(mock_client)

    dispatch_res = service.dispatch_alert_sms(session, alert, region.name)

    assert dispatch_res["status"] == "sent"
    assert dispatch_res["sent_count"] == 3  # 3 registered citizens with phone numbers
    assert mock_client.messages.create.call_count == 3

    # Check alert updated in DB
    session.refresh(alert)
    assert alert.delivery_status == "sent"
    assert alert.sent_count == 3
    assert alert.delivery_channel == "sms"


# ==================== ENDPOINT INTEGRATION TESTS ====================


def test_sensor_observation_triggers_twilio_alert(client, admin_token, session):
    """Verify posting high-risk sensor observation creates Alert and triggers Twilio SMS."""
    # Inject mocked client into the singleton alert_service
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_endpoint_trigger_123"
    mock_client.messages.create.return_value = mock_msg
    alert_service.from_number = "+15005550006"
    alert_service.set_client(mock_client)

    headers = {"Authorization": f"Bearer {admin_token}"}
    region = session.query(models.Region).first()

    # Elevated measurements triggering landslide prediction
    obs_data = {
        "region_id": region.id,
        "rainfall_mm": 250.0,
        "soil_moisture_percent": 90.0,
        "slope_angle": 45.0,
    }
    response = client.post("/api/v1/environment/observations", json=obs_data, headers=headers)
    assert response.status_code == 200

    # Verify Alert was created in database with delivery status
    db_alert = session.query(models.Alert).filter(models.Alert.region_id == region.id).order_by(models.Alert.timestamp.desc()).first()
    assert db_alert is not None
    assert db_alert.risk_level in ["HIGH", "CRITICAL", "SEVERE"]
    assert db_alert.delivery_status == "sent"
    assert db_alert.sent_count >= 1

    # Verify Twilio SMS was called
    assert mock_client.messages.create.called


def test_admin_notification_send_sms_broadcast(client, admin_token, session):
    """Verify admin notification with channel=sms triggers Twilio broadcast."""
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_notif_broadcast"
    mock_client.messages.create.return_value = mock_msg
    alert_service.from_number = "+15005550006"
    alert_service.set_client(mock_client)

    headers = {"Authorization": f"Bearer {admin_token}"}
    region = session.query(models.Region).first()

    # Create notification draft
    notif_data = {
        "region_id": region.id,
        "risk_level": "SEVERE",
        "title": "Emergency Evacuation",
        "message": "Immediate road closure on Hill Road 4. Move to safe zone.",
        "language": "en",
        "channel": "sms",
    }
    create_res = client.post("/api/v1/admin/notifications", json=notif_data, headers=headers)
    assert create_res.status_code == 200
    notif_id = create_res.json()["id"]

    # Send notification
    send_res = client.post(f"/api/v1/admin/notifications/{notif_id}/send", headers=headers)
    assert send_res.status_code == 200
    sent_notif = send_res.json()
    assert sent_notif["status"] == "sent"
    assert sent_notif["delivery_status"] == "sent"
    assert mock_client.messages.create.called


def test_manual_dispatch_sms_endpoint(client, admin_token, session):
    """Verify POST /admin/alerts/{alert_id}/dispatch-sms manually triggers SMS."""
    mock_client = MagicMock()
    mock_msg = MagicMock()
    mock_msg.sid = "SM_manual_dispatch"
    mock_client.messages.create.return_value = mock_msg
    alert_service.from_number = "+15005550006"
    alert_service.set_client(mock_client)

    headers = {"Authorization": f"Bearer {admin_token}"}
    region = session.query(models.Region).first()

    alert = models.Alert(
        region_id=region.id,
        risk_level="HIGH",
        risk_score=0.85,
        timestamp=datetime.utcnow(),
        reason="Heavy downpour warning",
    )
    session.add(alert)
    session.commit()
    session.refresh(alert)

    response = client.post(f"/api/v1/admin/alerts/{alert.id}/dispatch-sms", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "sent"
    assert data["sent_count"] >= 1

