import type { UserPreferences } from "./types";
import { defaultPreferences, loadPreferences, savePreferences } from "./preferences";
import { notifyStateChanged } from "./app-storage";

export type SettingsPatch = Partial<UserPreferences>;

export function loadSettings(): UserPreferences {
  return loadPreferences();
}

export function saveSettings(settings: UserPreferences): UserPreferences {
  const next = { ...defaultPreferences, ...settings };
  savePreferences(next);
  notifyStateChanged("pulseguard:settings-changed");
  return next;
}

export function updateSettings(patch: SettingsPatch): UserPreferences {
  return saveSettings({ ...loadSettings(), ...patch });
}
