import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.core.security import get_password_hash
from app.models import models

# Use isolated in-memory SQLite database for testing endpoints
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
    # Seed default regions for endpoint testing
    regions = [
        models.Region(name="Test Region A", latitude=10.0, longitude=20.0),
        models.Region(name="Test Region B", latitude=30.0, longitude=40.0)
    ]
    db.add_all(regions)
    
    # Create admin user for testing admin endpoints
    admin_user = models.User(
        username="admin_test",
        email="admin_test@test.com",
        hashed_password=get_password_hash("admin_password"),
        role="admin"
    )
    db.add(admin_user)
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
    """Get an admin JWT token for testing admin endpoints"""
    login_data = {
        "username": "admin_test",
        "password": "admin_password"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    return response.json()["access_token"]

def test_health_check(client, admin_token):
    """Health endpoint requires admin authentication"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert any(x["source_name"] == "IMD_API" for x in data)
    assert any(x["source_name"] == "ML_SERVICE" for x in data)

def test_auth_register_and_login(client):
    # Register
    reg_data = {
        "username": "tester",
        "password": "secure_password",
        "role": "citizen"
    }
    response = client.post("/api/v1/auth/register", json=reg_data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["username"] == "tester"
    assert res_data["role"] == "citizen"
    assert "hashed_password" not in res_data
    
    # Login
    login_data = {
        "username": "tester",
        "password": "secure_password"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

def test_get_regions(client):
    response = client.get("/api/v1/regions")
    assert response.status_code == 200
    regions = response.json()
    assert len(regions) == 2
    assert regions[0]["name"] == "Test Region A"


def test_seed_data_creates_default_admin_user(monkeypatch):
    import app.database as db_module
    from app.core.security import verify_password

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    Base.metadata.create_all(bind=engine)
    monkeypatch.setattr(db_module, "SessionLocal", TestingSessionLocal)

    db_module.seed_data()

    db = TestingSessionLocal()
    try:
        admin_user = db.query(models.User).filter(models.User.username == "admin_test").first()
        assert admin_user is not None
        assert admin_user.role == "admin"
        assert verify_password("admin_password", admin_user.hashed_password)
    finally:
        db.close()


def test_submit_citizen_report(client):
    report_data = {
        "region_id": 1,
        "hazard_type": "Rockfall",
        "description": "Minor boulders falling onto the road"
    }
    response = client.post("/api/v1/reports", json=report_data)
    assert response.status_code == 200
    report = response.json()
    assert report["hazard_type"] == "Rockfall"
    assert report["region_id"] == 1
    assert report["status"] == "Submitted"

def test_upload_sensor_observation_and_trigger_alert(client, admin_token):
    """Sensor observation endpoint requires admin authentication"""
    headers = {"Authorization": f"Bearer {admin_token}"}
    # Post elevated measurements
    obs_data = {
        "region_id": 1,
        "rainfall_mm": 210.0,
        "soil_moisture_percent": 88.0,
        "slope_angle": 42.0
    }
    response = client.post("/api/v1/environment/observations", json=obs_data, headers=headers)
    assert response.status_code == 200
    obs = response.json()
    assert obs["rainfall_mm"] == 210.0
    
    # Verify that risk status endpoint displays critical alert
    response = client.get("/api/v1/risk/1")
    assert response.status_code == 200
    risk_data = response.json()
    assert risk_data["data_status"] == "LIVE"
    assert risk_data["current_alert"] is not None
    assert risk_data["current_alert"]["risk_level"] in ["HIGH", "CRITICAL", "SEVERE"]
