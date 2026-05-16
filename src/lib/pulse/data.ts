// NOTE: This file is kept as a backwards-compatible shim for existing UI
// imports. The canonical, backend-ready data layer now lives in
// `@/lib/pulse/services` (typed domain models + async `api` facade).
// New code should prefer importing from `@/lib/pulse/services`.

export {
  api,
  departmentsMock,
  coordinatorsMock,
  scenariosMock,
  reportsMock,
  recommendationsMock,
  alertsMock,
  chatMessagesMock,
  defaultPreferences,
  buildTimeSeries,
  buildForecastOutput,
} from "./services";
export type {
  Department as DepartmentModel,
  Coordinator as CoordinatorModel,
  TimeSeriesInput,
  ForecastOutput,
  Scenario as ScenarioModel,
  Report,
  AlertItem as AlertModel,
  ChatMessage,
  UserPreferences,
  NotificationSetari,
  ThemeMode,
  Recommendation as RecommendationModel,
  RiskLevel,
} from "./services";

// ---------------------------------------------------------------------------
// Legacy shapes retained so existing screens keep compiling unchanged.
// ---------------------------------------------------------------------------

export type Department = {
  id: string;
  name: string;
  unit: string;
  staff: number;
  burnoutRisk: number; // 0-100
  fatigueIndex: number; // 0-100
  workloadPressure: number; // 0-100
  shortageRisk: number; // 0-100
  occupancy: number; // 0-100
  trend: "up" | "down" | "stable";
  delta: number;
  lead: string;
};

export const departments: Department[] = [
  { id: "icu", name: "Unitate Terapie Intensiva", unit: "ATI - Turn B", staff: 84, burnoutRisk: 78, fatigueIndex: 71, workloadPressure: 82, shortageRisk: 64, occupancy: 94, trend: "up", delta: 6.4, lead: "Dr. Reyes" },
  { id: "er",  name: "Departament Urgente", unit: "UPU - Parter", staff: 112, burnoutRisk: 71, fatigueIndex: 68, workloadPressure: 88, shortageRisk: 58, occupancy: 97, trend: "up", delta: 4.1, lead: "Dr. Okafor" },
  { id: "onc", name: "Oncologie", unit: "Turn A - L4", staff: 56, burnoutRisk: 62, fatigueIndex: 59, workloadPressure: 64, shortageRisk: 41, occupancy: 81, trend: "stable", delta: 0.6, lead: "Dr. Lindqvist" },
  { id: "ped", name: "Pediatrie", unit: "Turn C - L2", staff: 64, burnoutRisk: 44, fatigueIndex: 41, workloadPressure: 48, shortageRisk: 30, occupancy: 72, trend: "down", delta: -2.8, lead: "Dr. Haddad" },
  { id: "sur", name: "Chirurgie", unit: "Turn A - L3", staff: 78, burnoutRisk: 58, fatigueIndex: 55, workloadPressure: 72, shortageRisk: 47, occupancy: 86, trend: "up", delta: 3.2, lead: "Dr. Brennan" },
  { id: "mat", name: "Maternitate", unit: "Turn C - L1", staff: 48, burnoutRisk: 39, fatigueIndex: 36, workloadPressure: 44, shortageRisk: 22, occupancy: 68, trend: "down", delta: -1.4, lead: "Dr. Kovac" },
  { id: "rad", name: "Radiologie", unit: "Turn B - L1", staff: 32, burnoutRisk: 51, fatigueIndex: 47, workloadPressure: 58, shortageRisk: 34, occupancy: 74, trend: "stable", delta: 0.9, lead: "Dr. Park" },
  { id: "psy", name: "Psihiatrie", unit: "Turn D - L2", staff: 38, burnoutRisk: 66, fatigueIndex: 61, workloadPressure: 60, shortageRisk: 52, occupancy: 79, trend: "up", delta: 5.0, lead: "Dr. Almeida" },
];

export type SeriesPoint = {
  date: string; // ISO day
  workload: number;
  overtime: number;
  nightShifts: number;
  patientRatio: number;
  sickLeave: number;
  incidents: number;
  stressScore: number;
  occupancy: number;
};

export type ForecastPoint = {
  date: string;
  burnoutRisk: number;
  workloadPressure: number;
  shortageRisk: number;
  fatigueIndex: number;
  interventionUrgency: number;
  forecast?: boolean;
};

function seeded(i: number, base: number, amp: number, period = 7) {
  return base + Math.sin((i / period) * Math.PI * 2) * amp + (Math.cos(i / 3.1) * amp) / 3;
}

export function buildSeries(days = 30): SeriesPoint[] {
  const today = new Date();
  const out: SeriesPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const idx = days - i;
    out.push({
      date: d.toISOString().slice(0, 10),
      workload: Math.round(seeded(idx, 48, 6) + (idx > 18 ? idx - 18 : 0)),
      overtime: Math.round(seeded(idx, 9, 3) + (idx > 20 ? (idx - 20) * 0.6 : 0)),
      nightShifts: Math.round(seeded(idx, 14, 4)),
      patientRatio: +(seeded(idx, 4.6, 0.6) + (idx > 22 ? 0.4 : 0)).toFixed(2),
      sickLeave: Math.max(0, Math.round(seeded(idx, 5, 2.5) + (idx > 24 ? 2 : 0))),
      incidents: Math.max(0, Math.round(seeded(idx, 2.4, 1.6))),
      stressScore: +(seeded(idx, 6.2, 1.2) + (idx > 20 ? 0.6 : 0)).toFixed(1),
      occupancy: Math.min(100, Math.round(seeded(idx, 82, 6) + (idx > 22 ? 4 : 0))),
    });
  }
  return out;
}

export function buildForecast(days = 30, forecastDays = 14): ForecastPoint[] {
  const today = new Date();
  const out: ForecastPoint[] = [];
  const total = days + forecastDays;
  for (let i = 0; i < total; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - (days - 1) + i);
    const isForecast = i >= days;
    const t = i + 1;
    const drift = isForecast ? (i - days + 1) * 1.6 : 0;
    out.push({
      date: d.toISOString().slice(0, 10),
      burnoutRisk: Math.min(98, Math.round(50 + Math.sin(t / 5) * 8 + t * 0.6 + drift)),
      workloadPressure: Math.min(98, Math.round(58 + Math.cos(t / 4) * 7 + t * 0.4 + drift * 0.9)),
      shortageRisk: Math.min(95, Math.round(42 + Math.sin(t / 6) * 9 + t * 0.35 + drift * 0.7)),
      fatigueIndex: Math.min(98, Math.round(46 + Math.sin(t / 4.5) * 7 + t * 0.5 + drift * 0.8)),
      interventionUrgency: Math.min(99, Math.round(38 + Math.sin(t / 5.5) * 6 + t * 0.7 + drift * 1.1)),
      forecast: isForecast,
    });
  }
  return out;
}

export type Recommendation = {
  id: string;
  title: string;
  detail: string;
  impact: "ridicat" | "mediu" | "scazut";
  eta: string;
  department: string;
};

export const recommendations: Recommendation[] = [
  { id: "r1", title: "Adauga 2 asistenti pe tura de noapte ATI pentru 7 zile", detail: "Prognoza arata ca indicele de oboseala trece de 75 pana in ziua 4. Intareste rotatia de noapte ca sa reduci presiunea pe personalul expus.", impact: "ridicat", eta: "Tura urmatoare", department: "ATI" },
  { id: "r2", title: "Limiteaza orele suplimentare UPU la 8 ore pe saptamana", detail: "Orele suplimentare sustinute peste 12 ore sunt corelate cu risc mai mare de incidente in ultimele 14 zile.", impact: "ridicat", eta: "Saptamana aceasta", department: "UPU" },
  { id: "r3", title: "Programeaza verificari de stare pentru echipa Oncologie", detail: "Scorul de stres a crescut cu 0.9 puncte; recomanda discutii individuale de 30 minute.", impact: "mediu", eta: "In 5 zile", department: "Oncologie" },
  { id: "r4", title: "Redistribuie 4 pacienti din Chirurgie catre rezerva Maternitate", detail: "Maternitatea are ocupare 68%, deci exista capacitate pentru a reduce presiunea din Chirurgie.", impact: "mediu", eta: "48 ore", department: "Chirurgie" },
  { id: "r5", title: "Activeaza protocolul de micro-pauze in Psihiatrie", detail: "Indicele de oboseala estimat ajunge la 72 in 6 zile. Activeaza pauze protejate de 15 minute.", impact: "scazut", eta: "Urmatoarele 72h", department: "Psihiatrie" },
];

export type IncidentSignal = {
  id: string;
  time: string;
  message: string;
  level: "info" | "warn" | "critical";
  dept: string;
};

export const liveSignals: IncidentSignal[] = [
  { id: "s1", time: "acum 2 min", message: "Orele suplimentare ATI pe tura de noapte au crescut cu 14%", level: "critical", dept: "ATI" },
  { id: "s2", time: "acum 11 min", message: "Raport pacienti/personal UPU la 5.8, tinta 4.5", level: "warn", dept: "UPU" },
  { id: "s3", time: "acum 26 min", message: "Sondajul de stres Oncologie a fost trimis (n=18)", level: "info", dept: "Oncologie" },
  { id: "s4", time: "acum 48 min", message: "Indicele de oboseala Pediatrie este in scadere (-3.1)", level: "info", dept: "Pediatrie" },
  { id: "s5", time: "acum 1h", message: "Concedii medicale Psihiatrie +2 fata de baza pe 7 zile", level: "warn", dept: "Psihiatrie" },
];

export function riskBand(score: number): { label: string; tone: "success" | "warning" | "danger" | "muted" } {
  if (score >= 75) return { label: "Critic", tone: "danger" };
  if (score >= 60) return { label: "Ridicat", tone: "warning" };
  if (score >= 40) return { label: "Moderat", tone: "warning" };
  if (score >= 20) return { label: "Scazut", tone: "success" };
  return { label: "Stabil", tone: "muted" };
}

export type Scenario = {
  id: string;
  name: string;
  department: string;
  risk: number;
  description: string;
  spark: number[];
};

export const scenarios: Scenario[] = [
  { id: "icu-night", name: "Supraincarcare tura de noapte ATI", department: "ATI - Turn B",
    risk: 82, description: "Ore suplimentare sustinute si raport pacienti/asistent ridicat pe 14 nopti consecutive.",
    spark: [42, 48, 51, 55, 60, 64, 68, 71, 73, 76, 79, 82] },
  { id: "er-surge", name: "Crestere brusca in Departamentul de Urgente", department: "UPU - Parter",
    risk: 76, description: "Volum pacienti +34% in weekend; blocaj la triaj intre 22:00 si 04:00.",
    spark: [52, 55, 58, 62, 60, 65, 70, 72, 74, 73, 75, 76] },
  { id: "sur-short", name: "Deficit personal in Sectia Chirurgie", department: "Chirurgie - Turn A",
    risk: 68, description: "3 echipe operatorii planificate au lipsa cate un asistent instrumentar timp de 6 zile.",
    spark: [40, 44, 46, 48, 52, 55, 58, 60, 63, 65, 67, 68] },
  { id: "ped-seasonal", name: "Presiune sezoniera in Pediatrie", department: "Pediatrie - Turn C",
    risk: 54, description: "Internarile respiratorii sunt in crestere; estimare +20% paturi in urmatoarele 10 zile.",
    spark: [30, 33, 36, 40, 42, 44, 47, 49, 50, 52, 53, 54] },
  { id: "onc-load", name: "Incarcare emotionala in Oncologie", department: "Oncologie - Turn A L4",
    risk: 62, description: "Scorul de stres a crescut cu 0.9 puncte; 4 persoane au nevoie de verificare de stare.",
    spark: [44, 46, 48, 50, 51, 53, 55, 57, 58, 60, 61, 62] },
  { id: "weekend", name: "Scenariu deficit personal in weekend", department: "Toate sectiile - Weekend",
    risk: 71, description: "Golul obisnuit de acoperire in weekend se suprapune cu intarzieri la chirurgiile elective.",
    spark: [38, 42, 46, 50, 54, 58, 62, 65, 67, 68, 70, 71] },
];

export type AlertItem = {
  id: string;
  title: string;
  detail: string;
  department: string;
  level: "critical" | "warning" | "info";
  time: string;
};

export const alerts: AlertItem[] = [
  { id: "a1", title: "Riscul de epuizare ATI trece pragul critic", detail: "Prognoza ajunge la 80 in 6 zile pe traiectoria curenta.", department: "ATI - Turn B", level: "critical", time: "acum 2 min" },
  { id: "a2", title: "Ore suplimentare UPU peste 14h/asistent saptamana aceasta", detail: "5 asistenti sunt peste pragul flexibil de 12h.", department: "Urgente", level: "critical", time: "acum 18 min" },
  { id: "a3", title: "Sondajul de stres Oncologie este complet", detail: "18 raspunsuri - scor mediu 6.7 (+0.9 fata de baza).", department: "Oncologie", level: "info", time: "acum 1h" },
  { id: "a4", title: "Anomalie concedii medicale in Psihiatrie", detail: "+2 cazuri fata de baza pe 7 zile; monitorizeaza extinderea oboselii.", department: "Psihiatrie", level: "warning", time: "acum 2h" },
  { id: "a5", title: "Capacitate disponibila in Maternitate", detail: "Ocupare 68%; poate prelua 4 transferuri eligibile.", department: "Maternitate", level: "info", time: "acum 3h" },
  { id: "a6", title: "Orele suplimentare in Chirurgie sunt in crestere", detail: "+3.2% fata de saptamana trecuta; recomand monitorizare.", department: "Chirurgie", level: "warning", time: "acum 5h" },
];


