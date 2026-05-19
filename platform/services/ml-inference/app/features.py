from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

from .schemas import TelemetryEvent


FEATURE_NAMES = [
    "heart_rate_bpm",
    "hrv_ms",
    "stress_index",
    "fatigue_index",
    "sleep_debt_hours",
    "shift_duration_hours",
    "overtime_hours",
    "cognitive_load",
    "movement_activity_level",
    "emotional_stress_score",
    "patient_pressure_index",
    "alarm_exposure_frequency",
    "noise_exposure_db",
    "night_shift_adaptation",
    "recovery_score",
    "acuity_index",
    "staffing_ratio",
    "active_alarms",
    "weekend",
    "emergency_surge",
    "resilience",
    "recovery_rate",
    "overtime_sensitivity",
    "burnout_susceptibility",
    "sleep_quality",
    "role_doctor",
    "role_nurse",
    "role_coordinator",
    "dept_icu",
    "dept_er",
    "dept_surgery",
    "dept_pediatrics",
    "dept_oncology",
]


@dataclass(frozen=True)
class FeatureVector:
    values: np.ndarray
    named: dict[str, float]


def build_features(event: TelemetryEvent) -> FeatureVector:
    signals = event.signals
    context = event.operational_context
    twin = event.digital_twin
    role = event.role.lower()
    dept = event.department.lower()

    named = {
        "heart_rate_bpm": signals.heart_rate_bpm,
        "hrv_ms": signals.hrv_ms,
        "stress_index": signals.stress_index,
        "fatigue_index": signals.fatigue_index,
        "sleep_debt_hours": signals.sleep_debt_hours,
        "shift_duration_hours": signals.shift_duration_hours,
        "overtime_hours": signals.overtime_hours,
        "cognitive_load": signals.cognitive_load,
        "movement_activity_level": signals.movement_activity_level,
        "emotional_stress_score": signals.emotional_stress_score,
        "patient_pressure_index": signals.patient_pressure_index,
        "alarm_exposure_frequency": signals.alarm_exposure_frequency,
        "noise_exposure_db": signals.noise_exposure_db,
        "night_shift_adaptation": signals.night_shift_adaptation,
        "recovery_score": signals.recovery_score,
        "acuity_index": context.acuity_index,
        "staffing_ratio": context.staffing_ratio,
        "active_alarms": float(context.active_alarms),
        "weekend": 1.0 if context.weekend else 0.0,
        "emergency_surge": 1.0 if context.emergency_surge else 0.0,
        "resilience": twin.resilience,
        "recovery_rate": twin.recovery_rate,
        "overtime_sensitivity": twin.overtime_sensitivity,
        "burnout_susceptibility": twin.burnout_susceptibility,
        "sleep_quality": twin.sleep_quality,
        "role_doctor": 1.0 if role == "doctor" else 0.0,
        "role_nurse": 1.0 if role == "nurse" else 0.0,
        "role_coordinator": 1.0 if role == "coordinator" else 0.0,
        "dept_icu": 1.0 if dept == "icu" else 0.0,
        "dept_er": 1.0 if dept == "er" else 0.0,
        "dept_surgery": 1.0 if dept == "surgery" else 0.0,
        "dept_pediatrics": 1.0 if dept == "pediatrics" else 0.0,
        "dept_oncology": 1.0 if dept == "oncology" else 0.0,
    }
    return FeatureVector(values=np.array([[named[name] for name in FEATURE_NAMES]], dtype=float), named=named)


def logistic(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def heuristic_burnout_probability(features: dict[str, float]) -> float:
    score = (
        -4.7
        + features["stress_index"] * 0.026
        + features["fatigue_index"] * 0.034
        + features["sleep_debt_hours"] * 0.18
        + features["overtime_hours"] * 0.07
        + features["patient_pressure_index"] * 0.014
        + features["alarm_exposure_frequency"] * 0.016
        + features["emotional_stress_score"] * 0.012
        + features["burnout_susceptibility"] * 0.95
        + features["emergency_surge"] * 0.24
        - features["resilience"] * 0.78
        - features["recovery_score"] * 0.012
        - features["sleep_quality"] * 0.34
    )
    return max(0.01, min(0.99, logistic(score)))


def risk_level(probability: float) -> str:
    if probability >= 0.82:
        return "critical"
    if probability >= 0.64:
        return "high"
    if probability >= 0.42:
        return "moderate"
    return "low"

