CREATE SCHEMA IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops`
OPTIONS(location = "us-central1");

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.raw_telemetry` (
  event_id STRING NOT NULL,
  event_version STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  device_id STRING,
  staff_id STRING,
  department STRING,
  role STRING,
  shift_id STRING,
  shift_type STRING,
  shift_minutes_elapsed INT64,
  signals JSON,
  operational_context JSON,
  digital_twin JSON,
  ingest_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
CLUSTER BY department, staff_id;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.predictions` (
  staff_id STRING NOT NULL,
  department STRING,
  timestamp TIMESTAMP NOT NULL,
  model_version STRING,
  burnout_probability FLOAT64,
  fatigue_forecast_6h FLOAT64,
  fatigue_forecast_24h FLOAT64,
  workload_forecast_24h FLOAT64,
  anomaly_score FLOAT64,
  is_anomaly BOOL,
  risk_level STRING,
  top_drivers JSON,
  recommendations JSON,
  ingest_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
CLUSTER BY department, staff_id, risk_level;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.alerts` (
  alert_id STRING NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  staff_id STRING,
  department STRING,
  severity STRING,
  title STRING,
  risk_level STRING,
  burnout_probability FLOAT64,
  primary_driver STRING,
  status STRING DEFAULT "open",
  ingest_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(timestamp)
CLUSTER BY department, severity, status;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.staff_features_5m` (
  staff_id STRING NOT NULL,
  department STRING,
  role STRING,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  avg_heart_rate_bpm FLOAT64,
  min_hrv_ms FLOAT64,
  avg_hrv_ms FLOAT64,
  avg_stress_index FLOAT64,
  max_stress_index FLOAT64,
  avg_fatigue_index FLOAT64,
  fatigue_slope FLOAT64,
  avg_patient_pressure_index FLOAT64,
  max_alarm_exposure_frequency FLOAT64,
  avg_noise_exposure_db FLOAT64,
  anomaly_count INT64,
  shift_minutes_elapsed INT64,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_end)
CLUSTER BY department, staff_id;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.staff_features_1h` (
  staff_id STRING NOT NULL,
  department STRING,
  role STRING,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  avg_heart_rate_bpm FLOAT64,
  avg_hrv_ms FLOAT64,
  avg_stress_index FLOAT64,
  avg_fatigue_index FLOAT64,
  stress_volatility FLOAT64,
  fatigue_volatility FLOAT64,
  sleep_debt_hours FLOAT64,
  overtime_hours_7d FLOAT64,
  night_shift_count_14d INT64,
  patient_pressure_index_1h FLOAT64,
  alarm_exposure_frequency_1h FLOAT64,
  noise_exposure_db_1h FLOAT64,
  recovery_score_24h FLOAT64,
  intervention_count_30d INT64,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_end)
CLUSTER BY department, staff_id;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.staff_features_training` (
  staff_id STRING NOT NULL,
  department STRING,
  role STRING,
  window_end TIMESTAMP NOT NULL,
  avg_heart_rate_bpm FLOAT64,
  avg_hrv_ms FLOAT64,
  avg_stress_index FLOAT64,
  avg_fatigue_index FLOAT64,
  sleep_debt_hours_7d FLOAT64,
  overtime_hours_7d FLOAT64,
  patient_pressure_index_1h FLOAT64,
  alarm_exposure_frequency_1h FLOAT64,
  noise_exposure_db_1h FLOAT64,
  night_shift_count_14d INT64,
  recovery_score_24h FLOAT64,
  intervention_count_30d INT64,
  burnout_label_14d INT64,
  fatigue_target_24h FLOAT64,
  workload_target_24h FLOAT64,
  label_observed_at TIMESTAMP,
  feature_cutoff_at TIMESTAMP NOT NULL,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_end)
CLUSTER BY department, role, burnout_label_14d;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.model_monitoring` (
  model_name STRING NOT NULL,
  model_version STRING NOT NULL,
  window_start TIMESTAMP NOT NULL,
  window_end TIMESTAMP NOT NULL,
  feature_name STRING NOT NULL,
  population STRING,
  training_mean FLOAT64,
  serving_mean FLOAT64,
  psi FLOAT64,
  ks_statistic FLOAT64,
  missing_rate FLOAT64,
  alert_level STRING,
  generated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP()
)
PARTITION BY DATE(window_end)
CLUSTER BY model_name, model_version, feature_name;

CREATE TABLE IF NOT EXISTS `project-73d1e32a-8e68-4750-93c.pulseguard_ops.interventions` (
  intervention_id STRING NOT NULL,
  created_at TIMESTAMP NOT NULL,
  staff_id STRING,
  department STRING,
  action STRING,
  recommended_by_model_version STRING,
  accepted BOOL,
  human_approved_by STRING,
  expected_impact FLOAT64,
  observed_impact_24h FLOAT64,
  observed_impact_7d FLOAT64,
  notes STRING
)
PARTITION BY DATE(created_at)
CLUSTER BY department, action, accepted;
