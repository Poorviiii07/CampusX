# CAMPUS-X — AI-Powered Smart Campus Management System

A full-stack campus management platform with real-time classroom availability, timetable management, academic resource repository, complaint tracking, AI copilot, analytics dashboard, and an ML prediction engine.

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18+ |
| Python | 3.11+ |
| PostgreSQL | 15 |
| npm | 9+ |

## Quick Start

### 1. Clone

```bash
git clone <repo-url> campus-x
cd campus-x
```

### 2. Configure environment

```bash
# Root .env (backend reads this)
cp .env.example .env
# Edit .env and fill in JWT_SECRET, JWT_REFRESH_SECRET, DATABASE_URL

# Frontend .env
cp frontend/.env.example frontend/.env
```

### 3. Install dependencies

```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install

# ML service
cd ../ml-service && pip install -r requirements.txt
```

### 4. Set up the database

```bash
cd backend

# Run migrations
npx prisma migrate dev --name init

# Seed demo data
npm run db:seed
```

### 5. Start services

**Backend** (terminal 1):
```bash
cd backend
npm run dev
# API available at http://localhost:3001
```

**Frontend** (terminal 2):
```bash
cd frontend
npm run dev
# UI available at http://localhost:5173
```

**ML service** (terminal 3):
```bash
cd ml-service
uvicorn main:app --host 0.0.0.0 --port 8001 --reload
# ML API available at http://localhost:8001
```

## Docker (all services)

```bash
docker-compose up -d
```

All four services start automatically: PostgreSQL, backend, frontend, ML service.

## Default credentials (seeded)

| Role | Email | Password |
|------|-------|---------|
| Admin | admin@campusx.edu | Admin@123 |
| Faculty | faculty@campusx.edu | Faculty@123 |
| Student | student@campusx.edu | Student@123 |

## Smoke tests

After all services are running:

```bash
BASE_URL=http://localhost:3001 bash docs/smoke-test.sh
```

## Full documentation

See [docs/README.md](docs/README.md) for architecture, API reference, database schema, and deployment guide.
