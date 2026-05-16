import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { FileText, ArrowRight } from "lucide-react";
import { departments, riskBand } from "@/lib/pulse/data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Rapoarte - PulseGuard AI" },
      { name: "description", content: "Toate rapoartele generate pentru riscul de epuizare pe sectii." },
      { property: "og:title", content: "Rapoarte - PulseGuard AI" },
      { property: "og:description", content: "Biblioteca de rapoarte generate de AI pentru personal." },
    ],
  }),
  component: RapoartePage,
});

function RapoartePage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rapoarte</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Rapoarte generate</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ultimele rapoarte de prognoza si interventie generate de AI pentru fiecare unitate medicala.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {departments.map((d, i) => {
          const band = riskBand(d.burnoutRisk);
          return (
            <Link key={d.id} to="/forecast-report" className="group glass luminous-border rounded-2xl p-5 animate-fade-up hover:-translate-y-0.5 transition-transform" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="flex items-center justify-between">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/50 border border-border/60">
                  <FileText className="h-4 w-4 text-[var(--cyan-glow)]" />
                </div>
                <span className={cn(
                  "text-[10px] uppercase tracking-wider rounded-full px-2 py-0.5 border",
                  band.tone === "danger" && "bg-danger/15 text-danger border-danger/30",
                  band.tone === "warning" && "bg-warning/15 text-warning border-warning/30",
                  band.tone === "success" && "bg-success/15 text-success border-success/30",
                  band.tone === "muted" && "border-border/60 text-muted-foreground",
                )}>{band.label}</span>
              </div>
              <h2 className="mt-3 text-base font-semibold">{d.name}</h2>
              <p className="text-xs text-muted-foreground">{d.unit}</p>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Scor risc</span>
                <span className="font-semibold tabular-nums">{d.burnoutRisk}/100</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-[var(--cyan-glow)] via-warning to-danger" style={{ width: `${d.burnoutRisk}%` }} />
              </div>
              <div className="mt-4 inline-flex items-center gap-1 text-xs text-[var(--cyan-glow)] group-hover:gap-2 transition-all">
                Deschide raportul <ArrowRight className="h-3 w-3" />
              </div>
            </Link>
          );
        })}
      </div>
    </AppShell>
  );
}


