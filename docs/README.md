# CAMPUS-X — Smart Campus Management System

A full-stack campus management platform with AI-powered room finding, timetable management, resource sharing, complaint tracking, and real-time analytics.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, TanStack Query |
| Backend | Node.js, Express, TypeScript, Prisma ORM |
| Database | PostgreSQL 15 |
| Auth | JWT (access + refresh tokens) |
| AI Copilot | OpenAI GPT-4o (optional) |
| ML Service | Python 3.11, FastAPI, scikit-learn |
| Container | Docker + Docker Compose |

---

## Prerequisites

- Docker Desktop 4.x+
- Node.js 20+
- npm 10+

---

## Setup

### 1. Clone and configure environment

```bash
git clone <repo-url>
cd campus-x
cp .env.example .env
```

Edit `.env` with your values:

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://campusx:campusx123@localhost:5432/campusx` |
| `JWT_SECRET` | JWT signing secret | change in production |
| `JWT_REFRESH_SECRET` | JWT refresh token secret | change in production |
| `PORT` | Backend API port | `3001` |
| `FRONTEND_URL` | Frontend origin for CORS | `http://localhost:5173` |
| `OPENAI_API_KEY` | OpenAI key for AI Copilot | optional |
| `ML_SERVICE_URL` | FastAPI ML service URL | `http://localhost:8001` |

### 2. Start all services

```bash
docker-compose up -d
```

This starts: PostgreSQL, the Express backend, the Python ML service, and the React dev server.

### 3. Run database migrations

```bash
cd backend
npx prisma migrate dev
```

### 4. Seed demo data

```bash
npx prisma db seed
```

This creates 55 demo users, 6 buildings, ~120 rooms, timetable entries, resources, and complaints.

### 5. Start frontend separately (dev only)

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser Client                           │
│           React 18 + Vite + TanStack Query + Tailwind           │
│                        :5173                                    │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST / JSON
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Express API Server                           │
│            Node.js + TypeScript + Prisma ORM                    │
│                        :3001                                    │
│                                                                 │
│  Routes: auth, buildings, rooms, timetable, reservations,       │
│          resources, complaints, analytics, ai, optimization,    │
│          reports, energy, ml                                    │
└───────┬──────────────────────────────────────────┬─────────────┘
        │ Prisma                                   │ HTTP
        ▼                                          ▼
┌───────────────────┐                  ┌──────────────────────────┐
│   PostgreSQL 15   │                  │  FastAPI ML Service       │
│      :5432        │                  │  Python 3.11 + sklearn    │
│                   │                  │       :8001               │
│  campusx schema   │                  │                          │
└───────────────────┘                  └──────────────────────────┘
```

---

## Role-Based Access

| Role | Capabilities |
|---|---|
| **ADMIN** | Full access — buildings, rooms, timetable, complaints, analytics, reports, energy, ML forecasts, AI copilot |
| **FACULTY** | AI copilot, find classrooms, reserve rooms, upload resources, file/view complaints, view timetable |
| **STUDENT** | AI copilot, search/download resources, view timetable, file complaints, find classrooms |
| **GUEST** | Read-only campus map, no authentication required |

---

## Demo Credentials

| Role | Email | Password |
|---|---|---|
| Admin | `admin@campusx.edu` | `Admin@123` |
| Admin 2 | `admin1@campusx.edu` | `Admin@123` |
| Faculty | `faculty1@campusx.edu` | `Faculty@123` |
| Faculty 2 | `faculty2@campusx.edu` | `Faculty@123` |
| Student | `student1@campusx.edu` | `Student@123` |
| Student 2 | `student2@campusx.edu` | `Student@123` |
| Guest | `guest1@campusx.edu` | `Guest@123` |

---

## Demo Scenarios

### 1. Admin — Building and Room Setup
**URL:** `/admin/buildings`  
Log in as `admin@campusx.edu`. Create a new building (e.g. "Physics Block"), then navigate to Rooms and filter by the new building. Add rooms with types (Classroom, Lab) and verify they appear in the map.

### 2. Admin — Timetable Management
**URL:** `/admin/timetable`  
Select the active semester and a class. Click on any empty cell to add a timetable entry. The Conflicts panel on the right highlights double-booked rooms or faculty automatically.

### 3. Faculty — Room Reservation
**URL:** `/find-classroom`  
Log in as `faculty1@campusx.edu`. Click "Find Available Now" to see rooms available in the current period. Click Reserve on any room. Navigate to `/faculty/reservations` to confirm the booking.

### 4. Faculty — Resource Upload
**URL:** `/faculty/upload`  
Log in as a faculty account. Upload a PDF question paper for a subject. It enters a pending state until an admin approves it at `/admin/` (future admin resource approval screen).

### 5. Student — Resource Download
**URL:** `/student/resources`  
Log in as `student1@campusx.edu`. Filter by Department = CSE, Semester = 5, Exam Type = END_SEM. Download a question paper.

### 6. AI Copilot — Location Query
**URL:** `/ai-copilot`  
Log in with any authenticated role. Click the chip "Where is CSE-204?" — the bot responds with the room location, building, floor, and current status as a mini-card.

### 7. Admin — Analytics Dashboard
**URL:** `/admin/analytics`  
Log in as admin. The dashboard shows live stats (rooms, available rooms, active complaints, today's classes), utilization charts per building, complaint trend graph, room type pie chart, and energy consumption over 30 days.

---

## Running Tests

```bash
# Backend
cd backend && npm test

# Frontend lint/type-check
cd frontend && npm run build
```
