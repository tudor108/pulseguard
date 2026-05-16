import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { AlertTriangle, FileX, Inbox, FileQuestion, RefreshCcw } from "lucide-react";

type EmptyProps = {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
  tone?: "neutral" | "cyan" | "indigo";
};

export function EmptyState({ icon: Icon = Inbox, title, description, action, className, tone = "cyan" }: EmptyProps) {
  const toneRing = tone === "cyan" ? "from-[var(--cyan-glow)]/30" : tone === "indigo" ? "from-[var(--indigo-glow)]/30" : "from-muted/30";
  return (
    <div className={cn("relative glass luminous-border rounded-2xl p-8 md:p-10 text-center animate-fade-up", className)} role="status">
      <div className={cn("mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br to-transparent ring-1 ring-border/60", toneRing)}>
        <Icon className="h-6 w-6 text-[var(--cyan-glow)]" aria-hidden />
      </div>
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="btn-glow mt-5 inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-4 py-2 text-xs font-semibold text-background ring-glow focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

type ErrorProps = {
  title?: string;
  description: string;
  onRetry?: () => void;
  className?: string;
  variant?: "invalid-upload" | "forecast-failed" | "no-data" | "unsupported-format" | "generic";
};

const errorPresets: Record<NonNullable<ErrorProps["variant"]>, { icon: LucideIcon; title: string }> = {
  "invalid-upload":      { icon: FileX,        title: "Invalid file upload" },
  "forecast-failed":     { icon: AlertTriangle, title: "Forecast generation failed" },
  "no-data":             { icon: FileQuestion, title: "No data available" },
  "unsupported-format":  { icon: FileX,        title: "Unsupported time-series format" },
  "generic":             { icon: AlertTriangle, title: "Something went wrong" },
};

export function ErrorState({ title, description, onRetry, className, variant = "generic" }: ErrorProps) {
  const preset = errorPresets[variant];
  const Icon = preset.icon;
  return (
    <div className={cn("relative rounded-2xl border border-danger/30 bg-danger/10 p-6 md:p-8 text-center animate-fade-up", className)} role="alert">
      <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-danger/15 ring-1 ring-danger/40">
        <Icon className="h-5 w-5 text-danger" aria-hidden />
      </div>
      <h3 className="text-base font-semibold text-foreground">{title ?? preset.title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">{description}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-danger/40 bg-background/30 px-3.5 py-2 text-xs font-medium text-danger hover:bg-danger/10 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-danger/60"
        >
          <RefreshCcw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("relative overflow-hidden rounded-md bg-secondary/40 shimmer", className)} aria-hidden />;
}

export function SkeletonCard({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn("glass luminous-border rounded-2xl p-5 space-y-3", className)} aria-busy="true">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-7 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className={cn("h-3", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}