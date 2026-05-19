from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Department = Literal["ICU", "ER", "Surgery", "Pediatrics", "Oncology"]
Role = Literal["doctor", "nurse", "coordinator"]
ShiftType = Literal["day", "night", "off"]


class Signals(BaseModel):
    heart_rate_bpm: float = Field(ge=35, le=210)
    hrv_ms: float = Field(ge=5, le=160)
    stress_index: float = Field(ge=0, le=100)
    fatigue_index: float = Field(ge=0, le=100)
    skin_temperature_c: float = Field(ge=32, le=40)
    sleep_debt_hours: float = Field(ge=0, le=24)
    shift_duration_hours: float = Field(ge=0, le=24)
    overtime_hours: float = Field(ge=0, le=48)
    cognitive_load: float = Field(ge=0, le=100)
    movement_activity_level: float = Field(ge=0, le=100)
    emotional_stress_score: float = Field(ge=0, le=100)
    burnout_probability: float = Field(ge=0, le=1)
    patient_pressure_index: float = Field(ge=0, le=100)
    alarm_exposure_frequency: float = Field(ge=0, le=120)
    noise_exposure_db: float = Field(ge=20, le=120)
    night_shift_adaptation: float = Field(ge=0, le=1)
    recovery_score: float = Field(ge=0, le=100)


class OperationalContext(BaseModel):
    patient_count: int = Field(ge=0)
    acuity_index: float = Field(ge=0, le=1)
    staffing_ratio: float = Field(ge=0)
    active_alarms: int = Field(ge=0)
    weekend: bool
    emergency_surge: bool
    anomaly_type: str | None = None
    load_intensity: float = Field(ge=0, le=1.5)


class DigitalTwinState(BaseModel):
    resilience: float = Field(ge=0, le=1)
    recovery_rate: float = Field(ge=0, le=1)
    overtime_sensitivity: float = Field(ge=0, le=1)
    burnout_susceptibility: float = Field(ge=0, le=1)
    sleep_quality: float = Field(ge=0, le=1)


class TelemetryEvent(BaseModel):
    event_id: str
    event_version: str = "1.0"
    timestamp: datetime
    device_id: str
    staff_id: str
    department: Department
    role: Role
    shift_id: str
    shift_type: ShiftType
    shift_minutes_elapsed: int = Field(ge=0)
    signals: Signals
    operational_context: OperationalContext
    digital_twin: DigitalTwinState

