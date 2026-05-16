import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { ForecastChart, SignalsChart } from "@/components/pulse/Charts";
import { buildForecast, buildSeries, recommendations, riskBand } from "@/lib/pulse/data";
import { cn } from "@/lib/utils";
import { useEffect, useState } from "react";
import {
  Sparkles, ShieldAlert, Download, Share2, Save, Play, Loader2, CheckCircle2,
  Flame, MoonStar, Users, BatteryLow, UserMinus, ArrowRight, AlertTriangle,
  Clock, Activity,
} from "lucide-react";

export const Route = createFileRoute("/forecast-report")({
  head: () => ({
    meta: [
      { title: "Raport Prognoza â€” PulseGuard AI" },
      { name: "description", content: "Full AI-generated burnout report with input signals, 14-day forecast, and recommended actions." },
      { property: "og:title", content: "Raport Prognoza â€” PulseGuard AI" },
      { property: "og:description", content: "End-to-end burnout intelligence report." },
    ],
  }),
  component: ReportPage,
});

const GEN_STEPS = [
  "Reading workload time-seriesâ€¦",
  "Detecting fatigue patternsâ€¦",
  "Forecasting 14-day burnout riskâ€¦",
  "Generating intervention planâ€¦",
];

const drivers = [
  { id: "overtime", label: "Overtime accumulation", severity: 88, icon: Flame, tone: "danger",
    explain: "Cumulative overtime climbed +22% over the last 14 zile, with 9 staff above the 12h weekly soft cap.",
    mitigation: "Cap individual overtime at 8h/week and redistribute load to the float pool." },
  { id: "nights", label: "Night shift clustering", severity: 81, icon: MoonStar, tone: "danger",
    explain: "Six individuals worked â‰¥4 consecutive nights, compounding circadian fatigue indicators.",
    mitigation: "Insert a mandatory 36h recovery buffer after every 3 consecutive nights." },
  { id: "load", label: "Patient load increase", severity: 74, icon: Users, tone: "warning",
    explain: "Raport pacienti/personal rose from 4.4 to 5.1 (+16%) across ICU and ER.",
    mitigation: "Transfer 4 eligible patients from Chirurgie to the Maternitate float pool." },
  { id: "recovery", label: "Reduced recovery time", severity: 67, icon: BatteryLow, tone: "warning",
    explain: "Median inter-shift rest dropped to 9.2h, below the 11h policy target on 18% of rotations.",
    mitigation: "Block scheduling within 11h of the prior shift end across all wards." },
  { id: "absence", label: "Absenta personal trend", severity: 58, icon: UserMinus, tone: "warning",
    explain: "Sick-leave incidence rose +2 cases vs the 7-day baseline, concentrated in Psihiatrie and ICU.",
    mitigation: "Activate on-call pool and trigger wellbeing check-ins within 48h." },
] as const;

const followUps = [
  "Overtime above threshold",
  "Scor sondaj stres increase",
  "Absenteeism trend",
  "Raport pacienti/personal",
  "Consecutive night shifts",
  "Incident report frequency",
  "Recovery time between shifts",
];

const actions = [
  "Add 2 additional staff members to ICU night shifts for the next 7 days.",
  "Reduce overtime exposure for staff exceeding 12 hours per week.",
  "Rotate high-intensity cases across available senior staff.",
  "Add a recovery buffer after consecutive night shifts.",
  "Monitor sick leave and incident reports daily.",
  "Schedule a follow-up risk review in 72 hours.",
];

const comparison = [
  { metric: "Risc epuizare",        current: "78 / 100", recommended: "62 / 100", impact: "âˆ’16 pts", positive: true },
  { metric: "Overtime Hours",      current: "14.2 h/wk", recommended: "8.0 h/wk",  impact: "âˆ’44%",   positive: true },
  { metric: "Risc deficit personal", current: "64 / 100", recommended: "48 / 100", impact: "âˆ’16 pts", positive: true },
  { metric: "Oboseala Index",       current: "71 / 100", recommended: "58 / 100", impact: "âˆ’13 pts", positive: true },
  { metric: "Interventie Urgency",current: "58 / 100", recommended: "34 / 100", impact: "âˆ’24 pts", positive: true },
];

function ReportPage() {
  const unit = "ICU Â· Tower B";
  const coordinator = "Dr. Elena Rivera";
  const risk = 78;
  const band = riskBand(risk);
  const series = buildSeries(30);
  const forecast = buildForecast(30, 14);

  const [stamp, setStamp] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStamp(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
  }, []);

  const regenerate = () => {
    setGenerating(true); setStep(0);
    GEN_STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 700));
    setTimeout(() => {
      setGenerating(false);
      setStamp(new Date().toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" }));
    }, GEN_STEPS.length * 700 + 350);
  };

  return (
    <AppShell>
      {/* 1. Report header */}
      <header className="mb-5 animate-stagger">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> AI-generated Â· Pulse-v2.4
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold leading-tight">
          Risc epuizare Forecast &amp; Interventie Report
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analiza operationala completa a presiunii pe personal, cu proiectie pe 14 zile si plan de interventie.
        </p>
      </header>

      {/* Sticky actions + metadata bar */}
      <div className="sticky top-16 z-30 -mx-1 mb-6 animate-stagger" style={{ animationDelay: "0.05s" }}>
        <div className="glass luminous-border rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Meta label="Medical unit" value={unit} />
          <Divider />
          <Meta label="Coordinator" value={coordinator} />
          <Divider />
          <Meta label="Generat" value={<span suppressHydrationWarning>{stamp || "chiar acum"}</span>} />
          <Divider />
          <Meta label="Orizont prognoza" value="14 zile" />
          <Divider />
          <Meta label="Incredere" value="92%" />
          <Divider />
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
            band.tone === "danger"  && "bg-danger/15 text-danger border-danger/30",
            band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
            band.tone === "success" && "bg-success/15 text-success border-success/30",
            band.tone === "muted"   && "bg-secondary/50 text-muted-foreground border-border/60",
          )}>
            <ShieldAlert className="h-3.5 w-3.5" /> {band.label} risk Â· {risk}/100
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={regenerate} disabled={generating}
              className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3 py-1.5 text-xs font-semibold text-background ring-glow disabled:opacity-70">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {generating ? "Generatingâ€¦" : "Regenerate"}
            </button>
            <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Download className="h-3.5 w-3.5" /> Exporta PDF
            </button>
            <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Share2 className="h-3.5 w-3.5" /> Distribuie raportul
            </button>
            <button className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Save className="h-3.5 w-3.5" /> Save Scenariul
            </button>
          </div>
        </div>
        {generating && (
          <div className="mt-2 glass-strong rounded-xl border border-border/60 p-3 animate-fade-up">
            <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {GEN_STEPS.map((s, i) => {
                const done = i < step; const active = i === step;
                return (
                  <li key={s} className={cn("flex items-center gap-1.5", !done && !active && "opacity-50")}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      : active ? <Loader2 className="h-3.5 w-3.5 text-[var(--cyan-glow)] animate-spin" />
                      : <span className="h-3.5 w-3.5 rounded-full border border-border/60" />}
                    <span className={cn(active && "text-foreground caret")}>{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      {/* 2. Executive summary */}
      <Section eyebrow="Executive summary" title="What the AI is telling you" delay={0.1}>
        <article className="glass luminous-border rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] ring-glow">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <p className="text-sm lg:text-base leading-relaxed text-foreground/90">
              The forecast indicates a <strong className="text-danger">high probability of burnout escalation</strong> over the next 14 zile,
              mainly driven by overtime accumulation, night-shift clustering, and an increased patient-to-staff ratio.
              <span className="text-foreground/75"> Immediate workload redistribution and temporary staffing support are recommended.</span>
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Orizont prognoza" value="14 d" />
            <Stat label="Peak risk" value="86 / 100" tone="danger" />
            <Stat label="Window to peak" value="6 days" tone="warning" />
            <Stat label="Affected staff" value="42 of 84" />
          </div>
        </article>
      </Section>

      {/* 3. Input time-series */}
      <Section eyebrow="Historical signals Â· last 30 days" title="Historical Operational Pressure Signals" delay={0.18}>
        <div className="glass luminous-border rounded-2xl p-5">
          <SignalsChart data={series} />
        </div>
      </Section>

      {/* 4. Predictive time-series */}
      <Section eyebrow="Predictive forecast Â· +14 zile" title="14-Day Risc epuizare Forecast" delay={0.26}>
        <div className="glass luminous-border rounded-2xl p-5">
          <ForecastChart data={forecast} />
          <p className="mt-3 text-xs text-muted-foreground">
            Solid line = observed. Dashed glowing line = predicted. Shaded band = 92% confidence interval.
            Vertical marker indicates <span className="text-[var(--cyan-glow)]">today</span>.
          </p>
        </div>
      </Section>

      {/* 5. Analiza factori */}
      <Section eyebrow="Analiza factori" title="Factori principali de risc" delay={0.34}>
        <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drivers.map((d, i) => {
            const Icon = d.icon;
            return (
              <li key={d.id} className="glass luminous-border rounded-2xl p-4 animate-stagger hover-lift"
                  style={{ animationDelay: `${0.36 + i * 0.05}s` }}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                    d.tone === "danger"  ? "bg-danger/15 border-danger/30 text-danger"
                                         : "bg-warning/15 border-warning/30 text-warning"
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">#{i + 1} {d.label}</h3>
                      <span className={cn(
                        "text-[11px] font-semibold tabular-nums",
                        d.tone === "danger" ? "text-danger" : "text-warning"
                      )}>{d.severity}/100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                      <div className={cn(
                        "h-full rounded-full bg-gradient-to-r",
                        d.tone === "danger" ? "from-warning to-danger" : "from-[var(--cyan-glow)] to-warning"
                      )} style={{ width: `${d.severity}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-foreground/85 leading-relaxed">{d.explain}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-[var(--cyan-glow)] shrink-0" />
                      <span><span className="text-foreground/80 font-medium">Mitigation:</span> {d.mitigation}</span>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      {/* 6. AI recommendations */}
      <Section eyebrow="Interventie plan" title="Recommended Operational Actions" delay={0.42}>
        <div className="glass luminous-border rounded-2xl p-5">
          <ol className="flex flex-col gap-2.5">
            {actions.map((a, i) => (
              <li key={a} className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 animate-stagger hover:border-[var(--cyan-glow)]/40 transition"
                  style={{ animationDelay: `${0.44 + i * 0.05}s` }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] text-[11px] font-bold text-background">
                  {i + 1}
                </span>
                <p className="text-sm leading-relaxed text-foreground/90">{a}</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" /> {recommendations[i]?.eta ?? "This week"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      {/* 7. Follow-up indicators */}
      <Section eyebrow="Monitoring plan" title="Indicators to Monitor Next" delay={0.5}>
        <ul className="flex flex-wrap gap-2">
          {followUps.map((f, i) => (
            <li key={f}
                className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs animate-stagger hover:bg-secondary/70 hover:border-[var(--cyan-glow)]/50 hover:-translate-y-0.5 transition-all"
                style={{ animationDelay: `${0.52 + i * 0.04}s` }}>
              <Activity className="h-3 w-3 text-[var(--cyan-glow)]" /> {f}
            </li>
          ))}
        </ul>
      </Section>

      {/* 8. Comparatie scenarii */}
      <Section eyebrow="Comparatie scenarii" title="Plan Curent vs Plan Recomandat" delay={0.58}>
        <div className="glass luminous-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/60 bg-secondary/30">
                  <th className="text-left font-medium px-4 py-3">Indicator</th>
                  <th className="text-left font-medium px-4 py-3">Plan Curent</th>
                  <th className="text-left font-medium px-4 py-3">Plan Recomandat</th>
                  <th className="text-left font-medium px-4 py-3">Expected Impact</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.metric} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition">
                    <td className="px-4 py-3 font-medium">{row.metric}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{row.current}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">{row.recommended}</td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        row.positive ? "bg-success/15 text-success" : "bg-danger/15 text-danger"
                      )}>
                        <ArrowRight className="h-3 w-3" /> {row.impact}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Section>

      {/* 10. Disclaimer */}
      <footer className="mt-8 mb-2 flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3 animate-fade-up">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          This report is an operational decision-support forecast and should be reviewed by qualified workforce, HR, and clinical operations leaders.
          PulseGuard AI is not a medical diagnostic tool.
        </p>
      </footer>
    </AppShell>
  );
}

function Section({ eyebrow, title, children, delay = 0 }: { eyebrow: string; title: string; children: React.ReactNode; delay?: number }) {
  return (
    <section className="mt-8 animate-stagger" style={{ animationDelay: `${delay}s` }}>
      <header className="mb-3 flex items-end justify-between gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{eyebrow}</div>
          <h2 className="mt-1 text-lg lg:text-xl font-semibold">{title}</h2>
        </div>
        <div className="hidden sm:block flex-1 h-px bg-gradient-to-r from-border via-border/40 to-transparent ml-3" />
      </header>
      {children}
    </section>
  );
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="leading-tight">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="text-xs font-medium text-foreground">{value}</div>
    </div>
  );
}

function Divider() { return <span className="hidden md:block h-6 w-px bg-border/60" />; }

function Stat({ label, value, tone }: { label: string; value: string; tone?: "danger" | "warning" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-0.5 text-base font-semibold tabular-nums",
        tone === "danger" && "text-danger",
        tone === "warning" && "text-warning"
      )}>{value}</div>
    </div>
  );
}




