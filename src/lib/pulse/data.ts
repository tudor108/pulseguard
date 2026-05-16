// NOTE: This file is kept as a backwards-compatible shim for existing UI
// imports. The canonical, backend-ready data layer now lives in
// `@/lib/pulse/services` (typed domain models + async `api` facade).
// New code should prefer importing from `@/lib/pulse/services`.

export {
  api,
  departmentsMock,
  coordinatorsMock,
  scenariosMock,
  reportsMock,
  recommendationsMock,
  alertsMock,
  chatMessagesMock,
  defaultPreferences,
  buildTimeSeries,
  buildForecastOutput,
} from "./services";
export type {
  Department as DepartmentModel,
  Coordinator as CoordinatorModel,
  TimeSeriesInput,
  ForecastOutput,
  Scenario as ScenarioModel,
  Report,
  AlertItem as AlertModel,
  ChatMessage,
  UserPreferences,
  NotificationSetari,
  ThemeMode,
  Recommendation as RecommendationModel,
  RiskLevel,
} from "./services";

// ---------------------------------------------------------------------------
// Legacy shapes retained so existing screens keep compiling unchanged.
// ---------------------------------------------------------------------------

export type Department = {
  id: string;
  name: string;
  unit: string;
  staff: number;
  burnoutRisk: number; // 0-100
  fatigueIndex: number; // 0-100
  workloadPressure: number; // 0-100
  shortageRisk: number; // 0-100
  occupancy: number; // 0-100
  trend: "up" | "down" | "stable";
  delta: number;
  lead: string;
};

export const departments: Department[] = [
  { id: "icu", name: "Unitate Terapie Intensiva", unit: "ICU · Tower B", staff: 84, burnoutRisk: 78, fatigueIndex: 71, workloadPressure: 82, shortageRisk: 64, occupancy: 94, trend: "up", delta: 6.4, lead: "Dr. Reyes" },
  { id: "er",  name: "Departament Urgente", unit: "ER · Ground floor", staff: 112, burnoutRisk: 71, fatigueIndex: 68, workloadPressure: 88, shortageRisk: 58, occupancy: 97, trend: "up", delta: 4.1, lead: "Dr. Okafor" },
  { id: "onc", name: "Oncologie", unit: "Tower A · L4", staff: 56, burnoutRisk: 62, fatigueIndex: 59, workloadPressure: 64, shortageRisk: 41, occupancy: 81, trend: "stable", delta: 0.6, lead: "Dr. Lindqvist" },
  { id: "ped", name: "Pediatrie", unit: "Tower C · L2", staff: 64, burnoutRisk: 44, fatigueIndex: 41, workloadPressure: 48, shortageRisk: 30, occupancy: 72, trend: "down", delta: -2.8, lead: "Dr. Haddad" },
  { id: "sur", name: "Chirurgie", unit: "Tower A · L3", staff: 78, burnoutRisk: 58, fatigueIndex: 55, workloadPressure: 72, shortageRisk: 47, occupancy: 86, trend: "up", delta: 3.2, lead: "Dr. Brennan" },
  { id: "mat", name: "Maternitate", unit: "Tower C · L1", staff: 48, burnoutRisk: 39, fatigueIndex: 36, workloadPressure: 44, shortageRisk: 22, occupancy: 68, trend: "down", delta: -1.4, lead: "Dr. Kovač" },
  { id: "rad", name: "Radiologie", unit: "Tower B · L1", staff: 32, burnoutRisk: 51, fatigueIndex: 47, workloadPressure: 58, shortageRisk: 34, occupancy: 74, trend: "stable", delta: 0.9, lead: "Dr. Park" },
  { id: "psy", name: "Psihiatrie", unit: "Tower D · L2", staff: 38, burnoutRisk: 66, fatigueIndex: 61, workloadPressure: 60, shortageRisk: 52, occupancy: 79, trend: "up", delta: 5.0, lead: "Dr. Almeida" },
];

export type SeriesPoint = {
  date: string; // ISO day
  workload: number;
  overtime: number;
  nightShifts: number;
  patientRatio: number;
  sickLeave: number;
  incidents: number;
  stressScore: number;
  occupancy: number;
};

export type ForecastPoint = {
  date: string;
  burnoutRisk: number;
  workloadPressure: number;
  shortageRisk: number;
  fatigueIndex: number;
  interventionUrgency: number;
  forecast?: boolean;
};

function seeded(i: number, base: number, amp: number, period = 7) {
  return base + Math.sin((i / period) * Math.PI * 2) * amp + (Math.cos(i / 3.1) * amp) / 3;
}

export function buildSeries(days = 30): SeriesPoint[] {
  const today = new Date();
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const idx = days - i;
    out.push({
      date: d.toISOString().slice(0, 10),
      workload: Math.round(seeded(idx, 48, 6) + (idx > 18 ? idx - 18 : 0)),
      overtime: Math.round(seeded(idx, 9, 3) + (idx > 20 ? (idx - 20) * 0.6 : 0)),
      nightShifts: Math.round(seeded(idx, 14, 4)),
      patientRatio: +(seeded(idx, 4.6, 0.6) + (idx > 22 ? 0.4 : 0)).toFixed(2),
      sickLeave: Math.max(0, Math.round(seeded(idx, 5, 2.5) + (idx > 24 ? 2 : 0))),
      incidents: Math.max(0, Math.round(seeded(idx, 2.4, 1.6))),
      stressScore: +(seeded(idx, 6.2, 1.2) + (idx > 20 ? 0.6 : 0)).toFixed(1),
      occupancy: Math.min(100, Math.round(seeded(idx, 82, 6) + (idx > 22 ? 4 : 0))),
    });
  }
  return out;
}

export function buildForecast(days = 30, forecastDays = 14): ForecastPoint[] {
  const today = new Date();
  const out: ForecastPoint[] = [];
  const total = days + forecastDays;
  for (let i = 0; i < total; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1) + i);
    const isForecast = i >= days;
    const t = i + 1;
    const drift = isForecast ? (i - days + 1) * 1.6 : 0;
    out.push({
      date: d.toISOString().slice(0, 10),
      burnoutRisk: Math.min(98, Math.round(50 + Math.sin(t / 5) * 8 + t * 0.6 + drift)),
      workloadPressure: Math.min(98, Math.round(58 + Math.cos(t / 4) * 7 + t * 0.4 + drift * 0.9)),
      shortageRisk: Math.min(95, Math.round(42 + Math.sin(t / 6) * 9 + t * 0.35 + drift * 0.7)),
      fatigueIndex: Math.min(98, Math.round(46 + Math.sin(t / 4.5) * 7 + t * 0.5 + drift * 0.8)),
      interventionUrgency: Math.min(99, Math.round(38 + Math.sin(t / 5.5) * 6 + t * 0.7 + drift * 1.1)),
      forecast: isForecast,
    });
  }
  return out;
}

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  impact: "high" | "medium" | "low";
  eta: string;
  department: string;
};

export const recommendations: Recommendation[] = [
  { id: "r1", title: "Add 2 nurses to ICU night shift for next 7 days", detail: "Forecast shows fatigue index crossing 75 by Day 4. Reinforce night rotation to relieve tenure staff.", impact: "high", eta: "Tura urmatoare", department: "ICU" },
  { id: "r2", title: "Cap ER overtime at 8h / week", detail: "Sustained overtime above 12h correlates with +18% incident risk in the last 14 zile.", impact: "high", eta: "This week", department: "ER" },
  { id: "r3", title: "Schedule wellbeing check-ins for Oncologie team", detail: "Scor sondaj stress rose by 0.9 points; recommend 30-min individual sessions.", impact: "medium", eta: "Within 5 days", department: "Oncologie" },
  { id: "r4", title: "Redistribute 4 patients from Chirurgie to Maternitate float pool", detail: "Maternitate occupancy at 68% — capacity exists to offload pressure from Chirurgie.", impact: "medium", eta: "48 hours", department: "Chirurgie" },
  { id: "r5", title: "Trigger fatigue micro-break protocol in Psihiatrie", detail: "Predicted fatigue index reaches 72 within 6 days. Activate 15-min protected breaks.", impact: "low", eta: "Next 72h", department: "Psihiatrie" },
];

export type IncidentSignal = {
  id: string;
  time: string;
  message: string;
  level: "info" | "warn" | "critical";
  dept: string;
};

export const liveSignals: IncidentSignal[] = [
  { id: "s1", time: "2 min ago", message: "ICU night-shift overtime spiked +14%", level: "critical", dept: "ICU" },
  { id: "s2", time: "11 min ago", message: "ER patient-to-staff ratio at 5.8 (target 4.5)", level: "warn", dept: "ER" },
  { id: "s3", time: "26 min ago", message: "Oncologie stress survey submitted (n=18)", level: "info", dept: "Oncologie" },
  { id: "s4", time: "48 min ago", message: "Pediatrie fatigue index dropping (-3.1)", level: "info", dept: "Pediatrie" },
  { id: "s5", time: "1h ago", message: "Psihiatrie sick-leave +2 vs 7-day baseline", level: "warn", dept: "Psihiatrie" },
];

export function riskBand(score: number): { label: string; tone: "success" | "warning" | "danger" | "muted" } {
  if (score >= 75) return { label: "Critic", tone: "danger" };
  if (score >= 60) return { label: "Ridicat", tone: "warning" };
  if (score >= 40) return { label: "Moderat", tone: "warning" };
  if (score >= 20) return { label: "Scazut", tone: "success" };
  return { label: "Stabil", tone: "muted" };
}

export type Scenario = {
  id: string;
  name: string;
  department: string;
  risk: number;
  description: string;
  spark: number[];
};

export const scenarios: Scenario[] = [
  { id: "icu-night", name: "Supraincarcare tura de noapte ATI", department: "Intensive Care · Tower B",
    risk: 82, description: "Sustained overtime and elevated patient-to-nurse ratio across 14 consecutive nights.",
    spark: [42, 48, 51, 55, 60, 64, 68, 71, 73, 76, 79, 82] },
  { id: "er-surge", name: "Departament Urgente Surge", department: "ER · Ground floor",
    risk: 76, description: "Walk-in volume +34% during weekend; triage bottleneck between 22:00–04:00.",
    spark: [52, 55, 58, 62, 60, 65, 70, 72, 74, 73, 75, 76] },
  { id: "sur-short", name: "Sectie Chirurgie Staff Deficit", department: "Chirurgie · Tower A",
    risk: 68, description: "3 scheduled OR teams understaffed by 1 scrub nurse each for 6 days.",
    spark: [40, 44, 46, 48, 52, 55, 58, 60, 63, 65, 67, 68] },
  { id: "ped-seasonal", name: "Pediatric Unit Seasonal Pressure", department: "Pediatrie · Tower C",
    risk: 54, description: "RSV admissions trending up; predicted +20% beds in the next 10 days.",
    spark: [30, 33, 36, 40, 42, 44, 47, 49, 50, 52, 53, 54] },
  { id: "onc-load", name: "Oncologie Department Emotional Load", department: "Oncologie · Tower A L4",
    risk: 62, description: "Scor sondaj stress rose +0.9 points; 4 staff flagged for wellbeing check.",
    spark: [44, 46, 48, 50, 51, 53, 55, 57, 58, 60, 61, 62] },
  { id: "weekend", name: "Weekend Understaffing Scenario", department: "All wards · Sat–Sun",
    risk: 71, description: "Routine weekend coverage gap intersects with elective surgery backlog.",
    spark: [38, 42, 46, 50, 54, 58, 62, 65, 67, 68, 70, 71] },
];

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  department: string;
  level: "critical" | "warning" | "info";
  time: string;
};

export const alerts: AlertItem[] = [
  { id: "a1", title: "ICU burnout risk crossing critical threshold", detail: "Forecast hits 80 within 6 days at current trajectory.", department: "ICU · Tower B", level: "critical", time: "2 min ago" },
  { id: "a2", title: "ER overtime exceeding 14h/nurse this week", detail: "5 nurses above the 12h soft cap.", department: "Urgente", level: "critical", time: "18 min ago" },
  { id: "a3", title: "Oncologie stress survey complete", detail: "18 responses · average score 6.7 (+0.9 vs baseline).", department: "Oncologie", level: "info", time: "1h ago" },
  { id: "a4", title: "Psihiatrie sick-leave anomaly", detail: "+2 cases vs 7-day baseline; monitor for fatigue spillover.", department: "Psihiatrie", level: "warning", time: "2h ago" },
  { id: "a5", title: "Maternitate capacity available", detail: "Occupancy at 68%; eligible to absorb 4 transfers.", department: "Maternitate", level: "info", time: "3h ago" },
  { id: "a6", title: "Chirurgie overtime trending up", detail: "+3.2% vs last week; recommend monitoring.", department: "Chirurgie", level: "warning", time: "5h ago" },
];


