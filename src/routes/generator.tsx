import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { GenAIScenarioGenerator } from "@/components/pulse/GenAIScenarioGenerator";

export const Route = createFileRoute("/generator")({
  head: () => ({
    meta: [
      { title: "Generator Scenarii GenAI — PulseGuard AI" },
      { name: "description", content: "Describe a healthcare workforce situation and generate realistic burnout risk data, forecasts, and intervention recommendations." },
      { property: "og:title", content: "Generator Scenarii GenAI — PulseGuard AI" },
      { property: "og:description", content: "AI-powered scenario synthesis for hospital workforce burnout forecasting." },
    ],
  }),
  component: GeneratorPage,
});

function GeneratorPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">GenAI Workspace</div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Generator Scenarii GenAI</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Describe a medical workforce situation in natural language and generate realistic burnout risk data, predictive forecasts, AI explanations, and intervention recommendations — then apply it to the entire dashboard.
        </p>
      </header>
      <div className="glass luminous-border rounded-2xl p-5">
        <GenAIScenarioGenerator />
      </div>
    </AppShell>
  );
}

