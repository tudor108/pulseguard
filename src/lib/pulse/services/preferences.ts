import type { UserPreferences } from "./types";

export const defaultPreferences: UserPreferences = {
  selectedTheme: "dark",
  selectedDepartment: "icu",
  selectedCoordinator: "Dr. Emily Carter",
  reducedMotion: false,
  notificationSetari: {
    emailAlerts: true,
    pushAlerts: true,
    criticalOnly: false,
    weeklyDigest: true,
  },
};

const STORAGE_KEY = "pg:preferences";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    return { ...defaultPreferences, ...JSON.parse(raw) } as UserPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {}
}
