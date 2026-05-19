import { readStoredArray, writeStored } from "./app-storage";

const STORAGE_KEY = "pg:reports:v2";

export type SavedReport = {
  id: string;
  title: string;
  department: string;
  coordinator: string;
  riskScore: number;
  riskLevel: string;
  generatedAt: string;
  source: "scenario" | "telemetry" | "forecast" | "manual";
  scenarioId?: string;
  exported?: boolean;
};

export function loadSavedReports(): SavedReport[] {
  return readStoredArray<SavedReport>(STORAGE_KEY, []);
}

export function saveReports(reports: SavedReport[]) {
  writeStored(STORAGE_KEY, reports);
}

export function saveReport(
  report: Omit<SavedReport, "id" | "generatedAt"> &
    Partial<Pick<SavedReport, "id" | "generatedAt">>,
): SavedReport[] {
  const nextReport: SavedReport = {
    ...report,
    id: report.id ?? `report-${Date.now()}`,
    generatedAt: report.generatedAt ?? new Date().toISOString(),
  };
  const next = [
    nextReport,
    ...loadSavedReports().filter((item) => item.id !== nextReport.id),
  ].slice(0, 24);
  saveReports(next);
  return next;
}
