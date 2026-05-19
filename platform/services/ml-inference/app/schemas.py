from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


RiskLevel = Literal["low", "moderate", "high", "critical"]


class Signals(BaseModel):
    heart_rate_bpm: float
    hrv_ms: float
    stress_index: float
    fatigue_index: float
    skin_temperature_c: float
    sleep_debt_hours: float
    shift_duration_hours: float
    overtime_hours: float
    cognitive_load: float
    movement_activity_level: float
    emotional_stress_score: float
    burnout_probability: float
    patient_pressure_index: float
    alarm_exposure_frequency: float
    noise_exposure_db: float
    night_shift_adaptation: float
    recovery_score: float


class OperationalContext(BaseModel):
    patient_count: int
    acuity_index: float
    staffing_ratio: float
    active_alarms: int
    weekend: bool
    emergency_surge: bool
    anomaly_type: str | None = None
    load_intensity: float


class DigitalTwinState(BaseModel):
    resilience: float
    recovery_rate: float
    overtime_sensitivity: float
    burnout_susceptibility: float
    sleep_quality: float


class TelemetryEvent(BaseModel):
    event_id: str
    event_version: str = "1.0"
    timestamp: datetime
    device_id: str
    staff_id: str
    department: str
    role: str
    shift_id: str
    shift_type: str
    shift_minutes_elapsed: int
    signals: Signals
    operational_context: OperationalContext
    digital_twin: DigitalTwinState


class PredictionRequest(BaseModel):
    telemetry: TelemetryEvent
    history: list[TelemetryEvent] = Field(default_factory=list)
    model_policy: str = "champion"


class Driver(BaseModel):
    name: str
    value: float
    weight: float


class Recommendation(BaseModel):
    action: str
    priority: Literal["low", "medium", "high", "critical"]
    rationale: str
    expected_impact: float


class PredictionResponse(BaseModel):
    staff_id: str
    department: str
    timestamp: datetime
    model_version: str
    burnout_probability: float = Field(ge=0, le=1)
    fatigue_forecast_6h: float = Field(ge=0, le=100)
    fatigue_forecast_24h: float = Field(ge=0, le=100)
    workload_forecast_24h: float = Field(ge=0, le=100)
    anomaly_score: float
    is_anomaly: bool
    risk_level: RiskLevel
    top_drivers: list[Driver]
    recommendations: list[Recommendation]


class InterventionAction(BaseModel):
    action: str
    quantity: int | None = None
    coverage_percent: float | None = None
    start_in_hours: float | None = None
    duration_hours: float | None = None
    duration_minutes: float | None = None


class InterventionState(BaseModel):
    avg_burnout_probability: float = Field(ge=0, le=1)
    avg_fatigue_index: float = Field(ge=0, le=100)
    staffing_ratio: float = Field(ge=0)
    patient_pressure_index: float = Field(ge=0, le=100)


class InterventionSimulationRequest(BaseModel):
    department: str
    horizon_hours: int = Field(ge=1, le=336)
    current_state: InterventionState
    interventions: list[InterventionAction]


class InterventionSimulationResponse(BaseModel):
    department: str
    horizon_hours: int
    baseline_projected_risk: float
    intervention_projected_risk: float
    expected_delta: float
    confidence: dict[str, float]
    constraints: list[str]
    secondary_risks: list[dict[str, str]]
