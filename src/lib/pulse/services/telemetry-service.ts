import type {
  LiveDepartment,
  LivePrediction,
  LiveRiskLevel,
  LiveTelemetryEvent,
} from "./live-telemetry";
import { readStored, writeStored } from "./app-storage";

const STORAGE_KEY = "pg:telemetry-summary:v2";

export type TelemetryIntensity = "normal" | "busy" | "critical";
export type TelemetryConnectionMode = "websocket" | "fallback" | "paused";

export type StaffRiskSummary = {
  staffId: string;
  department: LiveDepartment;
  role: string;
  burnout: number;
  fatigue: number;
  stress: number;
  recovery: number;
  anomalyScore: number;
  riskLevel: LiveRiskLevel;
};

export type DepartmentRiskSummary = {
  department: LiveDepartment;
  risk: number;
  fatigue: number;
  stress: number;
  staff: number;
};

export type TelemetrySummary = {
  timestamp: string | null;
  connectionMode: TelemetryConnectionMode;
  intensity: TelemetryIntensity;
  departmentFilter: LiveDepartment | "All";
  paused: boolean;
  staffCount: number;
  avgBurnout: number;
  avgFatigue: number;
  avgStress: number;
  avgRecovery: number;
  criticalCount: number;
  highCount: number;
  modelVersion: string;
  modelHealth: "healthy" | "degraded" | "fallback";
  confidenceScore: number;
  anomalyScore: number;
  errorRate: number;
  latencyMs: number;
  lastRetrainingAt: string;
  departments: DepartmentRiskSummary[];
  staff: StaffRiskSummary[];
};

export const defaultTelemetrySummary: TelemetrySummary = {
  timestamp: null,
  connectionMode: "fallback",
  intensity: "normal",
  departmentFilter: "All",
  paused: false,
  staffCount: 0,
  avgBurnout: 63,
  avgFatigue: 58,
  avgStress: 61,
  avgRecovery: 54,
  criticalCount: 0,
  highCount: 0,
  modelVersion: "PulseGuard burnout-ensemble v2.4.1",
  modelHealth: "fallback",
  confidenceScore: 88,
  anomalyScore: 0.18,
  errorRate: 0.004,
  latencyMs: 42,
  lastRetrainingAt: "2026-05-12T08:00:00.000Z",
  departments: [],
  staff: [],
};

export function loadTelemetrySummary(): TelemetrySummary {
  return readStored<TelemetrySummary>(STORAGE_KEY, defaultTelemetrySummary);
}

export function saveTelemetrySummary(summary: TelemetrySummary): TelemetrySummary {
  writeStored(STORAGE_KEY, summary);
  return summary;
}

export function buildTelemetrySummary(
  rows: { telemetry: LiveTelemetryEvent; prediction: LivePrediction }[],
  controls: Pick<TelemetrySummary, "connectionMode" | "intensity" | "departmentFilter" | "paused">,
): TelemetrySummary {
  const staff = rows.map(({ telemetry, prediction }) => ({
    staffId: telemetry.staff_id,
    department: telemetry.department,
    role: telemetry.role,
    burnout: Math.round(prediction.burnout_probability * 100),
    fatigue: Math.round(telemetry.signals.fatigue_index),
    stress: Math.round(telemetry.signals.stress_index),
    recovery: Math.round(telemetry.signals.recovery_score),
    anomalyScore: prediction.anomaly_score,
    riskLevel: prediction.risk_level,
  }));
  const departments = Array.from(new Set(staff.map((item) => item.department))).map(
    (department) => {
      const scoped = staff.filter((item) => item.department === department);
      return {
        department,
        risk: average(scoped.map((item) => item.burnout)),
        fatigue: average(scoped.map((item) => item.fatigue)),
        stress: average(scoped.map((item) => item.stress)),
        staff: scoped.length,
      };
    },
  );
  const predictions = rows.map((row) => row.prediction);
  const latestPrediction = predictions[predictions.length - 1];
  return {
    ...defaultTelemetrySummary,
    ...controls,
    timestamp: new Date().toISOString(),
    staffCount: staff.length,
    avgBurnout: average(staff.map((item) => item.burnout)),
    avgFatigue: average(staff.map((item) => item.fatigue)),
    avgStress: average(staff.map((item) => item.stress)),
    avgRecovery: average(staff.map((item) => item.recovery)),
    criticalCount: staff.filter((item) => item.riskLevel === "critical").length,
    highCount: staff.filter((item) => item.riskLevel === "high").length,
    modelVersion: latestPrediction?.model_version ?? defaultTelemetrySummary.modelVersion,
    modelHealth: controls.connectionMode === "websocket" ? "healthy" : "fallback",
    confidenceScore: Math.max(
      72,
      Math.round(94 - average(predictions.map((item) => item.anomaly_score * 28))),
    ),
    anomalyScore: average(predictions.map((item) => item.anomaly_score)),
    errorRate: controls.connectionMode === "websocket" ? 0.003 : 0.011,
    latencyMs: controls.connectionMode === "websocket" ? 38 : 12,
    departments,
    staff,
  };
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}
