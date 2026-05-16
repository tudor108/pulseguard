import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { departments, riskBand } from "@/lib/pulse/data";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/staff-load")({
  head: () => ({
    meta: [
      { title: "Incarcare Personal — PulseGuard AI" },
      { name: "description", content: "Presiune de lucru and occupancy across every hospital department." },
      { property: "og:title", content: "Incarcare Personal — PulseGuard AI" },
      { property: "og:description", content: "Department-level staffing load and occupancy." },
    ],
  }),
  component: StaffLoadPage,
});

function StaffLoadPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><Users className="h-3 w-3" /> Incarcare Personal</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Incarcare departamente</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments.map((d, i) => {
          const band = riskBand(d.burnoutRisk);
          const Trend = d.trend === "up" ? TrendingUp : d.trend === "down" ? TrendingDown : Minus;
          return (
            <article key={d.id} className="glass luminous-border rounded-2xl p-5 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-semibold leading-tight">{d.name}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.unit} · Lead {d.lead}</p>
                </div>
                <span className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium border",
                  band.tone === "danger" && "bg-danger/15 text-danger border-danger/30",
                  band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
                  band.tone === "success" && "bg-success/15 text-success border-success/30",
                  band.tone === "muted" && "border-border/60 text-muted-foreground",
                )}>{band.label}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Stat label="Epuizare" value={d.burnoutRisk} />
                <Stat label="Oboseala" value={d.fatigueIndex} />
                <Stat label="Volum de lucru" value={d.workloadPressure} />
                <Stat label="Deficit" value={d.shortageRisk} />
              </div>
              <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                <span>{d.staff} staff · {d.occupancy}% occupancy</span>
                <span className={cn(
                  "inline-flex items-center gap-1 font-medium",
                  d.trend === "up" ? "text-danger" : d.trend === "down" ? "text-success" : "text-muted-foreground"
                )}>
                  <Trend className="h-3 w-3" /> {d.delta > 0 ? "+" : ""}{d.delta}%
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
        <span>{label}</span><span className="tabular-nums text-foreground/80">{value}</span>
      </div>
      <div className="mt-2 h-1 rounded-full bg-secondary/60 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--cyan-glow)] via-warning to-danger" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}


