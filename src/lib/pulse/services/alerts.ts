import type { AlertItem } from "./types";

export const alertsMock: AlertItem[] = [
  {
    id: "a1",
    title: "Riscul de epuizare ATI trece pragul critic",
    detail: "Prognoza ajunge la 80 in 6 zile pe traiectoria curenta.",
    department: "ATI - Turn B",
    level: "critical",
    time: "acum 2 min",
  },
  {
    id: "a2",
    title: "Ore suplimentare UPU peste 14h/asistent saptamana aceasta",
    detail: "5 asistenti sunt peste pragul flexibil de 12h.",
    department: "Urgente",
    level: "critical",
    time: "acum 18 min",
  },
  {
    id: "a3",
    title: "Sondajul de stres Oncologie este complet",
    detail: "18 raspunsuri - scor mediu 6.7 (+0.9 fata de baza).",
    department: "Oncologie",
    level: "info",
    time: "acum 1h",
  },
  {
    id: "a4",
    title: "Anomalie concedii medicale in Psihiatrie",
    detail: "+2 cazuri fata de baza pe 7 zile; monitorizeaza extinderea oboselii.",
    department: "Psihiatrie",
    level: "warning",
    time: "acum 2h",
  },
  {
    id: "a5",
    title: "Capacitate disponibila in Maternitate",
    detail: "Ocupare 68%; poate prelua 4 transferuri eligibile.",
    department: "Maternitate",
    level: "info",
    time: "acum 3h",
  },
  {
    id: "a6",
    title: "Orele suplimentare in Chirurgie sunt in crestere",
    detail: "+3.2% fata de saptamana trecuta; recomand monitorizare.",
    department: "Chirurgie",
    level: "warning",
    time: "acum 5h",
  },
];
