import type { Recommendation, Report } from "./types";

export const recommendationsMock: Recommendation[] = [
  { id: "r1", title: "Adauga 2 asistenti pe tura de noapte ATI pentru 7 zile", detail: "Prognoza arata ca indicele de oboseala trece de 75 pana in ziua 4. Intareste rotatia de noapte ca sa reduci presiunea pe personalul expus.", impact: "ridicat", eta: "Tura urmatoare", department: "ATI" },
  { id: "r2", title: "Limiteaza orele suplimentare UPU la 8 ore pe saptamana", detail: "Orele suplimentare peste 12 ore se coreleaza cu risc operational mai mare in ultimele 14 zile.", impact: "ridicat", eta: "Saptamana aceasta", department: "UPU" },
  { id: "r3", title: "Programeaza verificari de stare pentru echipa Oncologie", detail: "Scorurile de stres au crescut cu 0.9 puncte; recomanda discutii individuale de 30 minute.", impact: "mediu", eta: "In 5 zile", department: "Oncologie" },
  { id: "r4", title: "Redistribuie 4 pacienti din Chirurgie catre rezerva Maternitate", detail: "Maternitatea are ocupare 68%, deci exista capacitate pentru a reduce presiunea din Chirurgie.", impact: "mediu", eta: "48 ore", department: "Chirurgie" },
  { id: "r5", title: "Activeaza protocolul de micro-pauze in Psihiatrie", detail: "Indicele de oboseala estimat ajunge la 72 in 6 zile. Activeaza pauze protejate de 15 minute.", impact: "scazut", eta: "Urmatoarele 72h", department: "Psihiatrie" },
];

export const reportsMock: Report[] = [
  {
    id: "rep-001",
    generatedAt: new Date().toISOString(),
    department: "Unitate Terapie Intensiva",
    coordinator: "Dr. Emily Carter",
    confidenceScore: 92,
    riskLevel: "critical",
    executiveSummary:
      "ATI este estimata sa treaca pragul critic de epuizare in 6 zile, din cauza orelor suplimentare si a turelor de noapte grupate. Interventiile tintite de personal si recuperare pot reduce riscul estimat cu aproximativ 18 puncte pe 14 zile.",
    primaryDrivers: [
      { label: "Ture de noapte grupate", weight: 34 },
      { label: "Ore suplimentare", weight: 27 },
      { label: "Raport pacienti/personal", weight: 21 },
      { label: "Semnale din sondajul de stres", weight: 18 },
    ],
    recommendations: recommendationsMock.slice(0, 3),
    followUpIndicators: [
      "Ore suplimentare zilnice ATI",
      "Concedii medicale pe fereastra de 7 zile",
      "Diferenta scor stres fata de baza",
      "Recalculeaza saptamanal riscul de epuizare",
    ],
  },
];
