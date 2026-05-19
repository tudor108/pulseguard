import { createFileRoute } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Brain,
  HeartPulse,
  Pause,
  Play,
  RadioTower,
  ShieldCheck,
  SlidersHorizontal,
  Stethoscope,
  Thermometer,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/pulse/AppShell";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { usePulseStore } from "@/lib/pulse/app-state";
import {
  liveDepartments,
  makeSyntheticEnvelope,
  telemetryWebSocketUrl,
  type LiveDepartment,
  type LivePrediction,
  type LiveTelemetryEnvelope,
  type LiveTelemetryEvent,
} from "@/lib/pulse/services/live-telemetry";
import {
  buildTelemetrySummary,
  type TelemetryIntensity,
} from "@/lib/pulse/services/telemetry-service";

export const Route = createFileRoute("/live-telemetry")({
  head: () => ({
    meta: [
      { title: "Telemetrie Live - PulseGuard AI" },
      {
        name: "description",
        content:
          "Monitorizare live a semnalelor wearable pentru risc de burnout, oboseala si presiune operationala.",
      },
    ],
  }),
  component: LiveTelemetry,
});

type StaffState = {
  telemetry: LiveTelemetryEvent;
  prediction: LivePrediction;
};

type SeriesPoint = {
  time: string;
  burnout: number;
  fatigue: number;
  stress: number;
  pressure: number;
};

const tickStyle = { fill: "oklch(0.72 0.03 245)", fontSize: 11 };
const grid = "oklch(0.97 0.01 230 / 0.06)";

function LiveTelemetry() {
  const [staff, setStaff] = useState<Record<string, StaffState>>({});
  const [series, setSeries] = useState<SeriesPoint[]>([]);
  const [connected, setConnected] = useState(false);
  const { settings, updateSettings, recordTelemetrySummary, createTelemetryAlert } =
    usePulseStore();
  const [paused, setPaused] = useState(false);
  const [intensity, setIntensity] = useState<TelemetryIntensity>(settings.telemetrySimulationMode);
  const [departmentFilter, setDepartmentFilter] = useState<LiveDepartment | "All">("All");
  const [selected, setSelected] = useState<StaffState | null>(null);

  useEffect(() => {
    setIntensity(settings.telemetrySimulationMode);
  }, [settings.telemetrySimulationMode]);

  useEffect(() => {
    if (paused) {
      setConnected(false);
      return;
    }
    const wsUrl = telemetryWebSocketUrl();
    let socket: WebSocket | null = null;
    let fallbackTimer: number | undefined;
    let tick = 0;

    const applyEnvelope = (envelope: LiveTelemetryEnvelope) => {
      if (envelope.type === "snapshot") {
        for (const item of envelope.staff ?? []) applyEnvelope(item);
        return;
      }
      if (!envelope.telemetry || !envelope.prediction) return;
      createTelemetryAlert(envelope.telemetry, envelope.prediction);
      setStaff((current) => ({
        ...current,
        [envelope.telemetry!.staff_id]: {
          telemetry: envelope.telemetry!,
          prediction: envelope.prediction!,
        },
      }));
      setSeries((current) => {
        const next = [
          ...current,
          {
            time: new Date(envelope.telemetry!.timestamp).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
            burnout: Math.round(envelope.prediction!.burnout_probability * 100),
            fatigue: Math.round(envelope.telemetry!.signals.fatigue_index),
            stress: Math.round(envelope.telemetry!.signals.stress_index),
            pressure: Math.round(envelope.telemetry!.signals.patient_pressure_index),
          },
        ];
        return next.slice(-42);
      });
    };

    const startFallback = () => {
      setConnected(false);
      fallbackTimer = window.setInterval(() => {
        for (let index = 0; index < 20; index++) {
          applyEnvelope(
            makeSyntheticEnvelope(
              index,
              tick,
              intensity,
              departmentFilter === "All" ? undefined : departmentFilter,
            ),
          );
        }
        tick += 1;
      }, 1800);
    };

    if (wsUrl) {
      socket = new WebSocket(wsUrl);
      socket.onopen = () => setConnected(true);
      socket.onmessage = (event) => applyEnvelope(JSON.parse(event.data) as LiveTelemetryEnvelope);
      socket.onerror = startFallback;
      socket.onclose = () => {
        if (!fallbackTimer) startFallback();
      };
    } else {
      startFallback();
    }

    return () => {
      socket?.close();
      if (fallbackTimer) window.clearInterval(fallbackTimer);
    };
  }, [createTelemetryAlert, departmentFilter, intensity, paused]);

  const staffRows = useMemo(() => Object.values(staff), [staff]);
  const visibleRows = useMemo(
    () =>
      departmentFilter === "All"
        ? staffRows
        : staffRows.filter((row) => row.telemetry.department === departmentFilter),
    [departmentFilter, staffRows],
  );
  const heatmap = useMemo(() => buildHeatmap(visibleRows), [visibleRows]);
  const critical = visibleRows.filter((row) => row.prediction.risk_level === "critical").length;
  const high = visibleRows.filter((row) => row.prediction.risk_level === "high").length;
  const avgBurnout = average(visibleRows.map((row) => row.prediction.burnout_probability * 100));
  const avgRecovery = average(visibleRows.map((row) => row.telemetry.signals.recovery_score));
  const anomalies = visibleRows
    .filter((row) => row.prediction.is_anomaly || row.prediction.anomaly_score > 0.42)
    .sort((a, b) => b.prediction.anomaly_score - a.prediction.anomaly_score)
    .slice(0, 6);

  useEffect(() => {
    if (!staffRows.length) return;
    recordTelemetrySummary(
      buildTelemetrySummary(staffRows, {
        connectionMode: connected ? "websocket" : paused ? "paused" : "fallback",
        intensity,
        departmentFilter,
        paused,
      }),
    );
  }, [connected, departmentFilter, intensity, paused, recordTelemetrySummary, staffRows]);

  const updateIntensity = (value: TelemetryIntensity) => {
    setIntensity(value);
    updateSettings({ telemetrySimulationMode: value });
  };

  return (
    <AppShell>
      <header className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Wearable telemetry stream
          </div>
          <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Telemetrie Live Burnout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {connected
              ? "Conectat la realtime-gateway WebSocket."
              : "Ruleaza simulare locala pana cand pornesti gateway-ul real."}
          </p>
        </div>
        <Badge
          className={cn(
            "w-fit gap-1.5",
            connected
              ? "bg-success/15 text-success border-success/30"
              : "bg-warning/15 text-warning border-warning/30",
          )}
        >
          <RadioTower className="h-3.5 w-3.5" />{" "}
          {paused ? "pausat" : connected ? "stream live" : "synthetic fallback"}
        </Badge>
      </header>

      <section className="mb-5 glass luminous-border rounded-2xl p-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Control simulare
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={intensity}
            onValueChange={(value) => updateIntensity(value as TelemetryIntensity)}
          >
            <SelectTrigger className="h-9 w-[150px] bg-secondary/40 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-border/60">
              <SelectItem value="normal">normal</SelectItem>
              <SelectItem value="busy">busy</SelectItem>
              <SelectItem value="critical">critical</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={departmentFilter}
            onValueChange={(value) => setDepartmentFilter(value as LiveDepartment | "All")}
          >
            <SelectTrigger className="h-9 w-[170px] bg-secondary/40 border-border/60">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="glass-strong border-border/60">
              <SelectItem value="All">Toate departamentele</SelectItem>
              {liveDepartments.map((department) => (
                <SelectItem key={department} value={department}>
                  {department}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button
            onClick={() => setPaused((value) => !value)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 text-xs hover:bg-secondary/70 transition"
          >
            {paused ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {paused ? "Reia" : "Pauza"}
          </button>
        </div>
      </section>

      <section className="mb-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Metric
          icon={ShieldCheck}
          label="Risc mediu burnout"
          value={`${Math.round(avgBurnout)}/100`}
          tone={avgBurnout >= 70 ? "danger" : "warning"}
        />
        <Metric
          icon={AlertTriangle}
          label="Critic / ridicat"
          value={`${critical} / ${high}`}
          tone={critical ? "danger" : "warning"}
        />
        <Metric
          icon={Users}
          label="Digital twins active"
          value={visibleRows.length.toString()}
          tone="info"
        />
        <Metric
          icon={HeartPulse}
          label="Recuperare medie"
          value={`${Math.round(avgRecovery)}/100`}
          tone={avgRecovery < 45 ? "danger" : "success"}
        />
      </section>

      <section className="mb-5 grid grid-cols-1 xl:grid-cols-[1.35fr_0.9fr] gap-5">
        <Panel title="Semnale live" subtitle="Burnout, oboseala, stres si presiune pacienti">
          <ResponsiveContainer width="100%" height={320}>
            <LineChart data={series} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
              <CartesianGrid stroke={grid} vertical={false} />
              <XAxis
                dataKey="time"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                minTickGap={24}
              />
              <YAxis
                domain={[0, 100]}
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={38}
              />
              <Tooltip content={<TelemetryTooltip />} />
              <Line
                type="monotone"
                dataKey="burnout"
                name="Burnout"
                stroke="oklch(0.68 0.22 20)"
                strokeWidth={2.4}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="fatigue"
                name="Oboseala"
                stroke="oklch(0.82 0.16 75)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="stress"
                name="Stres"
                stroke="oklch(0.78 0.16 165)"
                strokeWidth={2}
                dot={false}
              />
              <Line
                type="monotone"
                dataKey="pressure"
                name="Presiune"
                stroke="oklch(0.82 0.18 210)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title="Heatmap departamente" subtitle="Agregare live pe sectii">
          <ResponsiveContainer width="100%" height={320}>
            <BarChart
              data={heatmap}
              layout="vertical"
              margin={{ top: 10, right: 18, left: 10, bottom: 0 }}
            >
              <CartesianGrid stroke={grid} horizontal={false} />
              <XAxis
                type="number"
                domain={[0, 100]}
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                dataKey="department"
                type="category"
                tick={tickStyle}
                axisLine={false}
                tickLine={false}
                width={80}
              />
              <Tooltip content={<HeatmapTooltip />} />
              <Bar dataKey="risk" radius={[0, 6, 6, 0]}>
                {heatmap.map((row) => (
                  <Cell key={row.department} fill={riskColor(row.risk)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </section>

      <section className="mb-5 grid grid-cols-1 xl:grid-cols-[0.95fr_1.05fr] gap-5">
        <Panel title="Anomaly timeline" subtitle="Semnale iesite din tiparul wearable">
          <div className="space-y-2">
            {anomalies.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">
                Nu exista anomalii active peste prag.
              </div>
            ) : (
              anomalies.map((row) => (
                <button
                  key={`${row.telemetry.event_id}-${row.prediction.anomaly_score}`}
                  onClick={() => setSelected(row)}
                  className="w-full rounded-lg border border-border/60 bg-secondary/25 p-3 text-left hover:bg-secondary/50 transition"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium">{row.telemetry.staff_id}</span>
                    <span className="text-danger tabular-nums">
                      {Math.round(row.prediction.anomaly_score * 100)}/100
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {row.telemetry.department} -{" "}
                    {row.telemetry.operational_context.anomaly_type ?? "stress/fatigue outlier"}
                  </p>
                </button>
              ))
            )}
          </div>
        </Panel>
        <Panel title="Model monitoring" subtitle="Burnout ensemble operational">
          <div className="grid grid-cols-2 gap-2">
            <MonitorMetric
              label="Versiune model"
              value={visibleRows[0]?.prediction.model_version ?? "browser-synthetic"}
            />
            <MonitorMetric label="Sanatate model" value={connected ? "healthy" : "fallback"} />
            <MonitorMetric label="Latenta p95" value={connected ? "38 ms" : "12 ms"} />
            <MonitorMetric label="Error rate" value={connected ? "0.3%" : "1.1%"} />
            <MonitorMetric label="Drift input" value={avgBurnout > 80 ? "watch" : "normal"} />
            <MonitorMetric label="Retraining" value="2026-05-12" />
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Mod fallback rule-based activ cand WebSocket-ul nu este disponibil. Suport operational,
            nu diagnostic clinic.
          </p>
        </Panel>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-4">
        {visibleRows
          .sort((a, b) => b.prediction.burnout_probability - a.prediction.burnout_probability)
          .slice(0, 12)
          .map((row) => (
            <DigitalTwinCard
              key={row.telemetry.staff_id}
              row={row}
              onOpen={() => setSelected(row)}
            />
          ))}
      </section>

      <TwinDrawer row={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone: "success" | "warning" | "danger" | "info";
}) {
  return (
    <div className="glass luminous-border rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={cn("h-4 w-4", toneClass(tone))} />
      </div>
      <div className="mt-3 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function Panel({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <div className="glass luminous-border rounded-2xl p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function DigitalTwinCard({ row, onOpen }: { row: StaffState; onOpen: () => void }) {
  const { telemetry, prediction } = row;
  const risk = Math.round(prediction.burnout_probability * 100);
  return (
    <article className="glass luminous-border rounded-2xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Stethoscope className="h-4 w-4 text-[var(--cyan-glow)]" />
            <h3 className="truncate text-sm font-semibold">{telemetry.staff_id}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {telemetry.department} - {telemetry.role} - tura {telemetry.shift_type}
          </p>
        </div>
        <button onClick={onOpen} className="shrink-0">
          <Badge className={cn(riskBadge(prediction.risk_level))}>{prediction.risk_level}</Badge>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
        <TwinStat icon={HeartPulse} label="HR" value={telemetry.signals.heart_rate_bpm} />
        <TwinStat icon={Brain} label="HRV" value={telemetry.signals.hrv_ms} />
        <TwinStat icon={Thermometer} label="Temp" value={telemetry.signals.skin_temperature_c} />
      </div>

      <div className="mt-4 space-y-2">
        <BarLine label="Burnout" value={risk} color={riskColor(risk)} />
        <BarLine
          label="Oboseala"
          value={telemetry.signals.fatigue_index}
          color="oklch(0.82 0.16 75)"
        />
        <BarLine
          label="Recuperare"
          value={telemetry.signals.recovery_score}
          color="oklch(0.78 0.16 165)"
        />
      </div>
    </article>
  );
}

function TwinDrawer({ row, onClose }: { row: StaffState | null; onClose: () => void }) {
  return (
    <Sheet open={Boolean(row)} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="glass-strong border-border/60 w-full sm:max-w-md overflow-y-auto"
      >
        {!row ? null : (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center justify-between gap-2">
                {row.telemetry.staff_id}
                <button
                  onClick={onClose}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </SheetTitle>
              <SheetDescription>
                {row.telemetry.department} - {row.telemetry.role} - digital twin wearable
              </SheetDescription>
            </SheetHeader>
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <MonitorMetric
                  label="Burnout probability"
                  value={`${Math.round(row.prediction.burnout_probability * 100)}/100`}
                />
                <MonitorMetric
                  label="Confidence"
                  value={`${Math.round(92 - row.prediction.anomaly_score * 18)}%`}
                />
                <MonitorMetric
                  label="Anomaly score"
                  value={`${Math.round(row.prediction.anomaly_score * 100)}/100`}
                />
                <MonitorMetric
                  label="Timestamp"
                  value={new Date(row.prediction.timestamp).toLocaleTimeString("ro-RO", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                />
              </div>
              <Panel title="Factori explicativi" subtitle="SHAP-style top drivers">
                <ul className="space-y-2">
                  {row.prediction.top_drivers.map((driver) => (
                    <li
                      key={driver.name}
                      className="rounded-lg border border-border/60 bg-secondary/20 p-2 text-xs"
                    >
                      <div className="flex justify-between">
                        <span>{driver.name}</span>
                        <span>{driver.value}</span>
                      </div>
                      <div className="mt-1 h-1.5 rounded-full bg-secondary/60 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--cyan-glow)]"
                          style={{ width: `${Math.min(100, driver.weight * 320)}%` }}
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              </Panel>
              <Panel title="Recomandare operationala" subtitle="Interventii rapide">
                <p className="text-sm leading-relaxed">
                  Prioritizeaza recuperarea, redu expunerea la alarme si verifica incarcarea pe
                  urmatoarea tura. Modelul ruleaza in mod operational demo, nu clinic.
                </p>
              </Panel>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function MonitorMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 bg-secondary/25 p-2.5">
      <div className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function TwinStat({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-secondary/20 p-2">
      <div className="flex items-center gap-1 text-muted-foreground">
        <Icon className="h-3 w-3" /> {label}
      </div>
      <div className="mt-1 font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function BarLine({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums">{Math.round(value)}/100</span>
      </div>
      <div className="h-2 rounded-full bg-secondary/60 overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${Math.max(3, Math.min(100, value))}%`, background: color }}
        />
      </div>
    </div>
  );
}

function buildHeatmap(staff: StaffState[]) {
  return liveDepartments.map((department) => {
    const rows = staff.filter((row) => row.telemetry.department === department);
    return {
      department,
      risk: Math.round(average(rows.map((row) => row.prediction.burnout_probability * 100))),
      fatigue: Math.round(average(rows.map((row) => row.telemetry.signals.fatigue_index))),
      staff: rows.length,
    };
  });
}

function TelemetryTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { color: string; name: string; value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg glass-strong px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span>{p.name}</span>
          <span className="ml-auto font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function HeatmapTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: { risk: number; fatigue: number; staff: number } }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg glass-strong px-3 py-2 text-xs shadow-xl">
      <div className="font-medium">{label}</div>
      <div className="text-muted-foreground">
        Risc {row.risk}/100 - Oboseala {row.fatigue}/100 - {row.staff} staff
      </div>
    </div>
  );
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function riskColor(value: number) {
  if (value >= 82) return "oklch(0.68 0.22 20)";
  if (value >= 64) return "oklch(0.82 0.16 75)";
  return "oklch(0.78 0.16 165)";
}

function riskBadge(level: LivePrediction["risk_level"]) {
  if (level === "critical") return "bg-danger/15 text-danger border-danger/30";
  if (level === "high") return "bg-warning/15 text-warning border-warning/30";
  if (level === "moderate")
    return "bg-[var(--cyan-glow)]/10 text-[var(--cyan-glow)] border-[var(--cyan-glow)]/30";
  return "bg-success/15 text-success border-success/30";
}

function toneClass(tone: "success" | "warning" | "danger" | "info") {
  if (tone === "danger") return "text-danger";
  if (tone === "warning") return "text-warning";
  if (tone === "success") return "text-success";
  return "text-[var(--cyan-glow)]";
}
