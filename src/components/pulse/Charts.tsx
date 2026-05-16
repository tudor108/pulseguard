import { Area, AreaChart, CartesianGrid, ComposedChart, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import type { ForecastPoint, SeriesPoint } from "@/lib/pulse/data";

const tickStyle = { fill: "oklch(0.72 0.03 245)", fontSize: 11 };
const grid = "oklch(0.97 0.01 230 / 0.06)";

function fmt(d: string) {
  const date = new Date(d);
  const months = ["Ian", "Feb", "Mar", "Apr", "Mai", "Iun", "Iul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

function TooltipBox({ active, payload, label }: { active?: boolean; payload?: { color: string; name: string; value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg glass-strong px-3 py-2 text-xs shadow-xl">
      <div className="text-muted-foreground mb-1">{label && fmt(label)}</div>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-foreground/80">{p.name}</span>
          <span className="ml-auto font-medium">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

export function ForecastChart({ data }: { data: ForecastPoint[] }) {
  const splitDate = data.find((d) => d.forecast)?.date;
  // Split lines: historical solid, forecast dashed + confidence band
  const enriched = data.map((d) => ({
    ...d,
    burnoutHist: d.forecast ? null : d.burnoutRisk,
    burnoutFcst: d.forecast ? d.burnoutRisk : null,
    bandLow: d.forecast ? Math.max(0, d.burnoutRisk - 8) : null,
    bandRidicat: d.forecast ? Math.min(100, d.burnoutRisk + 10) : null,
  }));
  // Stitch the join point so dashed line connects to historical
  const splitIdx = enriched.findIndex((d) => d.forecast);
  if (splitIdx > 0) enriched[splitIdx - 1].burnoutFcst = enriched[splitIdx - 1].burnoutHist;
  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={enriched} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="g-burnout" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0.55} />
            <stop offset="100%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-pressure" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.18 210)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="oklch(0.82 0.18 210)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-band" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="oklch(0.65 0.22 280)" stopOpacity={0} />
          </linearGradient>
          <filter id="forecast-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2.4" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={32} />
        <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} />
        {splitDate && (
          <ReferenceLine
            x={splitDate}
            stroke="oklch(0.82 0.18 210 / 0.55)"
            strokeDasharray="4 4"
            label={{ value: "Astazi", position: "insideTopRight", fill: "oklch(0.82 0.18 210)", fontSize: 10 }}
          />
        )}
        {/* Incredere band on forecast */}
        <Area type="monotone" dataKey="bandRidicat" stroke="none" fill="url(#g-band)" name="Limita superioara" isAnimationActive animationDuration={1400} legendType="none" connectNulls />
        <Area type="monotone" dataKey="bandLow" stroke="none" fill="var(--background)" fillOpacity={1} name="Limita inferioara" isAnimationActive animationDuration={1400} legendType="none" connectNulls />
        <Area type="monotone" dataKey="workloadPressure" name="Presiune de lucru" stroke="oklch(0.82 0.18 210)" strokeWidth={2} fill="url(#g-pressure)" isAnimationActive animationDuration={1600} />
        <Area type="monotone" dataKey="burnoutHist" name="Risc epuizare (real)" stroke="oklch(0.65 0.22 280)" strokeWidth={2.4} fill="url(#g-burnout)" isAnimationActive animationDuration={1800} connectNulls />
        <Line type="monotone" dataKey="burnoutFcst" name="Risc epuizare (prognoza)" stroke="oklch(0.65 0.22 280)" strokeWidth={2.4} strokeDasharray="6 4" dot={false} isAnimationActive animationDuration={2000} connectNulls filter="url(#forecast-glow)" />
        <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.72 0.03 245)" }} iconType="circle" />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

export function MultiForecastChart({ data }: { data: ForecastPoint[] }) {
  const splitDate = data.find((d) => d.forecast)?.date;
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={32} />
        <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} />
        {splitDate && <ReferenceLine x={splitDate} stroke="oklch(0.97 0.01 230 / 0.25)" strokeDasharray="4 4" />}
        <Line type="monotone" dataKey="fatigueIndex" name="Oboseala" stroke="oklch(0.78 0.16 165)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="shortageRisk" name="Deficit" stroke="oklch(0.82 0.16 75)" strokeWidth={2} dot={false} />
        <Line type="monotone" dataKey="interventionUrgency" name="Interventie" stroke="oklch(0.68 0.22 20)" strokeWidth={2} dot={false} />
        <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.72 0.03 245)" }} iconType="circle" />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function InputsChart({ data }: { data: SeriesPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="g-work" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.18 210)" stopOpacity={0.5} />
            <stop offset="100%" stopColor="oklch(0.82 0.18 210)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="g-ot" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0.45} />
            <stop offset="100%" stopColor="oklch(0.82 0.16 75)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={32} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<TooltipBox />} />
        <Area type="monotone" dataKey="workload" name="Volum de lucru (h)" stroke="oklch(0.82 0.18 210)" strokeWidth={2} fill="url(#g-work)" isAnimationActive animationDuration={1500} />
        <Area type="monotone" dataKey="overtime" name="Ore suplimentare (h)" stroke="oklch(0.82 0.16 75)" strokeWidth={2} fill="url(#g-ot)" isAnimationActive animationDuration={1700} />
        <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.72 0.03 245)" }} iconType="circle" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function SignalsChart({ data }: { data: SeriesPoint[] }) {
  // Normalize patientRatio to a comparable 0-100ish range for visual parity
  const enriched = data.map((d) => ({
    ...d,
    patientRatioScaled: +(d.patientRatio * 14).toFixed(1),
    stressScoreScaled: +(d.stressScore * 9).toFixed(1),
  }));
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={enriched} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
        <CartesianGrid stroke={grid} vertical={false} />
        <XAxis dataKey="date" tickFormatter={fmt} tick={tickStyle} axisLine={false} tickLine={false} minTickGap={32} />
        <YAxis tick={tickStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip content={<TooltipBox />} />
        <Line type="monotone" dataKey="overtime" name="Ore suplimentare (h)" stroke="oklch(0.82 0.16 75)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1500} />
        <Line type="monotone" dataKey="patientRatioScaled" name="Raport pacienti/personal" stroke="oklch(0.82 0.18 210)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1600} />
        <Line type="monotone" dataKey="nightShifts" name="Numar ture noapte" stroke="oklch(0.65 0.22 280)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1700} />
        <Line type="monotone" dataKey="sickLeave" name="Evenimente concediu medical" stroke="oklch(0.68 0.22 20)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1800} />
        <Line type="monotone" dataKey="stressScoreScaled" name="Scor sondaj stres" stroke="oklch(0.78 0.16 165)" strokeWidth={2} dot={false} isAnimationActive animationDuration={1900} />
        <Legend wrapperStyle={{ fontSize: 11, color: "oklch(0.72 0.03 245)" }} iconType="circle" />
      </LineChart>
    </ResponsiveContainer>
  );
}



