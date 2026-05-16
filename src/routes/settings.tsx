import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { Settings, Building2, BellDot, Shield, KeyRound } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Setari — PulseGuard AI" },
      { name: "description", content: "Configure your hospital, units, notifications, and integrations." },
      { property: "og:title", content: "Setari — PulseGuard AI" },
      { property: "og:description", content: "Workspace configuration." },
    ],
  }),
  component: SetariPage,
});

const groups = [
  { icon: Building2, title: "Organization", desc: "St. Mary Health · 1,820 staff · 24 units", action: "Manage" },
  { icon: BellDot, title: "Notification preferences", desc: "Email, SMS and in-app alerts per severity.", action: "Configure" },
  { icon: Shield, title: "Privacy & compliance", desc: "HIPAA, SOC 2 audit log, retention policy.", action: "Review" },
  { icon: KeyRound, title: "Integrations & API keys", desc: "Connect EHR, scheduling, or BI tools.", action: "Connect" },
];

function SetariPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2"><Settings className="h-3 w-3" /> Setari</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Workspace settings</h1>
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

