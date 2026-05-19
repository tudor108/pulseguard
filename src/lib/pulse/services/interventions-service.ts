import { recommendations } from "@/lib/pulse/data";
import { readStoredArray, writeStored } from "./app-storage";

const STORAGE_KEY = "pg:interventions:v2";

export type InterventionStatus = "recommended" | "approved" | "postponed" | "applied";

export type ProductIntervention = {
  id: string;
  title: string;
  detail: string;
  department: string;
  impact: "ridicat" | "mediu" | "scazut";
  eta: string;
  source: "seed" | "scenario" | "telemetry" | "plan";
  status: InterventionStatus;
  createdAt: string;
  updatedAt: string;
  postponedUntil?: string;
  evidence?: string;
};

function seedInterventions(): ProductIntervention[] {
  const now = new Date().toISOString();
  return recommendations.map((item) => ({
    ...item,
    source: "seed",
    status: "recommended",
    createdAt: now,
    updatedAt: now,
  }));
}

export function loadInterventions(): ProductIntervention[] {
  return readStoredArray<ProductIntervention>(STORAGE_KEY, seedInterventions());
}

export function saveInterventions(interventions: ProductIntervention[]) {
  writeStored(STORAGE_KEY, interventions);
}

export function upsertIntervention(
  intervention: Omit<ProductIntervention, "createdAt" | "updatedAt"> &
    Partial<Pick<ProductIntervention, "createdAt" | "updatedAt">>,
): ProductIntervention[] {
  const now = new Date().toISOString();
  const nextItem: ProductIntervention = {
    ...intervention,
    createdAt: intervention.createdAt ?? now,
    updatedAt: now,
  };
  const current = loadInterventions();
  const next = current.some((item) => item.id === nextItem.id)
    ? current.map((item) => (item.id === nextItem.id ? { ...item, ...nextItem } : item))
    : [nextItem, ...current];
  saveInterventions(next);
  return next;
}

export function setInterventionStatus(
  id: string,
  status: InterventionStatus,
): ProductIntervention[] {
  const now = new Date().toISOString();
  const next = loadInterventions().map((item) =>
    item.id === id
      ? {
          ...item,
          status,
          updatedAt: now,
          postponedUntil:
            status === "postponed"
              ? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
              : item.postponedUntil,
        }
      : item,
  );
  saveInterventions(next);
  return next;
}

export function applyRecommendedPlan(): ProductIntervention[] {
  const now = new Date().toISOString();
  const next = loadInterventions().map((item) =>
    item.status === "recommended" ? { ...item, status: "applied" as const, updatedAt: now } : item,
  );
  saveInterventions(next);
  return next;
}
