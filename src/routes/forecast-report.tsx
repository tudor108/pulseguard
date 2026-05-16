import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { ForecastChart, SignalsChart } from "@/components/pulse/Charts";
import { buildForecast, buildSeries, recommendations, riskBand } from "@/lib/pulse/data";
import { exportForecastPdf } from "@/lib/pulse/export-pdf";
import { useActiveScenario } from "@/lib/pulse/scenario-context";
import { useProfil } from "@/lib/pulse/profile";
import { cn } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Sparkles, ShieldAlert, Download, Share2, Save, Play, Loader2, CheckCircle2,
  Flame, MoonStar, Users, BatteryLow, UserMinus, ArrowRight, AlertTriangle,
  Clock, Activity,
} from "lucide-react";

export const Route = createFileRoute("/forecast-report")({
  head: () => ({
    meta: [
      { title: "Raport Prognoza - PulseGuard AI" },
      { name: "description", content: "Raport operational AI pentru risc de epuizare, prognoza pe 14 zile si actiuni recomandate." },
      { property: "og:title", content: "Raport Prognoza - PulseGuard AI" },
      { property: "og:description", content: "Raport operational pentru personal, ture si interventii." },
    ],
  }),
  component: ReportPage,
});

const GEN_STEPS = [
  "Citesc seriile operationale...",
  "Verific tiparele de oboseala...",
  "Actualizez prognoza pe 14 zile...",
  "Pregatesc planul de interventie...",
];

const defaultDrivers = [
  { id: "overtime", label: "Ore suplimentare acumulate", severity: 88, icon: Flame, tone: "danger", explain: "Orele suplimentare au crescut in ultimele 14 zile si mai multi oameni depasesc pragul de 12 ore pe saptamana.", mitigation: "Limiteaza orele suplimentare la 8 ore pe saptamana si muta sarcina catre personal de rezerva." },
  { id: "nights", label: "Ture de noapte consecutive", severity: 81, icon: MoonStar, tone: "danger", explain: "Mai multe persoane au lucrat cel putin 4 nopti consecutive, ceea ce reduce recuperarea si creste oboseala.", mitigation: "Adauga o pauza obligatorie de 36 ore dupa 3 ture de noapte consecutive." },
  { id: "load", label: "Volum mare de pacienti", severity: 74, icon: Users, tone: "warning", explain: "Raportul pacienti personal a crescut, mai ales in ATI si UPU.", mitigation: "Redistribuie pacientii eligibili si adauga personal senior in intervalele cu presiune mare." },
  { id: "recovery", label: "Timp redus de recuperare", severity: 67, icon: BatteryLow, tone: "warning", explain: "Timpul median intre ture a scazut sub pragul recomandat de 11 ore.", mitigation: "Blocheaza programarile care lasa mai putin de 11 ore intre ture." },
  { id: "absence", label: "Concedii medicale in crestere", severity: 58, icon: UserMinus, tone: "warning", explain: "Absentele cresc presiunea pe personalul ramas in tura.", mitigation: "Activeaza personalul de rezerva si verifica zilnic zonele cu lipsuri." },
] as const;

const defaultFollowUps = [
  "Ore suplimentare peste prag",
  "Scor stres echipa",
  "Concedii medicale",
  "Raport pacienti personal",
  "Ture de noapte consecutive",
  "Frecventa incidentelor",
  "Timp de recuperare intre ture",
];

function ReportPage() {
  const { active } = useActiveScenario();
  const { unit, coordinator } = useProfil();
  const risk = active?.riskScore ?? 78;
  const band = riskBand(risk);
  const effectiveUnit = active?.department ?? `${unit} - Turn B`;
  const effectiveCoordinator = coordinator;
  const confidence = active?.confidenceScore ?? 92;
  const series = buildSeries(30);
  const forecast = useMemo(() => {
    if (!active) return buildForecast(30, 14);
    return [
      ...buildForecast(30, 0),
      ...active.forecastSeries.map((f) => ({
        date: f.date,
        burnoutRisk: f.predictedEpuizareRisk,
        workloadPressure: Math.min(98, f.predictedEpuizareRisk + 4),
        shortageRisk: f.predictedStaffDeficitRisk,
        fatigueIndex: f.predictedObosealaIndex,
        interventionUrgency: Math.min(99, f.predictedEpuizareRisk - 2),
        forecast: true as const,
      })),
    ];
  }, [active]);

  const drivers = active?.primaryDrivers.length
    ? active.primaryDrivers.slice(0, 5).map((driver, index) => ({
        id: `${driver.driverName}-${index}`,
        label: driver.driverName,
        severity: driver.severity === "critical" ? 92 : driver.severity === "high" ? 82 : driver.severity === "medium" ? 64 : 42,
        icon: [Flame, MoonStar, Users, BatteryLow, UserMinus][index % 5],
        tone: driver.severity === "critical" || driver.severity === "high" ? "danger" : "warning",
        explain: driver.explanation,
        mitigation: driver.recommendedMitigation,
      }))
    : defaultDrivers;

  const actions = active?.recommendations.length
    ? active.recommendations.map((r) => `${r.title}: ${r.description}`)
    : [
        "Adauga 2 oameni suplimentari pe turele de noapte ATI pentru urmatoarele 7 zile.",
        "Limiteaza orele suplimentare pentru personalul care depaseste 12 ore pe saptamana.",
        "Roteaza cazurile cu intensitate mare catre personal senior disponibil.",
        "Introdu pauza de recuperare dupa ture consecutive de noapte.",
        "Monitorizeaza zilnic concediile medicale si incidentele raportate.",
        "Programeaza o revizuire a riscului peste 72 de ore.",
      ];

  const followUps = active?.followUpIndicators.length ? active.followUpIndicators : defaultFollowUps;
  const predicted = active?.predicted14d ?? 86;
  const pressure = active?.staffPressure ?? 82;
  const urgency = active?.interventionUrgency ?? 88;
  const comparison = [
    { metric: "Risc epuizare", current: `${risk} / 100`, recommended: `${Math.max(20, risk - 16)} / 100`, impact: "-16 puncte", positive: true },
    { metric: "Ore suplimentare", current: "14.2 h/sapt", recommended: "8.0 h/sapt", impact: "-44%", positive: true },
    { metric: "Presiune personal", current: `${pressure} / 100`, recommended: `${Math.max(20, pressure - 14)} / 100`, impact: "-14 puncte", positive: true },
    { metric: "Risc prognozat", current: `${predicted} / 100`, recommended: `${Math.max(20, predicted - 18)} / 100`, impact: "-18 puncte", positive: true },
    { metric: "Urgenta interventie", current: `${urgency} / 100`, recommended: `${Math.max(20, urgency - 24)} / 100`, impact: "-24 puncte", positive: true },
  ];

  const [stamp, setStamp] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    setStamp(new Date().toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }));
  }, [active?.id]);

  const regenerate = () => {
    if (generating) return;
    setGenerating(true);
    setStep(0);
    toast.loading("Regeneram raportul operational...", { id: "report-regenerate" });
    GEN_STEPS.forEach((_, i) => setTimeout(() => setStep(i + 1), (i + 1) * 650));
    setTimeout(() => {
      setGenerating(false);
      setStamp(new Date().toLocaleString("ro-RO", { dateStyle: "medium", timeStyle: "short" }));
      toast.success("Raport regenerat", { id: "report-regenerate", description: "Prognoza si planul au fost actualizate." });
    }, GEN_STEPS.length * 650 + 350);
  };

  const exportPdf = async () => {
    try {
      await exportForecastPdf({ unit: effectiveUnit, coordinator: effectiveCoordinator, riskScore: risk, riskLevel: band.label });
    } catch {
      toast.error("Exportul PDF a esuat", { description: "Incearca din nou peste cateva secunde." });
    }
  };

  const shareReport = async () => {
    const text = `Raport PulseGuard AI pentru ${effectiveUnit}: risc ${risk}/100, prognoza 14 zile ${predicted}/100.`;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Raport PulseGuard AI", text });
      } else {
        await navigator.clipboard.writeText(text);
        toast.success("Raport copiat", { description: "Textul raportului a fost copiat in clipboard." });
      }
    } catch {
      toast.info("Distribuirea a fost anulata");
    }
  };

  const saveScenario = () => {
    toast.success("Scenariu salvat", { description: active?.name ?? "Raportul curent a fost salvat local in demo." });
  };

  return (
    <AppShell>
      <header className="mb-5 animate-stagger">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Generat de AI - Pulse-v2.4
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold leading-tight">
          Raport prognoza risc epuizare si interventie
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Analiza operationala completa a presiunii pe personal, cu proiectie pe 14 zile si masuri clare pentru urmatoarele 72 de ore.
        </p>
      </header>

      <div className="sticky top-16 z-30 -mx-1 mb-6 animate-stagger" style={{ animationDelay: "0.05s" }}>
        <div className="glass luminous-border rounded-2xl px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <Meta label="Unitate medicala" value={effectiveUnit} />
          <Divider />
          <Meta label="Coordonator" value={effectiveCoordinator} />
          <Divider />
          <Meta label="Generat" value={<span suppressHydrationWarning>{stamp || "chiar acum"}</span>} />
          <Divider />
          <Meta label="Orizont prognoza" value="14 zile" />
          <Divider />
          <Meta label="Incredere" value={`${confidence}%`} />
          <Divider />
          <span className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border",
            band.tone === "danger" && "bg-danger/15 text-danger border-danger/30",
            band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
            band.tone === "success" && "bg-success/15 text-success border-success/30",
            band.tone === "muted" && "bg-secondary/50 text-muted-foreground border-border/60",
          )}>
            <ShieldAlert className="h-3.5 w-3.5" /> Risc {band.label.toLowerCase()} - {risk}/100
          </span>
          <div className="ml-auto flex flex-wrap gap-2">
            <button onClick={regenerate} disabled={generating}
              className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3 py-1.5 text-xs font-semibold text-background ring-glow disabled:opacity-70">
              {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
              {generating ? "Se regenereaza..." : "Regenereaza"}
            </button>
            <button onClick={exportPdf} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Download className="h-3.5 w-3.5" /> Exporta PDF
            </button>
            <button onClick={shareReport} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Share2 className="h-3.5 w-3.5" /> Distribuie raportul
            </button>
            <button onClick={saveScenario} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">
              <Save className="h-3.5 w-3.5" /> Salveaza scenariul
            </button>
          </div>
        </div>
        {generating && (
          <div className="mt-2 glass-strong rounded-xl border border-border/60 p-3 animate-fade-up">
            <ol className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
              {GEN_STEPS.map((s, i) => {
                const done = i < step;
                const activeStep = i === step;
                return (
                  <li key={s} className={cn("flex items-center gap-1.5", !done && !activeStep && "opacity-50")}>
                    {done ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                      : activeStep ? <Loader2 className="h-3.5 w-3.5 text-[var(--cyan-glow)] animate-spin" />
                      : <span className="h-3.5 w-3.5 rounded-full border border-border/60" />}
                    <span className={cn(activeStep && "text-foreground caret")}>{s}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}
      </div>

      <Section eyebrow="Rezumat executiv" title="Ce spune agentul AI" delay={0.1}>
        <article className="glass luminous-border rounded-2xl p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] ring-glow">
              <Sparkles className="h-4 w-4 text-background" />
            </div>
            <p className="text-sm lg:text-base leading-relaxed text-foreground/90">
              {active?.explanation ?? "Prognoza indica risc ridicat de epuizare in urmatoarele 14 zile. Semnalele principale sunt orele suplimentare, turele de noapte consecutive si presiunea crescuta pe personal. Prima masura recomandata este redistribuirea sarcinii si activarea personalului de rezerva pentru urmatoarele 72 de ore."}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Orizont" value="14 zile" />
            <Stat label="Risc maxim" value={`${predicted} / 100`} tone="danger" />
            <Stat label="Fereastra critica" value="72 ore" tone="warning" />
            <Stat label="Personal afectat" value="42 din 84" />
          </div>
        </article>
      </Section>

      <Section eyebrow="Semnale istorice" title="Presiune operationala in ultimele 30 zile" delay={0.18}>
        <div className="glass luminous-border rounded-2xl p-5">
          <SignalsChart data={series} />
        </div>
      </Section>

      <Section eyebrow="Prognoza predictiva" title="Prognoza risc epuizare pe 14 zile" delay={0.26}>
        <div className="glass luminous-border rounded-2xl p-5">
          <ForecastChart data={forecast} />
          <p className="mt-3 text-xs text-muted-foreground">
            Linia continua arata valorile observate. Linia punctata arata prognoza. Banda umbrita arata intervalul de incredere.
          </p>
        </div>
      </Section>

      <Section eyebrow="Analiza factori" title="Factori principali de risc" delay={0.34}>
        <ol className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {drivers.map((d, i) => {
            const Icon = d.icon;
            return (
              <li key={d.id} className="glass luminous-border rounded-2xl p-4 animate-stagger hover-lift" style={{ animationDelay: `${0.36 + i * 0.05}s` }}>
                <div className="flex items-start gap-3">
                  <div className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-lg border",
                    d.tone === "danger" ? "bg-danger/15 border-danger/30 text-danger" : "bg-warning/15 border-warning/30 text-warning",
                  )}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">#{i + 1} {d.label}</h3>
                      <span className={cn("text-[11px] font-semibold tabular-nums", d.tone === "danger" ? "text-danger" : "text-warning")}>{d.severity}/100</span>
                    </div>
                    <div className="mt-1.5 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                      <div className={cn("h-full rounded-full bg-gradient-to-r", d.tone === "danger" ? "from-warning to-danger" : "from-[var(--cyan-glow)] to-warning")} style={{ width: `${d.severity}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-foreground/85 leading-relaxed">{d.explain}</p>
                    <p className="mt-2 text-[11px] text-muted-foreground inline-flex items-start gap-1.5">
                      <ArrowRight className="h-3 w-3 mt-0.5 text-[var(--cyan-glow)] shrink-0" />
                      <span><span className="text-foreground/80 font-medium">Masura:</span> {d.mitigation}</span>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Section>

      <Section eyebrow="Plan interventie" title="Actiuni operationale recomandate" delay={0.42}>
        <div className="glass luminous-border rounded-2xl p-5">
          <ol className="flex flex-col gap-2.5">
            {actions.map((a, i) => (
              <li key={a} className="flex items-start gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3 animate-stagger hover:border-[var(--cyan-glow)]/40 transition" style={{ animationDelay: `${0.44 + i * 0.05}s` }}>
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] text-[11px] font-bold text-background">{i + 1}</span>
                <p className="text-sm leading-relaxed text-foreground/90">{a}</p>
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted-foreground shrink-0">
                  <Clock className="h-3 w-3" /> {recommendations[i]?.eta ?? "72 ore"}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </Section>

      <Section eyebrow="Monitorizare" title="Indicatori de urmarit" delay={0.5}>
        <ul className="flex flex-wrap gap-2">
          {followUps.map((f, i) => (
            <li key={f} className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs animate-stagger hover:bg-secondary/70 hover:border-[var(--cyan-glow)]/50 hover:-translate-y-0.5 transition-all" style={{ animationDelay: `${0.52 + i * 0.04}s` }}>
              <Activity className="h-3 w-3 text-[var(--cyan-glow)]" /> {f}
            </li>
          ))}
        </ul>
      </Section>

      <Section eyebrow="Comparatie scenarii" title="Plan curent vs plan recomandat" delay={0.58}>
        <div className="glass luminous-border rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground border-b border-border/60 bg-secondary/30">
                  <th className="text-left font-medium px-4 py-3">Indicator</th>
                  <th className="text-left font-medium px-4 py-3">Plan curent</th>
                  <th className="text-left font-medium px-4 py-3">Plan recomandat</th>
                  <th className="text-left font-medium px-4 py-3">Impact estimat</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.metric} className="border-b border-border/40 last:border-0 hover:bg-secondary/20 transition">
                    <td className="px-4 py-3 font-medium">{row.metric}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular-nums">{row.current}</td>
                    <td className="px-4 py-3 text-foreground tabular-nums">{row.recommended}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", row.positive ? "bg-success/15 text-success" : "bg-danger/15 text-danger")}>
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

      <footer className="mt-8 mb-2 flex items-start gap-2 rounded-xl border border-border/60 bg-secondary/20 p-3 animate-fade-up">
        <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Acest raport este suport decizional operational. Nu este instrument de diagnostic medical. Deciziile finale raman la echipa clinica si operationala calificata.
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
      <div className={cn("mt-0.5 text-base font-semibold tabular-nums", tone === "danger" && "text-danger", tone === "warning" && "text-warning")}>{value}</div>
    </div>
  );
}
