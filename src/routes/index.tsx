import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { KpiCard } from "@/components/pulse/KpiCard";
import { GenAIScenarioGenerator } from "@/components/pulse/GenAIScenarioGenerator";
import { ReportPanel } from "@/components/pulse/ReportPanel";
import { buildSeries } from "@/lib/pulse/data";
import { useProfil } from "@/lib/pulse/profile";
import { useActiveScenario } from "@/lib/pulse/scenario-context";
import { Flame, HeartPulse, Users, Siren } from "lucide-react";
import { useEffect, useState } from "react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Prezentare - PulseGuard AI" },
      { name: "description", content: "Sumar operational: risc live de epuizare, prognoza pe 14 zile, asistent AI si raport de interventie generat." },
      { property: "og:title", content: "Prezentare - PulseGuard AI" },
      { property: "og:description", content: "Centru de comanda pentru presiunea operationala si riscul de epuizare din spital." },
    ],
  }),
  component: Prezentare,
});

function Prezentare() {
  const series = buildSeries(30);
  const { coordinator, unit } = useProfil();
  const { active } = useActiveScenario();
  const firstName = coordinator.replace(/^(Dr\.|Nurse Lead|Operations Manager)\s+/i, "").split(" ")[0];
  const [greeting, setGreeting] = useState("Buna");
  useEffect(() => {
    const h = new Date().getHours();
    setGreeting(h < 5 ? "Noapte buna" : h < 12 ? "Buna dimineata" : h < 18 ? "Buna ziua" : "Buna seara");
  }, []);

  const k = {
    current: active?.riskScore ?? 63,
    predicted: active?.predicted14d ?? 78,
    pressure: active?.staffPressure ?? 71,
    urgency: active?.interventionUrgency ?? 58,
    cDelta: active ? +(active.riskScore - 60).toFixed(1) : 4.2,
    pDelta: active ? +(active.predicted14d - active.riskScore).toFixed(1) : 6.1,
  };
  const tone = (v: number) => (v >= 70 ? "danger" : v >= 50 ? "warning" : "success") as "danger" | "warning" | "success";

  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rezumat operational</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">{greeting}, {firstName}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {active
            ? <>Scenariu activ: <span className="text-foreground font-medium">{active.name}</span> - {active.department}</>
            : <>Monitorizare {unit} - 512 angajati - 28 semnale live.</>}
        </p>
      </header>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Risc curent epuizare" value={k.current} unit="/ 100" delta={k.cDelta} trend={k.cDelta >= 0 ? "up" : "down"} tone={tone(k.current)} highRisk={k.current >= 70} icon={Flame}
          spark={series.map((s) => s.stressScore * 10)} />
        <KpiCard label="Risc estimat 14 zile" value={k.predicted} unit="/ 100" delta={k.pDelta} trend={k.pDelta >= 0 ? "up" : "down"} tone={tone(k.predicted)} highRisk={k.predicted >= 70} icon={HeartPulse}
          spark={series.map((s) => s.workload)} />
        <KpiCard label="Indice presiune personal" value={k.pressure} unit="/ 100" delta={2.8} trend="up" tone={tone(k.pressure)} icon={Users}
          spark={series.map((s) => s.patientRatio * 14)} />
        <KpiCard label="Urgenta interventie" value={k.urgency} unit="/ 100" delta={-1.4} trend="down" tone={tone(k.urgency)} icon={Siren}
          spark={series.map((s) => s.incidents * 18 + 30)} />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-5 mb-6">
        <div className="glass luminous-border rounded-2xl p-5 animate-fade-up">
          <GenAIScenarioGenerator />
        </div>
        <ReportPanel />
      </section>
    </AppShell>
  );
}


