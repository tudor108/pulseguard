import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TimeSeriesInput, ForecastOutput, RiskLevel } from "./services/types";
import { buildTimeSeries } from "./services/timeseries";
import { buildForecastOutput } from "./services/forecast";

export type RiskDriver = {
  driverName: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  recommendedMitigation: string;
};

export type ScenarioRecommendation = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  expectedImpact: string;
};

export type ScenarioAlert = {
  title: string;
  severity: "warning" | "critical" | "info";
  department: string;
  primaryDriver: string;
  timestamp: string;
};

export type GeneratScenario = {
  id: string;
  name: string;
  department: string;
  generatedAt: string;
  forecastHorizon: number; // days
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  predicted14d: number;
  staffPressure: number;
  interventionUrgency: number;
  confidenceScore: number; // 0-100
  inputSeries: TimeSeriesInput[];
  forecastSeries: ForecastOutput[];
  primaryDrivers: RiskDriver[];
  recommendations: ScenarioRecommendation[];
  followUpIndicators: string[];
  explanation: string;
  expectedImpact: string;
  alerts: ScenarioAlert[];
  prompt: string;
};

type Ctx = {
  active: GeneratScenario | null;
  setActive: (s: GeneratScenario | null) => void;
  generateFromPrompt: (prompt: string) => GeneratScenario;
};

const ScenarioCtx = createContext<Ctx | null>(null);

function pick<T>(arr: T[], i: number): T { return arr[i % arr.length]; }

function detectContext(prompt: string) {
  const p = prompt.toLowerCase();
  const dept =
    /icu|intensive/.test(p) ? "Unitate Terapie Intensiva · Tower B" :
    /emergency|er\b|ed\b/.test(p) ? "Departament Urgente · Ground Floor" :
    /surg/.test(p) ? "Sectie Chirurgie · Tower A" :
    /oncolog/.test(p) ? "Oncologie · Tower A L4" :
    /pediatr/.test(p) ? "Pediatrie · Tower C" :
    /maternity/.test(p) ? "Maternitate · Tower C L1" :
    /psych/.test(p) ? "Psihiatrie · Tower D L2" :
    "Multi-Department · Hospital-wide";

  const nightShift = /night\s*shift|overnight|nocturn/.test(p);
  const overtime = /overtime|long hours|12h|14h/.test(p);
  const shortage = /short|underst|vacanc|missing|shortage/.test(p);
  const surge = /surge|spike|volume|influx|crowd/.test(p);
  const weekend = /weekend|sat|sun/.test(p);
  const emotional = /emotion|stress|wellbeing|bereave|moral/.test(p);

  let base = 55;
  if (/critical|high.?risk|severe|overload|crisis/.test(p)) base = 82;
  else if (/moderate|medium/.test(p)) base = 58;
  else if (/low|stable|mild/.test(p)) base = 38;
  if (nightShift) base += 6;
  if (overtime) base += 7;
  if (shortage) base += 9;
  if (surge) base += 8;
  if (weekend) base += 4;
  if (emotional) base += 3;
  base = Math.min(96, Math.max(22, base));

  const riskLevel: RiskLevel =
    base >= 78 ? "critical" :
    base >= 62 ? "elevated" :
    base >= 44 ? "moderate" :
    base >= 26 ? "low" : "stable";

  return { dept, riskScore: base, riskLevel, nightShift, overtime, shortage, surge, weekend, emotional };
}

export function generateScenario(prompt: string): GeneratScenario {
  const ctx = detectContext(prompt);
  const horizon = 14;
  const id = `gen-${Date.now()}`;
  const now = new Date();
  const confidence = 84 + Math.round(Math.random() * 10);

  const inputSeries = buildTimeSeries(30).map((p, i, arr) => {
    const ramp = i / arr.length;
    return {
      ...p,
      overtimeHours: Math.round(p.overtimeHours * (ctx.overtime ? 1.2 + ramp * 0.4 : 1)),
      nightShiftCount: Math.round(p.nightShiftCount * (ctx.nightShift ? 1.3 + ramp * 0.3 : 1)),
      patientToStaffRatio: +(p.patientToStaffRatio * (ctx.shortage || ctx.surge ? 1.15 + ramp * 0.2 : 1)).toFixed(2),
      stressSurveyScore: +(p.stressSurveyScore + (ctx.emotional ? 0.4 + ramp * 0.5 : 0)).toFixed(1),
      occupancyRate: Math.min(100, Math.round(p.occupancyRate * (ctx.surge ? 1.05 + ramp * 0.08 : 1))),
    };
  });

  const forecastBase = buildForecastOutput(0, horizon);
  const forecastSeries = forecastBase.map((p, i) => {
    const trend = (i / horizon) * (ctx.riskScore - 50) * 0.6;
    const pred = Math.min(98, Math.max(10, Math.round(ctx.riskScore + trend - 10 + Math.sin(i / 2) * 3)));
    return {
      ...p,
      predictedEpuizareRisk: pred,
      predictedObosealaIndex: Math.min(98, pred - 4),
      predictedStaffDeficitRisk: Math.min(95, Math.round(pred * 0.85)),
      confidenceLow: Math.max(5, pred - 8),
      confidenceRidicat: Math.min(99, pred + 7),
    };
  });

  const drivers: RiskDriver[] = [];
  if (ctx.overtime) drivers.push({ driverName: "Sustained overtime exposure", severity: "high", explanation: "Average overtime per nurse climbed to 13.4h/week, +28% versus 30-day baseline.", recommendedMitigation: "Cap individual overtime at 8h/week and rotate float-pool staff." });
  if (ctx.nightShift) drivers.push({ driverName: "Consecutive night-shift density", severity: "critical", explanation: "Six clinicians completed ≥4 consecutive night shifts within the last 10 days.", recommendedMitigation: "Insert 36h recovery buffer after 3 consecutive nights." });
  if (ctx.shortage) drivers.push({ driverName: "Raport pacienti/personal drift", severity: "high", explanation: "Ratio climbed from 4.4 to 5.6 during peak windows.", recommendedMitigation: "Reassign 2 nurses from float pool for next 7 days." });
  if (ctx.surge) drivers.push({ driverName: "Patient volume surge", severity: "high", explanation: "Walk-in admissions exceeded weekly forecast by +34%.", recommendedMitigation: "Activate surge protocol and expand triage capacity 22:00–04:00." });
  if (ctx.emotional) drivers.push({ driverName: "Emotional workload escalation", severity: "medium", explanation: "Scor sondaj stres rose +0.9 points; 4 staff flagged for wellbeing check.", recommendedMitigation: "Schedule 30-min wellbeing check-ins and counselling support." });
  if (ctx.weekend) drivers.push({ driverName: "Weekend coverage gap", severity: "medium", explanation: "Baseline weekend coverage intersects with elective backlog.", recommendedMitigation: "Activate weekend float pool; defer 2 elective cases to Monday." });
  if (drivers.length === 0) drivers.push({ driverName: "Compounding workload pressure", severity: "medium", explanation: "Multiple operational indicators trending upward simultaneously.", recommendedMitigation: "Run targeted scenario simulation in the simulator." });

  const recommendations: ScenarioRecommendation[] = [
    ctx.nightShift && { title: "Add 2 additional staff members to night shifts for the next 7 days", description: "Reinforce ICU/ED night rotation to relieve tenured staff entering the fatigue band.", priority: "high" as const, expectedImpact: "−12 burnout risk points" },
    ctx.overtime && { title: "Reduce overtime exposure for staff above 12 hours per week", description: "Cap weekly overtime at 8h and redistribute hours via the float pool.", priority: "high" as const, expectedImpact: "−9 fatigue index points" },
    ctx.shortage && { title: "Redistribute high-intensity cases across senior staff", description: "Reassign 4 high-acuity patients to senior clinicians and pause low-priority admissions.", priority: "medium" as const, expectedImpact: "−7 shortage risk points" },
    { title: "Add recovery buffers after consecutive night shifts", description: "Insert mandatory 36-hour recovery window after 3 consecutive overnight rotations.", priority: "medium" as const, expectedImpact: "−6 fatigue index points" },
    { title: "Review staffing pressure again in 72 hours", description: "Trigger automatic re-forecast and alert if predicted risk crosses 80.", priority: "low" as const, expectedImpact: "Continuous monitoring" },
  ].filter(Boolean) as ScenarioRecommendation[];

  const followUpIndicators = [
    "Ore suplimentare (h)ours per nurse (target ≤ 8h/week)",
    "Raport pacienti/personal (target ≤ 4.5)",
    "Scor sondaj stres (re-survey Day 7)",
    "Sick-leave events (rolling 7-day)",
    "Night-shift clustering per individual",
    "Incident report frequency",
    "Predicted burnout risk (re-forecast 72h)",
  ];

  const verbs = ctx.riskScore >= 70 ? "is escalating sharply" : ctx.riskScore >= 50 ? "is trending upward" : "remains within manageable range";
  const explanation =
    `Over the last 14 zile, ${ctx.dept} ${verbs}. ` +
    `Operational signals show ${ctx.overtime ? "a +28% overtime spike" : "stable overtime"}, ` +
    `${ctx.shortage ? "patient-to-staff ratio drift to 5.6" : "patient ratio within target band"}, ` +
    `and ${ctx.emotional ? "rising stress survey scores (+0.9)" : "steady stress survey scores"}. ` +
    `Historical analogues suggest a ${ctx.riskScore >= 70 ? "9–11" : "14–18"} day window before incident clustering if no intervention is deployed. ` +
    `Predictive burnout risk reaches ${forecastSeries[forecastSeries.length - 1].predictedEpuizareRisk} by day ${horizon}.`;

  const expectedImpact = ctx.riskScore >= 70
    ? "Without intervention, predicted incident rate increases by ~18% and absenteeism by ~12% within 14 zile."
    : "Without intervention, fatigue index drifts up by ~6 points within 14 zile; impact remains contained.";

  const scenarioName =
    ctx.nightShift && ctx.overtime ? "Night Shift Overload & Overtime Spike" :
    ctx.surge ? "Patient Volume Surge Scenario" :
    ctx.shortage ? "Staff Deficit Pressure Scenario" :
    ctx.weekend ? "Weekend Understaffing Scenario" :
    ctx.emotional ? "Emotional Volum de lucru Escalation" :
    "Generat Risc epuizare Scenario";

  const alerts: ScenarioAlert[] = [
    { title: `${ctx.dept.split(" · ")[0]} risk increased significantly`, severity: ctx.riskScore >= 75 ? "critical" : "warning", department: ctx.dept, primaryDriver: drivers[0].driverName, timestamp: now.toISOString() },
  ];

  return {
    id,
    name: scenarioName,
    department: ctx.dept,
    generatedAt: now.toISOString(),
    forecastHorizon: horizon,
    riskLevel: ctx.riskLevel,
    riskScore: ctx.riskScore,
    predicted14d: forecastSeries[forecastSeries.length - 1].predictedEpuizareRisk,
    staffPressure: Math.min(98, ctx.riskScore + 4),
    interventionUrgency: Math.min(99, ctx.riskScore - 2),
    confidenceScore: confidence,
    inputSeries,
    forecastSeries,
    primaryDrivers: drivers,
    recommendations,
    followUpIndicators,
    explanation,
    expectedImpact,
    alerts,
    prompt,
  };
}

export function ActiveScenarioProvider({ children }: { children: ReactNode }) {
  const [active, setActive] = useState<GeneratScenario | null>(null);
  const generateFromPrompt = useCallback((prompt: string) => generateScenario(prompt), []);
  return (
    <ScenarioCtx.Provider value={{ active, setActive, generateFromPrompt }}>
      {children}
    </ScenarioCtx.Provider>
  );
}

export function useActiveScenario() {
  const ctx = useContext(ScenarioCtx);
  if (!ctx) throw new Error("useActiveScenario must be used inside ActiveScenarioProvider");
  return ctx;
}



