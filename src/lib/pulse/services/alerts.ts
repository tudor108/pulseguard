import type { AlertItem } from "./types";

export const alertsMock: AlertItem[] = [
  { id: "a1", title: "ICU burnout risk crossing critical threshold", detail: "Forecast hits 80 within 6 days at current trajectory.", department: "ICU · Tower B", level: "critical", time: "2 min ago" },
  { id: "a2", title: "ER overtime exceeding 14h/nurse this week", detail: "5 nurses above the 12h soft cap.", department: "Emergency", level: "critical", time: "18 min ago" },
  { id: "a3", title: "Oncologie stress survey complete", detail: "18 responses · average score 6.7 (+0.9 vs baseline).", department: "Oncologie", level: "info", time: "1h ago" },
  { id: "a4", title: "Psychiatry sick-leave anomaly", detail: "+2 cases vs 7-day baseline; monitor for fatigue spillover.", department: "Psychiatry", level: "warning", time: "2h ago" },
  { id: "a5", title: "Maternity capacity available", detail: "Occupancy at 68%; eligible to absorb 4 transfers.", department: "Maternity", level: "info", time: "3h ago" },
  { id: "a6", title: "Surgery overtime trending up", detail: "+3.2% vs last week; recommend monitoring.", department: "Surgery", level: "warning", time: "5h ago" },
];
