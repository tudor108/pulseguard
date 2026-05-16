import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { Settings, Building2, BellDot, Shield, KeyRound } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Setari - PulseGuard AI" },
      { name: "description", content: "Configureaza spitalul, sectiile, notificarile si integrarile." },
      { property: "og:title", content: "Setari - PulseGuard AI" },
      { property: "og:description", content: "Configurare spatiu de lucru." },
    ],
  }),
  component: SetariPage,
});

const groups = [
  { icon: Building2, title: "Organizatie", desc: "St. Mary Health - 1,820 angajati - 24 unitati", action: "Administreaza" },
  { icon: BellDot, title: "Preferinte notificari", desc: "Email, SMS si alerte in aplicatie dupa severitate.", action: "Configureaza" },
  { icon: Shield, title: "Confidentialitate si conformitate", desc: "HIPAA, SOC 2, jurnal audit si politica retentie.", action: "Revizuieste" },
  { icon: KeyRound, title: "Integrari si chei API", desc: "Conecteaza EHR, planificare sau instrumente BI.", action: "Conecteaza" },
];

function SetariPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><Settings className="h-3 w-3" /> Setari</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Setari spatiu de lucru</h1>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {groups.map((g, i) => (
          <div key={g.title} className="glass luminous-border rounded-2xl p-5 flex items-start gap-4 animate-fade-up" style={{ animationDelay: `${i * 40}ms` }}>
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-secondary/50 border border-border/60">
              <g.icon className="h-4.5 w-4.5 text-[var(--cyan-glow)]" />
            </div>
            <div className="flex-1">
              <h2 className="text-sm font-semibold">{g.title}</h2>
              <p className="text-xs text-muted-foreground">{g.desc}</p>
            </div>
            <button className="rounded-md border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs hover:bg-secondary/70 transition">{g.action}</button>
          </div>
        ))}
      </div>
    </AppShell>
  );
}

