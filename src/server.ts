import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import { generateScenario, type GeneratScenario, type RiskDriver, type ScenarioRecommendation } from "./lib/pulse/scenario-context";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

type RuntimeEnv = {
  CORS_ORIGIN?: string;
  FOUNDRY_ENDPOINT?: string;
  FOUNDRY_API_KEY?: string;
  FOUNDRY_MODEL?: string;
  FOUNDRY_DEPLOYMENT?: string;
  AI_AGENT_ENDPOINT?: string;
  AI_AGENT_API_KEY?: string;
  AI_AGENT_MODEL?: string;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => ((m as { default?: ServerEntry }).default ?? (m as unknown as ServerEntry)),
    );
  }
  return serverEntryPromise;
}

function brandedErrorResponse(): Response {
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function getCorsOrigin(env: unknown): string | null {
  if (!env || typeof env !== "object") return null;
  const value = (env as RuntimeEnv).CORS_ORIGIN;
  if (!value || value.trim().length === 0) return null;
  return value.trim();
}

function withCorsHeaders(response: Response, corsOrigin: string | null): Response {
  if (!corsOrigin) return response;
  const headers = new Headers(response.headers);
  headers.set("Access-Control-Allow-Origin", corsOrigin);
  headers.set("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type,Authorization");
  headers.set("Vary", "Origin");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function getRuntimeString(env: unknown, ...names: string[]): string {
  const envObject = env && typeof env === "object" ? (env as Record<string, unknown>) : {};
  const processEnv = typeof process !== "undefined" ? process.env : {};

  for (const name of names) {
    const value = envObject[name] ?? processEnv[name];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return "";
}

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && !Array.isArray(value) && typeof value === "object";
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function asPriority(value: unknown): ScenarioRecommendation["priority"] {
  return value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function asSeverity(value: unknown): RiskDriver["severity"] {
  return value === "critical" || value === "high" || value === "medium" || value === "low" ? value : "medium";
}

function extractJsonObject(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function compactScenarioForAgent(scenario: GeneratScenario) {
  return {
    name: scenario.name,
    department: scenario.department,
    riskLevel: scenario.riskLevel,
    riskScore: scenario.riskScore,
    predicted14d: scenario.predicted14d,
    staffPressure: scenario.staffPressure,
    fatigueIndex: scenario.forecastSeries.at(-1)?.predictedObosealaIndex ?? scenario.riskScore,
    interventionUrgency: scenario.interventionUrgency,
    confidenceScore: scenario.confidenceScore,
    primaryDrivers: scenario.primaryDrivers,
    recommendations: scenario.recommendations,
    lastInputPoint: scenario.inputSeries.at(-1),
  };
}

type AgentAdvice = {
  explanation?: string;
  expectedImpact?: string;
  recommendations?: ScenarioRecommendation[];
  primaryDrivers?: RiskDriver[];
  followUpIndicators?: string[];
  decisionBasis?: string[];
};

type AgentIntent = {
  action: "chat" | "needs_details" | "scenario";
  message: string;
  missingInfo: string[];
};

const AGENT_ROUTER_PROMPT = `
Esti PulseGuard AI, un asistent conversational pentru operatiuni in spitale.
Rolul tau este sa vorbesti natural cu utilizatorul si sa decizi daca trebuie generat un scenariu.

Reguli obligatorii:
1. Raspunde in romana fara diacritice.
2. Nu folosi emoji, markdown, simboluri ciudate sau liste cu caractere speciale.
3. Fii prietenos si scurt cand utilizatorul doar saluta sau intreaba ceva general.
4. Impinge natural conversatia catre scopul aplicatiei: analiza riscului de epuizare in spital.
5. Daca mesajul nu are destule date pentru un scenariu, cere exact datele lipsa.
6. Daca mesajul contine suficiente date operationale, marcheaza actiunea ca "scenario".
7. Nu folosi termenul englezesc "burnout". Spune "epuizare" sau "risc de epuizare".

Alege actiunea astfel:
- "chat": salutari, conversatie generala, intrebari simple fara date despre spital.
- "needs_details": utilizatorul vrea ajutor pentru spital, dar lipsesc date importante.
- "scenario": exista context medical operational suficient, de exemplu sectie sau spital, pacienti, personal, ture, ocupare, ore suplimentare, concedii medicale, incidente sau deficit.

Intoarce strict JSON valid, fara markdown:
{
  "action": "chat | needs_details | scenario",
  "message": "raspuns conversational scurt, util si fara diacritice",
  "missingInfo": ["date lipsa, doar daca action este needs_details"]
}

Exemple de stil:
Pentru "salut ce faci": "Sunt bine, sunt aici sa te ajut sa intelegi riscul de epuizare din spital. Spune-mi sectia, cati pacienti aveti, cati oameni sunt pe tura si ce problema observi acum."
Pentru date insuficiente: "Pot sa te ajut, dar mai am nevoie de cateva detalii ca sa calculez corect riscul: sectia, numarul de pacienti, personalul disponibil, gradul de ocupare si daca exista ture de noapte sau ore suplimentare."
Pentru scenariu: "Am suficiente date ca sa generez scenariul. Calculez riscul, factorii principali si masurile pentru urmatoarele 72 de ore."
`.trim();

const AGENT_SYSTEM_PROMPT = `
Esti PulseGuard AI, un consultant operational pentru spitale.
Vorbesti cu manageri, medici coordonatori si asistenti sefi care au nevoie de decizii clare, nu de text academic.

Reguli obligatorii:
1. Raspunde in romana fara diacritice.
2. Nu folosi simboluri ciudate, markdown, emoji, bullet-uri cu caractere speciale sau linii decorative.
3. Scrie simplu si conversational, ca un om calm care explica pe inteles.
4. Nu inventa date noi. Foloseste doar problema utilizatorului si rezultatul ML primit.
5. Daca recomanzi ceva, spune de ce: leaga recomandarea de un semnal concret din date.
6. Cand explici riscul, spune ce inseamna practic pentru personal si pacienti.
7. Prioritizeaza urmatoarele 72 ore, apoi urmatoarele 14 zile.
8. Nu spune ca esti medic si nu da diagnostic medical. Vorbeste strict despre operatiuni si personal.
9. Nu folosi termenul englezesc "burnout". Spune "epuizare" sau "risc de epuizare".

Intoarce strict JSON valid, fara markdown, cu exact aceste chei:
{
  "explanation": "un raspuns conversational de 4-7 propozitii, clar, in romana fara diacritice",
  "expectedImpact": "ce se poate intampla daca nu se intervine, pe inteles",
  "primaryDrivers": [
    {
      "driverName": "nume scurt al factorului",
      "severity": "low | medium | high | critical",
      "explanation": "de ce conteaza acest factor",
      "recommendedMitigation": "ce masura directa ajuta"
    }
  ],
  "recommendations": [
    {
      "title": "actiune concreta",
      "description": "cum se aplica si de ce",
      "priority": "low | medium | high",
      "expectedImpact": "impact estimat in cuvinte simple"
    }
  ],
  "followUpIndicators": ["indicator simplu de urmarit"],
  "decisionBasis": ["explicatie scurta despre semnalul din date care a dus la decizie"]
}

Stil dorit:
- Incepe direct cu concluzia.
- Foloseste formulari de tipul: "As fi atent la...", "Prima masura ar fi...", "Decizia vine din...".
- Fiecare recomandare trebuie sa fie usor de pus in practica.
- Pastreaza textele scurte. Nu scrie paragrafe enorme.
`.trim();

function sanitizePlainText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, " ")
    .replace(/\bburnout\b/gi, "epuizare")
    .replace(/\boutputul\b/gi, "rezultatul")
    .replace(/\boutput\b/gi, "rezultat")
    .replace(/[\u2022\u00b7\u2013\u2014\u2265\u2264\u2248\u2190-\u2193]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

function sanitizeList(values: string[] | undefined): string[] | undefined {
  const out = values?.map(sanitizePlainText).filter(Boolean);
  return out?.length ? out : undefined;
}

function asCleanString(value: unknown): string | undefined {
  const text = asString(value);
  return text ? sanitizePlainText(text) : undefined;
}

function parseAgentAdvice(raw: unknown): AgentAdvice | null {
  if (!isObject(raw)) return null;

  const recommendations = Array.isArray(raw.recommendations)
    ? raw.recommendations.filter(isObject).map((item) => ({
        title: asCleanString(item.title) ?? "Revizuieste planul operational",
        description: asCleanString(item.description) ?? "Verifica datele operationale si ajusteaza turele.",
        priority: asPriority(item.priority),
        expectedImpact: asCleanString(item.expectedImpact) ?? "Impact estimat moderat",
      }))
    : undefined;

  const primaryDrivers = Array.isArray(raw.primaryDrivers)
    ? raw.primaryDrivers.filter(isObject).map((item) => ({
        driverName: asCleanString(item.driverName) ?? "Presiune operationala combinata",
        severity: asSeverity(item.severity),
        explanation: asCleanString(item.explanation) ?? "Indicatorii operationali cresc simultan.",
        recommendedMitigation: asCleanString(item.recommendedMitigation) ?? "Reechilibreaza personalul si monitorizeaza evolutia.",
      }))
    : undefined;

  const followUpIndicators = Array.isArray(raw.followUpIndicators)
    ? raw.followUpIndicators.map(asCleanString).filter((v): v is string => !!v)
    : undefined;

  const decisionBasis = Array.isArray(raw.decisionBasis)
    ? raw.decisionBasis.map(asCleanString).filter((v): v is string => !!v)
    : undefined;

  return {
    explanation: asCleanString(raw.explanation),
    expectedImpact: asCleanString(raw.expectedImpact),
    recommendations: recommendations?.length ? recommendations : undefined,
    primaryDrivers: primaryDrivers?.length ? primaryDrivers : undefined,
    followUpIndicators: sanitizeList(followUpIndicators),
    decisionBasis: sanitizeList(decisionBasis),
  };
}

function asAgentAction(value: unknown): AgentIntent["action"] {
  return value === "scenario" || value === "needs_details" || value === "chat" ? value : "chat";
}

function parseAgentIntent(raw: unknown): AgentIntent | null {
  if (!isObject(raw)) return null;

  const action = asAgentAction(raw.action);
  const missingInfo = Array.isArray(raw.missingInfo)
    ? raw.missingInfo.map(asCleanString).filter((v): v is string => !!v)
    : [];

  const defaultMessage =
    action === "scenario"
      ? "Am suficiente date ca sa generez scenariul. Calculez riscul, factorii principali si masurile pentru urmatoarele 72 de ore."
      : action === "needs_details"
        ? "Pot sa te ajut, dar mai am nevoie de cateva detalii: sectia, numarul de pacienti, personalul disponibil, ocuparea si daca exista ture de noapte sau ore suplimentare."
        : "Sunt bine, sunt aici sa te ajut sa intelegi riscul de epuizare din spital. Spune-mi sectia, pacientii, personalul si problema principala.";

  return {
    action,
    message: asCleanString(raw.message) ?? defaultMessage,
    missingInfo,
  };
}

function buildLocalIntent(prompt: string): AgentIntent {
  const p = prompt.toLowerCase();
  const hasHealthcareContext = /spital|sectie|ati|terapie intensiva|upu|urgente|chirurg|oncolog|pediatr|medic|asistent|pacient|tura|ocupare|personal|concedii medicale|ore suplimentare|epuizare/.test(p);
  const signalCount = [
    /\d+/.test(p),
    /pacient|internar|ocupare|capacitate/.test(p),
    /medic|asistent|personal|echipa/.test(p),
    /tura|noapte|weekend|program/.test(p),
    /ore suplimentare|concedii medicale|deficit|lipsa|incident|stres|epuizare/.test(p),
  ].filter(Boolean).length;

  if (hasHealthcareContext && signalCount >= 3) {
    return {
      action: "scenario",
      message: "Am suficiente date ca sa generez scenariul. Calculez riscul, factorii principali si masurile pentru urmatoarele 72 de ore.",
      missingInfo: [],
    };
  }

  if (hasHealthcareContext) {
    return {
      action: "needs_details",
      message: "Pot sa te ajut, dar mai am nevoie de cateva detalii ca sa calculez corect riscul: sectia, numarul de pacienti, personalul disponibil, gradul de ocupare si daca exista ture de noapte sau ore suplimentare.",
      missingInfo: [
        "Sectia sau zona spitalului",
        "Numarul de pacienti",
        "Cati medici si asistente sunt pe tura",
        "Gradul de ocupare",
        "Ture de noapte, ore suplimentare sau concedii medicale",
      ],
    };
  }

  return {
    action: "chat",
    message: "Sunt bine, sunt aici sa te ajut sa intelegi riscul de epuizare din spital. Spune-mi sectia, cati pacienti aveti, cati oameni sunt pe tura si ce problema observi acum.",
    missingInfo: [],
  };
}

function getFoundryConfig(env: unknown) {
  const endpoint = getRuntimeString(env, "FOUNDRY_ENDPOINT", "AI_AGENT_ENDPOINT").replace(/\/+$/, "");
  const apiKey = getRuntimeString(env, "FOUNDRY_API_KEY", "AI_AGENT_API_KEY");
  const deployment = getRuntimeString(env, "FOUNDRY_DEPLOYMENT", "FOUNDRY_MODEL", "AI_AGENT_MODEL");
  if (!endpoint || !apiKey || !deployment) return null;
  return {
    url: endpoint.endsWith("/chat/completions") ? endpoint : `${endpoint}/chat/completions`,
    apiKey,
    deployment,
  };
}

async function callFoundryJson(systemPrompt: string, payload: unknown, env: unknown, maxTokens: number, temperature: number): Promise<unknown> {
  const config = getFoundryConfig(env);
  if (!config) return null;

  const response = await fetch(config.url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      "api-key": config.apiKey,
    },
    body: JSON.stringify({
      model: config.deployment,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(payload) },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Foundry request failed ${response.status}: ${body.slice(0, 300)}`);
  }

  const foundryPayload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = foundryPayload.choices?.[0]?.message?.content;
  return content ? extractJsonObject(content) : null;
}

async function askFoundryForIntent(prompt: string, env: unknown): Promise<AgentIntent | null> {
  const raw = await callFoundryJson(
    AGENT_ROUTER_PROMPT,
    {
      userMessage: prompt,
      instruction:
        "Raspunde conversational si decide daca trebuie doar sa raspunzi, sa ceri detalii sau sa generezi un scenariu operational.",
    },
    env,
    700,
    0.25,
  );
  return parseAgentIntent(raw);
}

async function askFoundryForAdvice(prompt: string, scenario: GeneratScenario, env: unknown): Promise<AgentAdvice | null> {
  const raw = await callFoundryJson(
    AGENT_SYSTEM_PROMPT,
    {
      userProblem: prompt,
      mlOutput: compactScenarioForAgent(scenario),
      instruction:
        "Pe baza problemei utilizatorului si a rezultatului ML, da un raspuns conversational, explica riscurile, spune la ce trebuie sa fie atent, propune actiuni concrete si explica de unde vin deciziile.",
    },
    env,
    1200,
    0.2,
  );
  return parseAgentAdvice(raw);
}

async function handleGenerateScenario(request: Request, env: unknown, corsOrigin: string | null): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withCorsHeaders(Response.json({ ok: false, error: "JSON invalid." }, { status: 400 }), corsOrigin);
  }

  const prompt = isObject(body) ? asString(body.prompt) : undefined;
  if (!prompt) {
    return withCorsHeaders(Response.json({ ok: false, error: "Lipseste promptul." }, { status: 400 }), corsOrigin);
  }

  let source: "foundry" | "local" = "local";
  let agentError: string | undefined;
  const localIntent = buildLocalIntent(prompt);
  let intent = localIntent;

  try {
    const foundryIntent = await askFoundryForIntent(prompt, env);
    if (foundryIntent) {
      source = "foundry";
      if (localIntent.action === "chat" && foundryIntent.action === "scenario") {
        intent = localIntent;
      } else {
        intent = localIntent.action === "scenario" && foundryIntent.action !== "scenario" ? localIntent : foundryIntent;
      }
    }
  } catch (error) {
    agentError = error instanceof Error ? error.message : "Foundry router request failed.";
    console.error(agentError);
  }

  if (intent.action !== "scenario") {
    return withCorsHeaders(
      Response.json({
        ok: true,
        source,
        mode: intent.action,
        message: intent.message,
        missingInfo: intent.missingInfo,
        agentError,
      }),
      corsOrigin,
    );
  }

  const baseScenario = generateScenario(prompt);

  try {
    const advice = await askFoundryForAdvice(prompt, baseScenario, env);
    if (advice) {
      source = "foundry";
      baseScenario.explanation = advice.explanation ?? baseScenario.explanation;
      baseScenario.expectedImpact = advice.expectedImpact ?? baseScenario.expectedImpact;
      baseScenario.recommendations = advice.recommendations ?? baseScenario.recommendations;
      baseScenario.primaryDrivers = advice.primaryDrivers ?? baseScenario.primaryDrivers;
      baseScenario.followUpIndicators = advice.followUpIndicators ?? baseScenario.followUpIndicators;
      if (advice.decisionBasis?.length) {
        baseScenario.decisionBasis = Array.from(new Set([...advice.decisionBasis, ...baseScenario.decisionBasis])).slice(0, 8);
      }
    }
  } catch (error) {
    agentError = error instanceof Error ? error.message : "Foundry advice request failed.";
    console.error(agentError);
  }

  return withCorsHeaders(
    Response.json({
      ok: true,
      source,
      mode: "scenario",
      message: intent.message,
      scenario: baseScenario,
      agentError,
    }),
    corsOrigin,
  );
}

function isCatastrophicSsrErrorBody(body: string, responseStatus: number): boolean {
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return false;
  }

  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return false;
  }

  const fields = payload as Record<string, unknown>;
  const expectedKeys = new Set(["message", "status", "unhandled"]);
  if (!Object.keys(fields).every((key) => expectedKeys.has(key))) {
    return false;
  }

  return (
    fields.unhandled === true &&
    fields.message === "HTTPError" &&
    (fields.status === undefined || fields.status === responseStatus)
  );
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} - try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isCatastrophicSsrErrorBody(body, response.status)) {
    return response;
  }

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return brandedErrorResponse();
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const corsOrigin = getCorsOrigin(env);

    if (url.pathname === "/health") {
      return withCorsHeaders(
        Response.json({
          ok: true,
          service: "pulseguard",
          timestamp: new Date().toISOString(),
        }),
        corsOrigin,
      );
    }

    if (request.method === "OPTIONS") {
      return withCorsHeaders(new Response(null, { status: 204 }), corsOrigin);
    }

    if (url.pathname === "/api/generate-scenario" && request.method === "POST") {
      return handleGenerateScenario(request, env, corsOrigin);
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      const normalized = await normalizeCatastrophicSsrResponse(response);
      return withCorsHeaders(normalized, corsOrigin);
    } catch (error) {
      console.error(error);
      return withCorsHeaders(brandedErrorResponse(), corsOrigin);
    }
  },
};
