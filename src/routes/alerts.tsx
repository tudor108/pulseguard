import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { alerts } from "@/lib/pulse/data";
import { AlertOctagon, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerte Epuizare — PulseGuard AI" },
      { name: "description", content: "Real-time alerts on burnout risk, overtime anomalies, and staffing shortages." },
      { property: "og:title", content: "Alerte Epuizare — PulseGuard AI" },
      { property: "og:description", content: "Operational alerts across departments." },
    ],
  }),
  component: AlertsPage,
});

const levelStyle = {
  critical: { bg: "bg-danger/15 border-danger/30 text-danger", icon: ShieldAlert },
  warning:  { bg: "bg-warning/15 border-warning/30 text-warning", icon: AlertOctagon },
  info:     { bg: "bg-success/15 border-success/30 text-success", icon: Info },
} as const;

function AlertsPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Alerte Epuizare</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Alerte live</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sorted by severity. Acknowledge to log a response.</p>
      </header>

      <ul className="flex flex-col gap-3">
        {alerts.map((a, i) => {
          const s = levelStyle[a.level];
          const Icon = s.icon;
          return (
            <li key={a.id} className="glass luminous-border rounded-2xl p-4 flex items-start gap-3 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
              <div className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", s.bg)}>
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold">{a.title}</h2>
                  <span className="text-[10px] uppercase tracking-wider border border-border/60 rounded-full px-1.5 py-0.5 text-muted-foreground">{a.department}</span>
                  <span className="ml-auto text-[11px] text-muted-foreground">{a.time}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <div className="flex gap-1.5 self-center">
                <button className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs hover:bg-secondary/70 transition">Acknowledge</button>
                <button className="rounded-md bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-2.5 py-1 text-xs font-medium text-background">Review</button>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}

