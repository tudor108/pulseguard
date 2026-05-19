import type { UserPreferences } from "./types";

export const defaultPreferences: UserPreferences = {
  selectedTheme: "dark",
  selectedDepartment: "Unitate Terapie Intensiva",
  selectedCoordinator: "Dr. Emily Carter",
  reducedMotion: false,
  notificationSetari: {
    emailAlerts: true,
    pushAlerts: true,
    criticalOnly: false,
    weeklyDigest: true,
    smsAlerts: false,
    inAppAlerts: true,
  },
  organizationName: "St. Mary Health",
  organizationUnitName: "Unitate Terapie Intensiva",
  defaultDepartment: "Unitate Terapie Intensiva",
  coordinatorName: "Dr. Emily Carter",
  alertSensitivity: "medium",
  telemetrySimulationMode: "normal",
  aiProviderStatus: "online",
  privacyAcknowledged: true,
  complianceDisclaimerEnabled: true,
  themePreference: "dark",
};

const STORAGE_KEY = "pg:preferences";

export function loadPreferences(): UserPreferences {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw) as Partial<UserPreferences>;
    return {
      ...defaultPreferences,
      ...parsed,
      notificationSetari: {
        ...defaultPreferences.notificationSetari,
        ...parsed.notificationSetari,
      },
    } as UserPreferences;
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(prefs: UserPreferences) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore unavailable storage.
  }
}
