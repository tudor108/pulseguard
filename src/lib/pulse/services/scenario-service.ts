import type { GeneratScenario } from "@/lib/pulse/scenario-context";
import { readStoredArray, removeStored, writeStored } from "./app-storage";

const ACTIVE_KEY = "pg:active-scenario:v2";
const SAVED_KEY = "pg:saved-scenarios:v2";
const LEGACY_ACTIVE_KEY = "pulseguard:active-scenario";

function isFullScenario(value: unknown): value is GeneratScenario {
  return Boolean(
    value && typeof value === "object" && "inputSeries" in value && "forecastSeries" in value,
  );
}

export function loadActiveScenario(): GeneratScenario | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (isFullScenario(parsed)) return parsed;
    }
    const legacyRaw = window.localStorage.getItem(LEGACY_ACTIVE_KEY);
    if (legacyRaw) {
      const legacy = JSON.parse(legacyRaw);
      if (isFullScenario(legacy)) return legacy;
    }
  } catch {
    // Ignore malformed legacy scenario payloads.
  }
  return null;
}

export function saveActiveScenario(scenario: GeneratScenario | null) {
  if (!scenario) {
    removeStored(ACTIVE_KEY);
    removeStored(LEGACY_ACTIVE_KEY);
    return;
  }
  writeStored(ACTIVE_KEY, scenario);
  writeStored(LEGACY_ACTIVE_KEY, scenario);
}

export function loadSavedScenarios(): GeneratScenario[] {
  return readStoredArray<GeneratScenario>(SAVED_KEY, []);
}

export function saveScenario(scenario: GeneratScenario): GeneratScenario[] {
  const next = [scenario, ...loadSavedScenarios().filter((item) => item.id !== scenario.id)].slice(
    0,
    24,
  );
  writeStored(SAVED_KEY, next);
  saveActiveScenario(scenario);
  return next;
}
