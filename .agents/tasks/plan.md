# CAMPUS-X Implementation Plan

## Architecture Decisions

**Monorepo layout**: `campus-x/frontend`, `campus-x/backend`, `campus-x/ml-service`, `campus-x/database`, `campus-x/docs`. Docker Compose ties everything together. Rationale: clear separation while allowing shared `.env.example` and root-level scripts.

**Prisma schema strategy**: Single `schema.prisma` with all models. Enums declared first, then independent models (User, Building), then dependent models (Floor → Building, Room → Floor, etc.). No circular dependencies — ComplaintUpdate references Complaint via FK, not vice versa. Rationale: single source of truth, atomic migrations.

**Auth approach**: JWT access token (15 min) + refresh token (7 days) stored in httpOnly cookie; access token also returned in response body for SPA storage. Rationale: balance between XSS and CSRF protection.

**API response shape**: `{ success: bool, data: T, message?: string, errors?: string[] }`. Centralized `sendSuccess` / `sendError` helpers in `backend/src/utils/response.ts`. Rationale: consistent, type-safe client handling.

**Period system**: Periods 1–8 mapped to time slots via `backend/src/utils/period.ts`. Period calculator is a shared utility so availability, reservations, and timetable all agree on current period. Rationale: avoid drift between modules.

**File storage**: `backend/uploads/blueprints/` and `backend/uploads/resources/`. Served statically at `/uploads/*`. UUID-named files to avoid collisions. Rationale: no cloud dependency needed for local dev.

**ML service**: FastAPI on port 8001 with synthetic training data baked in. Node.js proxies via Axios. Rationale: keeps Python isolated, easy to swap for real models.

---

## Critical Files (everything else depends on these)

1. `backend/prisma/schema.prisma` — all entities, must exist before any migration or seed
2. `backend/src/utils/response.ts` — shared API response helpers
3. `backend/src/utils/period.ts` — period↔time mapping, used by availability, reservations, timetable
4. `backend/src/middleware/auth.ts` — `authenticateToken` + `requireRole`, used by every protected route
5. `backend/src/middleware/upload.ts` — multer config for blueprints and resources
6. `backend/src/app.ts` — Express app wiring, CORS, helmet, morgan, route mounting
7. `backend/src/server.ts` — entry point, listens on PORT
8. `backend/prisma/seed.ts` — all seed data (run after all migrations)
9. `frontend/src/contexts/AuthContext.tsx` — auth state, token refresh, useAuth hook
10. `frontend/src/router/index.tsx` — all routes with lazy loading and role guards
11. `frontend/src/api/client.ts` — Axios instance with interceptors (token attach + refresh)
12. `frontend/src/components/layout/AppShell.tsx` — sidebar + topbar shell wrapping all pages
13. `frontend/src/types/index.ts` — shared TypeScript interfaces matching Prisma output shapes
14. `ml-service/main.py` — FastAPI app entry point
15. `docker-compose.yml` — ties postgres + backend + frontend + ml-service together

---

## Prisma Schema Dependency Order

```
Enums first:
  Role, RoomType, RoomStatus, DayOfWeek, SemesterType, ExamType,
  ResourceType, ComplaintCategory, ComplaintStatus, ComplaintPriority,
  ReservationType, ReservationStatus, ResourceStatus

Independent models (no FK):
  User, Building, Department

One-level dependents:
  Floor(Building), Faculty(User,Department), Student(User,Department,Class)
  Subject(Department), Semester

Two-level dependents:
  Room(Floor,Building), Class(Department,Semester)
  TimetableEntry(Class,Subject,Faculty,Room,Semester)

Three-level dependents:
  RoomReservation(Room,User,Class)
  Resource(Subject,Department,User)
  Complaint(User,Building,Floor,Room)
  ComplaintUpdate(Complaint,User)
  EnergyRecord(Building,Floor,Room)
  AuditLog(User)
```

---

## TypeScript Configuration Gotchas

1. **Vite + React**: `tsconfig.json` must have `"jsx": "react-jsx"`, `"moduleResolution": "bundler"`. `tsconfig.node.json` separate for vite config.
2. **Backend**: `"module": "commonjs"`, `"target": "ES2020"`, `"esModuleInterop": true`, `"outDir": "./dist"`. Use `ts-node` with `tsconfig-paths` for dev; `tsc` for prod build.
3. **Prisma types**: Import from `@prisma/client`, not re-export. Run `npx prisma generate` before `tsc`.
4. **Path aliases**: Set `"paths": {"@/*": ["./src/*"]}` in both tsconfig and vite config. Add `vite-tsconfig-paths` plugin.
5. **Strict mode**: Enable `"strict": true` everywhere; Prisma nullable fields map to `T | null`, not `T | undefined`.
6. **multer types**: `@types/multer` needed; `req.file` is `Express.Multer.File | undefined`.
7. **cors + helmet**: Import as `import cors from 'cors'` requires `"esModuleInterop": true` and `"allowSyntheticDefaultImports": true`.

---

## Implementation Order (15 Phases mapped to build sequence)

- [ ] 1. **Project scaffolding** — initialize all three packages (frontend Vite, backend Node, ml-service FastAPI), install all dependencies, create `docker-compose.yml`, `.env.example`, root `package.json` scripts.
      Files: `campus-x/` root files, `frontend/`, `backend/`, `ml-service/`
      Verify: `docker-compose build` succeeds without errors.

- [ ] 2. **Prisma schema + migrations + seed** — write complete `schema.prisma` with all 20+ models and enums, run initial migration, write comprehensive `seed.ts` with all required seed data (5 buildings, 6 depts, 50+ rooms, 55 users, 2 semesters, 3 timetables, 20+ resources, 10+ complaints, 30-day energy records).
      Files: `backend/prisma/schema.prisma`, `backend/prisma/migrations/`, `backend/prisma/seed.ts`
      Verify: `cd backend && npx prisma migrate dev --name init && npx prisma db seed` — no errors, all records created.

- [ ] 3. **Backend core utilities + auth** — response helpers, period calculator, multer config, JWT helpers, auth middleware (`authenticateToken`, `requireRole`), app.ts, server.ts, auth routes (`/register`, `/login`, `/refresh`, `/logout`, `/me`), audit log service.
      Files: `backend/src/utils/`, `backend/src/middleware/`, `backend/src/app.ts`, `backend/src/server.ts`, `backend/src/routes/auth.ts`, `backend/src/services/audit.ts`
      Verify: `cd backend && npm run dev` starts; `curl -X POST localhost:3001/api/auth/login -d '{"email":"admin@campusx.edu","password":"Admin@123"}'` returns JWT.

- [ ] 4. **Campus blueprint + building APIs** — CRUD routes for buildings, floors, rooms; blueprint file upload; room status PATCH; building/room list with filters.
      Files: `backend/src/routes/buildings.ts`, `backend/src/routes/rooms.ts`, `backend/src/controllers/buildings.ts`, `backend/src/controllers/rooms.ts`
      Verify: `GET /api/buildings` returns 5 seeded buildings; `PATCH /api/rooms/:id/status` updates status.

- [ ] 5. **Timetable + department + subject APIs** — CRUD for departments, subjects, semesters, classes, timetable entries; CSV bulk import endpoint; conflict detection service.
      Files: `backend/src/routes/timetable.ts`, `backend/src/routes/departments.ts`, `backend/src/services/conflict.ts`
      Verify: `GET /api/timetable?class_id=...` returns structured timetable; conflict detection rejects double-booked room.

- [ ] 6. **Availability + reservation APIs** — availability algorithm (Phase 5 spec), `/availability/rooms`, `/availability/now`, `/availability/class`; reservation CRUD with conflict check and auto-expiry logic.
      Files: `backend/src/routes/availability.ts`, `backend/src/routes/reservations.ts`, `backend/src/services/availability.ts`
      Verify: Demo scenarios 1, 2, 3 from spec pass.

- [ ] 7. **Resource repository + complaint APIs** — resource upload/search/download/approve, complaint file/list/assign/status/stats endpoints.
      Files: `backend/src/routes/resources.ts`, `backend/src/routes/complaints.ts`, `backend/src/controllers/resources.ts`, `backend/src/controllers/complaints.ts`
      Verify: Demo scenarios 4, 6 pass; `GET /api/resources?subject_code=CD` returns seeded papers.

- [ ] 8. **AI Campus Copilot + analytics + ML proxy APIs** — intent classifier, DB-backed query handlers, analytics overview/utilization/complaints/alerts, optimization suggest/apply, simulation run, energy CRUD + anomaly, reports CSV endpoint, ML proxy routes.
      Files: `backend/src/routes/ai.ts`, `backend/src/routes/analytics.ts`, `backend/src/routes/optimization.ts`, `backend/src/routes/simulation.ts`, `backend/src/routes/energy.ts`, `backend/src/routes/reports.ts`, `backend/src/routes/ml.ts`, `backend/src/services/ai-copilot.ts`, `backend/src/services/analytics.ts`
      Verify: Demo scenarios 5, 7 pass; `GET /api/analytics/overview` returns correct counts.

- [ ] 9. **ML FastAPI service** — FastAPI app, three prediction endpoints, synthetic CSV generation, RandomForest training, labeled responses.
      Files: `ml-service/main.py`, `ml-service/models/`, `ml-service/data/`, `ml-service/requirements.txt`
      Verify: `cd ml-service && uvicorn main:app --port 8001` starts; `POST /ml/predict/demand` returns labeled prediction.

- [ ] 10. **Frontend core** — Vite+React+TS setup, Tailwind config, path aliases, AuthContext, Axios client with interceptors, React Router with all routes + lazy loading + role guards, AppShell sidebar+topbar, shared UI components (Button, Card, Modal, Toast, Skeleton, Badge, EmptyState, ErrorBoundary), types/index.ts.
       Files: `frontend/src/` — contexts, router, api, components/ui, components/layout, types
       Verify: `cd frontend && npm run dev` starts; login page renders; login with demo creds navigates to dashboard.

- [ ] 11. **Frontend: Admin pages** — Dashboard (analytics cards + charts), Campus Configuration (buildings/floors/rooms CRUD + blueprint upload), Room list with status badges, Timetable week-grid + CSV import, Complaint management table, Optimization page, What-If simulation, Energy dashboard, Reports page with CSV export.
       Files: `frontend/src/pages/admin/`
       Verify: All admin routes render without console errors; charts show seeded data.

- [ ] 12. **Frontend: Campus Map** — building selector, floor tabs, blueprint image with SVG overlay markers, room click → detail panel, status legend, search bar, accessible text+icon labels.
       Files: `frontend/src/pages/CampusMap.tsx`, `frontend/src/components/map/`
       Verify: Selecting CSE Block floor 2 shows blueprint with clickable markers; room status colors match DB state.

- [ ] 13. **Frontend: Faculty pages** — My Timetable, Upload Resource form (full metadata), My Uploads, Find Available Classroom, Reserve Room, File Complaint, My Complaints, Resource search.
       Files: `frontend/src/pages/faculty/`
       Verify: Faculty login → upload resource with all metadata fields → appears in resource list.

- [ ] 14. **Frontend: Student + Guest pages** — Student: My Timetable, Resource Search + Download, Find Classroom, File/Track Complaint. Guest: Campus Map (public only), Find Available Classroom, Campus Chatbot.
       Files: `frontend/src/pages/student/`, `frontend/src/pages/guest/`
       Verify: Student can download resource; guest cannot access resource page (redirected).

- [ ] 15. **AI Copilot chat UI + final polish** — Chat interface with typing indicator, inline cards, suggestion chips; deep blue+teal theme finalized in Tailwind config; loading skeletons on all data fetches; toast notifications; 404 page; empty states throughout.
       Files: `frontend/src/pages/AICopilot.tsx`, `frontend/src/components/chat/`, Tailwind theme, global polish
       Verify: `npm run build` completes without TS errors; all 7 demo scenarios work end-to-end.
