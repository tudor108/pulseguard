import type { ForecastOutput } from "./types";

export function buildForecastOutput(historyDays = 30, forecastDays = 14): ForecastOutput[] {
  const today = new Date();
  const out: ForecastOutput[] = [];
  const total = historyDays + forecastDays;
  for (let i = 0; i < total; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (historyDays - 1) + i);
    const isForecast = i >= historyDays;
    const t = i + 1;
    const drift = isForecast ? (i - historyDays + 1) * 1.6 : 0;
    const burnout = Math.min(98, Math.round(50 + Math.sin(t / 5) * 8 + t * 0.6 + drift));
    const fatigue = Math.min(98, Math.round(46 + Math.sin(t / 4.5) * 7 + t * 0.5 + drift * 0.8));
    const shortage = Math.min(95, Math.round(42 + Math.sin(t / 6) * 9 + t * 0.35 + drift * 0.7));
    const band = isForecast ? Math.round(4 + (i - historyDays) * 0.6) : 2;
    out.push({
      date: d.toISOString().slice(0, 10),
      predictedBurnoutRisk: burnout,
      predictedEpuizareRisk: burnout,
      predictedFatigueIndex: fatigue,
      predictedObosealaIndex: fatigue,
      predictedStaffDeficitRisk: shortage,
      confidenceLow: Math.max(0, burnout - band),
      confidenceRidicat: Math.min(100, burnout + band),
      isForecast,
    });
  }
  return out;
}
