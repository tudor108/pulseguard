# Microservice Breakdown

## telemetry-generator

Purpose: simulate hospital workforce digital twins and publish wearable/operational telemetry.

Core modules:

- `digital_twin.py`: staff entity physiology, stress, fatigue, sleep debt, recovery.
- `simulation_engine.py`: hospital-level dynamics, absences, flu season, holiday overload, shift swaps, cascading department pressure.
- `publishers.py`: stdout, HTTP, Pub/Sub sinks.

Production role:

- replaced later by real device gateway plus synthetic replay for testing.

## realtime-gateway

Purpose: low-latency operator-facing event layer.

Responsibilities:

- consume telemetry from Pub/Sub.
- call ML inference.
- maintain latest state per staff member.
- expose REST snapshots and WebSocket streams.
- generate alert envelopes.
- optionally use Redis for cross-replica fanout and state cache.

## ml-inference

Purpose: online prediction service.

Responsibilities:

- build feature vectors.
- load champion/candidate model artifacts.
- serve burnout, fatigue, workload, anomaly, and recommendation outputs.
- return top drivers for explainability.
- support shadow/canary model versions.

## feature-builder

Purpose: materialize online/offline features.

Recommended implementation:

- Dataflow streaming job for 5m windows.
- scheduled BigQuery SQL or Cloud Run Jobs for 1h/24h/7d features.
- write to BigQuery and optionally Vertex AI Feature Store.

## training-pipeline

Purpose: train and register models.

Implementation:

- Vertex AI Pipelines.
- BigQuery training tables.
- XGBoost/LightGBM/Isolation Forest artifacts.
- model registry promotion workflow.

