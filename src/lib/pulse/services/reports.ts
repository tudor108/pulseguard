import type { Recommendation, Report } from "./types";

export const recommendationsMock: Recommendation[] = [
  { id: "r1", title: "Add 2 nurses to ICU night shift for next 7 days", detail: "Forecast shows fatigue index crossing 75 by Day 4. Reinforce night rotation to relieve tenure staff.", impact: "high", eta: "Tura urmatoare", department: "ICU" },
  { id: "r2", title: "Cap ER overtime at 8h / week", detail: "Sustained overtime above 12h correlates with +18% incident risk in the last 14 days.", impact: "high", eta: "This week", department: "ER" },
  { id: "r3", title: "Schedule wellbeing check-ins for Oncologie team", detail: "Stress survey scores rose by 0.9 points; recommend 30-min individual sessions.", impact: "medium", eta: "Within 5 days", department: "Oncologie" },
  { id: "r4", title: "Redistribute 4 patients from Surgery to Maternity float pool", detail: "Maternity occupancy at 68% — capacity exists to offload pressure from Surgery.", impact: "medium", eta: "48 hours", department: "Surgery" },
  { id: "r5", title: "Trigger fatigue micro-break protocol in Psychiatry", detail: "Predicted fatigue index reaches 72 within 6 days. Activate 15-min protected breaks.", impact: "low", eta: "Next 72h", department: "Psychiatry" },
];

export const reportsMock: Report[] = [
  {
    id: "rep-001",
    generatedAt: new Date().toISOString(),
    department: "Unitate Terapie Intensiva",
    coordinator: "Dr. Emily Carter",
    confidenceScore: 92,
    riskLevel: "critical",
    executiveSummary:
      "ICU is projected to cross the critical burnout threshold within 6 days driven by sustained overtime and night-shift clustering. Targeted staffing and recovery interventions can reduce predicted risk by an estimated 18 points over the 14-day horizon.",
    primaryDrivers: [
      { label: "Night-shift clustering", weight: 34 },
      { label: "Overtime load", weight: 27 },
      { label: "Patient-to-staff ratio", weight: 21 },
      { label: "Stress survey signals", weight: 18 },
    ],
    recommendations: recommendationsMock.slice(0, 3),
    followUpIndicators: [
      "Daily ICU overtime hours",
      "Sick-leave events per 7d window",
      "Stress survey delta vs baseline",
      "Forecast burnout risk re-run weekly",
    ],
  },
];
