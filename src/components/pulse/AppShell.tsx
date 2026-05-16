import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, ChevronDown,
  Wand2, FileText, Library, Users, TrendingUp, ClipboardList, Settings,
  UserCircle, Building2, Stethoscope, Sun, Moon, Monitor, BellDot, Shield, LogOut,
  PanelLeftClose, PanelLeft, AlertOctagon, FlaskConical, ScanLine,
  Contrast, SlidersHorizontal, Check, Circle, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger,
  DropdownMenuSubContent, DropdownMenuPortal,
} from "@/components/ui/dropdown-menu";
import { Particles } from "./Particles";
import { useProfil, UNITS, COORDINATORS, getCoordinator, type Theme, type Unit, type Coordinator } from "@/lib/pulse/profile";
import { toast } from "sonner";
import { ActionBar } from "./ActionBar";
import { ProfilDrawer } from "./ProfileDrawer";
import { useActiveScenario } from "@/lib/pulse/scenario-context";

const topNav = [
  { to: "/", label: "Panou", icon: LayoutDashboard },
  { to: "/forecast", label: "Prognoza AI", icon: ScanLine },
  { to: "/simulator", label: "Simulator Scenarii", icon: FlaskConical },
  { to: "/alerts", label: "Alerte Epuizare", icon: AlertOctagon },
  { to: "/reports", label: "Rapoarte", icon: FileText },
];

const sideNav = [
  { to: "/", label: "Prezentare", icon: LayoutDashboard },
  { to: "/generator", label: "Generator Scenarii GenAI", icon: Wand2 },
  { to: "/forecast-report", label: "Raport Prognoza", icon: FileText },
  { to: "/examples", label: "Exemple Pregenerate", icon: Library },
  { to: "/staff-load", label: "Incarcare Personal", icon: Users },
  { to: "/risk-trends", label: "Tendinte Risc", icon: TrendingUp },
  { to: "/intervention-planner", label: "Planificator Interventii", icon: ClipboardList },
  { to: "/settings", label: "Setari", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="relative min-h-screen text-foreground">
      <div className="aurora-bg" />
      <div className="orbs-bg" aria-hidden>
        <span className="orb-emerald" />
        <span className="orb-cyan" />
      </div>
      <Particles />
      <div className="pointer-events-none fixed inset-0 -z-10 grid-bg" />

      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/55 backdrop-blur-xl">
        <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 lg:px-6 h-16 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60 rounded-lg">
            <div className="relative h-9 w-9 rounded-xl bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] grid place-items-center ring-glow">
              <PulseIcon />
              <span className="absolute -inset-px rounded-xl border border-white/20" />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="text-sm font-semibold tracking-tight">PulseGuard</div>
              <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">AI</div>
            </div>
          </Link>

          <nav aria-label="Primary" className="hidden lg:flex items-center gap-1 ml-4">
            {topNav.map((n) => {
              const active = pathname === n.to;
              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={cn(
                    "group relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all",
                    active
                      ? "text-foreground bg-secondary/60 shadow-[0_0_24px_-8px_oklch(0.78_0.18_210/0.55)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/40 hover:shadow-[0_0_24px_-12px_oklch(0.78_0.18_210/0.55)]"
                  )}
                >
                  <n.icon className={cn("h-4 w-4 transition-transform group-hover:scale-110", active && "text-[var(--cyan-glow)]")} />
                  {n.label}
                  <span className={cn(
                    "pointer-events-none absolute -bottom-0.5 left-3 right-3 h-0.5 rounded-full bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] origin-left transition-transform duration-300",
                    active ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                  )} />
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2 ml-auto min-w-0">
            <ActionBar />
            <ProfilMenu />
          </div>
        </div>
        <ContextStrip />
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={cn(
            "flex sticky top-16 self-start h-[calc(100vh-4rem)] shrink-0 flex-col gap-2 border-r border-border/60 bg-sidebar/55 backdrop-blur-xl py-4 transition-[width] duration-300",
            collapsed ? "w-[68px] px-2" : "w-64 px-3"
          )}
          aria-label="Secondary"
        >
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="self-end grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition"
            aria-label={collapsed ? "Extinde meniul lateral" : "Restrange meniul lateral"}
          >
            {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>

          <nav className="flex flex-col gap-0.5 mt-1">
            {sideNav.map((item) => {
              const active = pathname === item.to;
              const Icon = item.icon;
              const isAlerts = item.to === "/alerts";
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-lg px-2.5 py-2.5 text-sm transition-all",
                    active
                      ? "bg-sidebar-accent text-foreground shadow-[inset_0_0_0_1px_oklch(0.78_0.18_210/0.25),0_0_22px_-10px_oklch(0.78_0.18_210/0.55)]"
                      : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 hover:translate-x-0.5",
                    collapsed && "justify-center"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-0.5 rounded-full bg-gradient-to-b from-[var(--cyan-glow)] to-[var(--indigo-glow)]" />}
                  <Icon className={cn(
                    "h-4 w-4 shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:-rotate-3",
                    active && "text-[var(--cyan-glow)]"
                  )} />
                  {!collapsed && <span className="font-medium truncate">{item.label}</span>}
                  {!collapsed && isAlerts && (
                    <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-danger/15 px-1.5 py-0.5 text-[10px] font-semibold text-danger">
                      <span className="h-1.5 w-1.5 rounded-full bg-danger animate-pulse-soft" />
                      3
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {!collapsed && (
            <div className="mt-auto rounded-xl glass p-3.5 luminous-border">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Shield className="h-3.5 w-3.5 text-[var(--cyan-glow)]" />
                HIPAA-aware - SOC 2
              </div>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground/90">
                Suport decizional operational. Nu este un instrument de diagnostic medical.
              </p>
            </div>
          )}
        </aside>

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-[1600px] mx-auto w-full">
          <div key={pathname} className="animate-fade-up">
            {children}
          </div>
        </main>
      </div>

    </div>
  );
}

function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-background">
      <path d="M2 12h4l2-6 4 12 3-8 2 4h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <animate attributeName="stroke-dasharray" values="0 60; 60 0" dur="2.4s" repeatCount="indefinite" />
      </path>
    </svg>
  );
}

function ProfilMenu() {
  const { unit, coordinator, theme, setUnit, setCoordinator, setTheme } = useProfil();
  const coord = getCoordinator(coordinator);
  const [profileOpen, setProfileOpen] = useState(false);

  const themeLabel: Record<Theme, string> = {
    light: "Mod Luminos",
    dark: "Mod Intunecat",
    system: "Tema Sistem",
    "high-contrast": "Mod Contrast Ridicat",
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="group flex items-center gap-2 rounded-full pl-1 pr-2 py-1 hover:bg-secondary/50 transition focus:outline-none focus:ring-2 focus:ring-ring/50" aria-label="Deschide meniul de profil">
        <span className="relative grid h-10 w-10 shrink-0 place-items-center rounded-full ring-2 ring-background/60 transition-all duration-300 group-hover:ring-[var(--cyan-glow)]/80 group-hover:shadow-[0_0_22px_-2px_oklch(0.78_0.18_210/0.75)]">
          <img
            key={coord.name}
            src={coord.avatar}
            alt={coord.name}
            width={40}
            height={40}
            loading="lazy"
            className="avatar-swap h-full w-full rounded-full object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
          <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-success ring-2 ring-background animate-pulse-soft" aria-label="Online" />
          <span className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-inset ring-white/10" />
        </span>
        <div className="hidden xl:block leading-tight text-left max-w-[150px]">
          <div className="text-xs font-semibold truncate">{coord.name}</div>
          <div className="text-[10px] text-muted-foreground truncate">{coord.role}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={10}
        collisionPadding={12}
        className="w-72 glass-strong border-border/60 p-1.5 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-top-2"
      >
        <DropdownMenuLabel className="flex items-center gap-3 py-2.5 px-2">
          <span className="relative">
            <img key={coord.name} src={coord.avatar} alt="" width={48} height={48} className="avatar-swap h-12 w-12 rounded-full object-cover object-center ring-2 ring-[var(--cyan-glow)]/40" />
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold truncate">{coord.name}</div>
            <div className="text-[11px] text-muted-foreground font-normal truncate">{coord.role}</div>
            <div className="text-[10px] text-[var(--cyan-glow)] font-medium truncate mt-0.5 flex items-center gap-1">
              <Building2 className="h-2.5 w-2.5" /> {unit} - planificare personal
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setProfileOpen(true); }} className="gap-2 cursor-pointer"><UserCircle className="h-4 w-4 text-muted-foreground" /> Profil</DropdownMenuItem>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Schimba Unitatea Medicala
            <span className="ml-auto text-[10px] text-muted-foreground truncate max-w-[110px]">{unit}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="glass-strong border-border/60 w-60 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-2">
              {UNITS.map((u) => (
                <DropdownMenuItem
                  key={u}
                  onSelect={() => { setUnit(u as Unit); toast.success("Unitatea medicala a fost actualizata", { description: u }); }}
                  className="gap-2 cursor-pointer"
                >
                  {u === unit ? <Check className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  <span>{u}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            <Stethoscope className="h-4 w-4 text-muted-foreground" /> Schimba Doctorul / Coordonatorul
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="glass-strong border-border/60 w-72 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-2">
              {COORDINATORS.map((c) => (
                <DropdownMenuItem
                  key={c.name}
                  onSelect={() => { setCoordinator(c.name as Coordinator); toast.success("Coordonator actualizat", { description: c.name }); }}
                  className="gap-2 cursor-pointer py-2"
                >
                  {c.name === coordinator ? <Check className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />}
                  <div className="leading-tight">
                    <div className="text-sm">{c.name}</div>
                    <div className="text-[10px] text-muted-foreground">{c.role}</div>
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2">
            {theme === "light" ? <Sun className="h-4 w-4 text-muted-foreground" /> :
             theme === "dark" ? <Moon className="h-4 w-4 text-muted-foreground" /> :
             theme === "high-contrast" ? <Contrast className="h-4 w-4 text-muted-foreground" /> :
             <Monitor className="h-4 w-4 text-muted-foreground" />}
            Tema
            <span className="ml-auto text-[10px] text-muted-foreground">{themeLabel[theme]}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent className="glass-strong border-border/60 w-56 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-2">
              {([
                { id: "light", label: "Mod Luminos", Icon: Sun },
                { id: "dark", label: "Mod Intunecat", Icon: Moon },
                { id: "system", label: "Tema Sistem", Icon: Monitor },
                { id: "high-contrast", label: "Mod Contrast Ridicat", Icon: Contrast },
              ] as const).map(({ id, label, Icon }) => (
                <DropdownMenuItem
                  key={id}
                  onSelect={() => { setTheme(id); toast.success("Tema actualizata", { description: label }); }}
                  className="gap-2 cursor-pointer"
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span>{label}</span>
                  {theme === id && <Check className="ml-auto h-3.5 w-3.5 text-[var(--cyan-glow)]" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>

        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setProfileOpen(true); }} className="gap-2 cursor-pointer"><BellDot className="h-4 w-4 text-muted-foreground" /> Setari Notificari</DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setProfileOpen(true); }} className="gap-2 cursor-pointer"><SlidersHorizontal className="h-4 w-4 text-muted-foreground" /> Preferinte Prognoza</DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); setProfileOpen(true); }} className="gap-2 cursor-pointer"><Settings className="h-4 w-4 text-muted-foreground" /> Setari Cont</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => toast("Deconectat", { description: "Ai fost deconectat din PulseGuard AI." })}
          className="gap-2 cursor-pointer text-danger focus:text-danger"
        >
          <LogOut className="h-4 w-4" /> Deconectare
        </DropdownMenuItem>
      </DropdownMenuContent>
      <ProfilDrawer open={profileOpen} onOpenChange={setProfileOpen} />
    </DropdownMenu>
  );
}

function ContextStrip() {
  const { unit, coordinator } = useProfil();
  const coord = COORDINATORS.find((c) => c.name === coordinator) ?? COORDINATORS[0];
  const { active, setActive } = useActiveScenario();
  return (
    <div className="hidden md:flex items-center gap-2 px-4 lg:px-6 h-9 border-t border-border/40 bg-background/30 text-[11px] text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 px-2 py-0.5">
        <Building2 className="h-3 w-3 text-[var(--cyan-glow)]" />
        <span className="text-foreground/90 font-medium">{unit}</span>
      </span>
      <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/40 px-2 py-0.5">
        <Stethoscope className="h-3 w-3 text-[var(--indigo-glow)]" />
        <span className="text-foreground/90 font-medium">{coord.name}</span>
          <span className="text-muted-foreground">- {coord.role}</span>
      </span>
      {active && (
        <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--cyan-glow)]/40 bg-[var(--cyan-glow)]/10 px-2 py-0.5 animate-fade-up">
          <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" />
          <span className="text-foreground/90 font-medium truncate max-w-[280px]">Scenariu Activ: {active.name}</span>
          <span className="text-muted-foreground hidden lg:inline">- {active.riskLevel} - {active.riskScore}/100</span>
          <button onClick={() => setActive(null)} className="ml-1 text-muted-foreground hover:text-foreground transition" aria-label="Sterge scenariul activ">x</button>
        </span>
      )}
      <span className="ml-auto inline-flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse-soft" />
        Flux live de semnale - sincronizat
      </span>
    </div>
  );
}


