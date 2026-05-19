import { loadSettings, updateSettings } from "./settings-service";
import type { ThemeMode } from "./types";
import { notifyStateChanged } from "./app-storage";

const UNIT_KEY = "pg:unit";
const COORD_KEY = "pg:coord";
const THEME_KEY = "pg:theme";

export type ProfileSelection = {
  unit: string;
  coordinator: string;
  theme: ThemeMode;
};

export function loadProfileSelection(defaults: ProfileSelection): ProfileSelection {
  if (typeof window === "undefined") return defaults;
  const settings = loadSettings();
  return {
    unit: window.localStorage.getItem(UNIT_KEY) ?? settings.organizationUnitName ?? defaults.unit,
    coordinator:
      window.localStorage.getItem(COORD_KEY) ??
      settings.selectedCoordinator ??
      defaults.coordinator,
    theme:
      (window.localStorage.getItem(THEME_KEY) as ThemeMode | null) ??
      settings.selectedTheme ??
      defaults.theme,
  };
}

export function saveProfileSelection(patch: Partial<ProfileSelection>) {
  if (typeof window !== "undefined") {
    try {
      if (patch.unit) window.localStorage.setItem(UNIT_KEY, patch.unit);
      if (patch.coordinator) window.localStorage.setItem(COORD_KEY, patch.coordinator);
      if (patch.theme) window.localStorage.setItem(THEME_KEY, patch.theme);
    } catch {
      // Ignore unavailable storage.
    }
  }
  updateSettings({
    ...(patch.unit ? { organizationUnitName: patch.unit, defaultDepartment: patch.unit } : {}),
    ...(patch.coordinator
      ? { selectedCoordinator: patch.coordinator, coordinatorName: patch.coordinator }
      : {}),
    ...(patch.theme ? { selectedTheme: patch.theme, themePreference: patch.theme } : {}),
  });
  notifyStateChanged("pulseguard:profile-changed");
}
