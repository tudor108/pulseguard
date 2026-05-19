# MLOps Governance

## Training Pipeline

1. Materialize feature windows in BigQuery.
2. Validate schema and data ranges.
3. Split by time and staff cohort.
4. Train XGBoost, LightGBM, anomaly detector, and optional temporal models.
5. Evaluate performance, calibration, and alert-volume impact.
6. Generate model card and risk report.
7. Register candidate model in Vertex AI Model Registry.
8. Deploy as shadow model.
9. Promote through canary after human review.

## Experiment Tracking

Use Vertex ML Metadata for:

- dataset snapshot URI
- feature spec version
- training code commit
- hyperparameters
- evaluation metrics
- calibration plots
- model card URI
- approval status

## Drift Detection

Track drift in `model_monitoring`:

- PSI for continuous features.
- KS statistic for biometric and workload distributions.
- missing-rate drift for device telemetry.
- prediction distribution drift.
- alert-rate drift by department.
- recommendation acceptance drift.

Trigger retraining when:

- PSI > 0.2 for key features.
- calibration error breaches threshold.
- alert precision from coordinator review drops.
- new seasonal regime begins, such as flu season.

## Canary And Shadow Deployment

Shadow:

- candidate receives mirrored inference requests.
- predictions are logged but not shown to coordinators.
- compare champion vs candidate on calibration, alert volume, driver stability.

Canary:

- 5 percent traffic to candidate for low-risk cohorts.
- expand to 25 percent after stability.
- promote to 100 percent only after operational review.

Rollback:

- keep last champion image and Vertex model alias.
- rollback Kubernetes deployment and model alias independently.
- never delete prior model artifacts before retention window expires.

## Production Safety

- Human approval required for staff-level interventions.
- Do not use the model for employment discipline.
- Pseudonymize staff IDs in analytics.
- Log every recommendation, acceptance, rejection, and override.
- Monitor alert fatigue so coordinators are not overloaded.

