import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import {
  Settings,
  Building2,
  BellDot,
  Shield,
  KeyRound,
  RadioTower,
  Palette,
  Save,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePulseStore } from "@/lib/pulse/app-state";
import {
  COORDINATORS,
  UNITS,
  useProfil,
  type Coordinator,
  type Theme,
  type Unit,
} from "@/lib/pulse/profile";
import type {
  AiProviderStatus,
  AlertSensitivity,
  TelemetrySimulationMode,
} from "@/lib/pulse/services";
import { toast } from "sonner";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Setari - PulseGuard AI" },
      {
        name: "description",
        content: "Configureaza spitalul, sectiile, notificarile si integrarile.",
      },
      { property: "og:title", content: "Setari - PulseGuard AI" },
      { property: "og:description", content: "Configurare spatiu de lucru." },
    ],
  }),
  component: SetariPage,
});

const sensitivityLabel: Record<AlertSensitivity, string> = {
  low: "Scazuta - doar critic",
  medium: "Medie - recomandat",
  high: "Ridicata - detectie timpurie",
};

const telemetryLabel: Record<TelemetrySimulationMode, string> = {
  normal: "Normal",
  busy: "Aglomerat",
  critical: "Critic",
};

const aiStatusLabel: Record<AiProviderStatus, string> = {
  online: "Online",
  degraded: "Degradat",
  offline: "Fallback local",
};

function SetariPage() {
  const { settings, updateSettings } = usePulseStore();
  const { unit, coordinator, theme, setUnit, setCoordinator, setTheme } = useProfil();

  const persist = (label: string) => {
    toast.success("Setari salvate", { description: label });
  };

  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
          <Settings className="h-3 w-3" /> Setari
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Setari spatiu de lucru</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Modificarile se aplica imediat in panou, telemetrie, alerte si rapoarte si sunt persistate
          local.
        </p>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <Panel icon={Building2} title="Organizatie si profil">
          <Field label="Nume organizatie">
            <input
              value={settings.organizationName}
              onChange={(event) => updateSettings({ organizationName: event.target.value })}
              onBlur={() => persist("Organizatia a fost actualizata")}
              className="h-10 rounded-lg border border-border/60 bg-secondary/40 px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
            />
          </Field>
          <Field label="Departament implicit">
            <Select
              value={unit}
              onValueChange={(value) => {
                setUnit(value as Unit);
                updateSettings({
                  selectedDepartment: value,
                  defaultDepartment: value,
                  organizationUnitName: value,
                });
                persist(value);
              }}
            >
              <SelectTrigger className="h-10 bg-secondary/40 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {UNITS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Coordonator">
            <Select
              value={coordinator}
              onValueChange={(value) => {
                setCoordinator(value as Coordinator);
                updateSettings({ selectedCoordinator: value, coordinatorName: value });
                persist(value);
              }}
            >
              <SelectTrigger className="h-10 bg-secondary/40 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {COORDINATORS.map((item) => (
                  <SelectItem key={item.name} value={item.name}>
                    {item.name} - {item.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Panel>

        <Panel icon={RadioTower} title="Telemetrie si ML">
          <Field label="Mod simulare telemetrie">
            <Select
              value={settings.telemetrySimulationMode}
              onValueChange={(value) => {
                updateSettings({ telemetrySimulationMode: value as TelemetrySimulationMode });
                persist(`Mod telemetrie: ${telemetryLabel[value as TelemetrySimulationMode]}`);
              }}
            >
              <SelectTrigger className="h-10 bg-secondary/40 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {(["normal", "busy", "critical"] as TelemetrySimulationMode[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {telemetryLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sensibilitate alerte">
            <Select
              value={settings.alertSensitivity}
              onValueChange={(value) => {
                updateSettings({ alertSensitivity: value as AlertSensitivity });
                persist(`Sensibilitate: ${sensitivityLabel[value as AlertSensitivity]}`);
              }}
            >
              <SelectTrigger className="h-10 bg-secondary/40 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {(["low", "medium", "high"] as AlertSensitivity[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {sensitivityLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status provider AI">
            <Select
              value={settings.aiProviderStatus}
              onValueChange={(value) => {
                updateSettings({ aiProviderStatus: value as AiProviderStatus });
                persist(`AI: ${aiStatusLabel[value as AiProviderStatus]}`);
              }}
            >
              <SelectTrigger className="h-10 bg-secondary/40 border-border/60">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="glass-strong border-border/60">
                {(["online", "degraded", "offline"] as AiProviderStatus[]).map((item) => (
                  <SelectItem key={item} value={item}>
                    {aiStatusLabel[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </Panel>

        <Panel icon={BellDot} title="Preferinte notificari">
          <ToggleRow
            label="Alerte email"
            checked={settings.notificationSetari.emailAlerts}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, emailAlerts: value },
              })
            }
          />
          <ToggleRow
            label="Push in aplicatie"
            checked={settings.notificationSetari.pushAlerts}
            onChange={(value) =>
              updateSettings({
                notificationSetari: {
                  ...settings.notificationSetari,
                  pushAlerts: value,
                  inAppAlerts: value,
                },
              })
            }
          />
          <ToggleRow
            label="Doar alerte critice"
            checked={settings.notificationSetari.criticalOnly}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, criticalOnly: value },
              })
            }
          />
          <ToggleRow
            label="Rezumat saptamanal"
            checked={settings.notificationSetari.weeklyDigest}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, weeklyDigest: value },
              })
            }
          />
        </Panel>

        <Panel icon={Shield} title="Confidentialitate si conformitate">
          <ToggleRow
            label="Afiseaza disclaimer operational"
            checked={settings.complianceDisclaimerEnabled}
            onChange={(value) => updateSettings({ complianceDisclaimerEnabled: value })}
          />
          <ToggleRow
            label="Confirmare confidentialitate"
            checked={settings.privacyAcknowledged}
            onChange={(value) => updateSettings({ privacyAcknowledged: value })}
          />
          <ToggleRow
            label="Reduce animatiile"
            checked={settings.reducedMotion}
            onChange={(value) => updateSettings({ reducedMotion: value })}
          />
          <p className="rounded-lg border border-border/60 bg-secondary/20 p-3 text-xs text-muted-foreground">
            PulseGuard AI este suport decizional operational pentru planificarea personalului, nu
            instrument de diagnostic medical.
          </p>
        </Panel>

        <Panel icon={Palette} title="Tema">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(["dark", "light", "system", "high-contrast"] as Theme[]).map((item) => (
              <button
                key={item}
                onClick={() => {
                  setTheme(item);
                  updateSettings({ selectedTheme: item, themePreference: item });
                  persist(`Tema: ${item}`);
                }}
                className={`rounded-lg border px-3 py-2 text-xs transition ${theme === item ? "border-[var(--cyan-glow)]/60 bg-[var(--cyan-glow)]/10 text-foreground" : "border-border/60 bg-secondary/40 text-muted-foreground hover:text-foreground"}`}
              >
                {item === "high-contrast" ? "contrast" : item}
              </button>
            ))}
          </div>
        </Panel>

        <Panel icon={KeyRound} title="Stare salvare">
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
            <Save className="mt-0.5 h-4 w-4 text-success" />
            <div>
              <div className="font-medium text-success">Persistenta locala activa</div>
              <p className="mt-1 text-xs text-muted-foreground">
                Setarile, profilul, scenariile, alertele, interventiile si rapoartele se
                rehidrateaza dupa refresh.
              </p>
            </div>
          </div>
        </Panel>
      </div>
    </AppShell>
  );
}

function Panel({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="glass luminous-border rounded-2xl p-5 animate-fade-up">
      <header className="mb-4 flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary/50 border border-border/60">
          <Icon className="h-4.5 w-4.5 text-[var(--cyan-glow)]" />
        </span>
        <h2 className="text-sm font-semibold">{title}</h2>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/25 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
