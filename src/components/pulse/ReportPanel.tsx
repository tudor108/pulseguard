import {
  Download,
  Share2,
  Save,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Play,
  Wand2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ForecastChart, InputsChart } from "./Charts";
import { buildForecast, buildSeries, recommendations, riskBand } from "@/lib/pulse/data";
import { useActiveScenario } from "@/lib/pulse/scenario-context";
import { useProfil } from "@/lib/pulse/profile";
import { exportForecastPdf } from "@/lib/pulse/export-pdf";
import { toast } from "sonner";
import { usePulseStore } from "@/lib/pulse/app-state";

const GEN_STEPS = [
  "Citire serii temporale de volum...",
  "Detectare tipare de oboseala...",
  "Estimare risc epuizare pe 14 zile...",
  "Generare plan de interventie...",
];

export function ReportPanel({
  unit = "ATI  -  Turn B",
  risk = 78,
}: {
  unit?: string;
  risk?: number;
}) {
  const { active } = useActiveScenario();
  const { coordinator } = useProfil();
  const { telemetry, saveScenario: persistScenario, saveReport } = usePulseStore();
  const baseSeries = buildSeries(30);
  const baseForecast = buildForecast(30, 14);

  const series = active
    ? active.inputSeries.map((p) => ({
        date: p.date,
        workload: Math.round(40 + p.occupancyRate * 0.3 + p.overtimeHours * 0.6),
        overtime: p.overtimeHours,
        nightShifts: p.nightShiftCount,
        patientRatio: p.patientToStaffRatio,
        sickLeave: p.sickLeaveEvents,
        incidents: p.incidentRapoarte,
        stressScore: p.stressSurveyScore,
        occupancy: p.occupancyRate,
      }))
    : baseSeries;

  const forecast = active
    ? [
        ...baseForecast.slice(0, 30),
        ...active.forecastSeries.map((f) => ({
          date: f.date,
          burnoutRisk: f.predictedEpuizareRisk,
          workloadPressure: Math.min(98, f.predictedEpuizareRisk + 4),
          shortageRisk: f.predictedStaffDeficitRisk,
          fatigueIndex: f.predictedObosealaIndex,
          interventionUrgency: Math.min(99, f.predictedEpuizareRisk - 2),
          forecast: true as const,
        })),
      ]
    : baseForecast;

  const effectiveRisk = active?.riskScore ?? (telemetry.staffCount ? telemetry.avgBurnout : risk);
  const effectiveUnit = active?.department ?? unit;
  const confidence = active?.confidenceScore ?? 92;
  const band = riskBand(effectiveRisk);
  const impactLabel: Record<string, string> = { high: "ridicat", medium: "mediu", low: "scazut" };
  const [stamp, setStamp] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(true);

  useEffect(
    () => setStamp(new Date().toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" })),
    [active?.id],
  );

  const regenerate = () => {
    setRevealed(false);
    setGenerating(true);
    setStep(0);
    GEN_STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 700));
    setTimeout(
      () => {
        setGenerating(false);
        setRevealed(true);
        setStamp(new Date().toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }));
      },
      GEN_STEPS.length * 700 + 350,
    );
  };

  const exportPdf = async () => {
    await exportForecastPdf({
      unit: effectiveUnit,
      coordinator,
      riskScore: effectiveRisk,
      riskLevel: band.label,
    });
    saveReport({
      title: active?.name ?? "Raport prognoza risc epuizare",
      department: effectiveUnit,
      coordinator,
      riskScore: effectiveRisk,
      riskLevel: band.label,
      source: active ? "scenario" : "telemetry",
      scenarioId: active?.id,
      exported: true,
    });
  };

  const shareReport = async () => {
    const text = `Raport PulseGuard pentru ${effectiveUnit}: risc ${effectiveRisk}/100, nivel ${band.label}.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Raport PulseGuard AI", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Raport copiat", { description: "Textul raportului este in clipboard." });
      }
    } catch {
      toast.info("Distribuirea a fost anulata");
    }
  };

  const saveCurrent = () => {
    if (active) {
      persistScenario(active);
    }
    saveReport({
      title: active?.name ?? "Raport prognoza risc epuizare",
      department: effectiveUnit,
      coordinator,
      riskScore: effectiveRisk,
      riskLevel: band.label,
      source: active ? "scenario" : "telemetry",
      scenarioId: active?.id,
    });
    toast.success(active ? "Scenariu salvat" : "Raport salvat", {
      description: active?.name ?? "Raport prognoza risc epuizare",
    });
  };

  useEffect(() => {
    const handler = () => regenerate();
    window.addEventListener("pulseguard:run-forecast", handler);
    return () => window.removeEventListener("pulseguard:run-forecast", handler);
  }, []);

  return (
    <article className="relative glass luminous-border rounded-2xl p-5 lg:p-6 animate-fade-up overflow-hidden">
      {generating && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl glass-strong border border-border/60 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Generare AI in curs
            </div>
            <ol className="mt-3 space-y-2">
              {GEN_STEPS.map((s, i) => {
                const done = i < step;
                const activeStep = i === step;
                return (
                  <li
                    key={s}
                    className={cn(
                      "flex items-center gap-2.5 text-sm",
                      !done && !activeStep && "opacity-40",
                    )}
                  >
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : activeStep ? (
                      <Loader2 className="h-4 w-4 text-[var(--cyan-glow)] animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border/60" />
                    )}
                    <span>{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        </div>
      )}
      <div className={cn(revealed ? "opacity-100" : "opacity-50 transition-opacity")}>
        <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
              <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Generat de AI - Pulse-v2.4{" "}
              {active && (
                <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan-glow)]/40 bg-[var(--cyan-glow)]/10 px-1.5 py-0.5 text-[9px] text-[var(--cyan-glow)]">
                  <Wand2 className="h-2.5 w-2.5" /> Actualizat din scenariul GenAI
                </span>
              )}
            </div>
            <h2 className="mt-1.5 text-xl lg:text-2xl font-semibold leading-tight">
              {active ? active.name : "Raport prognoza risc epuizare si interventie"}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                Unitate medicala: <span className="text-foreground">{effectiveUnit}</span>
              </span>
              <span> - </span>
              <span suppressHydrationWarning>Generat {stamp || "chiar acum"}</span>
              <span> - </span>
              <span>
                Incredere <span className="text-foreground">{confidence}%</span>
              </span>
            </div>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border self-start",
              band.tone === "danger" && "bg-danger/15 text-danger border-danger/30",
              band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
              band.tone === "success" && "bg-success/15 text-success border-success/30",
              band.tone === "muted" && "bg-secondary/50 text-muted-foreground border-border/60",
            )}
          >
            <ShieldAlert className="h-3.5 w-3.5" /> {band.label} - {effectiveRisk}/100
          </span>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <Block
            title="Serii de intrare"
            subtitle="Volum de lucru si ore suplimentare  -  ultimele 30 zile"
          >
            <InputsChart data={series} />
          </Block>
          <Block title="Prognoza predictiva" subtitle="Epuizare si presiune de lucru  -  +14 zile">
            <ForecastChart data={forecast} />
          </Block>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
          <Block title="Explicatie AI">
            <p className="text-sm text-foreground/90 leading-relaxed">
              {active?.explanation ??
                `In ultimele 14 zile, ${effectiveUnit} a inregistrat crestere de ore suplimentare si presiune operationala, cu risc de intrare in zona critica in urmatoarele 6 zile.`}
            </p>
          </Block>
          <Block title="Actiuni recomandate">
            <ol className="flex flex-col gap-2 text-sm">
              {(active
                ? active.recommendations.slice(0, 3).map((r, idx) => ({
                    id: `s${idx}`,
                    title: r.title,
                    eta: r.expectedImpact,
                    impact: r.priority,
                  }))
                : recommendations.slice(0, 3)
              ).map((r, i) => (
                <li
                  key={r.id}
                  className="flex gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-3"
                >
                  <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <div className="font-medium">{r.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.eta} - impact {impactLabel[r.impact] ?? r.impact}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </Block>
        </div>

        <footer className="mt-5 flex flex-wrap gap-2">
          <button
            onClick={regenerate}
            disabled={generating}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-70"
          >
            {generating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Play className="h-3.5 w-3.5 fill-current" />
            )}{" "}
            {generating ? "Se genereaza..." : "Regenereaza raportul"}
          </button>
          <button
            onClick={exportPdf}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
          >
            <Download className="h-3.5 w-3.5" /> Exporta PDF
          </button>
          <button
            onClick={shareReport}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
          >
            <Share2 className="h-3.5 w-3.5" /> Distribuie raportul
          </button>
          <button
            onClick={saveCurrent}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
          >
            <Save className="h-3.5 w-3.5" /> Salveaza scenariul
          </button>
          <span className="ml-auto self-center text-[11px] text-muted-foreground inline-flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Suport decizional - nu este un
            instrument de diagnostic medical
          </span>
        </footer>
      </div>
    </article>
  );
}

function Block({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border/60 bg-secondary/20 p-4">
      <header className="mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}
