from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import declarative_base
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

engine = create_engine(
    settings.DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def migrate_schema():
    """Apply the additive migrations needed by the prototype's SQLite DB."""
    inspector = inspect(engine)
    with engine.begin() as connection:
        table_names = inspector.get_table_names()
        
        if "users" in table_names:
            user_columns = {column["name"] for column in inspector.get_columns("users")}
            if "email" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN email VARCHAR"))
            if "phone_number" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN phone_number VARCHAR"))
            if "preferred_language" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN preferred_language VARCHAR DEFAULT 'en'"))
            if "region_id" not in user_columns:
                connection.execute(text("ALTER TABLE users ADD COLUMN region_id INTEGER"))
            connection.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_users_email ON users (email)"))

        if "alerts" in table_names:
            alert_columns = {column["name"] for column in inspector.get_columns("alerts")}
            alert_additions = {
                "delivery_status": "VARCHAR DEFAULT 'pending'",
                "delivery_channel": "VARCHAR DEFAULT 'system'",
                "sent_count": "INTEGER DEFAULT 0",
                "failed_count": "INTEGER DEFAULT 0",
                "delivery_details": "VARCHAR",
            }
            for name, sql_type in alert_additions.items():
                if name not in alert_columns:
                    connection.execute(text(f"ALTER TABLE alerts ADD COLUMN {name} {sql_type}"))

        if "notifications" in table_names:
            notif_columns = {column["name"] for column in inspector.get_columns("notifications")}
            notif_additions = {
                "delivery_status": "VARCHAR DEFAULT 'pending'",
                "delivery_details": "VARCHAR",
            }
            for name, sql_type in notif_additions.items():
                if name not in notif_columns:
                    connection.execute(text(f"ALTER TABLE notifications ADD COLUMN {name} {sql_type}"))

        if "citizen_reports" in table_names:
            report_columns = {column["name"] for column in inspector.get_columns("citizen_reports")}
            additions = {
                "latitude": "FLOAT",
                "longitude": "FLOAT",
                "media_path": "VARCHAR",
                "media_content_type": "VARCHAR",
            }
            for name, sql_type in additions.items():
                if name not in report_columns:
                    connection.execute(text(f"ALTER TABLE citizen_reports ADD COLUMN {name} {sql_type}"))


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def seed_data():
    from app.models import models
    from app.core.security import get_password_hash
    db = SessionLocal()
    try:
        if db.query(models.User).filter(models.User.username == "admin_test").first() is None:
            db.add(models.User(
                username="admin_test",
                email="admin_test@example.com",
                hashed_password=get_password_hash("admin_password"),
                role="admin"
            ))
            db.commit()
            print("Seeded default admin account for admin dashboard login.")

        if db.query(models.Region).count() == 0:
            regions = [
                models.Region(name="Kohima, Nagaland", latitude=25.6586, longitude=94.1093),
                models.Region(name="Shillong, Meghalaya", latitude=25.5683, longitude=91.8762),
                models.Region(name="Aizawl, Mizoram", latitude=23.7271, longitude=92.7176),
                models.Region(name="Itanagar, Arunachal Pradesh", latitude=27.0844, longitude=93.6053),
                models.Region(name="Imphal, Manipur", latitude=24.8170, longitude=93.9368),
                models.Region(name="Dimapur, Nagaland", latitude=25.9092, longitude=93.7266),
                models.Region(name="Gangtok, Sikkim", latitude=27.3389, longitude=88.6065),
                models.Region(name="NH-2 Assam Corridor", latitude=26.1445, longitude=91.7362),
                models.Region(name="East Khasi Hills, Meghalaya", latitude=25.4646, longitude=91.7835)
            ]
            db.add_all(regions)
            db.commit()
            print("Database seeded with NER landslide-prone regions.")

        regions = db.query(models.Region).all()
        if db.query(models.Observation).count() == 0:
            now = __import__('datetime').datetime.utcnow()
            for index, region in enumerate(regions):
                rainfall = 42 + index * 18
                moisture = 45 + index * 9
                slope = 24 + index * 6
                db.add(models.Observation(
                    region_id=region.id,
                    rainfall_mm=float(rainfall),
                    soil_moisture_percent=float(moisture),
                    slope_angle=float(slope),
                    timestamp=now,
                    is_stale=False,
                    data_quality_score=0.96
                ))
                if index % 2 == 0:
                    db.add(models.Alert(
                        region_id=region.id,
                        risk_level='MODERATE' if index % 2 == 0 else 'HIGH',
                        risk_score=58 + index * 8,
                        timestamp=now,
                        reason='Heavy rainfall and unstable slope conditions observed.'
                    ))
            db.commit()
            print("Seeded live demo observations and alerts for active monitoring.")

        if db.query(models.CitizenReport).count() == 0:
            demo_region = db.query(models.Region).first()
            if demo_region:
                db.add(models.CitizenReport(
                    region_id=demo_region.id,
                    hazard_type='Soil Cracks',
                    description='Visible soil cracks and muddy flow near the hillside path.',
                    latitude=demo_region.latitude + 0.02,
                    longitude=demo_region.longitude + 0.03,
                    timestamp=__import__('datetime').datetime.utcnow(),
                    status='Submitted'
                ))
                db.commit()

        if db.query(models.RoadStatus).count() == 0:
            regions = db.query(models.Region).all()
            for idx, region in enumerate(regions):
                statuses = ["open", "at_risk", "blocked"]
                reasons = ["Clear", "Minor landslides reported", "Major landslide - road closed"]
                alternatives = ["NH-6 alternate route", "Local village road", "Helicopter rescue only"]
                db.add(models.RoadStatus(
                    region_id=region.id,
                    road_name=f"{region.name} Main Road",
                    status=statuses[idx % 3],
                    reason=reasons[idx % 3],
                    alternative_route=alternatives[idx % 3]
                ))
            db.commit()
            print("Seeded road statuses for regions.")
    except Exception as e:
        print(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
