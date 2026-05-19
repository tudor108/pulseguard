import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { useRef, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  label: string;
  value: number;
  unit?: string;
  delta?: number;
  trend?: "up" | "down" | "stable";
  icon: LucideIcon;
  tone?: "primary" | "warning" | "danger" | "success";
  spark?: number[];
  decimals?: number;
  highRisk?: boolean;
};

const toneRing: Record<NonNullable<Props["tone"]>, string> = {
  primary: "from-[var(--cyan-glow)]/30 to-[var(--indigo-glow)]/20",
  warning: "from-warning/30 to-warning/10",
  danger: "from-danger/35 to-danger/10",
  success: "from-success/30 to-success/10",
};

function riskLevelClass(value: number, highRisk?: boolean) {
  if (highRisk || value >= 85) return "risk-critical";
  if (value >= 70) return "risk-high";
  if (value >= 50) return "risk-medium";
  return "risk-low";
}

export function KpiCard({
  label,
  value,
  unit,
  delta,
  trend = "stable",
  icon: Icon,
  tone = "primary",
  spark,
  decimals = 0,
  highRisk,
}: Props) {
  const TrendIcon = trend === "up" ? ArrowUpRight : trend === "down" ? ArrowDownRight : Minus;
  const trendColor =
    trend === "up" ? "text-danger" : trend === "down" ? "text-success" : "text-muted-foreground";
  const ref = useRef<HTMLDivElement>(null);

  const handleMove = (e: MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(900px) rotateX(${(-y * 4).toFixed(2)}deg) rotateY(${(x * 5).toFixed(2)}deg) translateY(-3px)`;
  };
  const reset = () => {
    if (ref.current) ref.current.style.transform = "";
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      className={cn(
        "group relative glass luminous-border rounded-2xl p-5 overflow-hidden animate-fade-up hover-lift will-change-transform",
        riskLevelClass(value, highRisk),
      )}
      style={{ transition: "transform 220ms cubic-bezier(.2,.8,.2,1), box-shadow 280ms" }}
    >
      <div
        className={cn(
          "absolute -top-12 -right-12 h-32 w-32 rounded-full blur-3xl bg-gradient-to-br opacity-70",
          toneRing[tone],
        )}
      />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 flex items-baseline gap-1.5">
            <div className="text-3xl font-semibold tracking-tight tabular-nums">
              <AnimatedNumber value={value} decimals={decimals} />
            </div>
            {unit && <div className="text-xs text-muted-foreground">{unit}</div>}
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-secondary/50 border border-border/60 transition-transform group-hover:scale-110 group-hover:rotate-3">
          <Icon className="h-4 w-4 text-[var(--cyan-glow)] transition-colors group-hover:text-[var(--indigo-glow)]" />
        </div>
      </div>
      <div className="relative mt-4 flex items-center justify-between">
        {typeof delta === "number" && (
          <div className={cn("inline-flex items-center gap-1 text-xs font-medium", trendColor)}>
            <TrendIcon className="h-3.5 w-3.5" />
            {delta > 0 ? "+" : ""}
            {delta}% <span className="text-muted-foreground font-normal">fata de 7 zile</span>
          </div>
        )}
        {spark && <Sparkline data={spark} />}
      </div>
    </div>
  );
}

function Sparkline({ data }: { data: number[] }) {
  const w = 80,
    h = 24;
  const min = Math.min(...data),
    max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = (i / (data.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(" ");
  const len = data.length * 6;
  return (
    <svg width={w} height={h} className="opacity-80">
      <defs>
        <linearGradient id="spk" x1="0" x2="1">
          <stop offset="0%" stopColor="oklch(0.82 0.18 210)" />
          <stop offset="100%" stopColor="oklch(0.65 0.22 280)" />
        </linearGradient>
      </defs>
      <polyline
        fill="none"
        stroke="url(#spk)"
        strokeWidth="1.6"
        points={points}
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{
          strokeDasharray: len,
          strokeDashoffset: len,
          animation: "draw-line 1.4s cubic-bezier(.2,.8,.2,1) forwards",
        }}
      />
    </svg>
  );
}
