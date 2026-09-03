from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import endpoints
from app.database import engine, Base, seed_data, migrate_schema

# Create DB tables
Base.metadata.create_all(bind=engine)
migrate_schema()
seed_data()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Welcome to the Landslide Early Warning API"}

app.include_router(endpoints.router, prefix=settings.API_V1_STR)
