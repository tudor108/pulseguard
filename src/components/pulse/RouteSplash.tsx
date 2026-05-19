import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useRouterState } from "@tanstack/react-router";

type Phase = "idle" | "enter" | "hold" | "exit";

/**
 * Cinematic fullscreen route transition.
 * Phases: enter (dim+blur in) -> hold (logo + sweep + title) -> exit (dissolve).
 * Respects prefers-reduced-motion (simple fade only).
 */
export function RouteSplash() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [phase, setPhase] = useState<Phase>("idle");
  const [reduced, setReduced] = useState(false);
  const [runKey, setRunKey] = useState(0);
  const firstRender = useRef(true);
  const timers = useRef<number[]>([]);
  const lastPath = useRef<string | null>(null);
  const activeRun = useRef(0);
  const startedAt = useRef(0);
  const reducedRef = useRef(false);
  const phaseRef = useRef<Phase>(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncReduced = () => {
      reducedRef.current = media.matches;
      setReduced(media.matches);
    };
    syncReduced();
    media.addEventListener("change", syncReduced);
    return () => media.removeEventListener("change", syncReduced);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const watchdog = window.setInterval(() => {
      if (phaseRef.current === "idle" || !startedAt.current) return;
      if (performance.now() - startedAt.current < 3400) return;
      activeRun.current += 1;
      timers.current.forEach((timer) => window.clearTimeout(timer));
      timers.current = [];
      setPhase("idle");
    }, 400);
    return () => window.clearInterval(watchdog);
  }, []);

  useEffect(() => {
    // Skip duplicate triggers for the same path (StrictMode / router churn)
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    const run = activeRun.current + 1;
    activeRun.current = run;
    startedAt.current = performance.now();
    setRunKey(run);

    const finish = () => {
      if (activeRun.current !== run) return;
      timers.current = [];
      setPhase("idle");
    };

    if (reducedRef.current) {
      setPhase("enter");
      timers.current.push(window.setTimeout(finish, 240), window.setTimeout(finish, 900));
      return;
    }

    const isFirst = firstRender.current;
    firstRender.current = false;
    const enterMs = isFirst ? 280 : 220;
    const holdMs = isFirst ? 1480 : 1320;
    const exitMs = 460;

    setPhase("enter");
    timers.current.push(
      window.setTimeout(() => activeRun.current === run && setPhase("hold"), enterMs),
      window.setTimeout(() => activeRun.current === run && setPhase("exit"), enterMs + holdMs),
      window.setTimeout(finish, enterMs + holdMs + exitMs),
      window.setTimeout(finish, enterMs + holdMs + exitMs + 650),
    );
  }, [pathname]);

  const visible = phase !== "idle";

  return (
    <div
      aria-hidden
      className={
        "splash-root pointer-events-none fixed inset-0 z-[80] grid place-items-center " +
        `splash-phase-${phase} ` +
        (visible ? "opacity-100" : "opacity-0")
      }
    >
      {/* Layered backdrop: dim + cinematic blur + ambient glow */}
      <div className="splash-backdrop" />
      <div className="splash-ambient" />
      <div className="splash-grain" />

      {/* Particle streaks */}
      {!reduced && (
        <div key={`particles-${runKey}`} className="splash-particles" aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ "--i": i } as CSSProperties} />
          ))}
        </div>
      )}

      {/* Logo + title stage */}
      <div key={`stage-${runKey}`} className="splash-stage">
        <div className="splash-logo-wrap">
          <div className="splash-halo" />
          <div className="splash-sweep" />
          <div className="splash-logo">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" className="text-background">
              <path
                d="M2 12h4l2-6 4 12 3-8 2 4h5"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="splash-title">
          {"PulseGuard".split("").map((ch, i) => (
            <span key={i} className="splash-char" style={{ "--d": `${i * 28}ms` } as CSSProperties}>
              {ch}
            </span>
          ))}
        </div>
        <div className="splash-subtitle">AI - HEALTHCARE INTELLIGENCE</div>
      </div>
    </div>
  );
}
