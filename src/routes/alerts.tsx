import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { AlertOctagon, ShieldAlert, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePulseStore } from "@/lib/pulse/app-state";
import { toast } from "sonner";

export const Route = createFileRoute("/alerts")({
  head: () => ({
    meta: [
      { title: "Alerte Epuizare - PulseGuard AI" },
      {
        name: "description",
        content: "Alerte live despre risc de epuizare, ore suplimentare si deficit de personal.",
      },
      { property: "og:title", content: "Alerte Epuizare - PulseGuard AI" },
      { property: "og:description", content: "Alerte operationale pentru toate sectiile." },
    ],
  }),
  component: AlertsPage,
});

const levelStyle = {
  critical: { bg: "bg-danger/15 border-danger/30 text-danger", icon: ShieldAlert },
  warning: { bg: "bg-warning/15 border-warning/30 text-warning", icon: AlertOctagon },
  info: { bg: "bg-success/15 border-success/30 text-success", icon: Info },
} as const;

function AlertsPage() {
  const navigate = useNavigate();
  const { alerts, markAlertRead, markAllAlertsRead } = usePulseStore();
  const sortedAlerts = [...alerts].sort((a, b) => Number(a.read) - Number(b.read));

  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Alerte Epuizare
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Alerte live</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Sortate dupa severitate. Marcheaza o alerta ca citita dupa ce ai verificat-o.
        </p>
        <button
          onClick={() => {
            markAllAlertsRead();
            toast.success("Toate alertele au fost marcate ca citite");
          }}
          className="mt-3 rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition"
        >
          Marcheaza toate ca citite
        </button>
      </header>

      <ul className="flex flex-col gap-3">
        {sortedAlerts.length === 0 && (
          <li className="glass luminous-border rounded-2xl p-8 text-center text-sm text-muted-foreground">
            Nu exista alerte active. Telemetria live va crea automat alerte cand pragurile sunt
            depasite.
          </li>
        )}
        {sortedAlerts.map((a, i) => {
          const s = levelStyle[a.level];
          const Icon = s.icon;
          return (
            <li
              key={a.id}
              className={cn(
                "glass luminous-border rounded-2xl p-4 flex items-start gap-3 animate-fade-up",
                a.read && "opacity-60",
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div
                className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", s.bg)}
              >
                <Icon className="h-4.5 w-4.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-sm font-semibold">{a.title}</h2>
                  <span className="text-[10px] uppercase tracking-wider border border-border/60 rounded-full px-1.5 py-0.5 text-muted-foreground">
                    {a.department}
                  </span>
                  {a.read && (
                    <span className="text-[10px] uppercase tracking-wider border border-success/30 rounded-full px-1.5 py-0.5 text-success">
                      citita
                    </span>
                  )}
                  <span className="ml-auto text-[11px] text-muted-foreground">{a.time}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{a.detail}</p>
              </div>
              <div className="flex gap-1.5 self-center">
                <button
                  onClick={() => {
                    markAlertRead(a.id);
                    toast.success("Alerta marcata ca citita", { description: a.title });
                  }}
                  disabled={a.read}
                  className="rounded-md border border-border/60 bg-secondary/40 px-2.5 py-1 text-xs hover:bg-secondary/70 transition disabled:opacity-50"
                >
                  {a.read ? "Citita" : "Marcheaza citit"}
                </button>
                <button
                  onClick={() => {
                    markAlertRead(a.id);
                    navigate({
                      to: a.source === "telemetry" ? "/live-telemetry" : "/forecast-report",
                    });
                  }}
                  className="rounded-md bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-2.5 py-1 text-xs font-medium text-background"
                >
                  Verifica
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </AppShell>
  );
}
