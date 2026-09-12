from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Set
from app.core.config import settings
from app.api import endpoints
from app.database import engine, Base, seed_data, migrate_schema, SessionLocal

configured_cors_origins = [
    origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()
]

Base.metadata.create_all(bind=engine)
migrate_schema()
seed_data()

app = FastAPI(title=settings.PROJECT_NAME)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://10.179.75.155:5173",
        "http://10.179.75.155:5174",
        "http://10.229.128.155:5173",
        "http://10.229.128.155:5174",
        "http://127.0.0.1:5177",
        "http://127.0.0.1:5178",
        "http://127.0.0.1:5179",
        "http://127.0.0.1:5180",
        "http://localhost:5177",
        "http://localhost:5178",
        "http://localhost:5179",
        "http://localhost:5180",
        "exp://127.0.0.1:8081",
        "exp://10.179.75.155:8081",
        "exp://10.229.128.155:8081",
        *configured_cors_origins,
    ],
    # Vercel assigns a distinct *.vercel.app hostname to production and preview
    # deployments. Keeping this scoped to Vercel avoids opening the API to every
    # arbitrary browser origin.
    allow_origin_regex=r"https://[a-z0-9-]+\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self._loop = None

    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.active_connections.add(ws)

    def disconnect(self, ws: WebSocket):
        self.active_connections.discard(ws)

    async def broadcast(self, message: dict):
        import json
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except:
                disconnected.add(connection)
        for conn in disconnected:
            self.active_connections.discard(conn)

    def sync_broadcast(self, message: dict):
        """Called from synchronous endpoints; schedules async broadcast on the event loop."""
        import asyncio
        if self._loop and self._loop.is_running():
            asyncio.run_coroutine_threadsafe(self.broadcast(message), self._loop)

ws_manager = ConnectionManager()

async def live_ingestion_loop():
    """Persist fresh weather/soil readings without requiring an admin click."""
    import asyncio
    import logging
    logger = logging.getLogger(__name__)
    interval = max(1, settings.LIVE_INGEST_INTERVAL_MINUTES) * 60
    while True:
        # Manual admin refresh performs an immediate pull. Background work waits
        # for the configured cadence so startup and test environments stay fast.
        await asyncio.sleep(interval)
        def ingest_in_worker():
            db = SessionLocal()
            try:
                # The endpoint's authorization dependency is handled by FastAPI;
                # the scheduled task calls its ingestion implementation directly.
                return endpoints.trigger_ingest(admin_user=None, db=db)
            finally:
                db.close()
        try:
            result = await asyncio.to_thread(ingest_in_worker)
            logger.info("Live telemetry refresh completed: %s", result.get("message"))
        except Exception:
            logger.exception("Live telemetry refresh failed; retaining last valid readings")

_live_ingestion_task = None

@app.on_event("startup")
async def store_loop():
    import asyncio
    ws_manager._loop = asyncio.get_event_loop()
    global _live_ingestion_task
    if settings.LIVE_INGEST_ENABLED:
        _live_ingestion_task = asyncio.create_task(live_ingestion_loop())

@app.on_event("shutdown")
async def stop_live_ingestion():
    if _live_ingestion_task:
        _live_ingestion_task.cancel()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await ws_manager.connect(ws)
    try:
        while True:
            await ws.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(ws)

@app.get("/")
def root():
    return {"message": "Welcome to the Landslide Early Warning API"}

app.include_router(endpoints.router, prefix=settings.API_V1_STR)
