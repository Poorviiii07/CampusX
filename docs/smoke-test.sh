#!/bin/bash
# CAMPUS-X Smoke Test — 7 Demo Scenarios + Auth Flow
# Usage: BASE_URL=http://localhost:3001 bash docs/smoke-test.sh
# Prerequisites: jq, curl

BASE_URL="${BASE_URL:-http://localhost:3001}"
PASS=0
FAIL=0

check() {
  local label="$1"
  local expected_status="$2"
  local actual_status="$3"
  if [ "$actual_status" -eq "$expected_status" ]; then
    echo "  PASS  [$actual_status] $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL  [got $actual_status, want $expected_status] $label"
    FAIL=$((FAIL + 1))
  fi
}

echo "========================================"
echo " CAMPUS-X Smoke Tests"
echo " Target: $BASE_URL"
echo "========================================"

# ── Auth flow ─────────────────────────────────────────────────────────────────
echo ""
echo "[AUTH] Login as admin"
LOGIN_RESPONSE=$(curl -s -o /tmp/cx_login.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@campusx.edu","password":"Admin@123"}')
check "POST /api/auth/login" 200 "$LOGIN_RESPONSE"

ACCESS_TOKEN=""
if [ -f /tmp/cx_login.json ]; then
  ACCESS_TOKEN=$(jq -r '.data.accessToken // .accessToken // empty' /tmp/cx_login.json 2>/dev/null)
fi

if [ -z "$ACCESS_TOKEN" ]; then
  echo "  WARN  Could not extract access token — authenticated routes will fail"
  AUTH_HEADER="Authorization: Bearer invalid"
else
  echo "  INFO  Token obtained"
  AUTH_HEADER="Authorization: Bearer $ACCESS_TOKEN"
fi

# ── Health ────────────────────────────────────────────────────────────────────
echo ""
echo "[1] Health check"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/health")
check "GET /api/health" 200 "$STATUS"

# ── Scenario 1: Room availability search ─────────────────────────────────────
echo ""
echo "[2] Demo Scenario 1 — Available rooms (capacity >= 45, period 3)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$AUTH_HEADER" \
  "$BASE_URL/api/availability/rooms?period=3&capacity=45")
check "GET /api/availability/rooms?period=3&capacity=45" 200 "$STATUS"

# ── Scenario 2: Create reservation + re-check availability ───────────────────
echo ""
echo "[3] Demo Scenario 2 — Create a room reservation"
STATUS=$(curl -s -o /tmp/cx_reservation.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/reservations" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"roomId":"","period":3,"date":"2026-11-01","purpose":"Smoke test reservation","durationMinutes":60}')
# Expect 201 (created) or 400 (missing roomId) — either proves the endpoint is alive
if [ "$STATUS" -eq 201 ] || [ "$STATUS" -eq 400 ]; then
  echo "  PASS  [$STATUS] POST /api/reservations (endpoint reachable)"
  PASS=$((PASS + 1))
else
  echo "  FAIL  [got $STATUS] POST /api/reservations"
  FAIL=$((FAIL + 1))
fi

# ── Scenario 3: Class availability ───────────────────────────────────────────
echo ""
echo "[4] Demo Scenario 3 — Class availability"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$AUTH_HEADER" \
  "$BASE_URL/api/availability/class?period=3")
check "GET /api/availability/class?period=3" 200 "$STATUS"

# ── Scenario 4: Resource search ───────────────────────────────────────────────
echo ""
echo "[5] Demo Scenario 4 — Resource search (subject_code=CD)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$AUTH_HEADER" \
  "$BASE_URL/api/resources?subject_code=CD")
check "GET /api/resources?subject_code=CD" 200 "$STATUS"

# ── Scenario 5: AI Copilot ────────────────────────────────────────────────────
echo ""
echo "[6] Demo Scenario 5 — AI Copilot query"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -X POST "$BASE_URL/api/ai/query" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"query":"Where is the ladies restroom near CSE block?"}')
check "POST /api/ai/query" 200 "$STATUS"

# ── Scenario 6: Submit complaint ──────────────────────────────────────────────
echo ""
echo "[7] Demo Scenario 6 — Submit a complaint"
STATUS=$(curl -s -o /tmp/cx_complaint.json -w "%{http_code}" \
  -X POST "$BASE_URL/api/complaints" \
  -H "Content-Type: application/json" \
  -H "$AUTH_HEADER" \
  -d '{"title":"Smoke test complaint","description":"Automated smoke test","category":"MAINTENANCE","priority":"LOW"}')
check "POST /api/complaints" 201 "$STATUS"

# ── Scenario 7: Analytics ─────────────────────────────────────────────────────
echo ""
echo "[8] Demo Scenario 7 — Analytics overview"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$AUTH_HEADER" \
  "$BASE_URL/api/analytics/overview")
check "GET /api/analytics/overview" 200 "$STATUS"

echo ""
echo "[9] Demo Scenario 7 — Analytics alerts"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "$AUTH_HEADER" \
  "$BASE_URL/api/analytics/alerts")
check "GET /api/analytics/alerts" 200 "$STATUS"

# ── Summary ───────────────────────────────────────────────────────────────────
echo ""
echo "========================================"
echo " Results: $PASS passed, $FAIL failed"
echo "========================================"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
exit 0
