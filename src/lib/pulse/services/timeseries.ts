import type { TimeSeriesInput } from "./types";

function seeded(i: number, base: number, amp: number, period = 7) {
  return base + Math.sin((i / period) * Math.PI * 2) * amp + (Math.cos(i / 3.1) * amp) / 3;
}

export function buildTimeSeries(days = 30): TimeSeriesInput[] {
  const today = new Date();
  const out: TimeSeriesInput[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const idx = days - i;
    out.push({
      date: d.toISOString().slice(0, 10),
      overtimeHours: Math.round(seeded(idx, 9, 3) + (idx > 20 ? (idx - 20) * 0.6 : 0)),
      nightShiftCount: Math.round(seeded(idx, 14, 4)),
      patientToStaffRatio: +(seeded(idx, 4.6, 0.6) + (idx > 22 ? 0.4 : 0)).toFixed(2),
      sickLeaveEvents: Math.max(0, Math.round(seeded(idx, 5, 2.5) + (idx > 24 ? 2 : 0))),
      stressSurveyScore: +(seeded(idx, 6.2, 1.2) + (idx > 20 ? 0.6 : 0)).toFixed(1),
      occupancyRate: Math.min(100, Math.round(seeded(idx, 82, 6) + (idx > 22 ? 4 : 0))),
      incidentRapoarte: Math.max(0, Math.round(seeded(idx, 2.4, 1.6))),
    });
  }
  return out;
}
