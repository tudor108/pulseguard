import { useEffect, useState } from "react";
import { Play, GitCompareArrows, BellRing, FileDown, Loader2, CheckCircle2, X, AlertOctagon, ArrowUpRight, Activity, LineChart, Wand2, Clock, Building2, Eye, ShieldAlert, UserPlus, TimerReset, Users, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { exportForecastPdf } from "@/lib/pulse/export-pdf";
import { useProfile } from "@/lib/pulse/profile";

type RunState = "idle" | "loading" | "success";

type AlertSeverity = "critical" | "warning" | "info";
type AlertCard = {
  id: string;
  severity: AlertSeverity;
  title: string;
  detail: string;
  unit: string;
  driver: string;
  time: string;
};

const CRITICAL_ALERTS: AlertCard[] = [
  { id: "c-1", severity: "critical", title: "Riscul turei de noapte ATI a crescut cu 18%", detail: "Indicele de epuizare pe ultimele 7 zile a intrat in zona critica pe rotatia de noapte.", unit: "Unitate Terapie Intensiva", driver: "Ture de noapte grupate", time: "acum 12 min" },
  { id: "c-2", severity: "critical", title: "Orele suplimentare din UPU au trecut pragul", detail: "Media este 11.4 ore pe persoana pe saptamana fata de tinta sigura de 8 ore.", unit: "Departament Urgente", driver: "Ore suplimentare", time: "acum 38 min" },
  { id: "c-3", severity: "critical", title: "Chirurgia are 3 ture consecutive subdimensionate", detail: "Raportul pacienti personal a ajuns la 1:7 in ultimele 3 rotatii de noapte.", unit: "Sectie Chirurgie", driver: "Raport pacienti/personal", time: "acum 1 h" },
];

const WATCHLIST_ALERTS: AlertCard[] = [
  { id: "w-1", severity: "warning", title: "Presiunea sezoniera in Pediatrie este in crestere", detail: "Modelul estimeaza +22% internari in urmatoarele 14 zile.", unit: "Pediatrie", driver: "Internari sezoniere", time: "acum 2 h" },
  { id: "w-2", severity: "warning", title: "Oncologia are timp de recuperare sub tinta", detail: "Recuperarea medie intre ture a scazut la 9.2 ore fata de tinta de 11 ore.", unit: "Oncologie", driver: "Recuperare intre ture", time: "acum 3 h" },
  { id: "w-3", severity: "warning", title: "Rezerva de personal pentru weekend este sub tinta", detail: "Acoperirea cu personal de rezerva este 62% fata de tinta operationala de 80%.", unit: "Multi-sectie", driver: "Acoperire rezerva", time: "acum 5 h" },
];

const RECOMMENDED_ACTIONS = [
  { id: "ra-1", icon: UserPlus,    title: "Adauga acoperire temporara pe tura de noapte", detail: "Muta 2 asistenti din rezerva in rotatia de noapte ATI pentru 7 zile." },
  { id: "ra-2", icon: TimerReset,  title: "Redu orele suplimentare pentru personalul expus", detail: "Limiteaza orele suplimentare la 8 ore pe saptamana pentru asistentele UPU peste prag." },
  { id: "ra-3", icon: Users,       title: "Redistribuie personalul senior pe turele cu presiune mare", detail: "Reechilibreaza acoperirea seniorilor in ferestrele de noapte ATI, UPU si Chirurgie." },
  { id: "ra-4", icon: RefreshCw,   title: "Reevalueaza riscul peste 72 de ore",                       detail: "Programeaza o reprognoza automata si o revizuire operativa in 72h." },
];

const SCENARIOS = [
  { metric: "Risc mediu epuizare 14 zile", current: "78%", recommended: "54%", delta: "-24 pct" },
  { metric: "Acoperire tura de noapte", current: "82%", recommended: "96%", delta: "+14 pct" },
  { metric: "Ore suplimentare pe persoana", current: "11.4h", recommended: "7.2h", delta: "-4.2h" },
  { metric: "Indice oboseala", current: "0.71", recommended: "0.48", delta: "-0.23" },
  { metric: "Urgenta interventie", current: "Ridicat", recommended: "Moderat", delta: "scade un nivel" },
];

export function ActionBar() {
  const [compareOpen, setCompareOpen] = useState(false);
  const [alertsOpen, setAlertsOpen] = useState(false);
  const [runState, setRunState] = useState<RunState>("idle");
  const [exportState, setExportState] = useState<RunState>("idle");
  const [critical, setCritical] = useState<AlertCard[]>(CRITICAL_ALERTS);
  const [watchlist, setWatchlist] = useState<AlertCard[]>(WATCHLIST_ALERTS);
  const { unit, coordinator } = useProfile();

  // Allow any "notification bell" elsewhere to open the drawer.
  useEffect(() => {
    const open = () => setAlertsOpen(true);
    window.addEventListener("pulseguard:open-alerts", open);
    return () => window.removeEventListener("pulseguard:open-alerts", open);
  }, []);

  const totalAlerts = critical.length + watchlist.length;

  const dismissAlert = (id: string, scope: "critical" | "watchlist") => {
    if (scope === "critical") setCritical((xs) => xs.filter((a) => a.id !== id));
    else setWatchlist((xs) => xs.filter((a) => a.id !== id));
    toast.success("Alerta eliminata", { description: "Eliminata din lista activa de monitorizare." });
  };

  const runForecast = () => {
    if (runState === "loading") return;
    setRunState("loading");
    toast.loading("Se calculeaza prognoza de epuizare pe 14 zile...", { id: "run-forecast" });
    window.dispatchEvent(new CustomEvent("pulseguard:run-forecast"));
    setTimeout(() => {
      setRunState("success");
      toast.success("Prognoza generata", { id: "run-forecast", description: "Proiectia de risc pe 14 zile si planul de interventie au fost actualizate." });
      setTimeout(() => setRunState("idle"), 1600);
    }, 2900);
  };

  const exportReport = async () => {
    if (exportState === "loading") return;
    setExportState("loading");
    try {
      await exportForecastPdf({ unit, coordinator, riskScore: 78, riskLevel: "Ridicat" });
      setExportState("success");
    } catch {
      toast.error("Export esuat", { description: "Nu s-a putut genera PDF-ul." });
      setExportState("idle");
      return;
    }
    setTimeout(() => setExportState("idle"), 1800);
  };
  return (
    <>
      {/* Ruleaza Prognoza - primary glow */}
      <button
        onClick={runForecast}
        disabled={runState === "loading"}
        className={cn(
          "btn-glow inline-flex items-center gap-1.5 rounded-lg px-3 lg:px-3.5 py-2 text-xs font-semibold text-background ring-glow active:scale-[0.97] transition whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          runState === "success"
            ? "bg-gradient-to-r from-success to-[var(--cyan-glow)]"
            : "bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)]",
          runState === "loading" && "opacity-90 cursor-wait"
        )}
        aria-label="Ruleaza prognoza"
      >
        {runState === "loading" ? (
          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Se calculeaza...</>
        ) : runState === "success" ? (
          <><CheckCircle2 className="h-3.5 w-3.5" /> Prognoza Gata</>
        ) : (
          <><Play className="h-3.5 w-3.5 fill-current" /> Ruleaza Prognoza</>
        )}
      </button>

      {/* Compara Scenarii - outline */}
      <button
        onClick={() => setCompareOpen(true)}
        className="hidden lg:inline-flex items-center gap-1.5 rounded-lg border border-[var(--cyan-glow)]/40 bg-background/30 px-2.5 xl:px-3 py-2 text-xs font-medium text-foreground whitespace-nowrap hover:bg-[var(--cyan-glow)]/10 hover:border-[var(--cyan-glow)]/70 active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label="Compara scenarii"
        title="Compara Scenarii"
      >
        <GitCompareArrows className="h-3.5 w-3.5 text-[var(--cyan-glow)]" />
        <span className="hidden xl:inline">Compara Scenarii</span>
        <span className="xl:hidden">Compara</span>
      </button>

      {/* Centru alerte */}
      <button
        onClick={() => setAlertsOpen(true)}
        className="relative grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border/60 bg-secondary/40 hover:bg-secondary/70 hover:border-[var(--cyan-glow)]/60 active:scale-[0.95] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        aria-label={`${totalAlerts} alerte active de epuizare`}
      >
        <BellRing className="h-4 w-4" />
        <span className="absolute top-1 right-1 grid place-items-center h-4 w-4 rounded-full bg-danger text-[9px] font-bold text-background ring-2 ring-background/80">
          {totalAlerts}
        </span>
        <span className="absolute top-1 right-1 h-4 w-4 rounded-full bg-danger/60 animate-ping" aria-hidden />
      </button>

      {/* Exporta raport */}
      <button
        onClick={exportReport}
        disabled={exportState === "loading"}
        className={cn(
          "hidden md:inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-2.5 py-2 text-xs font-medium whitespace-nowrap hover:bg-secondary/70 active:scale-[0.97] transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60",
          exportState === "success" && "border-success/60 text-success"
        )}
        aria-label="Exporta raport"
        title="Exporta raport"
      >
        {exportState === "loading" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
         exportState === "success" ? <CheckCircle2 className="h-3.5 w-3.5" /> :
         <FileDown className="h-3.5 w-3.5" />}
        <span className="hidden xl:inline">Exporta</span>
      </button>

      {/* Compara Scenarii Modal */}
      <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
        <DialogContent className="glass-strong border-border/60 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-[var(--cyan-glow)]" /> Comparatie Scenarii</DialogTitle>
            <DialogDescription>
              Planul actual de personal vs interventia recomandata de AI pentru urmatoarele 14 zile.
            </DialogDescription>
          </DialogHeader>
          <div className="overflow-hidden rounded-xl border border-border/60">
            <table className="w-full text-sm">
              <thead className="bg-secondary/40 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="text-left px-3 py-2">Indicator</th>
                  <th className="text-left px-3 py-2">Plan Curent</th>
                  <th className="text-left px-3 py-2">Plan Recomandat</th>
                  <th className="text-left px-3 py-2">Impact</th>
                </tr>
              </thead>
              <tbody>
                {SCENARIOS.map((row, i) => (
                  <tr key={row.metric} className={cn("border-t border-border/40", i % 2 && "bg-secondary/10")}>
                    <td className="px-3 py-2.5 font-medium">{row.metric}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{row.current}</td>
                    <td className="px-3 py-2.5 text-foreground">{row.recommended}</td>
                    <td className="px-3 py-2.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                        <ArrowUpRight className="h-3 w-3" /> {row.delta}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <DialogFooter>
            <button onClick={() => setCompareOpen(false)} className="rounded-lg px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition">Inchide</button>
            <button
              onClick={() => { setCompareOpen(false); toast.success("Planul recomandat a fost aplicat in simulator"); }}
              className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow"
            >
              <CheckCircle2 className="h-3.5 w-3.5" /> Aplica Plan Recomandat
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Center Drawer */}
      <Sheet open={alertsOpen} onOpenChange={setAlertsOpen}>
        <SheetContent side="right" className="glass-strong border-border/60 w-full sm:max-w-md p-0 flex flex-col">
          {/* 1. Header */}
          <SheetHeader className="relative p-5 border-b border-border/60">
            <div className="absolute inset-0 bg-gradient-to-br from-danger/10 via-transparent to-[var(--cyan-glow)]/5 pointer-events-none" aria-hidden />
            <div className="relative flex items-start justify-between gap-3">
              <div className="min-w-0">
                <SheetTitle className="flex items-center gap-2 text-base">
                  <span className="relative grid h-7 w-7 place-items-center rounded-lg bg-danger/15 text-danger">
                    <AlertOctagon className="h-4 w-4" />
                    <span className="absolute inset-0 rounded-lg bg-danger/40 animate-ping opacity-60" aria-hidden />
                  </span>
                  Centru Alerte Epuizare
                </SheetTitle>
                <SheetDescription className="mt-1 text-xs">
                  Semnale live de risc operational - {totalAlerts} active
                </SheetDescription>
              </div>
              <div className={cn(
                "shrink-0 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
                critical.length > 0
                  ? "border-danger/40 bg-danger/10 text-danger"
                  : "border-success/40 bg-success/10 text-success"
              )}>
                <Activity className="h-3 w-3" />
                {critical.length > 0 ? "Ridicat" : "Stabil"}
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
            {/* 2. Alerte critice */}
            <Section
              title="Alerte critice"
              count={critical.length}
              tone="danger"
              icon={<ShieldAlert className="h-3.5 w-3.5" />}
            >
              {critical.length === 0 ? (
                <EmptyRow label="Toate semnalele critice au fost eliminate." />
              ) : (
                critical.map((a, i) => (
                  <AlertCardView
                    key={a.id}
                    alert={a}
                    index={i}
                    onDismiss={() => dismissAlert(a.id, "critical")}
                  />
                ))
              )}
            </Section>

            {/* 3. Lista monitorizare */}
            <Section
              title="Lista monitorizare"
              count={watchlist.length}
              tone="warning"
              icon={<Eye className="h-3.5 w-3.5" />}
            >
              {watchlist.length === 0 ? (
                <EmptyRow label="Lista de monitorizare este curata." />
              ) : (
                watchlist.map((a, i) => (
                  <AlertCardView
                    key={a.id}
                    alert={a}
                    index={i + critical.length}
                    onDismiss={() => dismissAlert(a.id, "watchlist")}
                  />
                ))
              )}
            </Section>

            {/* 4. Actiuni recomandate imediat */}
            <Section
              title="Actiuni recomandate imediat"
              count={RECOMMENDED_ACTIONS.length}
              tone="cyan"
              icon={<Wand2 className="h-3.5 w-3.5" />}
            >
              {RECOMMENDED_ACTIONS.map((a, i) => {
                const Icon = a.icon;
                return (
                  <div
                    key={a.id}
                    className="group rounded-xl border border-border/60 bg-secondary/30 p-3 hover:bg-secondary/50 hover:border-[var(--cyan-glow)]/50 transition animate-fade-in"
                    style={{ animationDelay: `${(i + critical.length + watchlist.length) * 60}ms`, animationFillMode: "both" }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--cyan-glow)]/10 text-[var(--cyan-glow)] group-hover:scale-105 transition">
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-[13px] font-semibold leading-snug">{a.title}</div>
                        <div className="text-[11.5px] text-muted-foreground mt-0.5">{a.detail}</div>
                      </div>
                      <button
                        onClick={() => toast.success("Actiune adaugata", { description: a.title })}
                        className="shrink-0 self-center rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[10px] font-medium hover:bg-[var(--cyan-glow)]/10 hover:border-[var(--cyan-glow)]/50 transition"
                      >
                        Aplica
                      </button>
                    </div>
                  </div>
                );
              })}
            </Section>
          </div>

          {/* Footer */}
          <div className="border-t border-border/60 p-3 flex items-center justify-between bg-background/40 backdrop-blur">
            <button
              onClick={() => {
                setCritical([]); setWatchlist([]);
                toast.success("Toate alertele au fost marcate ca citite");
              }}
              className="text-xs text-muted-foreground hover:text-foreground transition"
            >
              Marcheaza toate ca citite
            </button>
            <button onClick={() => setAlertsOpen(false)} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition">
              <X className="h-3.5 w-3.5" /> Inchide
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

// --- Drawer subcomponents ---------------------------------------------------

function Section({
  title, count, tone, icon, children,
}: {
  title: string;
  count: number;
  tone: "danger" | "warning" | "cyan";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === "danger" ? "text-danger bg-danger/10 border-danger/30"
    : tone === "warning" ? "text-warning bg-warning/10 border-warning/30"
    : "text-[var(--cyan-glow)] bg-[var(--cyan-glow)]/10 border-[var(--cyan-glow)]/30";
  return (
    <section>
      <header className="flex items-center justify-between mb-2 px-0.5">
        <div className="flex items-center gap-2">
          <span className={cn("grid h-6 w-6 place-items-center rounded-md border", toneClass)}>{icon}</span>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-foreground/90">{title}</h3>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground tabular-nums">{count}</span>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function EmptyRow({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-secondary/20 px-3 py-3 text-center text-[11.5px] text-muted-foreground">
      {label}
    </div>
  );
}

function AlertCardView({
  alert, index, onDismiss,
}: {
  alert: AlertCard;
  index: number;
  onDismiss: () => void;
}) {
  const sevMeta =
    alert.severity === "critical"
      ? { label: "Critic", text: "text-danger", chip: "bg-danger/15 text-danger border-danger/40", ring: "before:bg-danger" }
      : alert.severity === "warning"
      ? { label: "Atentie", text: "text-warning", chip: "bg-warning/15 text-warning border-warning/40", ring: "before:bg-warning" }
      : { label: "Info",     text: "text-[var(--cyan-glow)]", chip: "bg-[var(--cyan-glow)]/15 text-[var(--cyan-glow)] border-[var(--cyan-glow)]/40", ring: "before:bg-[var(--cyan-glow)]" };

  return (
    <article
      className={cn(
        "group relative rounded-xl border border-border/60 bg-secondary/30 p-3.5 hover:bg-secondary/50 hover:-translate-y-0.5 transition animate-fade-in",
        "before:content-[''] before:absolute before:inset-y-3 before:left-0 before:w-[3px] before:rounded-r",
        sevMeta.ring,
        alert.severity === "critical" && "shadow-[0_8px_24px_-12px_color-mix(in_oklab,var(--danger)_55%,transparent)]"
      )}
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "both" }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn(
            "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
            sevMeta.chip,
            alert.severity === "critical" && "animate-pulse-soft"
          )}>
            <span className={cn("h-1.5 w-1.5 rounded-full bg-current", alert.severity === "critical" && "animate-ping")} />
            {sevMeta.label}
          </span>
          <span className="inline-flex items-center gap-1 text-[10.5px] text-muted-foreground">
            <Clock className="h-3 w-3" /> {alert.time}
          </span>
        </div>
        <button
          onClick={onDismiss}
          aria-label="Elimina alerta"
          className="opacity-60 hover:opacity-100 hover:text-foreground text-muted-foreground rounded-md p-1 hover:bg-secondary/70 transition"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      <h4 className="mt-2 text-[13.5px] font-semibold leading-snug">{alert.title}</h4>
      <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{alert.detail}</p>

      <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10.5px] text-muted-foreground">
        <span className="inline-flex items-center gap-1"><Building2 className="h-3 w-3" /> {alert.unit}</span>
        <span className="inline-flex items-center gap-1"><Activity className="h-3 w-3" /> Factor principal: <span className="text-foreground/80 font-medium">{alert.driver}</span></span>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={() => toast.success("Deschidere prognoza", { description: `${alert.unit} - vizualizare 14 zile` })}
          className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-background/40 px-2 py-1 text-[10.5px] font-medium hover:bg-[var(--cyan-glow)]/10 hover:border-[var(--cyan-glow)]/50 transition"
        >
          <LineChart className="h-3 w-3" /> Vezi Prognoza
        </button>
        <button
          onClick={() => toast.success("Plan de actiune generat", { description: `Adaptat pentru ${alert.unit}` })}
          className="inline-flex items-center gap-1 rounded-md bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-2 py-1 text-[10.5px] font-semibold text-background ring-glow hover:opacity-95 transition"
        >
          <Wand2 className="h-3 w-3" /> Genereaza Plan de Actiune
        </button>
      </div>
    </article>
  );
}




