import { alertsMock } from "./alerts";
import type { AlertItem } from "./types";
import { readStoredArray, writeStored } from "./app-storage";

const STORAGE_KEY = "pg:alerts:v2";

export type ProductAlert = AlertItem & {
  read: boolean;
  source: "seed" | "scenario" | "telemetry" | "intervention" | "system";
  createdAt: string;
  acknowledgedAt?: string;
  relatedId?: string;
};

function seedAlerts(): ProductAlert[] {
  const now = new Date().toISOString();
  return alertsMock.map((alert) => ({
    ...alert,
    read: false,
    source: "seed",
    createdAt: now,
  }));
}

export function loadAlerts(): ProductAlert[] {
  return readStoredArray<ProductAlert>(STORAGE_KEY, seedAlerts());
}

export function saveAlerts(alerts: ProductAlert[]) {
  writeStored(STORAGE_KEY, alerts);
}

export function upsertAlert(
  alert: Omit<ProductAlert, "createdAt" | "read"> &
    Partial<Pick<ProductAlert, "createdAt" | "read">>,
): ProductAlert[] {
  const current = loadAlerts();
  const createdAt = alert.createdAt ?? new Date().toISOString();
  const nextAlert: ProductAlert = { ...alert, createdAt, read: alert.read ?? false };
  const exists = current.some((item) => item.id === nextAlert.id);
  const next = exists
    ? current.map((item) =>
        item.id === nextAlert.id
          ? { ...item, ...nextAlert, read: item.read && !nextAlert.read }
          : item,
      )
    : [nextAlert, ...current];
  saveAlerts(next);
  return next;
}

export function markAlertRead(id: string): ProductAlert[] {
  const next = loadAlerts().map((alert) =>
    alert.id === id ? { ...alert, read: true, acknowledgedAt: new Date().toISOString() } : alert,
  );
  saveAlerts(next);
  return next;
}

export function markAllAlertsRead(): ProductAlert[] {
  const now = new Date().toISOString();
  const next = loadAlerts().map((alert) => ({
    ...alert,
    read: true,
    acknowledgedAt: alert.acknowledgedAt ?? now,
  }));
  saveAlerts(next);
  return next;
}
