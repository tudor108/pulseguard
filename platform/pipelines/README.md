# Vertex AI Training Pipelines

This folder contains the production training design for PulseGuard AI models.

Models:

- XGBoost burnout risk classifier.
- LightGBM fatigue and workload forecasters.
- Isolation Forest anomaly detector.
- LSTM/temporal model for longer horizon trajectory modeling once enough history exists.

The pipeline reads BigQuery feature windows, trains models, evaluates metrics, writes artifacts to Cloud Storage, and registers champion candidates in Vertex AI Model Registry.

Recommended cadence:

- daily feature materialization
- weekly retraining
- immediate retraining candidate when drift or alert review quality crosses threshold
- monthly governance review before new champion promotion

