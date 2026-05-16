// Domain types for PulseGuard AI.
// These are the canonical shapes the UI consumes. Any future backend
// (Supabase / Lovable Cloud / external forecasting API) should map its
// responses into these models inside `services/api.ts`.

export type RiskLevel = "stable" | "low" | "moderate" | "elevated" | "critical";
export type Trend = "up" | "down" | "stable";
export type Impact = "ridicat" | "mediu" | "scazut";

export type Department = {
  id: string;
  name: string;
  type: string; // e.g. "Critic Care", "Emergency", "Surgical"
  unit: string; // physical unit label (Tower B, etc.)
  lead: string;
  staff: number;
  currentRisk: number; // 0-100
  predictedRisk: number; // 0-100, 14d horizon
  staffPressureIndex: number; // 0-100
  interventionUrgency: number; // 0-100
  fatigueIndex: number; // 0-100
  shortageRisk: number; // 0-100
  occupancy: number; // 0-100
  trend: Trend;
  delta: number;
};

export type Coordinator = {
  id: string;
  name: string;
  role: string;
  unit: string;
  avatarUrl?: string;
};

export type TimeSeriesInput = {
  date: string; // ISO YYYY-MM-DD
  overtimeHours: number;
  nightShiftCount: number;
  patientToStaffRatio: number;
  sickLeaveEvents: number;
  stressSurveyScore: number;
  occupancyRate: number; // 0-100
  incidentRapoarte: number;
};

export type ForecastOutput = {
  date: string;
  predictedBurnoutRisk: number; // 0-100
  predictedFatigueIndex: number; // 0-100
  predictedStaffDeficitRisk: number; // 0-100
  confidenceLow: number;
  confidenceRidicat: number;
  isForecast: boolean;
};

export type Scenario = {
  id: string;
  name: string;
  department: string;
  riskLevel: RiskLevel;
  risk: number; // 0-100
  description: string;
  drivers: string[];
  recommendedAction: string;
  mockInputSeries: TimeSeriesInput[];
  mockForecastSeries: ForecastOutput[];
  spark: number[];
};

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  impact: Impact;
  eta: string;
  department: string;
};

export type Report = {
  id: string;
  generatedAt: string; // ISO timestamp
  department: string;
  coordinator: string;
  confidenceScore: number; // 0-100
  riskLevel: RiskLevel;
  executiveSummary: string;
  primaryDrivers: { label: string; weight: number }[];
  recommendations: Recommendation[];
  followUpIndicators: string[];
};

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  department: string;
  level: "critical" | "warning" | "info";
  time: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: string; // ISO timestamp
};

export type NotificationSetari = {
  emailAlerts: boolean;
  pushAlerts: boolean;
  criticalOnly: boolean;
  weeklyDigest: boolean;
};

export type ThemeMode = "light" | "dark" | "system" | "high-contrast";

export type UserPreferences = {
  selectedTheme: ThemeMode;
  selectedDepartment: string; // department id or name
  selectedCoordinator: string; // coordinator name
  reducedMotion: boolean;
  notificationSetari: NotificationSetari;
};

