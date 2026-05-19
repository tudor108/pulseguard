from __future__ import annotations

import os
from pathlib import Path

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest

from .features import FeatureVector, heuristic_burnout_probability


class ModelBundle:
    def __init__(self, model_dir: str | None = None) -> None:
        self.model_dir = Path(model_dir or os.getenv("MODEL_DIR", "/models"))
        self.burnout_model = self._load_optional("burnout_xgboost.joblib")
        self.fatigue_model = self._load_optional("fatigue_lightgbm.joblib")
        self.workload_model = self._load_optional("workload_lightgbm.joblib")
        self.anomaly_model = self._load_optional("anomaly_isolation_forest.joblib") or self._default_anomaly_model()
        self.version = os.getenv("MODEL_VERSION", "heuristic-dev")
        if self.burnout_model is not None:
            self.version = os.getenv("MODEL_VERSION", "artifact-champion")

    def _load_optional(self, name: str):
        path = self.model_dir / name
        if not path.exists():
            return None
        return joblib.load(path)

    def _default_anomaly_model(self) -> IsolationForest:
        rng = np.random.default_rng(42)
        reference = rng.normal(
            loc=[72, 54, 45, 38, 3, 6, 2, 58, 45, 52, 58, 9, 62, 0.55, 64, 0.65, 2.1, 6, 0, 0, 0.62, 0.58, 0.52, 0.42, 0.72, 0, 1, 0, 0, 0, 0, 0, 0],
            scale=[8, 14, 18, 16, 2, 4, 4, 16, 18, 16, 18, 8, 8, 0.2, 18, 0.18, 0.8, 7, 0.2, 0.1, 0.15, 0.15, 0.18, 0.18, 0.14, 0.3, 0.4, 0.2, 0.3, 0.3, 0.2, 0.2, 0.2],
            size=(600, 33),
        )
        model = IsolationForest(n_estimators=100, contamination=0.04, random_state=42)
        model.fit(reference)
        return model

    def predict_burnout(self, vector: FeatureVector) -> float:
        if self.burnout_model is not None:
            if hasattr(self.burnout_model, "predict_proba"):
                return float(self.burnout_model.predict_proba(vector.values)[0][1])
            return float(np.clip(self.burnout_model.predict(vector.values)[0], 0, 1))
        return heuristic_burnout_probability(vector.named)

    def predict_fatigue(self, vector: FeatureVector, horizon_hours: int) -> float:
        model = self.fatigue_model
        if model is not None:
            return float(np.clip(model.predict(vector.values)[0], 0, 100))
        base = vector.named["fatigue_index"]
        pressure = vector.named["patient_pressure_index"]
        sleep = vector.named["sleep_debt_hours"]
        recovery = vector.named["recovery_rate"]
        delta = horizon_hours * (pressure / 100 * 1.2 + sleep * 0.09 - recovery * 0.45)
        return float(np.clip(base + delta, 0, 100))

    def predict_workload(self, vector: FeatureVector) -> float:
        if self.workload_model is not None:
            return float(np.clip(self.workload_model.predict(vector.values)[0], 0, 100))
        value = (
            vector.named["patient_pressure_index"] * 0.62
            + vector.named["staffing_ratio"] * 8
            + vector.named["acuity_index"] * 18
            + vector.named["emergency_surge"] * 8
        )
        return float(np.clip(value, 0, 100))

    def anomaly_score(self, vector: FeatureVector) -> tuple[float, bool]:
        raw = float(self.anomaly_model.decision_function(vector.values)[0])
        normalized = float(np.clip(0.5 - raw, 0, 1))
        return normalized, normalized >= 0.62

