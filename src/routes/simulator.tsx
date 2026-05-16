import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/pulse/AppShell";
import { AnimatedNumber } from "@/components/pulse/AnimatedNumber";
import { buildForecast } from "@/lib/pulse/data";
import { useProfil, UNITS } from "@/lib/pulse/profile";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import {
  FlaskConical, Play, Save, FileText, Sparkles, TrendingDown, DollarSign,
  ShieldCheck, Gauge, AlertTriangle, CheckCircle2, Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/simulator")({
  head: () => ({
    meta: [
      { title: "Simulator Scenarii - PulseGuard AI" },
      { name: "description", content: "Simuleaza modificari de personal, limitari ale orelor suplimentare si redistribuirea turelor fata de prognoza de epuizare." },
      { property: "og:title", content: "Simulator Scenarii - PulseGuard AI" },
      { property: "og:description", content: "Planificare de scenarii pentru operatiunile spitalului." },
    ],
  }),
  component: SimulatorPage,
});

const tickStyle = { fill: "oklch(0.72 0.03 245)", fontSize: 11 };
const grid = "oklch(0.97 0.01 230 / 0.06)";

type Surge = "low" | "medium" | "high";

function SimulatorPage() {
  const navigate = useNavigate();
  const { unit, setUnit } = useProfil();

  // Controls
  const [horizon, setHorizon] = useState<7 | 14 | 30>(14);
  const [tempStaff, setTempStaff] = useState(2);
  const [otReduction, setOtReduction] = useState(20); // %
  const [redistributeNight, setRedistributeNight] = useState(true);
  const [recoveryBuffer, setRecoveryBuffer] = useState(true);
  const [maxConsecutive, setMaxConsecutive] = useState("4");
  const [surge, setSurge] = useState<Surge>("medium");

  const [recalculating, setRecalculating] = useState(false);

  // Trigger shimmer on any control change
  useEffect(() => {
    setRecalculating(true);
    const t = setTimeout(() => setRecalculating(false), 550);
    return () => clearTimeout(t);
  }, [horizon, tempStaff, otReduction, redistributeNight, recoveryBuffer, maxConsecutive, surge, unit]);

  // Mock model
  const baseline = useMemo(() => buildForecast(30, horizon), [horizon]);

  const surgeMultiplier = surge === "low" ? 0.85 : surge === "high" ? 1.18 : 1;

  const reduction =
    tempStaff * 3.2 +
    otReduction * 0.42 +
    (redistributeNight ? 6.5 : 0) +
    (recoveryBuffer ? 4.8 : 0) +
    (5 - Math.min(5, Math.max(3, +maxConsecutive))) * 2.2;

  const adjusted = baseline.map((p) => p.forecast ? {
    ...p,
    burnoutRisk: Math.max(0, Math.min(100, (p.burnoutRisk - reduction) * surgeMultiplier)),
    workloadPressure: Math.max(0, Math.min(100, (p.workloadPressure - reduction * 0.9) * surgeMultiplier)),
  } : p);

  const forecastSlice = adjusted.filter((p) => p.forecast);
  const baseSlice = baseline.filter((p) => p.forecast);
  const beforeRisk = Math.round(baseSlice.reduce((a, p) => a + p.burnoutRisk, 0) / Math.max(1, baseSlice.length));
  const afterRisk = Math.round(forecastSlice.reduce((a, p) => a + p.burnoutRisk, 0) / Math.max(1, forecastSlice.length));
  const reductionPct = beforeRisk > 0 ? Math.max(0, Math.round(((beforeRisk - afterRisk) / beforeRisk) * 100)) : 0;

  const costImpact = tempStaff * 2.8 + (recoveryBuffer ? 1.2 : 0) - otReduction * 0.18;
  const costLevel: "low" | "moderate" | "high" =
    costImpact < 3 ? "low" : costImpact < 7 ? "moderate" : "high";

  const feasibility: "high" | "moderate" | "low" =
    tempStaff <= 4 && +maxConsecutive >= 3 ? "high" : tempStaff <= 7 ? "moderate" : "low";

  const confidence = Math.min(96, 72 + Math.round(reduction * 0.4) + (recoveryBuffer ? 4 : 0));

  // Combined chart data
  const chartData = baseline.map((p, i) => ({
    date: p.date,
    before: p.forecast ? Math.round(p.burnoutRisk) : null,
    after: p.forecast ? Math.round(adjusted[i].burnoutRisk) : null,
    actual: p.forecast ? null : Math.round(p.burnoutRisk),
  }));

  // Driver reductions
  const drivers = [
    { name: "Ture de noapte grupate", before: 82, after: Math.max(20, 82 - (redistributeNight ? 28 : 6) - tempStaff * 3) },
    { name: "Ore suplimentare", before: 76, after: Math.max(15, 76 - otReduction * 1.1) },
    { name: "Deficit recuperare intre ture", before: 71, after: Math.max(18, 71 - (recoveryBuffer ? 32 : 4) - tempStaff * 1.5) },
    { name: "Presiune raport pacienti/personal", before: 68, after: Math.max(20, 68 - tempStaff * 4 + (surge === "high" ? 8 : 0)) },
    { name: "Oboseala din ture consecutive", before: 64, after: Math.max(18, 64 - (5 - Math.min(5, +maxConsecutive)) * 9) },
  ];

  const barData = drivers.map((d) => ({ name: d.name, Before: d.before, After: Math.round(d.after) }));

  const apply = () => {
    toast.success("Scenariul a fost aplicat la Raport Prognoza", {
      description: `+${tempStaff} persoane - -${otReduction}% ore suplimentare - orizont ${horizon} zile`,
    });
    setTimeout(() => navigate({ to: "/forecast-report" }), 400);
  };

  const save = () => {
    toast.success("Scenariu salvat", { description: "Disponibil in biblioteca Scenarii Salvate." });
  };

  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
          <FlaskConical className="h-3 w-3" /> Simulator Scenarii
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Planificare interventii si scenarii</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Testeaza cum modificarile de personal, limitele pentru ore suplimentare si redistribuirea turelor schimba riscul estimat de epuizare pentru unitatea selectata.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-[340px_1fr] gap-5">
        {/* LEFT: Controls */}
        <aside className="glass luminous-border rounded-2xl p-5 animate-fade-up flex flex-col gap-5 self-start xl:sticky xl:top-28">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
            <Gauge className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Controale Scenariu
          </div>

          <ControlBlock label="Unitate medicala">
            <Select value={unit} onValueChange={(v) => setUnit(v as typeof UNITS[number])}>
              <SelectTrigger className="h-9 bg-secondary/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {UNITS.map((u) => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </ControlBlock>

          <ControlBlock label="Orizont prognoza">
            <ToggleGroup
              type="single"
              value={String(horizon)}
              onValueChange={(v) => v && setHorizon(+v as 7 | 14 | 30)}
              className="grid grid-cols-3 gap-1.5 bg-secondary/30 p-1 rounded-lg border border-border/60"
            >
              {[7, 14, 30].map((d) => (
                <ToggleGroupItem
                  key={d}
                  value={String(d)}
                  className="data-[state=on]:bg-gradient-to-r data-[state=on]:from-[var(--cyan-glow)] data-[state=on]:to-[var(--indigo-glow)] data-[state=on]:text-background text-xs h-8 rounded-md"
                >
                  {d} zile
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlBlock>

          <ControlBlock label="Adauga personal temporar" value={`+${tempStaff}`}>
            <Slider value={[tempStaff]} onValueChange={(v) => setTempStaff(v[0])} min={0} max={10} step={1} />
          </ControlBlock>

          <ControlBlock label="Reducere tinta ore suplimentare" value={`-${otReduction}%`}>
            <Slider value={[otReduction]} onValueChange={(v) => setOtReduction(v[0])} min={0} max={50} step={5} />
          </ControlBlock>

          <ToggleRow label="Redistribuire tura de noapte" hint="Distribuie tura de noapte in echipa de rezerva" checked={redistributeNight} onChange={setRedistributeNight} />
          <ToggleRow label="Buffer recuperare dupa ture de noapte" hint="Impune fereastra de odihna de 24h" checked={recoveryBuffer} onChange={setRecoveryBuffer} />

          <ControlBlock label="Numar maxim ture consecutive">
            <Select value={maxConsecutive} onValueChange={setMaxConsecutive}>
              <SelectTrigger className="h-9 bg-secondary/40 border-border/60"><SelectValue /></SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {["3", "4", "5", "6"].map((n) => <SelectItem key={n} value={n}>{n} ture</SelectItem>)}
              </SelectContent>
            </Select>
          </ControlBlock>

          <ControlBlock label="Ipoteza crestere pacienti">
            <ToggleGroup
              type="single"
              value={surge}
              onValueChange={(v) => v && setSurge(v as Surge)}
              className="grid grid-cols-3 gap-1.5 bg-secondary/30 p-1 rounded-lg border border-border/60"
            >
              {(["low", "medium", "high"] as const).map((s) => (
                <ToggleGroupItem
                  key={s}
                  value={s}
                  className="capitalize text-xs h-8 rounded-md data-[state=on]:bg-secondary data-[state=on]:text-foreground data-[state=on]:shadow-[0_0_18px_-6px_oklch(0.78_0.18_210/0.7)]"
                >
                  {s === "low" ? "scazut" : s === "medium" ? "mediu" : "ridicat"}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </ControlBlock>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button onClick={save} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs font-medium hover:bg-secondary/70 transition active:scale-[0.97]">
              <Save className="h-3.5 w-3.5" /> Salveaza
            </button>
            <button onClick={apply} className="btn-glow inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3 py-2 text-xs font-semibold text-background ring-glow active:scale-[0.97]">
              <FileText className="h-3.5 w-3.5" /> Aplica la Raport
            </button>
          </div>
        </aside>

        {/* RIGHT: Results */}
        <section className={cn("space-y-5 transition-opacity", recalculating && "opacity-95")}>
          {/* KPI strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KpiTile
              label="Risc inainte"
              value={<><AnimatedNumber value={beforeRisk} />%</>}
              tone="danger"
              icon={<AlertTriangle className="h-3.5 w-3.5" />}
              caption={`baza ${horizon} zile`}
              shimmer={recalculating}
            />
            <KpiTile
              label="Risc dupa interventie"
              value={<><AnimatedNumber value={afterRisk} />%</>}
              tone="success"
              icon={<ShieldCheck className="h-3.5 w-3.5" />}
              caption={`proiectie ${horizon} zile`}
              shimmer={recalculating}
            />
            <KpiTile
              label="Reducere estimata"
              value={<>-<AnimatedNumber value={reductionPct} />%</>}
              tone="cyan"
              icon={<TrendingDown className="h-3.5 w-3.5" />}
              caption={`${beforeRisk - afterRisk} puncte absolut`}
              shimmer={recalculating}
            />
            <KpiTile
              label="Incredere"
              value={<><AnimatedNumber value={confidence} />%</>}
              tone="indigo"
              icon={<Sparkles className="h-3.5 w-3.5" />}
              caption="Acord model"
              shimmer={recalculating}
            />
          </div>

          {/* Badges row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <BadgeTile
              icon={<DollarSign className="h-3.5 w-3.5" />}
              label="Impact cost personal"
              level={costLevel}
              detail={costLevel === "low" ? "In bugetul curent" : costLevel === "moderate" ? "+8.4k USD / 14 zile estimat" : "+18.2k USD / 14 zile estimat"}
            />
            <BadgeTile
              icon={<CheckCircle2 className="h-3.5 w-3.5" />}
              label="Fezabilitate operationala"
              level={feasibility}
              detail={feasibility === "high" ? "Posibil cu personal de rezerva" : feasibility === "moderate" ? "Necesita schimb de ture" : "Necesita angajari externe"}
            />
            <BadgeTile
              icon={<Sparkles className="h-3.5 w-3.5" />}
              label="Incredere recomandare"
              level={confidence > 88 ? "high" : confidence > 78 ? "moderate" : "low"}
              detail={`${confidence}% acord model`}
            />
          </div>

          {/* Before vs After chart */}
          <Card title="Inainte vs dupa - prognoza risc epuizare" shimmer={recalculating}>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="g-after" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.78 0.16 165)" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="oklch(0.78 0.16 165)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={grid} strokeDasharray="3 3" />
                <XAxis dataKey="date" tick={tickStyle} tickFormatter={(d) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })} tickLine={false} axisLine={false} />
                <YAxis tick={tickStyle} tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: "transparent", border: "none" }} cursor={{ stroke: "oklch(0.78 0.18 210 / 0.4)" }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line type="monotone" dataKey="actual" name="Istoric" stroke="oklch(0.72 0.03 245)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="before" name="Inainte de interventie" stroke="oklch(0.68 0.22 20)" strokeWidth={2.4} strokeDasharray="5 4" dot={false} />
                <Area type="monotone" dataKey="after" name="Dupa interventie" stroke="oklch(0.78 0.16 165)" strokeWidth={2.4} fill="url(#g-after)" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Bar chart */}
            <div className="lg:col-span-3">
              <Card title="Impact interventie pe factor de risc" shimmer={recalculating}>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={barData} margin={{ top: 8, right: 12, left: -10, bottom: 0 }} barGap={4}>
                    <CartesianGrid stroke={grid} strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" tick={{ ...tickStyle, fontSize: 10 }} tickLine={false} axisLine={false} interval={0} tickFormatter={(s: string) => s.length > 14 ? s.slice(0, 13) + "..." : s} />
                    <YAxis tick={tickStyle} tickLine={false} axisLine={false} domain={[0, 100]} />
                    <Tooltip contentStyle={{ background: "transparent", border: "none" }} cursor={{ fill: "oklch(0.78 0.18 210 / 0.06)" }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    <Bar dataKey="Before" name="Inainte" fill="oklch(0.68 0.22 20)" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="After" name="Dupa" fill="oklch(0.78 0.16 165)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>

            {/* Driver reduction cards */}
            <div className="lg:col-span-2">
              <Card title="Reducere factori de risc" shimmer={recalculating}>
                <ul className="space-y-2.5">
                  {drivers.map((d) => {
                    const drop = Math.max(0, d.before - d.after);
                    const pct = Math.round((drop / d.before) * 100);
                    return (
                      <li key={d.name} className="rounded-lg border border-border/50 bg-secondary/20 p-2.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium">{d.name}</span>
                          <span className="text-success font-semibold tabular-nums">-{pct}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                          <div className="h-full bg-gradient-to-r from-success to-[var(--cyan-glow)] transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10px] text-muted-foreground tabular-nums">
                          <span>Inainte {d.before}</span><span>Dupa {Math.round(d.after)}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            </div>
          </div>

          {/* Recomandare AI */}
          <Card title="Recomandare AI" shimmer={recalculating} accent>
            <div className="flex items-start gap-3">
              <div className="h-9 w-9 shrink-0 rounded-lg bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] grid place-items-center ring-glow">
                <Sparkles className="h-4 w-4 text-background" />
              </div>
              <div className="text-sm leading-relaxed text-foreground/90">
                Adaugarea a <span className="font-semibold text-foreground">{tempStaff} persoane temporare</span> si reducerea orelor suplimentare cu{" "}
                <span className="font-semibold text-foreground">{otReduction}%</span> este estimata sa reduca{" "}
                <span className="font-semibold text-foreground">riscul de epuizare pe {horizon} zile</span> in{" "}
                <span className="font-semibold text-foreground">{unit}</span> de la{" "}
                <span className="text-danger font-semibold">{beforeRisk}%</span> la{" "}
                <span className="text-success font-semibold">{afterRisk}%</span>
                {redistributeNight || recoveryBuffer ? (
                  <>. Cea mai mare imbunatatire vine din{" "}
                    {redistributeNight && <span className="font-semibold text-foreground">reducerea grupajului de ture de noapte</span>}
                    {redistributeNight && recoveryBuffer && " si "}
                    {recoveryBuffer && <span className="font-semibold text-foreground">cresterea timpului de recuperare intre ture intense</span>}.
                  </>
                ) : <>. Ia in calcul redistribuirea turelor de noapte si buffere de recuperare ca sa amplifici efectul.</>}
                {" "}Incredere model: <span className="font-semibold text-foreground">{confidence}%</span>.
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button onClick={apply} className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow active:scale-[0.97]">
                {recalculating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5 fill-current" />}
                Aplica scenariul la raport
              </button>
              <button onClick={save} className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs font-medium hover:bg-secondary/70 transition active:scale-[0.97]">
                <Save className="h-3.5 w-3.5" /> Salveaza Scenariul
              </button>
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

/* ----- Subcomponents ----- */

function ControlBlock({ label, value, children }: { label: string; value?: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex justify-between items-center text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        {value && <span className="font-semibold tabular-nums text-foreground">{value}</span>}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 p-2.5">
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="text-[10px] text-muted-foreground">{hint}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function KpiTile({ label, value, tone, icon, caption, shimmer }: {
  label: string; value: React.ReactNode; tone: "danger" | "success" | "cyan" | "indigo"; icon: React.ReactNode; caption: string; shimmer: boolean;
}) {
  const tones = {
    danger: "text-danger",
    success: "text-success",
    cyan: "text-[var(--cyan-glow)]",
    indigo: "text-[var(--indigo-glow)]",
  };
  return (
    <div className={cn("relative overflow-hidden rounded-xl glass p-3.5 luminous-border", shimmer && "shimmer")}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        <span className={tones[tone]}>{icon}</span> {label}
      </div>
      <div className={cn("mt-1.5 text-2xl font-semibold tabular-nums", tones[tone])}>{value}</div>
      <div className="text-[10px] text-muted-foreground mt-0.5">{caption}</div>
    </div>
  );
}

function BadgeTile({ icon, label, level, detail }: { icon: React.ReactNode; label: string; level: "low" | "moderate" | "high"; detail: string }) {
  const map = {
    low:      { color: "text-success",            ring: "ring-success/40",            text: "Scazut" },
    moderate: { color: "text-warning",            ring: "ring-warning/40",            text: "Moderat" },
    high:     { color: "text-[var(--cyan-glow)]", ring: "ring-[var(--cyan-glow)]/40", text: "Ridicat" },
  } as const;
  const m = map[level];
  return (
    <div className="rounded-xl glass p-3.5 luminous-border">
      <div className="flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground inline-flex items-center gap-1.5">{icon} {label}</div>
        <span className={cn("inline-flex items-center gap-1 rounded-full bg-background/30 px-2 py-0.5 text-[10px] font-semibold ring-1", m.color, m.ring)}>
          <span className={cn("h-1.5 w-1.5 rounded-full bg-current animate-pulse-soft")} /> {m.text}
        </span>
      </div>
      <div className="mt-2 text-xs text-foreground/80">{detail}</div>
    </div>
  );
}

function Card({ title, children, shimmer, accent }: { title: string; children: React.ReactNode; shimmer?: boolean; accent?: boolean }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl glass p-5 luminous-border", accent && "ring-1 ring-[var(--cyan-glow)]/30")}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {shimmer && <span className="inline-flex items-center gap-1.5 text-[10px] text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Se recalculeaza</span>}
      </div>
      <div className={cn(shimmer && "shimmer")}>{children}</div>
    </div>
  );
}




