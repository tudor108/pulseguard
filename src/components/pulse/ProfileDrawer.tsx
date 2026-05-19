import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useProfil, getCoordinator, UNITS, COORDINATORS, type Theme } from "@/lib/pulse/profile";
import {
  Bell,
  Camera,
  FileText,
  LogOut,
  Mail,
  Phone,
  Shield,
  Stethoscope,
  Sun,
  Moon,
  Monitor,
  Contrast,
  Pencil,
  Globe,
  Activity,
  KeyRound,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { usePulseStore } from "@/lib/pulse/app-state";

const themeIcons = { light: Sun, dark: Moon, system: Monitor, "high-contrast": Contrast } as const;
const themeLabels: Record<Theme, string> = {
  light: "Luminos",
  dark: "Intunecat",
  system: "Sistem",
  "high-contrast": "Contrast ridicat",
};

export function ProfilDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { coordinator, unit, theme, setTheme, setUnit, setCoordinator } = useProfil();
  const { settings, updateSettings } = usePulseStore();
  const c = getCoordinator(coordinator);
  const [editing, setEditing] = useState(false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="glass-strong border-l border-border/60 w-full sm:max-w-md overflow-y-auto scrollbar-thin p-0"
      >
        <div className="relative p-6 border-b border-border/40 bg-gradient-to-br from-[var(--cyan-glow)]/10 to-[var(--indigo-glow)]/10">
          <SheetHeader className="space-y-0">
            <SheetTitle className="text-base font-semibold">Profil</SheetTitle>
            <SheetDescription className="text-xs">
              Profil, preferinte si activitate
            </SheetDescription>
          </SheetHeader>
          <div className="mt-5 flex items-center gap-4">
            <div className="relative group shrink-0">
              <img
                key={c.name}
                src={c.avatar}
                alt={c.name}
                width={96}
                height={96}
                className="avatar-swap h-24 w-24 rounded-full object-cover object-center ring-2 ring-[var(--cyan-glow)]/50 shadow-[0_0_30px_-8px_oklch(0.78_0.18_210/0.55)]"
              />
              <button
                onClick={() =>
                  toast.info("Incarcarea va fi disponibila curand", {
                    description: "Incarcarea pozei de profil este simulata in demo.",
                  })
                }
                className="absolute -bottom-1 -right-1 grid h-7 w-7 place-items-center rounded-full bg-background border border-border/60 text-foreground hover:bg-secondary transition"
                aria-label="Schimba poza de profil"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="min-w-0">
              <div className="text-base font-semibold truncate">{c.name}</div>
              <div className="text-xs text-muted-foreground truncate">{c.role}</div>
              <div className="mt-1 text-[11px] text-[var(--cyan-glow)] inline-flex items-center gap-1">
                <Stethoscope className="h-3 w-3" /> {c.unit}
              </div>
            </div>
            <button
              onClick={() => {
                setEditing((e) => !e);
                toast.success(editing ? "Modificarile au fost salvate" : "Editezi profilul");
              }}
              className="ml-auto inline-flex items-center gap-1 rounded-lg border border-border/60 bg-background/40 px-2.5 py-1.5 text-[11px] font-medium hover:bg-secondary/60 transition"
            >
              <Pencil className="h-3 w-3" /> {editing ? "Salveaza" : "Editeaza"}
            </button>
          </div>
        </div>

        <Section title="Contact">
          <Row icon={Mail} label="Email" value={c.email} />
          <Row icon={Phone} label="Telefon" value={c.phone} />
          <Row icon={Globe} label="Fus orar" value={c.timezone} />
        </Section>

        <Section title="Spatiu de lucru">
          <div className="grid grid-cols-1 gap-2">
            <label className="text-[11px] text-muted-foreground">Unitate medicala</label>
            <select
              value={unit}
              onChange={(e) => {
                setUnit(e.target.value as (typeof UNITS)[number]);
                toast.success("Unitatea a fost actualizata");
              }}
              className="h-9 rounded-lg border border-border/60 bg-background/40 px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/60 outline-none"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
            <label className="text-[11px] text-muted-foreground mt-2">Coordonator</label>
            <select
              value={coordinator}
              onChange={(e) => {
                setCoordinator(e.target.value as (typeof COORDINATORS)[number]["name"]);
                toast.success("Coordonator actualizat");
              }}
              className="h-9 rounded-lg border border-border/60 bg-background/40 px-2 text-sm focus-visible:ring-2 focus-visible:ring-ring/60 outline-none"
            >
              {COORDINATORS.map((co) => (
                <option key={co.name} value={co.name}>
                  {co.name} - {co.role}
                </option>
              ))}
            </select>
          </div>
        </Section>

        <Section title="Preferinte notificari">
          <Toggle
            label="Alerte critice de epuizare"
            checked={settings.notificationSetari.criticalOnly}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, criticalOnly: value },
              })
            }
          />
          <Toggle
            label="Rezumat zilnic de prognoza"
            checked={settings.notificationSetari.emailAlerts}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, emailAlerts: value },
              })
            }
          />
          <Toggle
            label="Finalizare scenariu"
            checked={Boolean(settings.notificationSetari.inAppAlerts)}
            onChange={(value) =>
              updateSettings({
                notificationSetari: {
                  ...settings.notificationSetari,
                  inAppAlerts: value,
                  pushAlerts: value,
                },
              })
            }
          />
          <Toggle
            label="Raport saptamanal pentru conducere"
            checked={settings.notificationSetari.weeklyDigest}
            onChange={(value) =>
              updateSettings({
                notificationSetari: { ...settings.notificationSetari, weeklyDigest: value },
              })
            }
          />
        </Section>

        <Section title="Preferinte prognoza">
          <Row icon={Activity} label="Orizont implicit" value="14 zile" />
          <Row icon={Activity} label="Prag de incredere" value=">= 0.80" />
          <Row icon={Activity} label="Reprognosticare automata" value="La fiecare 72h" />
        </Section>

        <Section title="Activitate recenta">
          <ActivityRow text="A rulat prognoza pe 14 zile pentru ATI" time="acum 12 min" />
          <ActivityRow text="A aplicat scenariul 'Reducere ore suplimentare'" time="acum 2 h" />
          <ActivityRow text="A exportat PDF-ul de prognoza risc epuizare" time="Ieri" />
          <ActivityRow text="A revizuit alertele din UPU" time="Ieri" />
        </Section>

        <Section title="Rapoarte recente">
          <ReportRow title="Supraincarcare tura de noapte ATI" date="Astazi" />
          <ReportRow title="Presiune ore suplimentare UPU" date="Ieri" />
          <ReportRow title="Buffer de recuperare sectia Chirurgie" date="Acum 3 zile" />
        </Section>

        <Section title="Tema">
          <div className="grid grid-cols-2 gap-2">
            {(["light", "dark", "system", "high-contrast"] as Theme[]).map((t) => {
              const Icon = themeIcons[t];
              const active = theme === t;
              return (
                <button
                  key={t}
                  onClick={() => {
                    setTheme(t);
                    toast.success("Tema actualizata", { description: themeLabels[t] });
                  }}
                  className={
                    "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition " +
                    (active
                      ? "border-[var(--cyan-glow)]/60 bg-[var(--cyan-glow)]/10 text-foreground"
                      : "border-border/60 bg-background/30 text-muted-foreground hover:text-foreground hover:bg-secondary/40")
                  }
                >
                  <Icon className="h-3.5 w-3.5" /> {themeLabels[t]}
                </button>
              );
            })}
          </div>
        </Section>

        <Section title="Securitate cont">
          <Row icon={Shield} label="Autentificare in doi pasi" value="Activata" />
          <Row icon={KeyRound} label="Ultima schimbare parola" value="acum 42 zile" />
          <Row icon={Bell} label="Sesiuni active" value="2 dispozitive" />
        </Section>

        <div className="p-4 border-t border-border/40">
          <button
            onClick={() => {
              onOpenChange(false);
              toast("Deconectat", { description: "Ai fost deconectat din PulseGuard AI." });
            }}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-danger/15 text-danger px-3 py-2.5 text-sm font-semibold hover:bg-danger/25 transition"
          >
            <LogOut className="h-4 w-4" /> Deconectare
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-5 border-b border-border/40 animate-fade-up">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
        {title}
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary/30 px-3 py-2">
      <Icon className="h-3.5 w-3.5 text-[var(--cyan-glow)]" />
      <div className="flex-1 min-w-0">
        <div className="text-[11px] text-muted-foreground">{label}</div>
        <div className="text-xs font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <button
      onClick={() => {
        onChange(!checked);
        toast.success(`${label} ${!checked ? "activata" : "dezactivata"}`);
      }}
      className="w-full flex items-center justify-between rounded-lg bg-secondary/30 px-3 py-2.5 text-xs hover:bg-secondary/50 transition"
    >
      <span>{label}</span>
      <span
        className={
          "relative inline-flex h-5 w-9 rounded-full transition " +
          (checked ? "bg-[var(--cyan-glow)]/80" : "bg-muted")
        }
      >
        <span
          className={
            "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all " +
            (checked ? "left-4" : "left-0.5")
          }
        />
      </span>
    </button>
  );
}

function ActivityRow({ text, time }: { text: string; time: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-secondary/20 px-3 py-2">
      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[var(--cyan-glow)]" />
      <div className="flex-1 min-w-0">
        <div className="text-xs">{text}</div>
        <div className="text-[10px] text-muted-foreground">{time}</div>
      </div>
    </div>
  );
}

function ReportRow({ title, date }: { title: string; date: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-secondary/20 px-3 py-2 hover:bg-secondary/40 transition cursor-pointer">
      <FileText className="h-3.5 w-3.5 text-[var(--indigo-glow)]" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium truncate">{title}</div>
        <div className="text-[10px] text-muted-foreground">{date}</div>
      </div>
    </div>
  );
}
