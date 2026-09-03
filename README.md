# NER Landslide Early Warning System

An offline-capable, multi-platform landslide monitoring and alerting system for the North-Eastern Region of India. The platform combines machine-learning risk assessment, citizen reporting, GIS views, official alert dispatch, and mobile mesh relay for low-connectivity environments.

## Product Photos

### Citizen safety platform

![Citizen safety platform](docs/screenshots/citizen-platform.png)

### Landslide Sentinel app mark

![Landslide Sentinel app mark](web/src/assets/hero.png)

## Demo Recordings

The repository includes recorded walkthroughs of the working interfaces:

- [Citizen platform demo](web-citizen/recordings/landslide-citizen-demo.webm)
- [Full citizen platform walkthrough](web-citizen/recordings/landslide-citizen-full-demo.webm)
- [Admin dashboard walkthrough](web-citizen/recordings/landslide-admin-full-demo.webm)
- [Additional recorded page demo](web-citizen/recordings/page%40f3d18f8af63809f63dbc252ee70f8148.webm)

GitHub may offer these `.webm` files as downloads rather than inline players. Download a recording and open it in a browser or VLC.

<video controls width="720" src="web-citizen/recordings/landslide-citizen-full-demo.webm"></video>

<video controls width="720" src="web-citizen/recordings/landslide-admin-full-demo.webm"></video>

## Report and Project Documentation

The complete project report describes the problem, solution architecture, data flow, ML risk engine, offline-first mobile workflow, mesh alert relay, deployment instructions, testing notes, monitored regions, and future enhancements. The recorded walkthroughs above show the citizen and admin screens in action.

- [Open the complete project report](PROJECT_REPORT.html)
- [Offline QA checklist](OFFLINE_QA_CHECKLIST.md)
- [Smart India Hackathon presentation](SIH2026-IDEA-Presentation-Landslide-NER-UPDATED.pptx)

### Report at a glance

| Area | Implementation |
| --- | --- |
| Risk assessment | Random Forest probability inference mapped to Low, Moderate, High, and Severe |
| Citizen access | React/Vite web portal and React Native mobile app |
| Administration | Region monitoring, alert creation, preview, and broadcast workflows |
| Resilience | SQLite cache, offline report queue, automatic sync, and peer-to-peer mesh relay |
| Situational awareness | GIS map, citizen reports, notifications, road status, and evacuation information |
| Backend | FastAPI REST API, SQLAlchemy models, SQLite persistence, and validation services |

## Platform Features

- Four-tier risk classification: Low, Moderate, High, and Severe
- FastAPI backend with SQLite persistence and REST endpoints
- Random Forest-based landslide probability inference with explainable decisions
- Citizen web portal for regions, alerts, notifications, road status, and reports
- Admin dashboard for region management and alert broadcasting
- React Native mobile app with local SQLite cache and queued offline reports
- Bluetooth/Wi-Fi mesh relay for forwarding cached alerts between nearby devices
- GIS maps with risk-coloured region markers and evacuation information

## Repository Layout

| Directory | Purpose |
| --- | --- |
| `backend/` | FastAPI API, database models, validation, alerting, and ML inference |
| `web-citizen/` | Citizen-facing React/Vite web application |
| `web-admin/` | Administrator React/Vite dashboard |
| `web/` | Additional React web interface |
| `mobile/` | Expo/React Native application and native Android mesh module |
| `PROJECT_REPORT.html` | Detailed technical project report |
| `web-citizen/recordings/` | Recorded product walkthroughs |

## Quick Start

### Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The API is available at `http://localhost:8000` and interactive docs at `http://localhost:8000/docs`.

### Citizen Web App

```powershell
cd web-citizen
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

### Admin Web App

```powershell
cd web-admin
npm install
npm run dev -- --host 127.0.0.1 --port 5174
```

### Mobile App

```powershell
cd mobile
npm install
npx expo start
```

For a debug Android APK, see [`mobile/BUILD_APK.md`](mobile/BUILD_APK.md).

## API and Configuration Notes

The web clients currently expect the backend at `http://192.168.1.5:8000/api/v1`; update the client API constant for a different host or local-only setup. Local databases, environment files, virtual environments, dependency folders, caches, and build output are excluded by `.gitignore`.

## Technology Stack

Python, FastAPI, SQLAlchemy, SQLite, scikit-learn, React, Vite, Leaflet, React Native, Expo, Kotlin, Gradle, and Google Nearby Connections.

## Project Context

Built for Smart India Hackathon 2026 as a disaster-readiness solution focused on reliable warnings when internet infrastructure is intermittent or unavailable.