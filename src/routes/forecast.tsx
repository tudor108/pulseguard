import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { ForecastChart, MultiForecastChart } from "@/components/pulse/Charts";
import { buildForecast } from "@/lib/pulse/data";
import { ScanLine, Sparkles } from "lucide-react";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Prognoza AI — PulseGuard AI" },
      { name: "description", content: "14-day predictive forecast of burnout risk, workload pressure, fatigue and shortage." },
      { property: "og:title", content: "Prognoza AI — PulseGuard AI" },
      { property: "og:description", content: "Forward-looking workforce signals." },
    ],
  }),
  component: ForecastPage,
});

function ForecastPage() {
  const f = buildForecast(30, 14);
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up flex items-end justify-between flex-wrap gap-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><ScanLine className="h-3 w-3" /> Prognoza AI</div>
          <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">14-day predictive horizon</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Live model predictions across burnout, workload pressure, fatigue, shortage risk and intervention urgency.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Pulse-v2.4 · Confidence 92%
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Burnout & workload pressure</h2>
          <ForecastChart data={f} />
        </div>
        <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Risk decomposition</h2>
          <MultiForecastChart data={f} />
        </div>
      </div>
    </AppShell>
  );
}

