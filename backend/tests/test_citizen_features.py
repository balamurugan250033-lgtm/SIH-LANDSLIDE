import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app
from app.models import models
from app.core.security import get_password_hash

# Use isolated in-memory SQLite database for testing
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
    
    # Seed test data
    regions = [
        models.Region(name="Test Region A", latitude=10.0, longitude=20.0),
        models.Region(name="Test Region B", latitude=30.0, longitude=40.0)
    ]
    db.add_all(regions)
    
    # Create test admin and citizen users
    admin_user = models.User(
        username="admin_user",
        email="admin@test.com",
        hashed_password=get_password_hash("admin_password"),
        role="admin"
    )
    citizen_user = models.User(
        username="citizen_user",
        email="citizen@test.com",
        hashed_password=get_password_hash("citizen_password"),
        role="citizen"
    )
    db.add_all([admin_user, citizen_user])
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

# ==================== CITIZEN AUTHENTICATION TESTS ====================

def test_citizen_registration(client):
    """Test that citizens can register with default role"""
    reg_data = {
        "username": "new_citizen",
        "email": "new_citizen@test.com",
        "password": "secure_password_123"
    }
    response = client.post("/api/v1/auth/register", json=reg_data)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["username"] == "new_citizen"
    assert res_data["email"] == "new_citizen@test.com"
    assert res_data["role"] == "citizen"

def test_citizen_login(client):
    """Test that citizen can login and receive JWT token"""
    login_data = {
        "username": "citizen_user",
        "password": "citizen_password"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 200
    token_data = response.json()
    assert "access_token" in token_data
    assert token_data["token_type"] == "bearer"

def test_citizen_login_wrong_password(client):
    """Test that login fails with wrong password"""
    login_data = {
        "username": "citizen_user",
        "password": "wrong_password"
    }
    response = client.post("/api/v1/auth/login", json=login_data)
    assert response.status_code == 400

# ==================== ROLE-BASED ACCESS CONTROL TESTS ====================

def test_health_endpoint_is_public_for_demo(client):
    """Public status check should work without auth for browser health banners."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_citizen_cannot_access_health_endpoint(client):
    """Test that citizens cannot access admin-only health endpoint"""
    # Register and login as citizen
    reg_data = {
        "username": "test_citizen",
        "email": "test_citizen@test.com",
        "password": "password123"
    }
    client.post("/api/v1/auth/register", json=reg_data)
    
    login_data = {"username": "test_citizen", "password": "password123"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Try to access health endpoint - should fail
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200

def test_citizen_cannot_create_region(client):
    """Test that citizens cannot create regions"""
    # Register and login as citizen
    reg_data = {
        "username": "test_citizen2",
        "email": "test_citizen2@test.com",
        "password": "password123"
    }
    client.post("/api/v1/auth/register", json=reg_data)
    
    login_data = {"username": "test_citizen2", "password": "password123"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Try to create a region - should fail
    region_data = {
        "name": "New Region",
        "latitude": 15.0,
        "longitude": 75.0
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/regions", json=region_data, headers=headers)
    assert response.status_code == 403  # Forbidden

def test_admin_can_access_health_endpoint(client):
    """Test that admins can access health endpoint"""
    # Login as admin
    login_data = {"username": "admin_user", "password": "admin_password"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Access health endpoint - should succeed
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/health", headers=headers)
    assert response.status_code == 200

def test_admin_can_create_region(client):
    """Test that admins can create regions"""
    # Login as admin
    login_data = {"username": "admin_user", "password": "admin_password"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Create a region - should succeed
    region_data = {
        "name": "Admin Created Region",
        "latitude": 20.0,
        "longitude": 85.0
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/regions", json=region_data, headers=headers)
    assert response.status_code == 200
    res_data = response.json()
    assert res_data["name"] == "Admin Created Region"

# ==================== CITIZEN ENDPOINTS TESTS ====================

def test_citizen_submit_report(client):
    """Test that citizens can submit reports via citizen endpoint"""
    report_data = {
        "region_id": 1,
        "hazard_type": "Landslide",
        "description": "Major landslide on the hillside blocking access",
        "latitude": 10.1,
        "longitude": 20.1
    }
    response = client.post("/api/v1/citizen/reports", json=report_data)
    assert response.status_code == 200
    report = response.json()
    assert report["hazard_type"] == "Landslide"
    assert report["region_id"] == 1
    assert report["status"] == "Submitted"
    assert report["latitude"] == 10.1
    assert report["longitude"] == 20.1

def test_citizen_get_risk_status(client):
    """Test that citizens can get risk status for a region"""
    response = client.get("/api/v1/citizen/risk?region_id=1")
    assert response.status_code == 200
    risk_data = response.json()
    assert "region" in risk_data
    assert "current_alert" in risk_data
    assert "latest_observation" in risk_data
    assert "data_status" in risk_data

def test_citizen_get_alerts(client):
    """Test that citizens can get alerts"""
    response = client.get("/api/v1/citizen/alerts")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)

def test_citizen_get_alerts_for_specific_region(client):
    """Test that citizens can filter alerts by region"""
    response = client.get("/api/v1/citizen/alerts?region_id=1")
    assert response.status_code == 200
    alerts = response.json()
    assert isinstance(alerts, list)
    # All alerts should be from region 1
    for alert in alerts:
        assert alert["region_id"] == 1

# ==================== ADMIN ONLY ENDPOINTS TESTS ====================

def test_citizen_cannot_view_all_reports(client):
    """Test that citizens cannot view all reports (admin endpoint)"""
    # Register and login as citizen
    reg_data = {
        "username": "test_citizen3",
        "email": "test_citizen3@test.com",
        "password": "password123"
    }
    client.post("/api/v1/auth/register", json=reg_data)
    
    login_data = {"username": "test_citizen3", "password": "password123"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Try to get all reports - should fail
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/reports", headers=headers)
    assert response.status_code == 403  # Forbidden

def test_admin_can_view_all_reports(client):
    """Test that admins can view all reports"""
    # Login as admin
    login_data = {"username": "admin_user", "password": "admin_password"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Get all reports - should succeed
    headers = {"Authorization": f"Bearer {token}"}
    response = client.get("/api/v1/reports", headers=headers)
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_citizen_cannot_record_observation(client):
    """Test that citizens cannot record environmental observations"""
    # Register and login as citizen
    reg_data = {
        "username": "test_citizen4",
        "email": "test_citizen4@test.com",
        "password": "password123"
    }
    client.post("/api/v1/auth/register", json=reg_data)
    
    login_data = {"username": "test_citizen4", "password": "password123"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Try to post observation - should fail
    obs_data = {
        "region_id": 1,
        "rainfall_mm": 50.0,
        "soil_moisture_percent": 60.0,
        "slope_angle": 30.0
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/environment/observations", json=obs_data, headers=headers)
    assert response.status_code == 403  # Forbidden

def test_admin_can_record_observation(client):
    """Test that admins can record environmental observations"""
    # Login as admin
    login_data = {"username": "admin_user", "password": "admin_password"}
    token_response = client.post("/api/v1/auth/login", json=login_data)
    token = token_response.json()["access_token"]
    
    # Post observation - should succeed
    obs_data = {
        "region_id": 1,
        "rainfall_mm": 75.0,
        "soil_moisture_percent": 70.0,
        "slope_angle": 35.0
    }
    headers = {"Authorization": f"Bearer {token}"}
    response = client.post("/api/v1/environment/observations", json=obs_data, headers=headers)
    assert response.status_code == 200
    obs = response.json()
    assert obs["rainfall_mm"] == 75.0

# ==================== OFFLINE SYNC TESTS ====================

def test_queued_reports_sync(client, session):
    """Test that queued reports can be synced when online"""
    # Submit a report
    report_data = {
        "region_id": 1,
        "hazard_type": "Mudslide",
        "description": "Mudslide blocking the main road",
        "latitude": 10.5,
        "longitude": 20.5
    }
    response = client.post("/api/v1/citizen/reports", json=report_data)
    assert response.status_code == 200
    
    # Verify the report was saved
    report = response.json()
    assert report["id"] is not None
    
    # Query database to verify
    db_report = session.query(models.CitizenReport).filter(
        models.CitizenReport.id == report["id"]
    ).first()
    assert db_report is not None
    assert db_report.status == "Submitted"
