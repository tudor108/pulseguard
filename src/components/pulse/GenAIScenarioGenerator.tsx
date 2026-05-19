import { useState, useRef, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Wand2,
  Loader2,
  CheckCircle2,
  Eraser,
  Lightbulb,
  FlaskConical,
  Activity,
  ShieldAlert,
  FileText,
  RotateCw,
  Save,
  Download,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActiveScenario, type GeneratScenario } from "@/lib/pulse/scenario-context";
import { usePulseStore } from "@/lib/pulse/app-state";

const CHIPS = [
  "ATI aglomerat",
  "UPU supraaglomerat",
  "Weekend fara personal",
  "Oboseala ture noapte",
  "Deficit personal",
  "Volum mare pacienti",
];

const EXAMPLE_PROMPTS = [
  "Avem un spital cu 120 pacienti, dintre care 35 sunt la ATI. In ATI sunt 8 medici si 18 asistente, dar in ultimele 7 zile au fost multe ture de noapte consecutive si ore suplimentare peste 12 ore pe saptamana. Gradul de ocupare este 96%, avem 5 concedii medicale, iar personalul spune ca este epuizat. Vreau sa stiu riscul si ce masuri sa iau in urmatoarele 72 de ore.",
  "UPU are 180 pacienti pe zi, triajul este blocat intre 22:00 si 04:00, sunt doar 6 medici pe tura si 14 asistente. Au crescut incidentele raportate si exista deficit de personal in weekend.",
  "Sectia de chirurgie are 70 pacienti, 3 echipe operatorii incomplete, 4 asistente lipsa si multe ore suplimentare. Gradul de ocupare este 91%, iar recuperarea intre ture este sub 9 ore.",
  "Oncologia are personal stabil, dar echipa raporteaza stres ridicat dupa mai multe cazuri dificile. Vreau sa stiu ce indicatori ar trebui monitorizati si cum reduc riscul de epuizare.",
  "Pediatria are mai multe internari in weekend, acoperire slaba si ore suplimentare. Vreau un plan simplu pentru urmatoarele 7 zile.",
];

const GEN_STEPS = [
  "Inteleg mesajul...",
  "Verific daca sunt suficiente date...",
  "Aleg modul potrivit...",
  "Pregatesc raspunsul agentului...",
  "Actualizez panoul daca e cazul...",
];

type GenerateScenarioResponse = {
  ok: boolean;
  source?: "foundry" | "local";
  mode?: "chat" | "needs_details" | "scenario" | "out_of_scope" | "security_refusal";
  message?: string;
  missingInfo?: string[];
  scenario?: GeneratScenario;
  agentError?: string;
  error?: string;
};

type AgentRunResult = {
  mode: "chat" | "needs_details" | "scenario" | "out_of_scope" | "security_refusal";
  message?: string;
  missingInfo: string[];
  source: "foundry" | "local";
  scenario?: GeneratScenario;
  agentError?: string;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: string;
};

function localConversationFallback(
  prompt: string,
  fallback: (prompt: string) => GeneratScenario,
): AgentRunResult {
  const text = prompt.toLowerCase();
  const hasHealthcareContext =
    /spital|sectie|ati|terapie intensiva|upu|urgente|chirurg|oncolog|pediatr|medic|asistent|pacient|tura|ocupare|personal|concedii medicale|ore suplimentare|epuizare/.test(
      text,
    );
  const signalCount = [
    /\d+/.test(text),
    /pacient|internar|ocupare|capacitate/.test(text),
    /medic|asistent|personal|echipa/.test(text),
    /tura|noapte|weekend|program/.test(text),
    /ore suplimentare|concedii medicale|deficit|lipsa|incident|stres|epuizare/.test(text),
  ].filter(Boolean).length;

  if (hasHealthcareContext && signalCount >= 3) {
    return {
      mode: "scenario",
      source: "local",
      missingInfo: [],
      message: "Am suficiente date ca sa generez scenariul. Calculez riscul si masurile utile.",
      scenario: fallback(prompt),
    };
  }

  if (hasHealthcareContext) {
    return {
      mode: "needs_details",
      source: "local",
      missingInfo: [
        "Sectia sau zona spitalului",
        "Numarul de pacienti",
        "Cati medici si asistente sunt pe tura",
        "Gradul de ocupare",
        "Ture de noapte, ore suplimentare sau concedii medicale",
      ],
      message: "Pot sa te ajut, dar mai am nevoie de cateva detalii ca sa calculez corect riscul.",
    };
  }

  return {
    mode: "chat",
    source: "local",
    missingInfo: [],
    message:
      "Sunt bine, sunt aici sa te ajut sa intelegi riscul de epuizare din spital. Spune-mi sectia, pacientii, personalul disponibil si problema principala.",
  };
}

async function generateScenarioWithAgent(
  prompt: string,
  fallback: (prompt: string) => GeneratScenario,
): Promise<AgentRunResult> {
  try {
    const response = await fetch("/api/generate-scenario", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ prompt }),
    });
    const payload = (await response.json()) as GenerateScenarioResponse;
    if (!response.ok || !payload.ok || !payload.scenario) {
      if (
        payload.mode === "chat" ||
        payload.mode === "needs_details" ||
        payload.mode === "out_of_scope" ||
        payload.mode === "security_refusal"
      ) {
        return {
          mode: payload.mode,
          message: payload.message,
          missingInfo: payload.missingInfo ?? [],
          source: payload.source ?? "local",
          agentError: payload.agentError,
        };
      }
      throw new Error(payload.error ?? "Agentul nu a putut raspunde.");
    }
    return {
      mode: "scenario",
      message: payload.message,
      missingInfo: payload.missingInfo ?? [],
      scenario: payload.scenario,
      source: payload.source ?? "local",
      agentError: payload.agentError,
    };
  } catch (error) {
    const local = localConversationFallback(prompt, fallback);
    return {
      ...local,
      agentError: error instanceof Error ? error.message : "Agentul nu a raspuns.",
    };
  }
}

export function GenAIScenarioGenerator() {
  const { active, setActive, generateFromPrompt } = useActiveScenario();
  const { saveScenario } = usePulseStore();
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [step, setStep] = useState(0);
  const [pending, setPending] = useState<GeneratScenario | null>(null);
  const [assistantReply, setAssistantReply] = useState<AgentRunResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const navigate = useNavigate();

  const start = (prompt: string) => {
    const text = prompt.trim();
    if (!text) {
      toast.error("Scrie intai situatia", {
        description: "Include sectia, pacientii, personalul si problema principala.",
      });
      taRef.current?.focus();
      return;
    }
    setChatMessages((messages) => [
      ...messages,
      { id: `u-${Date.now()}`, role: "user", content: text },
    ]);
    setInput("");
    setGenerating(true);
    setStep(0);
    setPending(null);
    setAssistantReply(null);
    GEN_STEPS.forEach((_, i) => {
      window.setTimeout(() => setStep(i + 1), (i + 1) * 320);
    });
    window.setTimeout(
      async () => {
        const result = await generateScenarioWithAgent(text, generateFromPrompt);
        setAssistantReply(result);
        if (result.mode === "scenario" && result.scenario) {
          setPending(result.scenario);
        }
        setChatMessages((messages) => [
          ...messages,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content:
              result.message ??
              (result.mode === "scenario"
                ? "Am generat scenariul si am actualizat panoul de analiza."
                : "Sunt aici sa te ajut."),
            meta:
              result.mode === "scenario"
                ? "Scenariu generat"
                : result.mode === "needs_details"
                  ? "Cere detalii"
                  : result.mode === "security_refusal"
                    ? "Refuz securitate"
                    : result.mode === "out_of_scope"
                      ? "In afara domeniului"
                      : "Conversatie",
          },
        ]);
        setGenerating(false);
        toast.success(result.mode === "scenario" ? "Scenariu generat" : "Agentul a raspuns", {
          description: result.mode === "scenario" ? result.scenario?.name : result.message,
        });
        if (result.agentError) {
          toast.warning("Agentul a folosit fallback local", {
            description: "Raspunsul a ramas limitat la domeniul PulseGuard AI.",
          });
        }
      },
      GEN_STEPS.length * 320 + 250,
    );
  };

  const apply = (scenario: GeneratScenario) => {
    setActive(scenario);
    saveScenario(scenario);
    toast.success("Panoul a fost actualizat", {
      description: `${scenario.name} - ${scenario.department}`,
    });
  };

  const useExample = () => {
    const ex = EXAMPLE_PROMPTS[Math.floor(Math.random() * EXAMPLE_PROMPTS.length)];
    setInput(ex);
    taRef.current?.focus();
  };

  const clear = () => {
    setInput("");
    setPending(null);
    setAssistantReply(null);
    setChatMessages([]);
    taRef.current?.focus();
  };

  useEffect(() => {
    taRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <header className="flex items-start gap-3">
        <div className="relative">
          <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-[var(--cyan-glow)] to-[var(--indigo-glow)] ring-glow">
            <Wand2 className="h-5 w-5 text-background" />
          </div>
          <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-success ring-2 ring-background animate-pulse-soft" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
            PulseGuard GenAI - Engine v2.4
          </div>
          <h2 className="mt-0.5 text-base font-semibold leading-tight">
            Agent Conversational GenAI
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Poti saluta, poti cere ajutor sau poti descrie problema spitalului. Agentul raspunde si
            genereaza scenarii cand are date suficiente.
          </p>
        </div>
      </header>

      {/* Prompt input */}
      <div className="relative rounded-2xl border border-border/60 bg-secondary/30 focus-within:ring-2 focus-within:ring-[var(--cyan-glow)]/40 focus-within:border-[var(--cyan-glow)]/50 transition">
        <textarea
          ref={taRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              start(input);
            }
          }}
          rows={4}
          placeholder="Scrie natural: salut, ajuta-ma cu un spital aglomerat sau descrie direct situatia cu pacienti, personal, ture si ocupare."
          className="w-full resize-none bg-transparent px-4 py-3.5 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none"
          aria-label="Mesaj catre agent"
        />
        <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3 pt-1 border-t border-border/40">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setInput((v) => (v ? `${v.replace(/\s+$/, "")} - ${c}` : c))}
              className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-secondary/40 px-2 py-0.5 text-[10.5px] text-muted-foreground hover:text-foreground hover:border-[var(--cyan-glow)]/60 hover:bg-secondary/70 transition"
            >
              <Sparkles className="h-2.5 w-2.5 text-[var(--cyan-glow)]" /> {c}
            </button>
          ))}
        </div>
      </div>

      {/* Action row */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => start(input)}
          disabled={generating}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-4 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-70"
        >
          {generating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Wand2 className="h-3.5 w-3.5" />
          )}
          {generating ? "Agentul raspunde..." : "Trimite mesaj"}
        </button>
        <button
          onClick={useExample}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <Lightbulb className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Exemplu
        </button>
        <button
          onClick={clear}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <Eraser className="h-3.5 w-3.5" /> Sterge
        </button>
      </div>

      {/* Generation steps */}
      {generating && (
        <div className="rounded-2xl border border-border/60 glass-strong p-4 animate-fade-up">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-[var(--cyan-glow)]" /> Agentul analizeaza
          </div>
          <ol className="mt-3 space-y-2">
            {GEN_STEPS.map((s, i) => {
              const done = i < step;
              const active = i === step;
              return (
                <li
                  key={s}
                  className={cn(
                    "flex items-center gap-2.5 text-sm transition-opacity",
                    !done && !active && "opacity-40",
                  )}
                >
                  {done ? (
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 text-[var(--cyan-glow)] shrink-0 animate-spin" />
                  ) : (
                    <span className="h-4 w-4 rounded-full border border-border/60 shrink-0" />
                  )}
                  <span className={cn(active && "text-foreground caret")}>{s}</span>
                </li>
              );
            })}
          </ol>
        </div>
      )}

      {/* Result panel */}
      {chatMessages.length > 0 && (
        <ChatThread messages={chatMessages} latestReply={assistantReply} generating={generating} />
      )}
      {pending && !generating && (
        <ResultPanel
          scenario={pending}
          active={active}
          onAplica={() => apply(pending)}
          onRegenerate={() => start(pending.prompt)}
          onReport={() => {
            apply(pending);
            navigate({ to: "/forecast-report" });
          }}
        />
      )}

      {/* Empty state */}
      {!pending && chatMessages.length === 0 && !generating && !active && (
        <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center">
          <FlaskConical className="mx-auto h-6 w-6 text-[var(--cyan-glow)]" />
          <div className="mt-2 text-sm font-medium">Agentul este pregatit</div>
          <p className="mt-1 text-xs text-muted-foreground max-w-md mx-auto">
            Scrie un mesaj simplu sau descrie situatia echipei. Agentul raspunde conversational si
            genereaza scenariu cand are destule date.
          </p>
        </div>
      )}

      {/* Active context */}
      {active && !pending && chatMessages.length === 0 && (
        <div className="rounded-2xl border border-border/60 bg-secondary/20 p-4 flex items-start gap-3">
          <ShieldAlert className="h-4 w-4 text-[var(--cyan-glow)] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              Scenariu activ
            </div>
            <div className="text-sm font-medium truncate">{active.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {active.department} - risc {active.riskScore}/100 - incredere {active.confidenceScore}
              %
            </div>
          </div>
          <button
            onClick={() => setActive(null)}
            className="text-[11px] text-muted-foreground hover:text-foreground transition"
          >
            Sterge
          </button>
        </div>
      )}
    </div>
  );
}

function ChatThread({
  messages,
  latestReply,
  generating,
}: {
  messages: ChatMessage[];
  latestReply: AgentRunResult | null;
  generating: boolean;
}) {
  const needsDetails = latestReply?.mode === "needs_details";

  return (
    <article className="rounded-2xl border border-border/60 glass-strong p-4 animate-fade-up space-y-3">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" />
            Conversatie PulseGuard
          </div>
          <h3 className="mt-1 text-base font-semibold leading-tight">
            {needsDetails ? "Mai am nevoie de cateva date" : "Chat operational"}
          </h3>
        </div>
        <span className="rounded-full border border-[var(--cyan-glow)]/30 bg-[var(--cyan-glow)]/10 px-2.5 py-1 text-[10px] text-[var(--cyan-glow)]">
          {latestReply?.source === "foundry" ? "Llama 4" : "Local"}
        </span>
      </header>

      <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed shadow-sm",
                message.role === "user"
                  ? "bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] text-background"
                  : "border border-border/60 bg-secondary/35 text-foreground/90",
              )}
            >
              {message.meta && (
                <div className="mb-1 text-[10px] uppercase tracking-[0.16em] opacity-70">
                  {message.meta}
                </div>
              )}
              {message.content}
            </div>
          </div>
        ))}
        {generating && (
          <div className="flex justify-start">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-border/60 bg-secondary/35 px-3.5 py-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--cyan-glow)]" />
              Agentul scrie raspunsul...
            </div>
          </div>
        )}
      </div>

      {latestReply?.missingInfo.length ? (
        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Date utile pentru scenariu
          </div>
          <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {latestReply.missingInfo.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2 text-[11px] leading-relaxed"
              >
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-[var(--cyan-glow)] shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function ResultPanel({
  scenario,
  active,
  onAplica,
  onRegenerate,
  onReport,
}: {
  scenario: GeneratScenario;
  active: GeneratScenario | null;
  onAplica: () => void;
  onRegenerate: () => void;
  onReport: () => void;
}) {
  const isApplied = active?.id === scenario.id;
  const riskLabel: Record<GeneratScenario["riskLevel"], string> = {
    stable: "stabil",
    low: "scazut",
    moderate: "moderat",
    elevated: "ridicat",
    critical: "critic",
  };
  const severityLabel: Record<string, string> = {
    low: "scazut",
    medium: "mediu",
    high: "ridicat",
    critical: "critic",
  };
  const riskTone =
    scenario.riskLevel === "critical"
      ? "bg-danger/15 text-danger border-danger/30"
      : scenario.riskLevel === "elevated"
        ? "bg-warning/15 text-warning border-warning/30"
        : scenario.riskLevel === "moderate"
          ? "bg-warning/10 text-warning border-warning/20"
          : "bg-success/15 text-success border-success/30";

  return (
    <article className="rounded-2xl border border-border/60 glass-strong p-5 animate-fade-up space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground inline-flex items-center gap-2">
            <Sparkles className="h-3 w-3 text-[var(--cyan-glow)]" /> Scenariu generat
            {isApplied && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[var(--cyan-glow)]/40 bg-[var(--cyan-glow)]/10 px-1.5 py-0.5 text-[9px] text-[var(--cyan-glow)]">
                <CheckCircle2 className="h-2.5 w-2.5" /> Aplicat
              </span>
            )}
          </div>
          <h3 className="mt-1 text-lg font-semibold leading-tight">{scenario.name}</h3>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
            <span>{scenario.department}</span>
            <span>-</span>
            <span>Orizont prognoza {scenario.forecastHorizon} zile</span>
            <span>-</span>
            <span>Incredere {scenario.confidenceScore}%</span>
            <span>-</span>
            <span suppressHydrationWarning>
              Generat{" "}
              {new Date(scenario.generatedAt).toLocaleTimeString("ro-RO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          </div>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border self-start",
            riskTone,
          )}
        >
          <Activity className="h-3.5 w-3.5" /> {riskLabel[scenario.riskLevel]} -{" "}
          {scenario.riskScore}/100
        </span>
      </header>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Risc curent", v: scenario.riskScore },
          { label: "Prognoza 14 zile", v: scenario.predicted14d },
          { label: "Presiune personal", v: scenario.staffPressure },
          { label: "Urgenta interventie", v: scenario.interventionUrgency },
        ].map((k) => (
          <div key={k.label} className="rounded-lg border border-border/60 bg-secondary/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              {k.label}
            </div>
            <div className="mt-0.5 text-lg font-semibold tabular-nums">
              {k.v}
              <span className="text-[10px] text-muted-foreground">/100</span>
            </div>
          </div>
        ))}
      </div>

      {/* Explanation */}
      <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Explicatia agentului
        </div>
        <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{scenario.explanation}</p>
        <p className="mt-2 text-xs text-muted-foreground italic">{scenario.expectedImpact}</p>
      </section>

      {scenario.decisionBasis.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            De unde vin deciziile
          </div>
          <ul className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-1.5">
            {scenario.decisionBasis.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2 text-[11px] leading-relaxed"
              >
                <CheckCircle2 className="h-3 w-3 mt-0.5 text-[var(--cyan-glow)] shrink-0" /> {item}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Drivers + recomandari */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Factori principali
          </div>
          <ul className="mt-2 space-y-2">
            {scenario.primaryDrivers.map((d, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 animate-stagger"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm font-medium">{d.driverName}</div>
                  <span
                    className={cn(
                      "text-[9px] uppercase tracking-wider rounded-full px-1.5 py-0.5 border",
                      d.severity === "critical"
                        ? "border-danger/40 text-danger bg-danger/10"
                        : d.severity === "high"
                          ? "border-warning/40 text-warning bg-warning/10"
                          : "border-border/60 text-muted-foreground bg-secondary/40",
                    )}
                  >
                    {severityLabel[d.severity] ?? d.severity}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground leading-relaxed">
                  {d.explanation}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            Recomandari
          </div>
          <ol className="mt-2 space-y-2">
            {scenario.recommendations.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-border/60 bg-secondary/30 p-2.5 flex gap-2.5 animate-stagger"
                style={{ animationDelay: `${i * 0.06}s` }}
              >
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-secondary text-[10px] font-semibold">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-medium leading-tight">{r.title}</div>
                  <div className="text-[11px] text-muted-foreground mt-0.5">{r.description}</div>
                  <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-[var(--cyan-glow)]">
                    {r.expectedImpact}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* Follow-up indicators */}
      <section className="rounded-xl border border-border/60 bg-secondary/20 p-3.5">
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          Indicatori de urmarit
        </div>
        <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {scenario.followUpIndicators.map((s) => (
            <li
              key={s}
              className="flex items-start gap-2 rounded-lg border border-border/60 bg-secondary/30 p-2 text-[11px]"
            >
              <CheckCircle2 className="h-3 w-3 mt-0.5 text-success shrink-0" /> {s}
            </li>
          ))}
        </ul>
      </section>

      {/* Actions */}
      <footer className="flex flex-wrap gap-2 pt-1">
        <button
          onClick={onAplica}
          disabled={isApplied}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-[var(--cyan-glow)] to-[var(--indigo-glow)] px-3.5 py-2 text-xs font-semibold text-background ring-glow disabled:opacity-60"
        >
          <ArrowRight className="h-3.5 w-3.5" />{" "}
          {isApplied ? "Aplicat in panou" : "Aplica in panou"}
        </button>
        <button
          onClick={onReport}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <FileText className="h-3.5 w-3.5" /> Genereaza raport
        </button>
        <button
          onClick={onRegenerate}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <RotateCw className="h-3.5 w-3.5" /> Regenerare
        </button>
        <button
          onClick={() => {
            onAplica();
            toast.success("Scenariu salvat", { description: scenario.name });
          }}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <Save className="h-3.5 w-3.5" /> Salveaza
        </button>
        <button
          onClick={() => toast("Scenariu exportat", { description: `${scenario.name}.json` })}
          className="btn-glow inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-secondary/40 px-3.5 py-2 text-xs hover:bg-secondary/70 transition"
        >
          <Download className="h-3.5 w-3.5" /> Exporta
        </button>
      </footer>
    </article>
  );
}
