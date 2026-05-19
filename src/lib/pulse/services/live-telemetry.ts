export type LiveDepartment = "ICU" | "ER" | "Surgery" | "Pediatrics" | "Oncology";
export type LiveRole = "doctor" | "nurse" | "coordinator";
export type LiveRiskLevel = "low" | "moderate" | "high" | "critical";
export type LiveIntensity = "normal" | "busy" | "critical";

export type LiveTelemetryEvent = {
  event_id: string;
  timestamp: string;
  device_id: string;
  staff_id: string;
  department: LiveDepartment;
  role: LiveRole;
  shift_type: "day" | "night" | "off";
  shift_minutes_elapsed: number;
  signals: {
    heart_rate_bpm: number;
    hrv_ms: number;
    stress_index: number;
    fatigue_index: number;
    skin_temperature_c: number;
    sleep_debt_hours: number;
    shift_duration_hours: number;
    overtime_hours: number;
    cognitive_load: number;
    movement_activity_level: number;
    emotional_stress_score: number;
    burnout_probability: number;
    patient_pressure_index: number;
    alarm_exposure_frequency: number;
    noise_exposure_db: number;
    night_shift_adaptation: number;
    recovery_score: number;
  };
  operational_context: {
    patient_count: number;
    acuity_index: number;
    staffing_ratio: number;
    active_alarms: number;
    weekend: boolean;
    emergency_surge: boolean;
    anomaly_type: string | null;
    load_intensity: number;
  };
  digital_twin: {
    resilience: number;
    recovery_rate: number;
    overtime_sensitivity: number;
    burnout_susceptibility: number;
    sleep_quality: number;
  };
};

export type LivePrediction = {
  staff_id: string;
  department: LiveDepartment;
  timestamp: string;
  model_version: string;
  burnout_probability: number;
  fatigue_forecast_6h: number;
  fatigue_forecast_24h: number;
  workload_forecast_24h: number;
  anomaly_score: number;
  is_anomaly: boolean;
  risk_level: LiveRiskLevel;
  top_drivers: { name: string; value: number; weight: number }[];
  recommendations: {
    action: string;
    priority: string;
    rationale: string;
    expected_impact: number;
  }[];
};

export type LiveTelemetryEnvelope = {
  type: "telemetry.prediction" | "snapshot";
  telemetry?: LiveTelemetryEvent;
  prediction?: LivePrediction;
  staff?: LiveTelemetryEnvelope[];
};

export const liveDepartments: LiveDepartment[] = ["ICU", "ER", "Surgery", "Pediatrics", "Oncology"];

const departmentBase: Record<
  LiveDepartment,
  { pressure: number; alarms: number; noise: number; emotional: number }
> = {
  ICU: { pressure: 82, alarms: 24, noise: 72, emotional: 68 },
  ER: { pressure: 78, alarms: 16, noise: 76, emotional: 64 },
  Surgery: { pressure: 64, alarms: 8, noise: 64, emotional: 52 },
  Pediatrics: { pressure: 52, alarms: 7, noise: 58, emotional: 58 },
  Oncology: { pressure: 58, alarms: 5, noise: 55, emotional: 78 },
};

const roles: LiveRole[] = ["nurse", "nurse", "doctor", "coordinator"];

export function telemetryWebSocketUrl(): string | null {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  return env?.VITE_TELEMETRY_WS_URL ?? null;
}

export function makeSyntheticEnvelope(
  index: number,
  tick: number,
  intensity: LiveIntensity = "normal",
  forcedDepartment?: LiveDepartment,
): LiveTelemetryEnvelope {
  const department = forcedDepartment ?? liveDepartments[index % liveDepartments.length];
  const role = roles[index % roles.length];
  const base = departmentBase[department];
  const now = new Date();
  const hour = now.getHours();
  const dayShift = hour >= 7 && hour < 19;
  const shift_type = dayShift ? "day" : "night";
  const elapsed = dayShift
    ? (hour - 7) * 60 + now.getMinutes()
    : ((hour + 5) % 24) * 60 + now.getMinutes();
  const wave = Math.sin((tick + index * 7) / 8);
  const surge =
    (department === "ER" && (hour >= 18 || hour <= 2)) || (department === "ICU" && tick % 19 > 15);
  const intensityBoost = intensity === "critical" ? 22 : intensity === "busy" ? 12 : 0;
  const patientPressure = clamp(
    base.pressure + intensityBoost + wave * 8 + (surge ? 13 : 0),
    0,
    100,
  );
  const fatigue = clamp(34 + elapsed / 18 + patientPressure * 0.24 + wave * 5, 0, 100);
  const stress = clamp(28 + patientPressure * 0.48 + (surge ? 10 : 0) + wave * 4, 0, 100);
  const sleepDebt = clamp(
    (shift_type === "night" ? 4.8 : 2.6) + elapsed / 330 + index * 0.08,
    0,
    16,
  );
  const burnout = clamp01(
    -0.35 + stress / 170 + fatigue / 185 + sleepDebt / 22 + (department === "ICU" ? 0.08 : 0),
  );
  const anomaly = tick % (31 + index) === 0 ? "alarm_storm" : null;
  const risk_level: LiveRiskLevel =
    burnout >= 0.82 ? "critical" : burnout >= 0.64 ? "high" : burnout >= 0.42 ? "moderate" : "low";
  const staff_id = `staff_${department.toLowerCase()}_${String((index % 12) + 1).padStart(3, "0")}`;

  const telemetry: LiveTelemetryEvent = {
    event_id: `browser_${tick}_${staff_id}`,
    timestamp: now.toISOString(),
    device_id: `headset_${department.toLowerCase()}_${String((index % 12) + 1).padStart(3, "0")}`,
    staff_id,
    department,
    role,
    shift_type,
    shift_minutes_elapsed: Math.max(0, elapsed),
    signals: {
      heart_rate_bpm: round(66 + stress * 0.24 + fatigue * 0.08 + wave * 3, 1),
      hrv_ms: round(clamp(72 - stress * 0.42 - fatigue * 0.16, 8, 110), 1),
      stress_index: round(stress, 1),
      fatigue_index: round(fatigue, 1),
      skin_temperature_c: round(36.4 + stress * 0.006, 2),
      sleep_debt_hours: round(sleepDebt, 2),
      shift_duration_hours: round(elapsed / 60, 2),
      overtime_hours: round(Math.max(0, elapsed / 60 - 12), 2),
      cognitive_load: round(
        clamp(48 + patientPressure * 0.44 + (role === "doctor" ? 10 : 0), 0, 100),
        1,
      ),
      movement_activity_level: round(
        clamp(22 + patientPressure * (role === "nurse" ? 0.62 : 0.32), 0, 100),
        1,
      ),
      emotional_stress_score: round(clamp(base.emotional + stress * 0.16, 0, 100), 1),
      burnout_probability: round(burnout, 4),
      patient_pressure_index: round(patientPressure, 1),
      alarm_exposure_frequency: round(base.alarms + patientPressure / 7 + (anomaly ? 12 : 0), 1),
      noise_exposure_db: round(base.noise + patientPressure / 12 + (anomaly ? 6 : 0), 1),
      night_shift_adaptation: round(clamp01(0.45 + index * 0.015), 3),
      recovery_score: round(clamp(92 - fatigue * 0.7 - sleepDebt * 2.1, 0, 100), 1),
    },
    operational_context: {
      patient_count: Math.round(patientPressure / 4 + (department === "ICU" ? 8 : 3)),
      acuity_index: round(department === "ICU" ? 0.92 : department === "ER" ? 0.78 : 0.62, 2),
      staffing_ratio: round(1.4 + patientPressure / 42, 2),
      active_alarms: Math.round(base.alarms + patientPressure / 8),
      weekend: [0, 6].includes(now.getDay()),
      emergency_surge: surge,
      anomaly_type: anomaly,
      load_intensity: intensity === "critical" ? 0.98 : intensity === "busy" ? 0.9 : 0.72,
    },
    digital_twin: {
      resilience: round(clamp01(0.72 - index * 0.01), 3),
      recovery_rate: round(clamp01(0.62 - index * 0.006), 3),
      overtime_sensitivity: round(clamp01(0.42 + index * 0.012), 3),
      burnout_susceptibility: round(clamp01(0.38 + index * 0.012), 3),
      sleep_quality: round(clamp01(0.78 - sleepDebt * 0.05), 3),
    },
  };

  return {
    type: "telemetry.prediction",
    telemetry,
    prediction: {
      staff_id,
      department,
      timestamp: now.toISOString(),
      model_version: "browser-synthetic",
      burnout_probability: burnout,
      fatigue_forecast_6h: round(clamp(fatigue + 6, 0, 100), 1),
      fatigue_forecast_24h: round(clamp(fatigue + 14, 0, 100), 1),
      workload_forecast_24h: round(clamp(patientPressure + 4, 0, 100), 1),
      anomaly_score: anomaly ? 0.76 : round(clamp01((stress + fatigue - 110) / 120), 3),
      is_anomaly: Boolean(anomaly),
      risk_level,
      top_drivers: [
        { name: "patient_pressure_index", value: round(patientPressure, 1), weight: 0.22 },
        { name: "fatigue_index", value: round(fatigue, 1), weight: 0.2 },
        { name: "sleep_debt_hours", value: round(sleepDebt, 2), weight: 0.14 },
      ],
      recommendations: [],
    },
  };
}

function clamp(value: number, low: number, high: number) {
  return Math.max(low, Math.min(high, value));
}

function clamp01(value: number) {
  return clamp(value, 0, 1);
}

function round(value: number, digits: number) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
