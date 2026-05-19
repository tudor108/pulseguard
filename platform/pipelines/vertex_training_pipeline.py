from __future__ import annotations

from kfp import dsl


@dsl.component(
    base_image="python:3.12",
    packages_to_install=["google-cloud-bigquery", "pandas", "pyarrow"],
)
def extract_training_data(
    project_id: str,
    dataset: str,
    output_uri: dsl.Output[dsl.Dataset],
) -> None:
    from google.cloud import bigquery

    query = f"""
    SELECT
      staff_id,
      department,
      role,
      window_end,
      avg_heart_rate_bpm,
      avg_hrv_ms,
      avg_stress_index,
      avg_fatigue_index,
      sleep_debt_hours_7d,
      overtime_hours_7d,
      patient_pressure_index_1h,
      alarm_exposure_frequency_1h,
      noise_exposure_db_1h,
      night_shift_count_14d,
      recovery_score_24h,
      intervention_count_30d,
      burnout_label_14d,
      fatigue_target_24h,
      workload_target_24h
    FROM `{project_id}.{dataset}.staff_features_training`
    WHERE window_end >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 180 DAY)
    """
    client = bigquery.Client(project=project_id)
    frame = client.query(query).to_dataframe()
    frame.to_parquet(output_uri.path, index=False)


@dsl.component(
    base_image="python:3.12",
    packages_to_install=["pandas", "pyarrow", "scikit-learn", "xgboost", "lightgbm", "joblib"],
)
def train_tabular_models(
    training_data: dsl.Input[dsl.Dataset],
    model_dir: dsl.Output[dsl.Model],
    metrics: dsl.Output[dsl.Metrics],
) -> None:
    import joblib
    import lightgbm as lgb
    import pandas as pd
    import xgboost as xgb
    from sklearn.ensemble import IsolationForest
    from sklearn.metrics import average_precision_score, mean_absolute_error, roc_auc_score
    from sklearn.model_selection import train_test_split
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import OneHotEncoder
    from sklearn.compose import ColumnTransformer

    frame = pd.read_parquet(training_data.path)
    label = "burnout_label_14d"
    fatigue_target = "fatigue_target_24h"
    workload_target = "workload_target_24h"
    excluded = {"staff_id", "window_end", label, fatigue_target, workload_target}
    feature_columns = [column for column in frame.columns if column not in excluded]
    categorical = ["department", "role"]
    numeric = [column for column in feature_columns if column not in categorical]

    train, test = train_test_split(frame, test_size=0.2, random_state=42, stratify=frame[label])
    preprocessor = ColumnTransformer(
        transformers=[
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical),
            ("num", "passthrough", numeric),
        ]
    )

    burnout_model = Pipeline(
        steps=[
            ("features", preprocessor),
            (
                "model",
                xgb.XGBClassifier(
                    n_estimators=350,
                    max_depth=4,
                    learning_rate=0.045,
                    subsample=0.85,
                    colsample_bytree=0.85,
                    eval_metric="logloss",
                    tree_method="hist",
                    random_state=42,
                ),
            ),
        ]
    )
    burnout_model.fit(train[feature_columns], train[label])
    burnout_prob = burnout_model.predict_proba(test[feature_columns])[:, 1]

    fatigue_model = Pipeline(
        steps=[
            ("features", preprocessor),
            (
                "model",
                lgb.LGBMRegressor(
                    objective="quantile",
                    alpha=0.5,
                    n_estimators=400,
                    learning_rate=0.04,
                    num_leaves=31,
                    random_state=42,
                ),
            ),
        ]
    )
    fatigue_model.fit(train[feature_columns], train[fatigue_target])
    fatigue_pred = fatigue_model.predict(test[feature_columns])

    workload_model = Pipeline(
        steps=[
            ("features", preprocessor),
            (
                "model",
                lgb.LGBMRegressor(
                    n_estimators=320,
                    learning_rate=0.05,
                    num_leaves=31,
                    random_state=42,
                ),
            ),
        ]
    )
    workload_model.fit(train[feature_columns], train[workload_target])

    anomaly_features = preprocessor.fit_transform(frame[feature_columns])
    anomaly_model = IsolationForest(n_estimators=300, contamination=0.04, random_state=42)
    anomaly_model.fit(anomaly_features)

    joblib.dump(burnout_model, f"{model_dir.path}/burnout_xgboost.joblib")
    joblib.dump(fatigue_model, f"{model_dir.path}/fatigue_lightgbm.joblib")
    joblib.dump(workload_model, f"{model_dir.path}/workload_lightgbm.joblib")
    joblib.dump(anomaly_model, f"{model_dir.path}/anomaly_isolation_forest.joblib")

    metrics.log_metric("burnout_auroc", float(roc_auc_score(test[label], burnout_prob)))
    metrics.log_metric("burnout_auprc", float(average_precision_score(test[label], burnout_prob)))
    metrics.log_metric("fatigue_mae_24h", float(mean_absolute_error(test[fatigue_target], fatigue_pred)))


@dsl.component(
    base_image="python:3.12",
    packages_to_install=["google-cloud-aiplatform"],
)
def register_model(
    project_id: str,
    region: str,
    model_dir: dsl.Input[dsl.Model],
    display_name: str,
) -> None:
    from google.cloud import aiplatform

    aiplatform.init(project=project_id, location=region)
    aiplatform.Model.upload(
        display_name=display_name,
        artifact_uri=model_dir.uri,
        serving_container_image_uri=f"{region}-docker.pkg.dev/{project_id}/pulseguard/ml-inference:latest",
        sync=True,
    )


@dsl.pipeline(name="pulseguard-training-pipeline")
def pulseguard_training_pipeline(
    project_id: str,
    region: str = "us-central1",
    dataset: str = "pulseguard_ops",
    display_name: str = "pulseguard-burnout-risk",
) -> None:
    data = extract_training_data(project_id=project_id, dataset=dataset)
    trained = train_tabular_models(training_data=data.outputs["output_uri"])
    register_model(
        project_id=project_id,
        region=region,
        model_dir=trained.outputs["model_dir"],
        display_name=display_name,
    )

