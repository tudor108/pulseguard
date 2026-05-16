import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Library, Play, Eye, Search, HeartPulse, Siren, Stethoscope,
  Baby, Activity, CalendarDays, Building2, Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/examples")({
  head: () => ({
    meta: [
      { title: "Exemple Pregenerate — PulseGuard AI" },
      { name: "description", content: "Exploreaza scenarii realiste de presiune pe personalul medical si genereaza planuri de interventie asistate de AI." },
      { property: "og:title", content: "Scenarii pregenerate de risc de epuizare — PulseGuard AI" },
      { property: "og:description", content: "Library of example workforce scenarios you can load into the dashboard." },
    ],
  }),
  component: ExamplesPage,
});

type RiskLevel = "Critic" | "Ridicat" | "Moderat to Ridicat" | "Moderat";
type Tag = "ICU" | "Urgente" | "Chirurgie" | "Pediatrie" | "Oncologie" | "Personal weekend" | "Ridicat Risk" | "Moderat Risk";

type Scenario = {
  id: string;
  name: string;
  department: string;
  icon: LucideIcon;
  risk: RiskLevel;
  riskScore: number;
  description: string;
  drivers: string[];
  action: string;
  spark: number[];
  tags: Tag[];
};

const SCENARIOS: Scenario[] = [
  {
    id: "icu-night",
    name: "Supraincarcare tura de noapte ATI",
    department: "Unitate Terapie Intensiva",
    icon: HeartPulse,
    risk: "Critic",
    riskScore: 86,
    description: "Repeated night shifts, increased patient acuity, and overtime accumulation create elevated burnout risk.",
    drivers: ["Overtime", "Night shifts", "Patient acuity"],
    action: "Add 2 night-shift staff members for 7 days.",
    spark: [42, 48, 51, 55, 60, 64, 68, 71, 73, 76, 79, 82, 84, 86],
    tags: ["ICU", "Ridicat Risk"],
  },
  {
    id: "er-surge",
    name: "Departament Urgente Surge",
    department: "Departament Urgente",
    icon: Siren,
    risk: "Ridicat",
    riskScore: 78,
    description: "A patient volume surge increases workload pressure and reduces recovery time between shifts.",
    drivers: ["Patient volume", "Incidents", "Overtime"],
    action: "Open surge staffing protocol and redistribute senior staff.",
    spark: [52, 55, 58, 62, 60, 65, 70, 72, 74, 73, 75, 76, 77, 78],
    tags: ["Urgente", "Ridicat Risk"],
  },
  {
    id: "sur-short",
    name: "Sectie Chirurgie Staff Deficit",
    department: "Sectie Chirurgie",
    icon: Stethoscope,
    risk: "Ridicat",
    riskScore: 72,
    description: "Reduced staff availability and higher post-operative monitoring needs increase fatigue risk.",
    drivers: ["Deficit personal", "Raport pacienti/personal", "Concedii medicale"],
    action: "Add floating staff and rebalance weekend shifts.",
    spark: [40, 44, 46, 48, 52, 55, 58, 60, 63, 65, 67, 68, 70, 72],
    tags: ["Chirurgie", "Ridicat Risk"],
  },
  {
    id: "ped-seasonal",
    name: "Pediatric Unit Seasonal Pressure",
    department: "Pediatrie",
    icon: Baby,
    risk: "Moderat",
    riskScore: 54,
    description: "Seasonal admission increases create moderate pressure with potential escalation.",
    drivers: ["Occupancy", "Patient load", "Shift clustering"],
    action: "Monitor risk daily and prepare temporary support.",
    spark: [30, 33, 36, 40, 42, 44, 47, 49, 50, 52, 53, 54, 54, 55],
    tags: ["Pediatrie", "Moderat Risk"],
  },
  {
    id: "onc-load",
    name: "Oncologie Department Emotional Load",
    department: "Oncologie",
    icon: Activity,
    risk: "Moderat to Ridicat",
    riskScore: 66,
    description: "Sustained emotional workload and limited recovery windows create long-term fatigue risk.",
    drivers: ["Emotional load", "Consecutive shifts", "Scazut recovery time"],
    action: "Rotate high-intensity assignments and add wellbeing check-ins.",
    spark: [44, 46, 48, 50, 51, 53, 55, 57, 58, 60, 61, 62, 64, 66],
    tags: ["Oncologie", "Moderat Risk", "Ridicat Risk"],
  },
  {
    id: "weekend",
    name: "Weekend Understaffing Scenario",
    department: "Multi-sectie",
    icon: CalendarDays,
    risk: "Ridicat",
    riskScore: 74,
    description: "Weekend coverage gaps create workload concentration among available staff.",
    drivers: ["Gol de acoperire", "Overtime", "Absenta personal"],
    action: "Add weekend reserve staff and reduce double shifts.",
    spark: [38, 42, 46, 50, 54, 58, 62, 65, 67, 68, 70, 71, 73, 74],
    tags: ["Personal weekend", "Ridicat Risk"],
  },
];

const FILTERS: Tag[] = ["ICU", "Urgente", "Chirurgie", "Pediatrie", "Oncologie", "Personal weekend", "Ridicat Risk", "Moderat Risk"];

function riskTone(risk: RiskLevel): "danger" | "warning" {
  return risk === "Critic" || risk === "Ridicat" ? "danger" : "warning";
}
function riskGlowClass(risk: RiskLevel): string {
  if (risk === "Critic") return "risk-critical";
  if (risk === "Ridicat") return "risk-high";
  if (risk === "Moderat to Ridicat") return "risk-medium";
  return "risk-low";
}

function ExamplesPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Tag | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCENARIOS.filter((s) => {
      const matchTag = !active || s.tags.includes(active);
      const matchQ = !q
        || s.name.toLowerCase().includes(q)
        || s.department.toLowerCase().includes(q)
        || s.description.toLowerCase().includes(q)
        || s.drivers.some((d) => d.toLowerCase().includes(q));
      return matchTag && matchQ;
    });
  }, [query, active]);

  const loadScenario = (s: Scenario) => {
    setLoadingId(s.id);
    try {
      window.localStorage.setItem("pulseguard:active-scenario", JSON.stringify({
        id: s.id, name: s.name, department: s.department, riskScore: s.riskScore, ts: Date.now(),
      }));
    } catch { /* ignore */ }
    toast.success("Scenariul a fost incarcat in spatiul de prognoza", {
      description: `${s.name} — ${s.department}`,
    });
    setTimeout(() => {
      setLoadingId(null);
      navigate({ to: "/" });
    }, 700);
  };

  const previewReport = (s: Scenario) => {
    try {
      window.localStorage.setItem("pulseguard:active-scenario", JSON.stringify({
        id: s.id, name: s.name, department: s.department, riskScore: s.riskScore, ts: Date.now(),
      }));
    } catch { /* ignore */ }
    toast("Opening report preview", { description: s.name });
    navigate({ to: "/forecast-report" });
  };

  return (
    <AppShell>
      <header className="mb-6 animate-stagger">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
          <Library className="h-3 w-3" /> Exemple Pregenerate
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold leading-tight">
          Scenarii pregenerate de risc de epuizare
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground max-w-2xl">
          Exploreaza scenarii realiste de presiune pe personalul medical si genereaza planuri de interventie asistate de AI.
        </p>
      </header>

      {/* Controls */}
      <div className="glass luminous-border rounded-2xl p-3 sm:p-4 mb-6 animate-stagger" style={{ animationDelay: "0.05s" }}>
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search scenarios…"
            aria-label="Search scenarios"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} className="text-[11px] text-muted-foreground hover:text-foreground transition">Clear</button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip label="All" active={active === null} onClick={() => setActive(null)} />
          {FILTERS.map((t) => (
            <FilterChip key={t} label={t} active={active === t} onClick={() => setActive(active === t ? null : t)} />
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass luminous-border rounded-2xl p-10 text-center">
          <Sparkles className="h-5 w-5 mx-auto text-[var(--cyan-glow)]" />
          <p className="mt-2 text-sm text-muted-foreground">No scenarios match your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((s, i) => (
            <ScenarioCard
              key={s.id}
              s={s}
              index={i}
              loading={loadingId === s.id}
              onLoad={() => loadScenario(s)}
              onPreview={() => previewReport(s)}
            />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs border transition-all",
        active
          ? "bg-gradient-to-r from-[var(--cyan-glow)]/25 to-[var(--indigo-glow)]/20 border-[var(--cyan-glow)]/50 text-foreground shadow-[0_0_18px_-6px_oklch(0.78_0.18_210/0.6)]"
          : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-[var(--cyan-glow)]/40 hover:-translate-y-0.5"
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ScenarioCard({ s, index, loading, onLoad, onPreview }: {
  s: Scenario; index: number; loading: boolean; onLoad: () => void; onPreview: () => void;
}) {
  const Icon = s.icon;
  const tone = riskTone(s.risk);
  return (
    <article
      className={cn(
        "group glass luminous-border rounded-2xl p-5 animate-stagger hover-lift overflow-hidden relative",
        riskGlowClass(s.risk)
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-transform group-hover:scale-105",
            tone === "danger"
              ? "bg-danger/15 border-danger/30 text-danger"
              : "bg-warning/15 border-warning/30 text-warning"
          )}>
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">{s.name}</h2>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {s.department}
            </p>
          </div>
        </div>
        <span className={cn(
          "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap",
          tone === "danger" ? "bg-danger/15 text-danger border-danger/30" : "bg-warning/15 text-warning border-warning/30"
        )}>
          <span className={cn(
            "h-1.5 w-1.5 rounded-full animate-pulse-soft",
            tone === "danger" ? "bg-danger" : "bg-warning"
          )} />
          {s.risk}
        </span>
      </div>

      <p className="mt-3 text-xs text-foreground/80 leading-relaxed">{s.description}</p>

      {/* Mini chart */}
      <div className="mt-4">
        <MiniChart data={s.spark} tone={tone} />
      </div>

      {/* Drivers */}
      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">Factor principals</div>
        <div className="flex flex-wrap gap-1.5">
          {s.drivers.map((d) => (
            <span key={d} className="inline-flex items-center rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px]">
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Action preview */}
      <div className="mt-3 rounded-lg border border-border/60 bg-secondary/30 p-2.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Recommended action
        </div>
        <p className="mt-0.5 text-xs text-foreground/90 leading-relaxed">{s.action}</p>
      </div>

      {/* Footer / score + buttons */}
      <div className="mt-4 flex items-center gap-2">
        <div className="text-xs text-muted-foreground">
          Forecast risk <span className="text-foreground font-semibold tabular-nums">{s.riskScore}/100</span>
        </div>
        <div className="ml-auto flex gap-1.5">
          <button
            onClick={onPreview}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-1.5 text-xs hover:bg-secondary/70 transition"
          >
            <Eye className="h-3 w-3" /> Previzualizare raport
          </button>
          <button
            onClick={onLoad}
            disabled={loading}
            className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-2.5 py-1.5 text-xs font-semibold text-background ring-glow disabled:opacity-70"
          >
            {loading
              ? <span className="h-3 w-3 rounded-full border-2 border-background/60 border-t-transparent animate-spin" />
              : <Play className="h-3 w-3 fill-current" />}
            {loading ? "Loading…" : "Incarca scenariul"}
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniChart({ data, tone }: { data: number[]; tone: "danger" | "warning" }) {
  const w = 320, h = 64;
  const min = Math.min(...data), max = Math.max(...data);
  const range = max - min || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`).join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const stroke = tone === "danger" ? "url(#scn-stroke-danger)" : "url(#scn-stroke-warn)";
  const fill = tone === "danger" ? "url(#scn-area-danger)" : "url(#scn-area-warn)";
  const dashLen = w * 1.6;
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id="scn-area-danger" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.68 0.22 20)" stopOpacity={0.42} />
          <stop offset="100%" stopColor="oklch(0.68 0.22 20)" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="scn-area-warn" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0.38} />
          <stop offset="100%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="scn-stroke-danger" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.18 210)" />
          <stop offset="100%" stopColor="oklch(0.68 0.22 20)" />
        </linearGradient>
        <linearGradient id="scn-stroke-warn" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.18 210)" />
          <stop offset="100%" stopColor="oklch(0.82 0.16 75)" />
        </linearGradient>
      </defs>
      <polygon points={area} fill={fill} />
      <polyline
        points={pts}
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: dashLen,
          strokeDashoffset: dashLen,
          animation: "draw-line 1.6s cubic-bezier(.2,.8,.2,1) forwards",
        }}
      />
    </svg>
  );
}


