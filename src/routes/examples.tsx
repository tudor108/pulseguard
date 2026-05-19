import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import {
  Library,
  Play,
  Eye,
  Search,
  HeartPulse,
  Siren,
  Stethoscope,
  Baby,
  Activity,
  CalendarDays,
  Building2,
  Sparkles,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useActiveScenario } from "@/lib/pulse/scenario-context";
import { usePulseStore } from "@/lib/pulse/app-state";

export const Route = createFileRoute("/examples")({
  head: () => ({
    meta: [
      { title: "Exemple Pregenerate - PulseGuard AI" },
      {
        name: "description",
        content:
          "Exploreaza scenarii realiste de presiune pe personalul medical si genereaza planuri de interventie asistate de AI.",
      },
      { property: "og:title", content: "Scenarii pregenerate de risc de epuizare - PulseGuard AI" },
      {
        property: "og:description",
        content: "Biblioteca de scenarii exemplu care pot fi incarcate in panou.",
      },
    ],
  }),
  component: ExamplesPage,
});

type RiskLevel = "Critic" | "Ridicat" | "Moderat spre ridicat" | "Moderat";
type Tag =
  | "ATI"
  | "Urgente"
  | "Chirurgie"
  | "Pediatrie"
  | "Oncologie"
  | "Personal weekend"
  | "Risc ridicat"
  | "Risc moderat";

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
    description:
      "Turele de noapte repetate, pacientii cu nevoi ridicate si orele suplimentare cresc riscul de epuizare.",
    drivers: ["Ore suplimentare", "Ture de noapte", "Acutitate pacienti"],
    action: "Adauga 2 persoane pe tura de noapte pentru urmatoarele 7 zile.",
    spark: [42, 48, 51, 55, 60, 64, 68, 71, 73, 76, 79, 82, 84, 86],
    tags: ["ATI", "Risc ridicat"],
  },
  {
    id: "er-surge",
    name: "Crestere brusca in Departamentul de Urgente",
    department: "Departament Urgente",
    icon: Siren,
    risk: "Ridicat",
    riskScore: 78,
    description:
      "Cresterea volumului de pacienti mareste presiunea de lucru si reduce timpul de recuperare intre ture.",
    drivers: ["Volum pacienti", "Incidente", "Ore suplimentare"],
    action: "Activeaza protocolul de supraaglomerare si redistribuie personalul senior.",
    spark: [52, 55, 58, 62, 60, 65, 70, 72, 74, 73, 75, 76, 77, 78],
    tags: ["Urgente", "Risc ridicat"],
  },
  {
    id: "sur-short",
    name: "Deficit personal in Sectia Chirurgie",
    department: "Sectie Chirurgie",
    icon: Stethoscope,
    risk: "Ridicat",
    riskScore: 72,
    description:
      "Disponibilitatea redusa a personalului si monitorizarea postoperatorie cresc riscul de oboseala.",
    drivers: ["Deficit personal", "Raport pacienti/personal", "Concedii medicale"],
    action: "Adauga personal de rezerva si reechilibreaza turele de weekend.",
    spark: [40, 44, 46, 48, 52, 55, 58, 60, 63, 65, 67, 68, 70, 72],
    tags: ["Chirurgie", "Risc ridicat"],
  },
  {
    id: "ped-seasonal",
    name: "Presiune sezoniera in Pediatrie",
    department: "Pediatrie",
    icon: Baby,
    risk: "Moderat",
    riskScore: 54,
    description:
      "Cresterea sezoniera a internarilor produce presiune moderata cu risc de escaladare.",
    drivers: ["Ocupare", "Volum pacienti", "Ture grupate"],
    action: "Monitorizeaza riscul zilnic si pregateste sprijin temporar.",
    spark: [30, 33, 36, 40, 42, 44, 47, 49, 50, 52, 53, 54, 54, 55],
    tags: ["Pediatrie", "Risc moderat"],
  },
  {
    id: "onc-load",
    name: "Incarcare emotionala in Oncologie",
    department: "Oncologie",
    icon: Activity,
    risk: "Moderat spre ridicat",
    riskScore: 66,
    description:
      "Incarcarea emotionala sustinuta si recuperarea limitata cresc riscul de oboseala pe termen lung.",
    drivers: ["Incarcare emotionala", "Ture consecutive", "Recuperare redusa"],
    action: "Roteaza cazurile intense si introdu discutii scurte de sprijin cu echipa.",
    spark: [44, 46, 48, 50, 51, 53, 55, 57, 58, 60, 61, 62, 64, 66],
    tags: ["Oncologie", "Risc moderat", "Risc ridicat"],
  },
  {
    id: "weekend",
    name: "Scenariu deficit personal in weekend",
    department: "Multi-sectie",
    icon: CalendarDays,
    risk: "Ridicat",
    riskScore: 74,
    description: "Golurile de acoperire din weekend concentreaza munca pe personalul disponibil.",
    drivers: ["Gol de acoperire", "Ore suplimentare", "Absenta personal"],
    action: "Adauga personal de rezerva in weekend si redu turele duble.",
    spark: [38, 42, 46, 50, 54, 58, 62, 65, 67, 68, 70, 71, 73, 74],
    tags: ["Personal weekend", "Risc ridicat"],
  },
];

const FILTERS: Tag[] = [
  "ATI",
  "Urgente",
  "Chirurgie",
  "Pediatrie",
  "Oncologie",
  "Personal weekend",
  "Risc ridicat",
  "Risc moderat",
];

function riskTone(risk: RiskLevel): "danger" | "warning" {
  return risk === "Critic" || risk === "Ridicat" ? "danger" : "warning";
}
function riskGlowClass(risk: RiskLevel): string {
  if (risk === "Critic") return "risk-critical";
  if (risk === "Ridicat") return "risk-high";
  if (risk === "Moderat spre ridicat") return "risk-medium";
  return "risk-low";
}

function ExamplesPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<Tag | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { setActive: setActiveScenario, generateFromPrompt } = useActiveScenario();
  const { saveScenario } = usePulseStore();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SCENARIOS.filter((s) => {
      const matchTag = !active || s.tags.includes(active);
      const matchQ =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.drivers.some((d) => d.toLowerCase().includes(q));
      return matchTag && matchQ;
    });
  }, [query, active]);

  const loadScenario = (s: Scenario) => {
    setLoadingId(s.id);
    const generated = scenarioToGenerated(s);
    setActiveScenario(generated);
    saveScenario(generated);
    toast.success("Scenariul a fost incarcat in spatiul de prognoza", {
      description: `${s.name} - ${s.department}`,
    });
    setTimeout(() => {
      setLoadingId(null);
      navigate({ to: "/" });
    }, 700);
  };

  const previewReport = (s: Scenario) => {
    const generated = scenarioToGenerated(s);
    setActiveScenario(generated);
    saveScenario(generated);
    toast("Se deschide previzualizarea raportului", { description: s.name });
    navigate({ to: "/forecast-report" });
  };

  const scenarioToGenerated = (s: Scenario) => {
    const generated = generateFromPrompt(
      `${s.department}: ${s.description}. ${s.action}. Factori: ${s.drivers.join(", ")}.`,
    );
    return {
      ...generated,
      id: s.id,
      name: s.name,
      department: s.department,
      riskScore: s.riskScore,
      predicted14d: Math.min(98, s.riskScore + 8),
      staffPressure: Math.min(98, s.riskScore + 4),
      interventionUrgency: Math.min(99, s.riskScore + 2),
      explanation: s.description,
      expectedImpact: s.action,
      prompt: `${s.department}: ${s.description}`,
    };
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
          Exploreaza scenarii realiste de presiune pe personalul medical si genereaza planuri de
          interventie asistate de AI.
        </p>
      </header>

      {/* Controls */}
      <div
        className="glass luminous-border rounded-2xl p-3 sm:p-4 mb-6 animate-stagger"
        style={{ animationDelay: "0.05s" }}
      >
        <div className="flex items-center gap-2 rounded-xl border border-border/60 bg-secondary/40 px-3 py-2 focus-within:ring-2 focus-within:ring-ring/50">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cauta scenarii..."
            aria-label="Cauta scenarii"
            className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-[11px] text-muted-foreground hover:text-foreground transition"
            >
              Sterge
            </button>
          )}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <FilterChip label="Toate" active={active === null} onClick={() => setActive(null)} />
          {FILTERS.map((t) => (
            <FilterChip
              key={t}
              label={t}
              active={active === t}
              onClick={() => setActive(active === t ? null : t)}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="glass luminous-border rounded-2xl p-10 text-center">
          <Sparkles className="h-5 w-5 mx-auto text-[var(--cyan-glow)]" />
          <p className="mt-2 text-sm text-muted-foreground">
            Niciun scenariu nu se potriveste filtrelor.
          </p>
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

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs border transition-all",
        active
          ? "bg-gradient-to-r from-[var(--cyan-glow)]/25 to-[var(--indigo-glow)]/20 border-[var(--cyan-glow)]/50 text-foreground shadow-[0_0_18px_-6px_oklch(0.78_0.18_210/0.6)]"
          : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground hover:bg-secondary/70 hover:border-[var(--cyan-glow)]/40 hover:-translate-y-0.5",
      )}
      aria-pressed={active}
    >
      {label}
    </button>
  );
}

function ScenarioCard({
  s,
  index,
  loading,
  onLoad,
  onPreview,
}: {
  s: Scenario;
  index: number;
  loading: boolean;
  onLoad: () => void;
  onPreview: () => void;
}) {
  const Icon = s.icon;
  const tone = riskTone(s.risk);
  return (
    <article
      className={cn(
        "group glass luminous-border rounded-2xl p-5 animate-stagger hover-lift overflow-hidden relative",
        riskGlowClass(s.risk),
      )}
      style={{ animationDelay: `${index * 60}ms` }}
    >
      {/* Top */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-xl border transition-transform group-hover:scale-105",
              tone === "danger"
                ? "bg-danger/15 border-danger/30 text-danger"
                : "bg-warning/15 border-warning/30 text-warning",
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-semibold leading-tight truncate">{s.name}</h2>
            <p className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
              <Building2 className="h-3 w-3" /> {s.department}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border whitespace-nowrap",
            tone === "danger"
              ? "bg-danger/15 text-danger border-danger/30"
              : "bg-warning/15 text-warning border-warning/30",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full animate-pulse-soft",
              tone === "danger" ? "bg-danger" : "bg-warning",
            )}
          />
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
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground mb-1.5">
          Factori principali
        </div>
        <div className="flex flex-wrap gap-1.5">
          {s.drivers.map((d) => (
            <span
              key={d}
              className="inline-flex items-center rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10px]"
            >
              {d}
            </span>
          ))}
        </div>
      </div>

      {/* Action preview */}
      <div className="mt-3 rounded-lg border border-border/60 bg-secondary/30 p-2.5">
        <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground inline-flex items-center gap-1">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Actiune recomandata
        </div>
        <p className="mt-0.5 text-xs text-foreground/90 leading-relaxed">{s.action}</p>
      </div>

      {/* Footer / score + buttons */}
      <div className="mt-4 flex items-center gap-2">
        <div className="text-xs text-muted-foreground">
          Risc prognozat{" "}
          <span className="text-foreground font-semibold tabular-nums">{s.riskScore}/100</span>
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
            {loading ? (
              <span className="h-3 w-3 rounded-full border-2 border-background/60 border-t-transparent animate-spin" />
            ) : (
              <Play className="h-3 w-3 fill-current" />
            )}
            {loading ? "Se incarca..." : "Incarca scenariul"}
          </button>
        </div>
      </div>
    </article>
  );
}

function MiniChart({ data, tone }: { data: number[]; tone: "danger" | "warning" }) {
  const w = 320,
    h = 64;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const pts = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 6) - 3}`)
    .join(" ");
  const area = `0,${h} ${pts} ${w},${h}`;
  const stroke = tone === "danger" ? "url(#scn-stroke-danger)" : "url(#scn-stroke-warn)";
  const fill = tone === "danger" ? "url(#scn-area-danger)" : "url(#scn-area-warn)";
  const dashLen = w * 1.6;
  return (
    <svg
      width="100%"
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="overflow-visible"
    >
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
