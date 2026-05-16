import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles, Wand2, Loader2, CheckCircle2, Eraser, Lightbulb, FlaskConical,
  Activity, ShieldAlert, FileText, RotateCw, Save, Download, ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActiveScenario, type GeneratScenario } from "@/lib/pulse/scenario-context";

const CHIPS = [
  "ICU overload",
  "ED surge",
  "Weekend understaffing",
  "Night shift fatigue",
  "Deficit personal",
  "Ridicat patient volume",
];

const EXAMPLE_PROMPTS = [
  "Generate a scenario for ICU night shift overload next week with overtime escalation.",
  "Create a high-risk emergency department surge for the weekend with triage bottleneck.",
  "Simulate burnout risk for surgical ward staff shortage over 14 zile.",
  "Generate a moderate-risk oncology emotional workload scenario.",
  "Create a weekend understaffing scenario with increased overtime in pediatrics.",
];

const GEN_STEPS = [
  "Interpreting operational contextâ€¦",
  "Generating historical time-seriesâ€¦",
  "Forecasting burnout riskâ€¦",
  "Detecting key risk driversâ€¦",
  "Creating intervention recommendationsâ€¦",
  "Updating dashboard panelsâ€¦",
];

export function GenAIScenarioGenerator() {
  const { active, setActive, generateFromPrompt } = useActiveScenario();
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState<GeneratScenario | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const start = (prompt: string) => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Enter a description first", { description: "Describe a department, workload, or pressure scenario." });
      taRef.current?.focus();
      return;
    }
    setGenerating(true);
    setStep(0);
    setPending(null);
    GEN_STEPS.forEach((_, i) => {
      window.setTimeout(() => setStep(i + 1), (i + 1) * 320);
    });
    window.setTimeout(() => {
      const scenario = generateFromPrompt(text);
      setPending(scenario);
      setGenerating(false);
      toast.success("Scenario generated", { description: scenario.name });
    }, GEN_STEPS.length * 320 + 250);
  };

  const apply = (scenario: GeneratScenario) => {
    setActive(scenario);
    toast.success("Panou updated with active scenario", {
      description: `${scenario.name} Â· ${scenario.department}`,
    });
  };

  const useExample = () => {
    const ex = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setInput(ex);
    taRef.current?.focus();
  };

  const clear = () => {
    setInput("");
    setPending(null);
    taRef.current?.focus();
  };

  useEffect(() => { taRef.current?.focus(); }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] ring-glow">
            <Wand2 className="h-5 w-5 text-background" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background animate-pulse-soft" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">PulseGuard GenAI Â· Engine v2.4</div>
          <h2 className="mt-0.5 text-base font-semibold leading-tight">Generator Scenarii GenAI</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Describe a medical workforce situation and generate realistic burnout risk data, forecasts, and intervention recommendations.
          </p>
        </div>
      </header>

      {/* Prompt input */}
      <div className="relative rounded-2xl border border-border/60 bg-secondary/30 focus-within:ring-2 focus-within:ring-[var(--cyan-glow)]/40 focus-within:border-[var(--cyan-glow)]/50 transition">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") start(input); }}
          rows={4}
          placeholder="Describe the staffing pressure, department, workload pattern, and forecast horizonâ€¦"
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none"
          aria-label="Scenario prompt"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pt-1 border-t border-border/40">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setInput((v) => (v ? `${v.replace(/\s+$/, "")} Â· ${c}` : c))}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:text-foreground hover:border-[var(--cyan-glow)]/60 hover:bg-secondary/70 transition"
            >
              <Sparkles className="h-2.5 w-2.5 text-[var(--cyan-glow)]" /> {c}
            </button>
          ))}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => start(input)}
          disabled={generating}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-4 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-70"
        >
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
          {generating ? "Generatingâ€¦" : "Generate Scenario"}
        </button>
        <button onClick={useExample} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary/70 transition">
          <Lightbulb className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Use Example Prompt
        </button>
        <button onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary/70 transition">
          <Eraser className="h-3.5 w-3.5" /> Clear
        </button>
        <span className="ml-auto text-[10px] text-muted-foreground hidden sm:inline-flex items-center gap-1">
          <kbd className="rounded border border-border/60 bg-secondary/40 px-1 py-px font-mono text-[9px]">âŒ˜</kbd>
          <kbd className="rounded border border-border/60 bg-secondary/40 px-1 py-px font-mono text-[9px]">â†µ</kbd>
          to generate
        </span>
      </div>

      {/* Generation steps */}
      {generating && (
        <div className="rounded-2xl border border-border/60 glass-strong p-4 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> GenAI scenario synthesis
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
                  {done ? <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    : active ? <Loader2 className="h-4 w-4 text-[var(--cyan-glow)] shrink-0 animate-spin" />
                    : <span className="h-4 w-4 rounded-full border border-border/60 shrink-0" />}
                  <span className={cn(active && "text-foreground caret")}>{s}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Result panel */}
      {pending && !generating && <ResultPanel scenario={pending} active={active} onAplica={() => apply(pending)} onRegenerate={() => start(pending.prompt)} onReport={() => { apply(pending); navigate({ to: "/forecast-report" }); }} />}

      {/* Empty state */}
      {!pending && !generating && !active && (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <FlaskConical className="mx-auto h-6 w-6 text-[var(--cyan-glow)]" />
          <div className="mt-2 text-sm font-medium">No scenario generated yet</div>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Describe a workforce situation above. The GenAI engine will synthesize time-series data, a 14-day burnout forecast, drivers, and an intervention plan.
          </p>
        </div>
      )}

      {/* Active context */}
      {active && !pending && (
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-[var(--cyan-glow)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Active Scenario</div>
            <div className="text-sm font-medium truncate">{active.name}</div>
            <div className="text-[11px] text-muted-foreground">{active.department} Â· risk {active.riskScore}/100 Â· confidence {active.confidenceScore}%</div>
          </div>
          <button onClick={() => setActive(null)} className="text-[11px] text-muted-foreground hover:text-foreground transition">Clear</button>
        </div>
      )}
    </div>
  );
}

function ResultPanel({
  scenario, active, onAplica, onRegenerate, onReport,
}: {
  scenario: GeneratScenario;
  active: GeneratScenario | null;
  onAplica: () => void;
  onRegenerate: () => void;
  onReport: () => void;
}) {
  const isApplied = active?.id === scenario.id;
  const riskTone =
    scenario.riskLevel === "critical" ? "bg-danger/15 text-danger border-danger/30" :
    scenario.riskLevel === "elevated" ? "bg-warning/15 text-warning border-warning/30" :
    scenario.riskLevel === "moderate" ? "bg-warning/10 text-warning border-warning/20" :
    "bg-success/15 text-success border-success/30";

  return (
    <article className="rounded-2xl border border-border/60 glass-strong p-5 animate-fade-up space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Generat scenario
            {isApplied && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan-glow)]/40 bg-[var(--cyan-glow)]/10 px-1.5 py-0.5 text-[9px] text-[var(--cyan-glow)]">
                <CheckCircle2 className="h-2.5 w-2.5" /> Applied
              </span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-tight">{scenario.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{scenario.department}</span>
            <span>Â·</span>
            <span>Orizont prognoza {scenario.forecastHorizon}d</span>
            <span>Â·</span>
            <span>Incredere {scenario.confidenceScore}%</span>
            <span>Â·</span>
            <span suppressHydrationWarning>Generat {new Date(scenario.generatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border self-start", riskTone)}>
          <Activity className="h-3.5 w-3.5" /> {scenario.riskLevel} Â· {scenario.riskScore}/100
        </span>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Current Risk", v: scenario.riskScore },
          { label: "Predicted 14d", v: scenario.predicted14d },
          { label: "Staff Pressure", v: scenario.staffPressure },
          { label: "Interventie", v: scenario.interventionUrgency },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{k.label}</div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">{k.v}<span className="text-[10px] text-muted-foreground">/100</span></div>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI Explanation</div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{scenario.explanation}</p>
        <p className="mt-2 text-xs text-muted-foreground italic">{scenario.expectedImpact}</p>
      </section>

      {/* Drivers + Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Primary risk drivers</div>
          <ul className="mt-2 space-y-2">
            {scenario.primaryDrivers.map((d, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 animate-stagger" style={{ animationDelay: `${i * 0.06}s` }}>
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{d.driverName}</div>
                  <span className={cn(
                    "text-[9px] uppercase tracking-wider rounded-full px-1.5 py-0.5 border",
                    d.severity === "critical" ? "border-danger/40 text-danger bg-danger/10" :
                    d.severity === "high" ? "border-warning/40 text-warning bg-warning/10" :
                    "border-border/60 text-muted-foreground bg-secondary/40"
                  )}>{d.severity}</span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">{d.explanation}</p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recommendations</div>
          <ol className="mt-2 space-y-2">
            {scenario.recommendations.map((r, i) => (
              <li key={i} className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 flex gap-2.5 animate-stagger" style={{ animationDelay: `${i * 0.06}s` }}>
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-semibold">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{r.description}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--cyan-glow)]">{r.expectedImpact}</div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Follow-up indicators */}
      <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Follow-up indicators</div>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {scenario.followUpIndicators.map((s) => (
            <li key={s} className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2 text-[11px]">
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-success shrink-0" /> {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      <footer className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onAplica}
          disabled={isApplied}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-60"
        >
          <ArrowRight className="h-3.5 w-3.5" /> {isApplied ? "Applied to Panou" : "Aplica Scenario to Panou"}
        </button>
        <button onClick={onReport} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <FileText className="h-3.5 w-3.5" /> Generate Report
        </button>
        <button onClick={onRegenerate} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <RotateCw className="h-3.5 w-3.5" /> Regenerate
        </button>
        <button onClick={() => toast.success("Scenariu salvat", { description: scenario.name })} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <Save className="h-3.5 w-3.5" /> Save
        </button>
        <button onClick={() => toast("Scenario exported", { description: `${scenario.name}.json` })} className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition">
          <Download className="h-3.5 w-3.5" /> Exporta
        </button>
      </footer>
    </article>
  );
}



