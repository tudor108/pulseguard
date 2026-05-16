import { Download, Share2, Save, Sparkles, ShieldAlert, CheckCircle2, Loader2, Play, Wand2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import { ForecastChart, InputsChart } from "./Charts";
import { buildForecast, buildSeries, recommendations, riskBand } from "@/lib/pulse/data";
import { useActiveScenario } from "@/lib/pulse/scenario-context";

const GEN_STEPS = [
  "Reading workload time-series…",
  "Detecting fatigue patterns…",
  "Forecasting 14-day burnout risk…",
  "Generating intervention plan…",
];

export function ReportPanel({ unit = "ICU · Tower B", risk = 78 }: { unit?: string; risk?: number }) {
  const { active } = useActiveScenario();
  const baseSeries = buildSeries(30);
  const baseForecast = buildForecast(30, 14);
  // Map active scenario to ReportPanel shapes when present.
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
        ...active.forecastSeries.map((f, i) => ({
          date: f.date,
          burnoutRisk: f.predictedBurnoutRisk,
          workloadPressure: Math.min(98, f.predictedBurnoutRisk + 4),
          shortageRisk: f.predictedStaffDeficitRisk,
          fatigueIndex: f.predictedFatigueIndex,
          interventionUrgency: Math.min(99, f.predictedBurnoutRisk - 2),
          forecast: true as const,
        })),
      ]
    : baseForecast;
  const effectiveRisk = active?.riskScore ?? risk;
  const effectiveUnit = active?.department ?? unit;
  const confidence = active?.confidenceScore ?? 92;
  const band = riskBand(effectiveRisk);
  const [stamp, setStamp] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [revealed, setRevealed] = useState(true);

  useEffect(() => {
    setStamp(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
  }, [active?.id]);

  const regenerate = () => {
    setRevealed(false);
    setGenerating(true);
    setStep(0);
    GEN_STEPS.forEach((_, i) => {
      setTimeout(() => setStep(i + 1), (i + 1) * 700);
    });
    setTimeout(() => {
      setGenerating(false);
      setRevealed(true);
      setStamp(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
    }, GEN_STEPS.length * 700 + 350);
  };

  useEffect(() => {
    const handler = () => regenerate();
    window.addEventListener("pulseguard:run-forecast", handler);
    return () => window.removeEventListener("pulseguard:run-forecast", handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <article className="relative glass luminous-border rounded-2xl p-5 lg:p-6 animate-fade-up overflow-hidden">
      {generating && (
        <div className="absolute inset-0 z-10 grid place-items-center bg-background/60 backdrop-blur-sm animate-fade-up">
          <div className="w-full max-w-sm rounded-xl glass-strong border border-border/60 p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
              <Sparkles className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> AI generation in progress
            </div>
            <ol className="mt-3 space-y-2">
              {GEN_STEPS.map((s, i) => {
                const done = i < step;
                const active = i === step;
                return (
                  <li key={s} className={cn(
                    "flex items-center gap-2.5 text-sm transition-opacity",
                    !done && !active && "opacity-40"
                  )}>
                    {done ? (
                      <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    ) : active ? (
                      <Loader2 className="h-4 w-4 text-[var(--cyan-glow)] shrink-0 animate-spin" />
                    ) : (
                      <span className="h-4 w-4 rounded-full border border-border/60 shrink-0" />
                    )}
                    <span className={cn(active && "text-foreground caret")}>{s}</span>
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
            <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> AI-generated · Pulse-v2.4
            {active && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan-glow)]/40 bg-[var(--cyan-glow)]/10 px-1.5 py-0.5 text-[9px] text-[var(--cyan-glow)] normal-case tracking-normal">
                <Wand2 className="h-2.5 w-2.5" /> Updated from GenAI Scenario
              </span>
            )}
          </div>
          <h2 className="mt-1.5 text-xl lg:text-2xl font-semibold leading-tight">
            {active ? active.name : "Burnout Risk Forecast & Interventie Report"}
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>Medical unit: <span className="text-foreground">{effectiveUnit}</span></span>
            <span>·</span>
            <span suppressHydrationWarning>Generated {stamp || "just now"}</span>
            <span>·</span>
            <span>Confidence <span className="text-foreground">{confidence}%</span></span>
          </div>
        </div>
        <span className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border self-start",
          band.tone === "danger" && "bg-danger/15 text-danger border-danger/30",
          band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
          band.tone === "success" && "bg-success/15 text-success border-success/30",
          band.tone === "muted" && "bg-secondary/50 text-muted-foreground border-border/60",
        )}>
          <ShieldAlert className="h-3.5 w-3.5" /> {band.label} risk · {effectiveRisk}/100
        </span>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <Block title="Input time-series" subtitle="Workload & overtime · last 30 days" delay={0.05}>
          <InputsChart data={series} />
        </Block>
        <Block title="Predictive forecast" subtitle="Burnout & workload pressure · +14 days" delay={0.15}>
          <ForecastChart data={forecast} />
        </Block>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        <Block title="AI explanation" delay={0.25}>
          {active ? (
            <>
              <p className="text-sm text-foreground/90 leading-relaxed">{active.explanation}</p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed italic">{active.expectedImpact}</p>
            </>
          ) : (
            <>
              <p className="text-sm text-foreground/90 leading-relaxed">
                Over the last 14 days, {effectiveUnit} experienced a <strong>+22% increase in overtime hours</strong> combined with a patient-to-staff ratio climbing from 4.4 to 5.1. Sick leave rose modestly (+2 cases), but the compounding effect on the remaining tenured staff is what drives the forecast curve toward the critical band by Day 6.
              </p>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                Historical analogues from Q1 show this signal pattern preceded a fatigue-driven incident cluster within 9–11 days.
              </p>
            </>
          )}
        </Block>
        <Block title="Recommended actions" delay={0.35}>
          <ol className="flex flex-col gap-2 text-sm">
            {(active
              ? active.recommendations.slice(0, 3).map((r, idx) => ({ id: `s${idx}`, title: r.title, eta: r.expectedImpact, impact: r.priority }))
              : recommendations.slice(0, 3)
            ).map((r, i) => (
              <li key={r.id} className="flex gap-2.5 rounded-lg border border-border/60 bg-secondary/30 p-3 animate-stagger" style={{ animationDelay: `${0.4 + i * 0.08}s` }}>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-secondary text-[11px] font-semibold">{i + 1}</span>
                <div className="min-w-0">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-xs text-muted-foreground">{r.eta} · {r.impact} impact</div>
                </div>
              </li>
            ))}
          </ol>
        </Block>
      </div>

      <Block title="Follow-up indicators" className="mt-5" delay={0.45}>
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {(active?.followUpIndicators ?? [
            "Overtime hours per nurse (≤8h/week)",
            "Patient-to-staff ratio (≤4.5)",
            "Stress survey delta (re-survey Day 7)",
            "Night-shift density per individual",
            "Sick leave rate (rolling 7-day)",
            "Incident report frequency",
          ]).map((s) => (
            <li key={s} className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2.5 text-xs">
              <CheckCircle2 className="h-3.5 w-3.5 mt-0.5 text-success shrink-0" /> {s}
            </li>
          ))}
        </ul>
      </Block>

      <footer className="mt-5 flex flex-wrap gap-2">
        <button onClick={regenerate} disabled={generating} className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-70">
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />} {generating ? "Generating…" : "Regenerate Report"}
        </button>
        <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <Download className="h-3.5 w-3.5" /> Exporta PDF
        </button>
        <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <Share2 className="h-3.5 w-3.5" /> Share Report
        </button>
        <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <Save className="h-3.5 w-3.5" /> Salveaza Scenariul
        </button>
        <span className="ml-auto self-center text-[11px] text-muted-foreground inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Decision support · not a medical diagnosis
        </span>
      </footer>
      </div>
    </article>
  );
}

function Block({ title, subtitle, children, className, delay = 0 }: { title: string; subtitle?: string; children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <section className={cn("rounded-xl border border-border/60 bg-secondary/20 p-4 animate-stagger", className)} style={{ animationDelay: `${delay}s` }}>
      <header className="mb-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

