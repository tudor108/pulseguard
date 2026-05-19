import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { TimeSeriesInput, ForecastOutput, RiskLevel } from "./services/types";
import { buildTimeSeries } from "./services/timeseries";
import { buildForecastOutput } from "./services/forecast";
import { loadActiveScenario, saveActiveScenario } from "./services/scenario-service";

export type RiskDriver = {
  driverName: string;
  severity: "low" | "medium" | "high" | "critical";
  explanation: string;
  recommendedMitigation: string;
};

export type ScenarioRecommendation = {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
  expectedImpact: string;
};

export type ScenarioAlert = {
  title: string;
  severity: "warning" | "critical" | "info";
  department: string;
  primaryDriver: string;
  timestamp: string;
};

export type GeneratScenario = {
  id: string;
  name: string;
  department: string;
  generatedAt: string;
  forecastHorizon: number; // days
  riskLevel: RiskLevel;
  riskScore: number; // 0-100
  predicted14d: number;
  staffPressure: number;
  interventionUrgency: number;
  confidenceScore: number; // 0-100
  inputSeries: TimeSeriesInput[];
  forecastSeries: ForecastOutput[];
  primaryDrivers: RiskDriver[];
  recommendations: ScenarioRecommendation[];
  followUpIndicators: string[];
  decisionBasis: string[];
  explanation: string;
  expectedImpact: string;
  alerts: ScenarioAlert[];
  prompt: string;
};

type Ctx = {
  active: GeneratScenario | null;
  setActive: (s: GeneratScenario | null) => void;
  generateFromPrompt: (prompt: string) => GeneratScenario;
};

const ScenarioCtx = createContext<Ctx | null>(null);

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function detectContext(prompt: string) {
  const p = prompt.toLowerCase();
  const occupancyMatch = p.match(
    /(?:ocupare|gradul de ocupare|occupancy|capacitate)[^\d]{0,30}(\d{2,3})\s*%?|(\d{2,3})\s*%?\s*(?:ocupare|gradul de ocupare|occupancy|capacitate)/,
  );
  const patientMatch = p.match(/(\d{2,4})\s*(?:de\s+)?pacienti/);
  const doctorMatch = p.match(/(\d+)\s*(?:de\s+)?(?:medici|doctori|doctors?)/);
  const nurseMatch = p.match(/(\d+)\s*(?:de\s+)?(?:asistenti|asistente|nurses?)/);
  const overtimeHoursMatch = p.match(
    /(\d{1,3})\s*(?:de\s+)?ore\s+suplimentare|ore\s+suplimentare[^\d]{0,30}(\d{1,3})/,
  );
  const nightShiftCountMatch = p.match(
    /(\d{1,2})\s*(?:de\s+)?ture\s+de\s+noapte|ture\s+de\s+noapte[^\d]{0,30}(\d{1,2})/,
  );
  const occupancy = occupancyMatch ? Number(occupancyMatch[1] ?? occupancyMatch[2]) : 0;
  const patientCount = patientMatch ? Number(patientMatch[1]) : 0;
  const doctorCount = doctorMatch ? Number(doctorMatch[1]) : 0;
  const nurseCount = nurseMatch ? Number(nurseMatch[1]) : 0;
  const overtimeHours = overtimeHoursMatch
    ? Number(overtimeHoursMatch[1] ?? overtimeHoursMatch[2])
    : 0;
  const nightShiftCount = nightShiftCountMatch
    ? Number(nightShiftCountMatch[1] ?? nightShiftCountMatch[2])
    : 0;
  const clinicalStaff = doctorCount + nurseCount;
  const patientStaffRatio = clinicalStaff ? patientCount / clinicalStaff : 0;
  const dept = /ati|terapie intensiva|icu|intensive/.test(p)
    ? "Unitate Terapie Intensiva - Turn B"
    : /upu|urgente|camera de garda|emergency|er\b|ed\b/.test(p)
      ? "Departament Urgente - Parter"
      : /chirurg|surg/.test(p)
        ? "Sectie Chirurgie - Turn A"
        : /oncolog/.test(p)
          ? "Oncologie - Turn A L4"
          : /pediatr/.test(p)
            ? "Pediatrie - Turn C"
            : /maternitate|maternity/.test(p)
              ? "Maternitate - Turn C L1"
              : /psihiatr|psych/.test(p)
                ? "Psihiatrie - Turn D L2"
                : "Multi-sectie - Spital";

  const nightShift =
    /ture\s+de\s+noapte|ture-\s+de\s+noapte|tura\s+de\s+noapte|nocturn|night\s*shift|overnight/.test(
      p,
    );
  const overtime = /ore\s+suplimentare|peste\s+program|overtime|long hours|12h|14h/.test(p);
  const sickLeave = /concedii\s+medicale?|absente|medical leave|sick leave|sick/.test(p);
  const inferredShortage =
    patientCount > 0 &&
    clinicalStaff > 0 &&
    patientStaffRatio >= (/ati|terapie intensiva|icu|intensive/.test(p) ? 2.5 : 4);
  const shortage =
    /deficit|lipsa|personal\s+insuficient|subdimensionat|short|underst|vacanc|missing|shortage/.test(
      p,
    ) ||
    sickLeave ||
    inferredShortage;
  const highOccupancy = occupancy >= 90;
  const highPatientVolume = patientCount >= 100;
  const surge =
    /aglomer|supraaglomer|multi\s+pacienti|pacienti\s+multi|volum|crestere|surge|spike|volume|influx|crowd/.test(
      p,
    ) ||
    highOccupancy ||
    highPatientVolume;
  const weekend = /weekend|sambata|duminica|sat|sun/.test(p);
  const emotional = /epuizare|burnout|stres|emotional|wellbeing|bereave|moral/.test(p);

  let base = 55;
  if (
    /critic|risc\s+mare|ridicat|sever|supraincarc|aglomerat|criza|critical|high.-risk|severe|overload|crisis/.test(
      p,
    )
  )
    base = 82;
  else if (/moderat|mediu|moderate|medium/.test(p)) base = 58;
  else if (/scazut|stabil|usor|low|stable|mild/.test(p)) base = 38;
  if (nightShift) base += 6;
  if (overtime) base += 7;
  if (shortage) base += 9;
  if (surge) base += 8;
  if (weekend) base += 4;
  if (emotional) base += 3;
  if (highOccupancy) base += 4;
  if (sickLeave) base += 3;
  base = Math.min(96, Math.max(22, base));

  const riskLevel: RiskLevel =
    base >= 78
      ? "critical"
      : base >= 62
        ? "elevated"
        : base >= 44
          ? "moderate"
          : base >= 26
            ? "low"
            : "stable";

  return {
    dept,
    riskScore: base,
    riskLevel,
    nightShift,
    overtime,
    shortage,
    surge,
    weekend,
    emotional,
    highOccupancy,
    highPatientVolume,
    sickLeave,
    occupancy,
    patientCount,
    doctorCount,
    nurseCount,
    clinicalStaff,
    patientStaffRatio,
    overtimeHours,
    nightShiftCount,
  };
}

export function generateScenario(prompt: string): GeneratScenario {
  const ctx = detectContext(prompt);
  const horizon = 14;
  const id = `gen-${Date.now()}`;
  const now = new Date();
  const confidence = 84 + Math.round(Math.random() * 10);

  const inputSeries = buildTimeSeries(30).map((p, i, arr) => {
    const ramp = i / arr.length;
    return {
      ...p,
      overtimeHours: Math.round(p.overtimeHours * (ctx.overtime ? 1.2 + ramp * 0.4 : 1)),
      nightShiftCount: Math.round(p.nightShiftCount * (ctx.nightShift ? 1.3 + ramp * 0.3 : 1)),
      patientToStaffRatio: +(
        p.patientToStaffRatio * (ctx.shortage || ctx.surge ? 1.15 + ramp * 0.2 : 1)
      ).toFixed(2),
      stressSurveyScore: +(p.stressSurveyScore + (ctx.emotional ? 0.4 + ramp * 0.5 : 0)).toFixed(1),
      occupancyRate: Math.min(
        100,
        Math.round(p.occupancyRate * (ctx.surge ? 1.05 + ramp * 0.08 : 1)),
      ),
    };
  });

  const forecastBase = buildForecastOutput(0, horizon);
  const forecastSeries = forecastBase.map((p, i) => {
    const trend = (i / horizon) * (ctx.riskScore - 50) * 0.6;
    const pred = Math.min(
      98,
      Math.max(10, Math.round(ctx.riskScore + trend - 10 + Math.sin(i / 2) * 3)),
    );
    return {
      ...p,
      predictedEpuizareRisk: pred,
      predictedObosealaIndex: Math.min(98, pred - 4),
      predictedStaffDeficitRisk: Math.min(95, Math.round(pred * 0.85)),
      confidenceLow: Math.max(5, pred - 8),
      confidenceRidicat: Math.min(99, pred + 7),
    };
  });

  const drivers: RiskDriver[] = [];
  if (ctx.overtime)
    drivers.push({
      driverName: "Ore suplimentare peste prag",
      severity: "high",
      explanation:
        "Orele suplimentare sunt peste limita sigura si imping riscul de epuizare in sus.",
      recommendedMitigation:
        "Limiteaza orele suplimentare la 8 ore pe saptamana si redistribuie turele.",
    });
  if (ctx.nightShift)
    drivers.push({
      driverName: "Ture de noapte consecutive",
      severity: "critical",
      explanation: ctx.nightShiftCount
        ? `${ctx.nightShiftCount} ture de noapte consecutive reduc timpul de recuperare si cresc oboseala.`
        : "Mai multe ture de noapte la rand reduc timpul de recuperare si cresc oboseala.",
      recommendedMitigation:
        "Adauga o pauza de recuperare de 36 ore dupa 3 ture de noapte consecutive.",
    });
  if (ctx.shortage)
    drivers.push({
      driverName: "Deficit de personal",
      severity: "high",
      explanation:
        ctx.clinicalStaff > 0
          ? `Raportul pacienti personal este ${ctx.patientStaffRatio.toFixed(1)} pentru ${ctx.patientCount} pacienti, ${ctx.doctorCount} medici si ${ctx.nurseCount} asistenti.`
          : "Raportul pacienti personal creste in perioadele de varf.",
      recommendedMitigation: "Adu personal de rezerva pentru urmatoarele 7 zile.",
    });
  if (ctx.surge)
    drivers.push({
      driverName: "Volum mare de pacienti",
      severity: "high",
      explanation:
        ctx.highOccupancy && ctx.patientCount
          ? `Sectia are ${ctx.occupancy}% ocupare si ${ctx.patientCount} pacienti, peste pragul operational.`
          : "Numarul mare de pacienti creste presiunea pe fiecare medic si asistent.",
      recommendedMitigation:
        "Activeaza protocolul de supraaglomerare si separa cazurile dupa prioritate.",
    });
  if (ctx.emotional)
    drivers.push({
      driverName: "Stres operational ridicat",
      severity: "medium",
      explanation: "Semnalele de stres si epuizare indica risc de scadere a atentiei.",
      recommendedMitigation:
        "Planifica verificari scurte cu echipa si sprijin pentru personalul expus.",
    });
  if (ctx.weekend)
    drivers.push({
      driverName: "Acoperire slaba in weekend",
      severity: "medium",
      explanation: "Acoperirea redusa din weekend se suprapune cu presiune operationala mare.",
      recommendedMitigation: "Activeaza personal de rezerva pentru weekend.",
    });
  if (drivers.length === 0)
    drivers.push({
      driverName: "Presiune operationala combinata",
      severity: "medium",
      explanation: "Mai multi indicatori operationali cresc in acelasi timp.",
      recommendedMitigation: "Ruleaza o simulare tintita si verifica turele cu risc.",
    });

  const recommendations: ScenarioRecommendation[] = [
    ctx.nightShift && {
      title: "Adauga personal pe turele de noapte",
      description:
        "Acopera urmatoarele 7 zile cu personal suplimentar pe tura de noapte, mai ales in ATI sau UPU.",
      priority: "high" as const,
      expectedImpact: "Risc redus cu aproximativ 12 puncte",
    },
    ctx.overtime && {
      title: "Taie orele suplimentare peste 12 ore pe saptamana",
      description:
        "Pune plafon la 8 ore suplimentare si muta o parte din sarcina catre personal de rezerva.",
      priority: "high" as const,
      expectedImpact: "Oboseala redusa cu aproximativ 9 puncte",
    },
    ctx.shortage && {
      title: "Redistribuie cazurile grele catre personal senior",
      description:
        "Imparte cazurile cu intensitate mare intre seniori si amana activitatile cu prioritate mica.",
      priority: "medium" as const,
      expectedImpact: "Risc de deficit redus cu aproximativ 7 puncte",
    },
    {
      title: "Introdu pauze reale de recuperare",
      description:
        "Dupa ture consecutive de noapte, programeaza o fereastra de recuperare de cel putin 36 ore.",
      priority: "medium" as const,
      expectedImpact: "Oboseala redusa cu aproximativ 6 puncte",
    },
    {
      title: "Reverifica riscul peste 72 ore",
      description: "Ruleaza din nou prognoza si verifica daca riscul trece de 80.",
      priority: "low" as const,
      expectedImpact: "Monitorizare continua",
    },
  ].filter(Boolean) as ScenarioRecommendation[];

  const followUpIndicators = [
    "Ore suplimentare pe persoana, tinta sub 8 ore pe saptamana",
    "Raport pacienti personal, tinta sub 4.5",
    "Scor de stres al echipei, repetat in ziua 7",
    "Concedii medicale in ultimele 7 zile",
    "Numar de ture de noapte consecutive",
    "Frecventa incidentelor raportate",
    "Risc de epuizare estimat, recalculat peste 72 ore",
  ];

  const verbs =
    ctx.riskScore >= 70
      ? "creste rapid"
      : ctx.riskScore >= 50
        ? "este in crestere"
        : "ramane intr-o zona gestionabila";
  const pressureSignals = [
    ctx.highOccupancy ? `ocupare ${ctx.occupancy}%` : "ocupare fara prag critic mentionat",
    ctx.patientCount ? `${ctx.patientCount} pacienti` : "volum pacienti nespecificat",
    ctx.overtime
      ? ctx.overtimeHours
        ? `${ctx.overtimeHours} ore suplimentare`
        : "ore suplimentare mari"
      : "ore suplimentare stabile",
    ctx.nightShift ? "ture de noapte consecutive" : "ture fara aglomerare majora",
    ctx.sickLeave ? "concedii medicale active" : "concedii medicale nespecificate",
    ctx.shortage ? "deficit de personal" : "personal aparent stabil",
  ];
  const explanation =
    `Din ce ai descris, ${ctx.dept} ${verbs}. ` +
    `Am ridicat riscul pentru ca apar semnale combinate: ${pressureSignals.join(", ")}. ` +
    `Prognoza indica un risc de epuizare de ${forecastSeries[forecastSeries.length - 1].predictedEpuizareRisk} din 100 in ${horizon} zile.`;

  const expectedImpact =
    ctx.riskScore >= 70
      ? "Daca nu intervii, ma astept la mai multa oboseala, mai multe greseli operationale si crestere a absentelor in urmatoarele 14 zile."
      : "Daca nu intervii, oboseala poate creste usor in urmatoarele 14 zile, dar situatia pare inca gestionabila.";

  const scenarioName =
    ctx.nightShift && ctx.overtime
      ? "Supraincarcare pe ture de noapte si ore suplimentare"
      : ctx.surge
        ? "Crestere mare a volumului de pacienti"
        : ctx.shortage
          ? "Presiune din deficit de personal"
          : ctx.weekend
            ? "Acoperire insuficienta in weekend"
            : ctx.emotional
              ? "Crestere a stresului operational"
              : "Scenariu generat de risc epuizare";

  const decisionBasis = [
    `Riscul curent calculat este ${ctx.riskScore} din 100.`,
    `Prognoza pe 14 zile ajunge la ${forecastSeries[forecastSeries.length - 1].predictedEpuizareRisk} din 100.`,
    ctx.overtime
      ? "Promptul mentioneaza ore suplimentare, deci am crescut componenta de oboseala."
      : "Nu ai mentionat ore suplimentare mari.",
    ctx.nightShift
      ? "Promptul mentioneaza ture de noapte, un factor important pentru recuperare slaba."
      : "Nu ai mentionat ture de noapte consecutive.",
    ctx.highOccupancy
      ? `Gradul de ocupare detectat este ${ctx.occupancy}%, peste pragul operational de 90%.`
      : "Nu ai mentionat ocupare peste 90%.",
    ctx.clinicalStaff > 0
      ? `Ai indicat ${ctx.doctorCount} medici si ${ctx.nurseCount} asistenti pentru ${ctx.patientCount} pacienti.`
      : "Nu ai mentionat separat numarul de medici si asistenti.",
    ctx.sickLeave
      ? "Concediile medicale indica presiune suplimentara pe personalul ramas in tura."
      : "Nu ai mentionat multe concedii medicale.",
    ctx.surge
      ? "Promptul indica aglomerare sau volum mare de pacienti."
      : "Nu ai mentionat crestere clara de volum pacienti.",
  ];

  const alerts: ScenarioAlert[] = [
    {
      title: `${ctx.dept.split(" - ")[0]} are risc crescut`,
      severity: ctx.riskScore >= 75 ? "critical" : "warning",
      department: ctx.dept,
      primaryDriver: drivers[0].driverName,
      timestamp: now.toISOString(),
    },
  ];

  return {
    id,
    name: scenarioName,
    department: ctx.dept,
    generatedAt: now.toISOString(),
    forecastHorizon: horizon,
    riskLevel: ctx.riskLevel,
    riskScore: ctx.riskScore,
    predicted14d: forecastSeries[forecastSeries.length - 1].predictedEpuizareRisk,
    staffPressure: Math.min(98, ctx.riskScore + 4),
    interventionUrgency: Math.min(99, ctx.riskScore - 2),
    confidenceScore: confidence,
    inputSeries,
    forecastSeries,
    primaryDrivers: drivers,
    recommendations,
    followUpIndicators,
    decisionBasis,
    explanation,
    expectedImpact,
    alerts,
    prompt,
  };
}

export function ActiveScenarioProvider({ children }: { children: ReactNode }) {
  const [activeState, setActiveState] = useState<GeneratScenario | null>(() =>
    loadActiveScenario(),
  );
  const setActive = useCallback((scenario: GeneratScenario | null) => {
    setActiveState(scenario);
    saveActiveScenario(scenario);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("pulseguard:scenario-changed"));
    }
  }, []);
  const generateFromPrompt = useCallback((prompt: string) => generateScenario(prompt), []);
  return (
    <ScenarioCtx.Provider value={{ active: activeState, setActive, generateFromPrompt }}>
      {children}
    </ScenarioCtx.Provider>
  );
}

export function useActiveScenario() {
  const ctx = useContext(ScenarioCtx);
  if (!ctx) throw new Error("useActiveScenario must be used inside ActiveScenarioProvider");
  return ctx;
}
