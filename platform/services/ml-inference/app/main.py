from __future__ import annotations

from datetime import datetime, timezone

from fastapi import FastAPI

from .features import build_features, risk_level
from .models import ModelBundle
from .recommendations import build_recommendations
from .schemas import Driver, InterventionSimulationRequest, InterventionSimulationResponse, PredictionRequest, PredictionResponse

app = FastAPI(title="PulseGuard ML Inference", version="1.0.0")
models = ModelBundle()


@app.get("/health")
def health() -> dict[str, str]:
    return {"ok": "true", "service": "ml-inference", "model_version": models.version}


@app.get("/v1/model/status")
def model_status() -> dict[str, str]:
    return {
        "model_version": models.version,
        "burnout_model": "artifact" if models.burnout_model is not None else "heuristic",
        "fatigue_model": "artifact" if models.fatigue_model is not None else "heuristic",
        "workload_model": "artifact" if models.workload_model is not None else "heuristic",
        "anomaly_model": "artifact" if (models.model_dir / "anomaly_isolation_forest.joblib").exists() else "reference-isolation-forest",
    }


@app.post("/v1/predict/burnout", response_model=PredictionResponse)
def predict_burnout(request: PredictionRequest) -> PredictionResponse:
    event = request.telemetry
    vector = build_features(event)
    probability = models.predict_burnout(vector)
    fatigue_6h = models.predict_fatigue(vector, 6)
    fatigue_24h = models.predict_fatigue(vector, 24)
    workload_24h = models.predict_workload(vector)
    anomaly_score, is_anomaly = models.anomaly_score(vector)
    drivers = top_drivers(vector.named)

    return PredictionResponse(
        staff_id=event.staff_id,
        department=event.department,
        timestamp=datetime.now(timezone.utc),
        model_version=models.version,
        burnout_probability=round(probability, 4),
        fatigue_forecast_6h=round(fatigue_6h, 1),
        fatigue_forecast_24h=round(fatigue_24h, 1),
        workload_forecast_24h=round(workload_24h, 1),
        anomaly_score=round(anomaly_score, 4),
        is_anomaly=is_anomaly or event.operational_context.anomaly_type is not None,
        risk_level=risk_level(probability),  # type: ignore[arg-type]
        top_drivers=drivers,
        recommendations=build_recommendations(vector.named, probability),
    )


@app.post("/v1/predict/batch", response_model=list[PredictionResponse])
def predict_batch(requests: list[PredictionRequest]) -> list[PredictionResponse]:
    return [predict_burnout(request) for request in requests]


@app.post("/v1/interventions/simulate", response_model=InterventionSimulationResponse)
def simulate_intervention(request: InterventionSimulationRequest) -> InterventionSimulationResponse:
    state = request.current_state
    baseline = min(
        0.98,
        max(
            0.02,
            state.avg_burnout_probability
            + (request.horizon_hours / 168) * 0.09
            + max(0, state.avg_fatigue_index - 70) / 500
            + max(0, state.patient_pressure_index - 80) / 600,
        ),
    )

    delta = 0.0
    constraints: list[str] = []
    secondary_risks: list[dict[str, str]] = []

    for intervention in request.interventions:
        if intervention.action == "add_float_staff":
            quantity = intervention.quantity or 1
            delta -= min(0.16, quantity * 0.035)
            constraints.append(f"requires {quantity} available float staff")
            if request.department in {"ICU", "ER"}:
                secondary_risks.append({"department": "Surgery", "risk": "float pool diversion can delay elective recovery capacity"})
        elif intervention.action == "protected_micro_break":
            coverage = (intervention.coverage_percent or 50) / 100
            delta -= min(0.08, 0.06 * coverage)
            constraints.append("requires coordinator protected break coverage")
        elif intervention.action == "cap_overtime":
            delta -= 0.07
            constraints.append("requires schedule owner approval")
        elif intervention.action == "alarm_noise_mitigation":
            delta -= 0.035
            constraints.append("requires charge nurse and biomedical alarm review")
        elif intervention.action == "patient_redistribution":
            delta -= 0.09
            secondary_risks.append({"department": "receiving_unit", "risk": "monitor receiving department cascade pressure"})

    projected = min(0.98, max(0.02, baseline + delta))
    uncertainty = min(0.12, 0.035 + request.horizon_hours / 2400)
    return InterventionSimulationResponse(
        department=request.department,
        horizon_hours=request.horizon_hours,
        baseline_projected_risk=round(baseline, 4),
        intervention_projected_risk=round(projected, 4),
        expected_delta=round(projected - baseline, 4),
        confidence={"low": round((projected - baseline) + uncertainty, 4), "high": round((projected - baseline) - uncertainty, 4)},
        constraints=constraints or ["no hard operational constraints identified"],
        secondary_risks=secondary_risks,
    )


def top_drivers(features: dict[str, float]) -> list[Driver]:
    weighted = [
        ("fatigue_index", features["fatigue_index"], 0.18),
        ("stress_index", features["stress_index"], 0.17),
        ("sleep_debt_hours", features["sleep_debt_hours"], 0.14),
        ("patient_pressure_index", features["patient_pressure_index"], 0.14),
        ("alarm_exposure_frequency", features["alarm_exposure_frequency"], 0.1),
        ("overtime_hours", features["overtime_hours"], 0.1),
        ("emotional_stress_score", features["emotional_stress_score"], 0.08),
        ("low_recovery_score", 100 - features["recovery_score"], 0.09),
    ]
    weighted.sort(key=lambda item: item[1] * item[2], reverse=True)
    return [Driver(name=name, value=round(value, 2), weight=weight) for name, value, weight in weighted[:4]]
