# API Contracts

## Telemetry Event

Endpoint:

```http
POST /v1/telemetry
Content-Type: application/json
```

Example:

```json
{
  "event_id": "evt_20260518T121500Z_staff_icu_007",
  "event_version": "1.0",
  "timestamp": "2026-05-18T12:15:00Z",
  "device_id": "headset_icu_007",
  "staff_id": "staff_icu_007",
  "department": "ICU",
  "role": "nurse",
  "shift_id": "shift_staff_icu_007_20260518_day",
  "shift_type": "day",
  "shift_minutes_elapsed": 315,
  "signals": {
    "heart_rate_bpm": 96.4,
    "hrv_ms": 31.2,
    "stress_index": 74.0,
    "fatigue_index": 68.5,
    "skin_temperature_c": 36.9,
    "sleep_debt_hours": 6.1,
    "shift_duration_hours": 5.25,
    "overtime_hours": 0.0,
    "cognitive_load": 81.3,
    "movement_activity_level": 58.6,
    "emotional_stress_score": 63.2,
    "burnout_probability": 0.71,
    "patient_pressure_index": 88.0,
    "alarm_exposure_frequency": 21.0,
    "noise_exposure_db": 72.5,
    "night_shift_adaptation": 0.48,
    "recovery_score": 42.0
  },
  "operational_context": {
    "patient_count": 21,
    "acuity_index": 0.89,
    "staffing_ratio": 2.8,
    "active_alarms": 17,
    "weekend": false,
    "emergency_surge": true,
    "anomaly_type": null,
    "load_intensity": 0.82
  },
  "digital_twin": {
    "resilience": 0.62,
    "recovery_rate": 0.54,
    "overtime_sensitivity": 0.71,
    "burnout_susceptibility": 0.66,
    "sleep_quality": 0.43
  }
}
```

## Prediction Request

Endpoint:

```http
POST /v1/predict/burnout
Content-Type: application/json
```

Body:

```json
{
  "telemetry": "{TelemetryEvent}",
  "history": [],
  "model_policy": "champion"
}
```

## Prediction Response

```json
{
  "staff_id": "staff_icu_007",
  "department": "ICU",
  "timestamp": "2026-05-18T12:15:01Z",
  "model_version": "heuristic-dev",
  "burnout_probability": 0.74,
  "fatigue_forecast_6h": 78.4,
  "fatigue_forecast_24h": 83.2,
  "workload_forecast_24h": 89.0,
  "anomaly_score": 0.12,
  "is_anomaly": false,
  "risk_level": "high",
  "top_drivers": [
    {"name": "patient_pressure_index", "value": 88.0, "weight": 0.22},
    {"name": "sleep_debt_hours", "value": 6.1, "weight": 0.18},
    {"name": "alarm_exposure_frequency", "value": 21.0, "weight": 0.15}
  ],
  "recommendations": [
    {
      "action": "protected_micro_break",
      "priority": "high",
      "rationale": "High fatigue with sustained alarm exposure; schedule a protected 15 minute recovery break within 60 minutes.",
      "expected_impact": -0.06
    }
  ]
}
```

## WebSocket Stream

Endpoint:

```http
GET /ws/telemetry
```

Message shape:

```json
{
  "type": "telemetry.prediction",
  "telemetry": "{TelemetryEvent}",
  "prediction": "{PredictionResponse}"
}
```

## Intervention Simulation

Endpoint:

```http
POST /v1/interventions/simulate
Content-Type: application/json
```

Request:

```json
{
  "department": "ICU",
  "horizon_hours": 24,
  "current_state": {
    "avg_burnout_probability": 0.74,
    "avg_fatigue_index": 78,
    "staffing_ratio": 3.4,
    "patient_pressure_index": 88
  },
  "interventions": [
    {
      "action": "add_float_staff",
      "quantity": 3,
      "start_in_hours": 2,
      "duration_hours": 8
    },
    {
      "action": "protected_micro_break",
      "coverage_percent": 60,
      "duration_minutes": 15
    }
  ]
}
```

Response:

```json
{
  "department": "ICU",
  "horizon_hours": 24,
  "baseline_projected_risk": 0.81,
  "intervention_projected_risk": 0.68,
  "expected_delta": -0.13,
  "confidence": {
    "low": -0.07,
    "high": -0.18
  },
  "constraints": [
    "requires 3 available float staff",
    "avoid pulling staff from ER while ER pressure exceeds 80"
  ],
  "secondary_risks": [
    {
      "department": "ER",
      "risk": "possible cascading overload if float pool is sourced from ER"
    }
  ]
}
```

This endpoint should be backed by the simulator first, then by an uplift model once intervention outcomes accumulate.
