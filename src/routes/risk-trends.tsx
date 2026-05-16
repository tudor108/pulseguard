import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { InputsChart, MultiForecastChart } from "@/components/pulse/Charts";
import { buildForecast, buildSeries } from "@/lib/pulse/data";
import { TrendingUp } from "lucide-react";

export const Route = createFileRoute("/risk-trends")({
  head: () => ({
    meta: [
      { title: "Tendinte Risc - PulseGuard AI" },
      { name: "description", content: "Tendinte ale semnalelor operationale si descompunere de risc pe ultimele 30 zile." },
      { property: "og:title", content: "Tendinte Risc - PulseGuard AI" },
      { property: "og:description", content: "Analiza operationala pe serii temporale." },
    ],
  }),
  component: RiskTrendsPage,
});

function RiskTrendsPage() {
  const series = buildSeries(30);
  const forecast = buildForecast(30, 14);
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><TrendingUp className="h-3 w-3" /> Tendinte Risc</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Tendinte semnale operationale</h1>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Volum de lucru si ore suplimentare (30 zile)</h2>
          <InputsChart data={series} />
        </div>
        <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
          <h2 className="text-sm font-semibold mb-2">Oboseala - Deficit - Interventie</h2>
          <MultiForecastChart data={forecast} />
        </div>
      </div>
    </AppShell>
  );
}

