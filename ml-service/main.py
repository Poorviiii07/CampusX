"""
CAMPUS-X ML Service
FastAPI app with synthetic training data, trained Random Forest models,
and prediction endpoints for demand, energy, and maintenance forecasting.
"""

import datetime
import random
import numpy as np
import pandas as pd
from typing import Optional, List, Dict, Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.preprocessing import LabelEncoder

# ─── App Setup ────────────────────────────────────────────────────────────────
app = FastAPI(
    title="CAMPUS-X ML Service",
    description="AI/ML microservice for CAMPUS-X Smart Campus Management System",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

DISCLAIMER = "Based on synthetic demonstration data"

# ─── In-memory models ─────────────────────────────────────────────────────────
models: Dict[str, Any] = {}
encoders: Dict[str, LabelEncoder] = {}

# ─── Synthetic Data Generation ────────────────────────────────────────────────

ROOM_TYPES = ["CLASSROOM", "LAB", "SEMINAR_HALL", "AUDITORIUM"]
BUILDING_IDS = ["bld-001", "bld-002", "bld-003", "bld-004", "bld-005"]


def generate_demand_data(n: int = 100) -> pd.DataFrame:
    random.seed(42)
    np.random.seed(42)
    rows = []
    for _ in range(n):
        day = random.randint(0, 5)          # Mon-Sat
        period = random.randint(1, 8)
        room_type = random.choice(ROOM_TYPES)
        building_idx = random.randint(0, 4)
        # Demand: higher mid-week, middle periods
        base = 5
        base += 2 if 2 <= day <= 4 else 0
        base += 3 if 2 <= period <= 6 else 0
        base += 2 if room_type == "CLASSROOM" else 0
        demand = max(0, base + random.gauss(0, 1.5))
        rows.append({
            "day_of_week": day,
            "period": period,
            "room_type": room_type,
            "building_idx": building_idx,
            "demand": round(demand, 2),
        })
    return pd.DataFrame(rows)


def generate_energy_data(n: int = 100) -> pd.DataFrame:
    random.seed(7)
    np.random.seed(7)
    rows = []
    for _ in range(n):
        hour = random.randint(0, 23)
        day_of_week = random.randint(0, 6)
        building_idx = random.randint(0, 4)
        hist_mean = 5.0 + building_idx * 0.5
        # High during working hours
        usage_factor = 1.5 if 8 <= hour <= 18 else 0.4
        kwh = max(0.5, hist_mean * usage_factor + random.gauss(0, 0.8))
        rows.append({
            "hour": hour,
            "day_of_week": day_of_week,
            "building_idx": building_idx,
            "hist_mean": hist_mean,
            "kwh": round(kwh, 3),
        })
    return pd.DataFrame(rows)


def generate_maintenance_data(n: int = 100) -> pd.DataFrame:
    random.seed(99)
    np.random.seed(99)
    rows = []
    for _ in range(n):
        complaint_count_30d = random.randint(0, 10)
        age_years = random.uniform(0.5, 20)
        room_type = random.choice(ROOM_TYPES)
        # Higher probability for older rooms with many complaints
        prob = min(1.0, (complaint_count_30d * 0.1) + (age_years * 0.02))
        needs_maintenance = 1 if random.random() < prob else 0
        rows.append({
            "complaint_count_30d": complaint_count_30d,
            "age_years": round(age_years, 1),
            "room_type": room_type,
            "needs_maintenance": needs_maintenance,
        })
    return pd.DataFrame(rows)


# ─── Training ─────────────────────────────────────────────────────────────────

def train_models():
    """Generate synthetic data and train all three models at startup."""
    # Demand model
    df_demand = generate_demand_data(100)
    le_rt = LabelEncoder().fit(df_demand["room_type"])
    encoders["room_type"] = le_rt
    X_demand = np.column_stack([
        df_demand["day_of_week"].values,
        df_demand["period"].values,
        le_rt.transform(df_demand["room_type"]),
        df_demand["building_idx"].values,
    ])
    y_demand = df_demand["demand"].values
    demand_model = RandomForestRegressor(n_estimators=50, random_state=42)
    demand_model.fit(X_demand, y_demand)
    models["demand"] = demand_model

    # Energy model
    df_energy = generate_energy_data(100)
    X_energy = np.column_stack([
        df_energy["hour"].values,
        df_energy["day_of_week"].values,
        df_energy["building_idx"].values,
        df_energy["hist_mean"].values,
    ])
    y_energy = df_energy["kwh"].values
    energy_model = RandomForestRegressor(n_estimators=50, random_state=7)
    energy_model.fit(X_energy, y_energy)
    models["energy"] = energy_model

    # Maintenance model
    df_maint = generate_maintenance_data(100)
    le_rt2 = LabelEncoder().fit(df_maint["room_type"])
    encoders["room_type_maint"] = le_rt2
    X_maint = np.column_stack([
        df_maint["complaint_count_30d"].values,
        df_maint["age_years"].values,
        le_rt2.transform(df_maint["room_type"]),
    ])
    y_maint = df_maint["needs_maintenance"].values
    maint_model = RandomForestClassifier(n_estimators=50, random_state=99)
    maint_model.fit(X_maint, y_maint)
    models["maintenance"] = maint_model

    print("[OK] ML models trained on synthetic data.")


# Train on startup
train_models()


# ─── Request/Response Models ──────────────────────────────────────────────────

class DemandRequest(BaseModel):
    room_id: Optional[str] = None
    building_id: Optional[str] = None
    days_ahead: int = 7


class DemandResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    disclaimer: str


class EnergyRequest(BaseModel):
    building_id: str
    hours_ahead: int = 24


class EnergyResponse(BaseModel):
    predictions: List[Dict[str, Any]]
    disclaimer: str


class MaintenanceRequest(BaseModel):
    room_id: str
    complaint_count_30d: Optional[int] = 2
    age_years: Optional[float] = 5.0
    room_type: Optional[str] = "CLASSROOM"


class MaintenanceResponse(BaseModel):
    room_id: str
    maintenance_probability: float
    needs_maintenance: bool
    disclaimer: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "campus-x-ml",
        "models_loaded": list(models.keys()),
        "timestamp": datetime.datetime.utcnow().isoformat(),
    }


@app.get("/")
async def root():
    return {"message": "CAMPUS-X ML Service", "version": "1.0.0", "status": "running"}


@app.post("/ml/predict/demand", response_model=DemandResponse)
async def predict_demand(request: DemandRequest):
    """Predict room demand for the next N days across all periods."""
    preds = []
    model = models["demand"]
    le_rt = encoders["room_type"]
    building_idx = BUILDING_IDS.index(request.building_id) if request.building_id in BUILDING_IDS else 0

    base_date = datetime.datetime.utcnow()
    for day_offset in range(request.days_ahead):
        target_date = base_date + datetime.timedelta(days=day_offset)
        day_of_week = target_date.weekday()  # Mon=0, Sun=6
        for period in range(1, 9):
            for room_type in ROOM_TYPES:
                rt_enc = le_rt.transform([room_type])[0]
                x = np.array([[day_of_week, period, rt_enc, building_idx]])
                demand = float(model.predict(x)[0])
                preds.append({
                    "date": target_date.strftime("%Y-%m-%d"),
                    "period": period,
                    "room_type": room_type,
                    "predicted_demand": round(max(0, demand), 2),
                })

    return DemandResponse(predictions=preds, disclaimer=DISCLAIMER)


@app.post("/ml/predict/energy", response_model=EnergyResponse)
async def predict_energy(request: EnergyRequest):
    """Predict energy consumption (kWh) for next N hours."""
    preds = []
    model = models["energy"]
    building_idx = BUILDING_IDS.index(request.building_id) if request.building_id in BUILDING_IDS else 0
    hist_mean = 5.0 + building_idx * 0.5

    now = datetime.datetime.utcnow()
    for h in range(request.hours_ahead):
        target = now + datetime.timedelta(hours=h)
        hour = target.hour
        day_of_week = target.weekday()
        x = np.array([[hour, day_of_week, building_idx, hist_mean]])
        kwh = float(model.predict(x)[0])
        preds.append({
            "timestamp": target.strftime("%Y-%m-%dT%H:00:00Z"),
            "hour": hour,
            "predicted_kwh": round(max(0.1, kwh), 3),
        })

    return EnergyResponse(predictions=preds, disclaimer=DISCLAIMER)


@app.post("/ml/predict/maintenance", response_model=MaintenanceResponse)
async def predict_maintenance(request: MaintenanceRequest):
    """Predict maintenance need probability for a room."""
    model = models["maintenance"]
    le_rt = encoders["room_type_maint"]

    room_type = request.room_type if request.room_type in le_rt.classes_ else "CLASSROOM"
    rt_enc = le_rt.transform([room_type])[0]
    x = np.array([[request.complaint_count_30d or 0, request.age_years or 5.0, rt_enc]])

    prob = float(model.predict_proba(x)[0][1])
    needs = bool(model.predict(x)[0])

    return MaintenanceResponse(
        room_id=request.room_id,
        maintenance_probability=round(prob, 4),
        needs_maintenance=needs,
        disclaimer=DISCLAIMER,
    )


# ─── Legacy stubs kept for backward compat ────────────────────────────────────

@app.get("/analyze/free-periods")
async def analyze_free_periods(class_id: str, semester_id: str):
    return {"class_id": class_id, "semester_id": semester_id, "free_periods": [], "disclaimer": DISCLAIMER}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
