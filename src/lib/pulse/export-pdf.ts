import jsPDF from "jspdf";
import { toast } from "sonner";

export type ExportaContext = {
  unit: string;
  coordinator: string;
  riskScore?: number;
  riskLevel?: string;
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function exportForecastPdf(ctx: ExportaContext) {
  const id = "pg-export";
  toast.loading("Preparing report…", { id });
  await sleep(450);
  toast.loading("Rendering forecast charts…", { id });
  await sleep(550);
  toast.loading("Generating PDF…", { id });
  await sleep(500);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date();
  const fmt = now.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

  // Header band
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PulseGuard AI — Burnout Risk Forecast", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generated ${fmt}  ·  Unit: ${ctx.unit}  ·  Coordinator: ${ctx.coordinator}`, 40, 72);

  // Risk indicator
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Operational Risk Indicator", 40, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(`Current risk score: ${(ctx.riskScore ?? 78).toFixed(0)} / 100   (${ctx.riskLevel ?? "Ridicat"})`, 40, 150);

  // Mock chart (sparkline)
  doc.setDrawColor(80, 180, 220);
  doc.setLineWidth(1.2);
  const points = [55, 58, 62, 60, 67, 71, 74, 72, 78, 76, 80, 78];
  const x0 = 40, y0 = 200, w = W - 80, h = 140;
  doc.setDrawColor(220, 220, 230);
  doc.rect(x0, y0, w, h);
  doc.setDrawColor(80, 180, 220);
  for (let i = 0; i < points.length - 1; i++) {
    const x1 = x0 + (i / (points.length - 1)) * w;
    const x2 = x0 + ((i + 1) / (points.length - 1)) * w;
    const y1 = y0 + h - (points[i] / 100) * h;
    const y2 = y0 + h - (points[i + 1] / 100) * h;
    doc.line(x1, y1, x2, y2);
  }
  doc.setFontSize(9);
  doc.setTextColor(110, 110, 130);
  doc.text("14-day burnout risk trajectory (forecast)", x0, y0 + h + 16);

  // AI summary
  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("AI Executive Summary", 40, 390);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const summary = `Burnout risk in ${ctx.unit} is trending upward driven by night-shift clustering, ` +
    `elevated overtime load, and reduced inter-shift recovery. The model projects a 14-day risk of ` +
    `${(ctx.riskScore ?? 78).toFixed(0)}/100 if no intervention is applied. Adding 2 temporary night-shift ` +
    `nurses and capping weekly overtime at 8h reduces projected risk by an estimated 24 points.`;
  doc.text(doc.splitTextToSize(summary, W - 80), 40, 410);

  // Recommendations
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Recommended Interventies", 40, 510);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const recs = [
    "1. Add 2 temporary nurses to the ICU night rotation for 7 days.",
    "2. Cap weekly overtime at 8h for staff above the soft threshold.",
    "3. Redistribute senior coverage across high-pressure night windows.",
    "4. Schedule automated re-forecast and stand-up review in 72 hours.",
  ];
  recs.forEach((r, i) => doc.text(r, 40, 532 + i * 18));

  // Footer disclaimer
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text(
    "Operational decision support tool. Not a medical diagnostic device. Outputs assist staffing decisions; clinical judgement remains with qualified healthcare professionals.",
    40,
    800,
    { maxWidth: W - 80 },
  );

  doc.save(`PulseGuard_Burnout_Forecast_${now.toISOString().slice(0, 10)}.pdf`);
  toast.success("Report exported", { id, description: "PDF downloaded to your device." });
}
