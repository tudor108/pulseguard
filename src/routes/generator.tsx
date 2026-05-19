import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/pulse/AppShell";
import { GenAIScenarioGenerator } from "@/components/pulse/GenAIScenarioGenerator";

export const Route = createFileRoute("/generator")({
  head: () => ({
    meta: [
      { title: "Generator Scenarii GenAI - PulseGuard AI" },
      {
        name: "description",
        content:
          "Descrie o situatie operationala din spital si genereaza date de risc, prognoze si recomandari de interventie.",
      },
      { property: "og:title", content: "Generator Scenarii GenAI - PulseGuard AI" },
      {
        property: "og:description",
        content: "Sinteza asistata de AI pentru scenarii de risc de epuizare in spital.",
      },
    ],
  }),
  component: GeneratorPage,
});

function GeneratorPage() {
  return (
    <AppShell>
      <header className="mb-6 animate-fade-up">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Spatiu GenAI
        </div>
        <h1 className="mt-2 text-2xl lg:text-3xl font-semibold">Generator Scenarii GenAI</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Scrie natural ce se intampla in spital. Agentul raspunde conversational, genereaza
          scenariul cand are date suficiente si il poate aplica in tot panoul.
        </p>
      </header>
      <div className="glass luminous-border rounded-2xl p-5">
        <GenAIScenarioGenerator />
      </div>
    </AppShell>
  );
}
