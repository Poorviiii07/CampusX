# CAMPUS-X API Reference

Base URL: `http://localhost:3001/api`

All authenticated endpoints require the header:
```
Authorization: Bearer <accessToken>
```

Responses follow the shape:
```json
{ "success": true, "data": <payload>, "message": "optional" }
```

Errors:
```json
{ "success": false, "message": "error description", "errors": ["..."] }
```

---

## Auth `/auth`

### POST /auth/register
Create a new user account.

**Auth required:** No

**Request body:**
```json
{
  "email": "user@example.com",
  "password": "Secret@123",
  "name": "Full Name",
  "role": "STUDENT"
}
```

**Response:** `{ user: User, accessToken: string, refreshToken: string }`

---

### POST /auth/login
Authenticate and receive tokens.

**Auth required:** No

**Request body:**
```json
{ "email": "admin@campusx.edu", "password": "Admin@123" }
```

**Response:** `{ user: User, accessToken: string, refreshToken: string }`

---

### POST /auth/refresh
Refresh an access token.

**Auth required:** No

**Request body:** `{ "refreshToken": string }`

**Response:** `{ accessToken: string }`

---

### POST /auth/logout
Invalidate refresh token.

**Auth required:** Yes (any role)

**Request body:** `{ "refreshToken": string }`

**Response:** `{ message: "Logged out" }`

---

### GET /auth/me
Return the currently authenticated user.

**Auth required:** Yes (any role)

**Response:** `{ user: User }`

---

## Buildings `/buildings`

All buildings routes require authentication.

### GET /buildings
List all buildings.

**Auth required:** Yes (any role)

**Query params:** `isActive` (boolean)

**Response:** `Building[]`

---

### POST /buildings
Create a building.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "name": "CSE Block",
  "code": "CSE",
  "totalFloors": 4,
  "description": "Computer Science Engineering building"
}
```

**Response:** `Building`

---

### GET /buildings/:id
Get a single building.

**Auth required:** Yes (any role)

**Response:** `Building`

---

### PUT /buildings/:id
Update a building.

**Auth required:** Yes — ADMIN only

**Request body:** Same fields as POST (partial)

**Response:** `Building`

---

### DELETE /buildings/:id
Soft-delete (deactivate) a building.

**Auth required:** Yes — ADMIN only

**Response:** `{ message: "Building deactivated" }`

---

### POST /buildings/:id/blueprint
Upload a floor blueprint image.

**Auth required:** Yes — ADMIN only

**Request:** `multipart/form-data`, field `file` (image)

**Response:** `{ blueprintUrl: string }`

---

### GET /buildings/:buildingId/floors
List floors for a building.

**Auth required:** Yes (any role)

**Response:** `Floor[]`

---

### POST /buildings/:buildingId/floors
Add a floor to a building.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{ "floorNumber": 1, "name": "Ground Floor" }
```

**Response:** `Floor`

---

## Rooms `/rooms`

### GET /rooms/available/now
Get rooms available in the current period.

**Auth required:** Yes (any role)

**Response:** `Room[]`

---

### GET /rooms
List rooms with optional filters.

**Auth required:** Yes (any role)

**Query params:** `buildingId`, `floorId`, `type`, `status`, `department`

**Response:** `Room[]`

---

### POST /rooms
Create a room.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "code": "CSE-204",
  "name": "Seminar Hall",
  "type": "SEMINAR_HALL",
  "capacity": 60,
  "floor": 2,
  "floorId": "floor-uuid",
  "buildingId": "building-uuid",
  "equipment": "[\"Projector\",\"AC\"]"
}
```

**Response:** `Room`

---

### GET /rooms/:id
Get a single room.

**Auth required:** Yes (any role)

**Response:** `Room`

---

### PUT /rooms/:id
Update room details.

**Auth required:** Yes — ADMIN only

**Request body:** Partial `Room` fields

**Response:** `Room`

---

### PATCH /rooms/:id/status
Update room availability status.

**Auth required:** Yes — ADMIN or FACULTY

**Request body:**
```json
{ "status": "MAINTENANCE", "reason": "AC repair" }
```

**Response:** `Room`

---

## Timetable `/timetable`

### GET /timetable/entries
List timetable entries.

**Auth required:** Yes (any role)

**Query params:** `classId`, `semesterId`, `day`, `period`

**Response:** `TimetableEntry[]`

---

### POST /timetable/entries
Create a timetable entry.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "classId": "uuid",
  "subjectId": "uuid",
  "facultyId": "uuid",
  "roomId": "uuid",
  "semesterId": "uuid",
  "day": "MON",
  "period": 1,
  "startTime": "09:00",
  "endTime": "10:00"
}
```

**Response:** `TimetableEntry`

---

### PUT /timetable/entries/:id
Update a timetable entry.

**Auth required:** Yes — ADMIN only

**Request body:** Partial `TimetableEntry` fields

**Response:** `TimetableEntry`

---

### DELETE /timetable/entries/:id
Delete a timetable entry.

**Auth required:** Yes — ADMIN only

**Response:** `{ message: "Entry deleted" }`

---

### POST /timetable/import
Import timetable from CSV.

**Auth required:** Yes — ADMIN only

**Request:** `multipart/form-data`, fields: `file` (CSV), `semesterId`

**CSV columns:** `classId,subjectId,facultyId,roomId,day,period,startTime,endTime`

**Response:** `{ created: number, errors: string[] }`

---

### GET /timetable/conflicts
Detect scheduling conflicts.

**Auth required:** Yes — ADMIN only

**Response:** `ConflictResult[]` — each with `type`, `message`, `entry1`, `entry2`

---

### GET /timetable/classes
List classes.

**Auth required:** Yes (any role)

**Query params:** `semesterId`, `departmentId`

**Response:** `Class[]`

---

### POST /timetable/classes
Create a class.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "name": "CSE-A",
  "departmentId": "uuid",
  "semesterId": "uuid",
  "semesterNumber": 5,
  "section": "A",
  "strength": 60
}
```

**Response:** `Class`

---

### GET /timetable/semesters
List semesters.

**Auth required:** Yes (any role)

**Response:** `Semester[]`

---

### POST /timetable/semesters
Create a semester.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "type": "ODD",
  "academicYear": "2024-25",
  "startDate": "2024-07-01",
  "endDate": "2024-11-30",
  "isActive": true
}
```

**Response:** `Semester`

---

### GET /timetable/subjects
List subjects.

**Auth required:** Yes (any role)

**Query params:** `departmentId`, `semester`

**Response:** `Subject[]`

---

### POST /timetable/subjects
Create a subject.

**Auth required:** Yes — ADMIN only

**Request body:**
```json
{
  "code": "CS501",
  "name": "Database Management Systems",
  "credits": 4,
  "departmentId": "uuid",
  "semester": 5
}
```

**Response:** `Subject`

---

## Reservations `/reservations`

### POST /reservations
Create a room reservation.

**Auth required:** Yes — ADMIN or FACULTY

**Request body:**
```json
{
  "roomId": "uuid",
  "classId": "uuid",
  "reason": "Extra class for project review",
  "date": "2024-09-15",
  "periodStart": 3,
  "periodEnd": 4,
  "type": "SINGLE"
}
```

**Response:** `RoomReservation`

---

### GET /reservations
List all reservations (admin view).

**Auth required:** Yes (any role — filtered by role)

**Query params:** `date`, `roomId`, `status`

**Response:** `RoomReservation[]`

---

### GET /reservations/my
List reservations for the authenticated user.

**Auth required:** Yes (any role)

**Response:** `RoomReservation[]`

---

### DELETE /reservations/:id
Cancel a reservation.

**Auth required:** Yes (owner or ADMIN)

**Response:** `{ message: "Reservation cancelled" }`

---

### PATCH /reservations/:id/status
Update reservation status (admin).

**Auth required:** Yes — ADMIN only

**Request body:** `{ "status": "CANCELLED" }`

**Response:** `RoomReservation`

---

## Resources `/resources`

### GET /resources/my
Get resources uploaded by the authenticated user.

**Auth required:** Yes (any role)

**Response:** `Resource[]`

---

### POST /resources/upload
Upload a resource file.

**Auth required:** Yes — ADMIN or FACULTY

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | File | PDF or document |
| `title` | string | Resource title |
| `departmentId` | string | Department UUID |
| `semester` | number | 1–8 |
| `academicYear` | string | e.g. `2024-25` |
| `examType` | string | `END_SEM`, `INTERNAL`, `NOTES`, etc. |
| `subjectId` | string (opt) | Subject UUID |
| `isPublic` | boolean (opt) | Default: true |

**Response:** `Resource`

---

### GET /resources
Search / list approved resources.

**Auth required:** Yes (any role)

**Query params:** `departmentId`, `subjectCode`, `semester`, `examType`, `academicYear`

**Response:** `Resource[]` or `{ items: Resource[], total: number }`

---

### GET /resources/:id/download
Download a resource file.

**Auth required:** Yes (any role)

**Response:** Binary file stream (increments `downloadCount`)

---

### PATCH /resources/:id/approve
Approve a pending resource.

**Auth required:** Yes — ADMIN only

**Response:** `Resource`

---

### DELETE /resources/:id
Delete a resource.

**Auth required:** Yes (uploader or ADMIN)

**Response:** `{ message: "Resource deleted" }`

---

## Complaints `/complaints`

### GET /complaints/stats
Get complaint statistics grouped by status.

**Auth required:** Yes — ADMIN only

**Response:** `{ byStatus: { status: string, _count: number }[] }`

---

### POST /complaints
File a new complaint.

**Auth required:** Yes (any role)

**Request:** `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `image` | File (opt) | Complaint photo |
| `category` | string | e.g. `AC`, `PROJECTOR` |
| `description` | string | Detailed description |
| `buildingId` | string (opt) | Building UUID |
| `roomId` | string (opt) | Room UUID |
| `priority` | string (opt) | `LOW`, `MEDIUM`, `HIGH`, `CRITICAL` |

**Response:** `Complaint`

---

### GET /complaints
List complaints.

**Auth required:** Yes (any role — filtered by role)

**Query params:** `status`, `category`, `buildingId`, `priority`

**Response:** `Complaint[]`

---

### GET /complaints/:id
Get a single complaint.

**Auth required:** Yes (any role)

**Response:** `Complaint`

---

### PATCH /complaints/:id/assign
Assign a complaint to a staff member.

**Auth required:** Yes — ADMIN only

**Request body:** `{ "assignedToId": "user-uuid" }`

**Response:** `Complaint`

---

### PATCH /complaints/:id/status
Update complaint status and add a resolution note.

**Auth required:** Yes — ADMIN or FACULTY

**Request body:**
```json
{
  "status": "RESOLVED",
  "resolution": "AC unit replaced on 2024-09-10."
}
```

**Response:** `Complaint`

---

## Analytics `/analytics`

All analytics endpoints require ADMIN role.

### GET /analytics/overview
Overview stats: total rooms, available rooms, active complaints, today's classes, utilization %.

**Response:**
```json
{
  "rooms": 120,
  "availableRooms": 45,
  "activeComplaints": 8,
  "todayClasses": 32,
  "utilizationPercent": 62
}
```

---

### GET /analytics/utilization
Room utilization percentage per building.

**Response:** `{ building: string, utilizationPct: number }[]`

---

### GET /analytics/complaints
Complaint open vs resolved trend (8 weeks).

**Response:** `{ week: string, open: number, resolved: number }[]`

---

### GET /analytics/alerts
Active system alerts.

**Response:** `{ type: string, message: string, severity: "LOW"|"MEDIUM"|"HIGH", entityId?: string }[]`

---

## AI Copilot `/ai`

### POST /ai/query
Send a natural-language query to the AI Copilot.

**Auth required:** Yes (any role)

**Request body:**
```json
{ "query": "Where is the ladies restroom near the CSE block?" }
```

**Response:**
```json
{
  "response": "The nearest ladies restroom is on Floor 2 of the CSE block, room CSE-R201.",
  "intent": "LOCATION_SEARCH",
  "results": [ { "code": "CSE-R201", "type": "RESTROOM", "floor": 2, "status": "AVAILABLE" } ]
}
```

**Intent values:** `LOCATION_SEARCH`, `AVAILABILITY_SEARCH`, `RESOURCE_SEARCH`, `COMPLAINT_LIST`, `TIMETABLE_QUERY`, `GENERAL`

---

## Optimization `/optimization`

All optimization endpoints require ADMIN role.

### GET /optimization/suggest
Get AI-generated room assignment suggestions.

**Query params:** `semesterId`

**Response:** `{ suggestions: { classId, currentRoomId, suggestedRoomId, reason }[] }`

---

### POST /optimization/apply
Apply one or more optimization suggestions.

**Request body:**
```json
{ "suggestions": [ { "entryId": "uuid", "newRoomId": "uuid" } ] }
```

**Response:** `{ applied: number, errors: string[] }`

---

## Reports `/reports`

All report endpoints require ADMIN role.

### GET /reports/:type
Generate a report. `type` values: `utilization`, `complaints`, `resources`, `energy`.

**Query params:** `startDate`, `endDate`, `format` (`json` | `csv`)

**Response:** Report data as JSON or CSV file download.

---

## Energy `/energy`

All energy endpoints require ADMIN role.

### POST /energy/records
Bulk-insert energy consumption records.

**Request body:**
```json
{
  "records": [
    { "buildingId": "uuid", "date": "2024-09-01", "hour": 9, "consumptionKwh": 12.5 }
  ]
}
```

**Response:** `{ created: number }`

---

### GET /energy/data
Get energy consumption data for a date range.

**Query params:** `startDate`, `endDate`, `buildingId`

**Response:** `EnergyRecord[]`

---

### GET /energy/anomalies
Get flagged energy anomaly records.

**Query params:** `buildingId`, `startDate`, `endDate`

**Response:** `EnergyRecord[]`

---

### GET /energy/summary
Get aggregated energy summary.

**Query params:** `groupBy` (`day` | `week` | `building`)

**Response:** `{ label: string, totalKwh: number }[]`

---

## ML Service `/ml`

All ML endpoints require ADMIN role.

### GET /ml/demand-forecast
Forecast room demand for upcoming periods.

**Query params:** `days` (default: 7), `buildingId`

**Response:** `{ date: string, building: string, predictedOccupancy: number }[]`

---

### GET /ml/energy-forecast
Forecast energy consumption.

**Query params:** `days` (default: 7), `buildingId`

**Response:** `{ date: string, building: string, predictedKwh: number }[]`

---

### GET /ml/maintenance-forecast
Predict rooms likely to need maintenance.

**Response:** `{ roomId: string, roomCode: string, probability: number, reasons: string[] }[]`
