import type { Scenario } from "./types";
import { buildTimeSeries } from "./timeseries";
import { buildForecastOutput } from "./forecast";

export const scenariosMock: Scenario[] = [
  {
    id: "icu-night",
    name: "Supraincarcare tura de noapte ATI",
    department: "ATI - Turn B",
    riskLevel: "critical",
    risk: 82,
    description:
      "Ore suplimentare sustinute si raport pacienti/asistent ridicat pe 14 nopti consecutive.",
    drivers: [
      "Ture de noapte consecutive",
      "Ore suplimentare peste 12h/saptamana",
      "Raport pacienti/personal 5.4:1",
    ],
    recommendedAction:
      "Adauga 2 asistenti de rezerva in rotatia de noapte ATI pentru 7 zile si limiteaza orele suplimentare la 8h/saptamana.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [42, 48, 51, 55, 60, 64, 68, 71, 73, 76, 79, 82],
  },
  {
    id: "er-surge",
    name: "Crestere brusca in Departamentul de Urgente",
    department: "UPU - Parter",
    riskLevel: "elevated",
    risk: 76,
    description: "Volum pacienti +34% in weekend; blocaj la triaj intre 22:00 si 04:00.",
    drivers: [
      "Volum pacienti weekend +34%",
      "Gol de personal la triaj 22:00-04:00",
      "Ore suplimentare in crestere",
    ],
    recommendedAction:
      "Activeaza protocolul de crestere in weekend si realoca 2 asistenti la triaj.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [52, 55, 58, 62, 60, 65, 70, 72, 74, 73, 75, 76],
  },
  {
    id: "sur-short",
    name: "Deficit personal in Sectia Chirurgie",
    department: "Chirurgie - Turn A",
    riskLevel: "elevated",
    risk: 68,
    description:
      "3 echipe operatorii planificate au lipsa cate un asistent instrumentar timp de 6 zile.",
    drivers: [
      "Lipsa asistent instrumentar",
      "Intarzieri cazuri elective",
      "Oboseala prin acoperire incrucisata",
    ],
    recommendedAction:
      "Realoca 3 asistenti instrumentari din rezerva si amana 2 proceduri elective.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [40, 44, 46, 48, 52, 55, 58, 60, 63, 65, 67, 68],
  },
  {
    id: "ped-seasonal",
    name: "Presiune sezoniera in Pediatrie",
    department: "Pediatrie - Turn C",
    riskLevel: "moderate",
    risk: 54,
    description:
      "Internarile respiratorii sunt in crestere; estimare +20% paturi in urmatoarele 10 zile.",
    drivers: ["Internari respiratorii +18%", "Varf sezonier estimat", "Rotatie paturi redusa"],
    recommendedAction:
      "Deschide 6 paturi pediatrice suplimentare si pregateste echipa de terapie respiratorie.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [30, 33, 36, 40, 42, 44, 47, 49, 50, 52, 53, 54],
  },
  {
    id: "onc-load",
    name: "Incarcare emotionala in Oncologie",
    department: "Oncologie - Turn A L4",
    riskLevel: "elevated",
    risk: 62,
    description:
      "Scorurile de stres au crescut cu 0.9 puncte; 4 persoane au nevoie de verificare de stare.",
    drivers: [
      "Diferenta sondaj stres +0.9",
      "Cazuri emotionale dificile",
      "Oboseala personal cu vechime",
    ],
    recommendedAction:
      "Programeaza discutii de sprijin de 30 minute si adu suport psihologic pentru 2 saptamani.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [44, 46, 48, 50, 51, 53, 55, 57, 58, 60, 61, 62],
  },
  {
    id: "weekend",
    name: "Scenariu deficit personal in weekend",
    department: "Toate sectiile - Weekend",
    riskLevel: "elevated",
    risk: 71,
    description:
      "Golul obisnuit de acoperire in weekend se suprapune cu intarzieri la chirurgiile elective.",
    drivers: ["Gol acoperire weekend", "Intarzieri cazuri elective", "Crestere concedii medicale"],
    recommendedAction: "Activeaza rezerva de weekend si muta 2 cazuri elective pe luni.",
    mockInputSeries: buildTimeSeries(30),
    mockForecastSeries: buildForecastOutput(30, 14),
    spark: [38, 42, 46, 50, 54, 58, 62, 65, 67, 68, 70, 71],
  },
];
