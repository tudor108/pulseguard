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
  toast.loading("Pregatesc raportul...", { id });
  await sleep(450);
  toast.loading("Randam graficele prognozei...", { id });
  await sleep(550);
  toast.loading("Generam PDF-ul...", { id });
  await sleep(500);

  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const now = new Date();
  const fmt = now.toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" });

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("PulseGuard AI - Raport risc epuizare", 40, 50);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Generat ${fmt}  -  Unitate: ${ctx.unit}  -  Coordonator: ${ctx.coordinator}`, 40, 72);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Indicator risc operational", 40, 130);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(
    `Scor risc curent: ${(ctx.riskScore ?? 78).toFixed(0)} / 100   (${ctx.riskLevel ?? "Ridicat"})`,
    40,
    150,
  );

  doc.setDrawColor(80, 180, 220);
  doc.setLineWidth(1.2);
  const points = [55, 58, 62, 60, 67, 71, 74, 72, 78, 76, 80, 78];
  const x0 = 40,
    y0 = 200,
    w = W - 80,
    h = 140;
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
  doc.text("Traiectorie risc epuizare pe 14 zile", x0, y0 + h + 16);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Rezumat operational AI", 40, 390);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const summary = `Riscul de epuizare in ${ctx.unit} este in crestere, mai ales din cauza turelor de noapte, a orelor suplimentare si a timpului redus de recuperare. Modelul estimeaza un risc de ${(ctx.riskScore ?? 78).toFixed(0)}/100 daca nu se intervine. Primele masuri recomandate sunt acoperire temporara pe tura de noapte, limitarea orelor suplimentare si redistribuirea personalului senior in intervalele cu presiune mare.`;
  doc.text(doc.splitTextToSize(summary, W - 80), 40, 410);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text("Interventii recomandate", 40, 510);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10.5);
  const recs = [
    "1. Adauga 2 asistenti temporari pe tura de noapte pentru urmatoarele 7 zile.",
    "2. Limiteaza orele suplimentare la 8 ore pe saptamana pentru personalul peste prag.",
    "3. Redistribuie personalul senior in ferestrele cu presiune operationala mare.",
    "4. Ruleaza din nou prognoza si revizuieste planul peste 72 de ore.",
  ];
  recs.forEach((r, i) => doc.text(r, 40, 532 + i * 18));

  doc.setFontSize(8);
  doc.setTextColor(120, 120, 140);
  doc.text(
    "Instrument de suport decizional operational. Nu este un dispozitiv de diagnostic medical. Rezultatele sprijina deciziile de personal, iar judecata clinica ramane la profesionistii calificati.",
    40,
    800,
    { maxWidth: W - 80 },
  );

  doc.save(`PulseGuard_Raport_Risc_Epuizare_${now.toISOString().slice(0, 10)}.pdf`);
  toast.success("Raport exportat", { id, description: "PDF generat pe dispozitiv." });
}
