# PulseGuard AI Enterprise Architecture

## Design Principles

- Treat wearable telemetry as sensitive workforce health-adjacent data.
- Pseudonymize staff IDs at ingestion; keep identity mapping in a separate protected system.
- Separate streaming ingestion, online inference, offline training, and UI delivery.
- Keep online inference fast and explainable enough for operational response.
- Store immutable raw events and version every derived feature, prediction, model, and recommendation.
- Require human approval for staffing interventions, schedule changes, and individual outreach.

## Real-Time Data Flow

1. Synthetic devices or future headset gateways emit `TelemetryEvent` records.
2. `telemetry-generator` publishes to `pulseguard.telemetry.v1`.
3. Pub/Sub fans out to:
   - BigQuery subscription for immutable storage.
   - `realtime-gateway` for live WebSocket state.
   - feature builder for rolling features.
4. `realtime-gateway` calls `ml-inference` for low-latency online predictions.
5. `ml-inference` returns:
   - burnout probability
   - fatigue forecast
   - anomaly flag and score
   - workload forecast
   - recommended interventions
6. Predictions and alerts are published back to Pub/Sub and streamed to the React dashboard.
7. Vertex AI Pipelines retrains models using BigQuery feature windows and intervention outcomes.

## Deployment Topology

### Current

- React/TanStack app on Cloud Run.
- AI scenario generation using an OpenAI-compatible Azure AI endpoint.
- Mock deterministic operational data.

### Target

- React app can remain on Cloud Run for fast iteration.
- Streaming and ML microservices run on GKE Autopilot.
- Pub/Sub is the event backbone.
- BigQuery is the operational lakehouse.
- Vertex AI owns training, registry, batch jobs, and model governance.
- Artifact Registry stores Docker images.
- Cloud Build builds and deploys services.

## Services

### telemetry-generator

Generates synthetic staff digital twins and emits realistic multi-signal time series. It models:

- circadian rhythm
- shift transitions
- night shift adaptation
- overtime accumulation
- ICU alarm spikes
- ER weekend surge
- Surgery daytime cognitive load
- Oncology emotional stress load
- rest and recovery after shift
- individual resilience and susceptibility
- anomalies such as alarm storms, HRV drops, tachycardia, thermal stress, and rapid escalation

### realtime-gateway

Provides the UI-facing low-latency layer:

- `POST /v1/telemetry`
- `POST /v1/pubsub/telemetry`
- `GET /v1/staff/latest`
- `GET /v1/departments/heatmap`
- `GET /v1/alerts`
- `WebSocket /ws/telemetry`

It can run without Redis for demos. In production, Redis is useful for shared WebSocket fanout state across replicas.

### ml-inference

Serves online model outputs:

- `POST /v1/predict/burnout`
- `POST /v1/predict/batch`
- `GET /v1/model/status`

The service supports artifact-based model loading with heuristic fallbacks for development.

## ML Strategy

### Burnout Risk Prediction

Model: XGBoost binary classifier or calibrated regressor.

Why: strong tabular performance, handles nonlinear interactions, explainable with SHAP, robust on mixed biometric and operational features.

Labels:

- simulated label for synthetic mode
- production proxy labels such as repeated overtime escalation, sick leave risk, self-reported high stress survey, voluntary escalation, schedule-change intervention, or HR-approved operational fatigue events

Metrics:

- AUROC and AUPRC for classification
- calibration error for probability quality
- recall at high-risk threshold
- false alert rate per department
- lead time before escalation

### Fatigue Forecasting

Model: LightGBM quantile regression.

Why: fast, strong on tabular time-window features, can produce prediction intervals for 6h/24h/7d fatigue trajectories.

Metrics:

- MAE/RMSE for point estimates
- pinball loss for quantiles
- coverage of prediction intervals

### Temporal Burnout Trajectory

Model: LSTM/Temporal CNN/TFT when enough history exists.

Why: captures sequence patterns across shifts, recovery periods, and cumulative stress better than static tabular windows.

Use it offline or nearline first. Promote to online only after latency and stability are proven.

Metrics:

- sequence RMSE
- event lead-time recall
- calibration by department and role

### Anomaly Detection

Model: Isolation Forest.

Why: unsupervised, works when anomaly labels are sparse, interpretable enough for operational triage.

Examples:

- sudden HRV collapse
- alarm exposure outlier
- abnormal stress vs movement mismatch
- rapid burnout probability jump

Metrics:

- alert precision from reviewed anomalies
- anomaly review burden per day
- department-level anomaly drift

### Intervention Recommendation Engine

Approach:

- rules plus uplift estimates initially
- later contextual bandits or causal forests when intervention outcomes are collected

Inputs:

- prediction outputs
- department capacity
- role coverage
- overtime limits
- staff recovery profile
- operational constraints

Outputs:

- micro-break protocol
- staffing reinforcement
- patient redistribution
- noise/alarm mitigation
- shift swap/recovery window
- coordinator check-in

## Feature Engineering

Online rolling windows:

- last 5m/15m/1h mean, max, slope, volatility for HR, HRV, stress, fatigue, alarm exposure, noise
- shift elapsed minutes
- overtime hours this week
- sleep debt rolling 7d
- department pressure index
- patient acuity and occupancy
- role and department embeddings
- night shift adaptation score
- recovery velocity after rest
- anomaly counts in last 24h

Offline features:

- previous 7/14/30 day burden
- shift pattern entropy
- night/day rotation instability
- intervention history
- cohort-normalized stress residuals
- department-specific seasonality

## Online vs Offline Inference

Online inference:

- used for current dashboard, live alerts, rapid escalation
- target p95 latency under 250 ms per event batch
- uses last known rolling features and latest telemetry event

Offline inference:

- daily and weekly forecasts
- staffing planning
- intervention evaluation
- model validation and backtesting

## MLOps Roadmap

1. Synthetic telemetry and UI live dashboard.
2. BigQuery raw event capture.
3. Rolling feature builder.
4. First offline XGBoost/LightGBM baselines.
5. Vertex AI Model Registry and versioned online serving.
6. Drift monitoring and retraining triggers.
7. Human-reviewed intervention outcome loop.
8. Temporal model promotion after enough longitudinal data.
9. Fairness and policy audits by role, department, shift type, and demographic-safe cohorts where legally approved.

