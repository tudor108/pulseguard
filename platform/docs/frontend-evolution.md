# Frontend Evolution

## New Operator Surfaces

- Live telemetry streaming: already started in `/live-telemetry`.
- Digital twin cards: staff-level state with risk, fatigue, recovery, HR, HRV.
- Department heatmaps: aggregate risk, fatigue, stress, pressure, critical counts.
- Cascading risk map: show how ER/ICU overload spills into Surgery, Pediatrics, and Oncology.
- Prediction confidence: show calibrated probability and interval/uncertainty.
- SHAP-style explanations: top drivers with risk direction and magnitude.
- Intervention impact simulator: compare projected risk before/after staffing changes.
- AI copilot: summarize live telemetry, recent anomalies, and safe intervention options.

## UI Contract

The UI should consume these gateway endpoints:

- `GET /v1/staff/latest`
- `GET /v1/departments/heatmap`
- `GET /v1/alerts`
- `WebSocket /ws/telemetry`
- future: `POST /v1/interventions/simulate`
- future: `GET /v1/models/explanations/{prediction_id}`

## Explanation Design

For each prediction:

- show risk probability and level.
- show confidence band.
- show top positive drivers.
- show protective factors.
- show what intervention is expected to change.

Do not display biometric data as medical diagnosis. Phrase as operational strain indicators.

