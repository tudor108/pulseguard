import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { recommendations } from "@/lib/pulse/data";
import { ClipboardList, Clock, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/intervention-planner")({
  head: () => ({
    meta: [
      { title: "Planificator Interventii - PulseGuard AI" },
      { name: "description", content: "Prioritizeaza si aplica interventii de personal recomandate de AI." },
      { property: "og:title", content: "Planificator Interventii - PulseGuard AI" },
      { property: "og:description", content: "Planifica, aproba si trimite actiuni operationale." },
    ],
  }),
  component: PlannerPage,
});

function PlannerPage() {
  const impactLabel: Record<string, string> = { high: "ridicat", medium: "mediu", low: "scazut" };
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><ClipboardList className="h-3 w-3" /> Planificator Interventii</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Planifica si aplica interventii</h1>
        <p className="mt-1 text-sm text-muted-foreground">Revizuieste actiunile recomandate de AI, aproba-le si trimite-le catre coordonatorii de sectie.</p>
      </header>

      <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
        <ul className="flex flex-col gap-2.5">
          {recommendations.map((r) => (
            <li key={r.id} className="group flex gap-3 rounded-xl border border-border/60 bg-secondary/30 hover:bg-secondary/50 transition p-4">
              <div className={cn(
                "mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                r.impact === "ridicat" ? "bg-danger/15 text-danger" : r.impact === "mediu" ? "bg-warning/15 text-warning" : "bg-success/15 text-success"
              )}>
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm font-medium">{r.title}</h3>
                  <span className="text-[10px] uppercase tracking-wider rounded-full border border-border/60 px-1.5 py-0.5 text-muted-foreground">{r.department}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{r.detail}</p>
                <div className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {r.eta}</span>
                  <span className={cn(
                    "inline-flex items-center gap-1",
                    r.impact === "ridicat" ? "text-danger" : r.impact === "mediu" ? "text-warning" : "text-success"
                  )}> impact {impactLabel[r.impact] ?? r.impact}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 self-center">
                <button className="rounded-md bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3 py-1 text-xs font-medium text-background">Aproba</button>
                <button className="rounded-md border border-border/60 bg-secondary/40 px-3 py-1 text-xs hover:bg-secondary/70 transition">Amana</button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}

