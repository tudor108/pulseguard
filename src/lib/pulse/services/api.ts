// Backend-ready API facade.
//
// Every UI feature should call these functions. Today they return mock data
// wrapped in promises so the call sites are already async. To wire a real
// backend (Supabase / Lovable Cloud / external forecasting API), swap the
// body of each function - the return types are the contract.

import type {
  AlertItem,
  ChatMessage,
  Coordinator,
  Department,
  ForecastOutput,
  Report,
  Scenario,
  TimeSeriesInput,
  UserPreferences,
} from "./types";
import { alertsMock } from "./alerts";
import { chatMessagesMock, makeChatMessage } from "./chat";
import { coordinatorsMock } from "./coordinators";
import { departmentsMock } from "./departments";
import { buildForecastOutput } from "./forecast";
import { reportsMock } from "./reports";
import { scenariosMock } from "./scenarios";
import { buildTimeSeries } from "./timeseries";
import { loadPreferences, savePreferences } from "./preferences";

const ok = <T,>(value: T, delay = 0): Promise<T> =>
  new Promise((resolve) => (delay ? setTimeout(() => resolve(value), delay) : resolve(value)));

export const api = {
  // Departments
  listDepartments: (): Promise<Department[]> => ok(departmentsMock),
  getDepartment: (id: string): Promise<Department | undefined> =>
    ok(departmentsMock.find((d) => d.id === id)),

  // Coordinators
  listCoordinators: (): Promise<Coordinator[]> => ok(coordinatorsMock),

  // Time series + forecast
  getTimeSeries: (_departmentId?: string, days = 30): Promise<TimeSeriesInput[]> =>
    ok(buildTimeSeries(days)),
  getForecast: (_departmentId?: string, historyDays = 30, forecastDays = 14): Promise<ForecastOutput[]> =>
    ok(buildForecastOutput(historyDays, forecastDays)),

  // Scenarios
  listScenarios: (): Promise<Scenario[]> => ok(scenariosMock),
  getScenario: (id: string): Promise<Scenario | undefined> =>
    ok(scenariosMock.find((s) => s.id === id)),

  // Rapoarte
  listRapoarte: (): Promise<Report[]> => ok(reportsMock),
  getLatestReport: (): Promise<Report> => ok(reportsMock[0]),

  // Alerts
  listAlerts: (): Promise<AlertItem[]> => ok(alertsMock),

  // Chat
  listChatMessages: (): Promise<ChatMessage[]> => ok(chatMessagesMock),
  sendChatMessage: (content: string): Promise<ChatMessage> =>
    ok(makeChatMessage("user", content)),

  // Preferences
  getPreferences: (): Promise<UserPreferences> => ok(loadPreferences()),
  updatePreferences: (prefs: UserPreferences): Promise<UserPreferences> => {
    savePreferences(prefs);
    return ok(prefs);
  },
};

export type PulseGuardApi = typeof api;
