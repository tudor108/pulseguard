import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { ForecastChart, MultiForecastChart } from "@/components/pulse/Charts";
import { buildForecast } from "@/lib/pulse/data";
import { ScanLine, Sparkles } from "lucide-react";

export const Route = createFileRoute("/forecast")({
  head: () => ({
    meta: [
      { title: "Prognoza AI - PulseGuard AI" },
      { name: "description", content: "Prognoza predictiva pe 14 zile pentru risc de epuizare, presiune de lucru, oboseala si deficit de personal." },
      { property: "og:title", content: "Prognoza AI - PulseGuard AI" },
      { property: "og:description", content: "Semnale prospective despre personal." },
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
          <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Orizont predictiv pe 14 zile</h1>
          <p className="mt-1 text-sm text-muted-foreground max-w-2xl">Predictii live ale modelului pentru epuizare, presiune de lucru, oboseala, risc de deficit si urgenta interventiei.</p>
        </div>
        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Pulse-v2.4  -  Incredere 92%
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Epuizare si presiune de lucru</h2>
          <ForecastChart data={f} />
        </div>
        <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Descompunere risc</h2>
          <MultiForecastChart data={f} />
        </div>
      </div>
    </AppShell>
  );
}



