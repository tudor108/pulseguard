import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { GeneratScenario } from "./scenario-context";
import {
  applyRecommendedPlan as applyRecommendedPlanService,
  loadAlerts,
  loadInterventions,
  loadSavedReports,
  loadSavedScenarios,
  loadSettings,
  loadTelemetrySummary,
  markAlertRead as markAlertReadService,
  markAllAlertsRead as markAllAlertsReadService,
  saveReport as saveReportService,
  saveScenario as saveScenarioService,
  saveTelemetrySummary,
  setInterventionStatus,
  updateSettings as updateSettingsService,
  upsertAlert,
  upsertIntervention,
  type ProductAlert,
  type ProductIntervention,
  type SavedReport,
  type SettingsPatch,
  type TelemetrySummary,
} from "./services";
import type { LivePrediction, LiveTelemetryEvent } from "./services/live-telemetry";
import type { UserPreferences } from "./services/types";

type PulseStore = {
  settings: UserPreferences;
  alerts: ProductAlert[];
  unreadAlerts: ProductAlert[];
  interventions: ProductIntervention[];
  savedReports: SavedReport[];
  savedScenarios: GeneratScenario[];
  telemetry: TelemetrySummary;
  updateSettings: (patch: SettingsPatch) => void;
  markAlertRead: (id: string) => void;
  markAllAlertsRead: () => void;
  addAlert: (
    alert: Omit<ProductAlert, "createdAt" | "read"> &
      Partial<Pick<ProductAlert, "createdAt" | "read">>,
  ) => void;
  approveIntervention: (id: string) => void;
  postponeIntervention: (id: string) => void;
  addIntervention: (
    intervention: Omit<ProductIntervention, "createdAt" | "updatedAt"> &
      Partial<Pick<ProductIntervention, "createdAt" | "updatedAt">>,
  ) => void;
  applyRecommendedPlan: () => void;
  saveScenario: (scenario: GeneratScenario) => void;
  saveReport: (
    report: Omit<SavedReport, "id" | "generatedAt"> &
      Partial<Pick<SavedReport, "id" | "generatedAt">>,
  ) => void;
  recordTelemetrySummary: (summary: TelemetrySummary) => void;
  createTelemetryAlert: (telemetry: LiveTelemetryEvent, prediction: LivePrediction) => void;
};

const PulseStoreCtx = createContext<PulseStore | null>(null);

export function PulseStoreProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<UserPreferences>(() => loadSettings());
  const [alerts, setAlerts] = useState<ProductAlert[]>(() => loadAlerts());
  const [interventions, setInterventions] = useState<ProductIntervention[]>(() =>
    loadInterventions(),
  );
  const [savedReports, setSavedReports] = useState<SavedReport[]>(() => loadSavedReports());
  const [savedScenarios, setSavedScenarios] = useState<GeneratScenario[]>(() =>
    loadSavedScenarios(),
  );
  const [telemetry, setTelemetry] = useState<TelemetrySummary>(() => loadTelemetrySummary());

  const reloadState = useCallback(() => {
    setSettings(loadSettings());
    setAlerts(loadAlerts());
    setInterventions(loadInterventions());
    setSavedReports(loadSavedReports());
    setSavedScenarios(loadSavedScenarios());
    setTelemetry(loadTelemetrySummary());
  }, []);

  useEffect(() => {
    const handler = () => reloadState();
    window.addEventListener("storage", handler);
    window.addEventListener("pulseguard:state-changed", handler);
    window.addEventListener("pulseguard:settings-changed", handler);
    window.addEventListener("pulseguard:profile-changed", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("pulseguard:state-changed", handler);
      window.removeEventListener("pulseguard:settings-changed", handler);
      window.removeEventListener("pulseguard:profile-changed", handler);
    };
  }, [reloadState]);

  const updateSettings = useCallback((patch: SettingsPatch) => {
    const next = updateSettingsService(patch);
    setSettings(next);
  }, []);

  const markAlertRead = useCallback((id: string) => {
    setAlerts(markAlertReadService(id));
  }, []);

  const markAllAlertsRead = useCallback(() => {
    setAlerts(markAllAlertsReadService());
  }, []);

  const addAlert = useCallback<PulseStore["addAlert"]>((alert) => {
    setAlerts(upsertAlert(alert));
  }, []);

  const approveIntervention = useCallback((id: string) => {
    const next = setInterventionStatus(id, "approved");
    setInterventions(next);
    const item = next.find((intervention) => intervention.id === id);
    if (item) {
      setAlerts(
        upsertAlert({
          id: `intervention-approved-${id}`,
          title: "Interventie aprobata",
          detail: item.title,
          department: item.department,
          level: "info",
          time: "acum cateva secunde",
          source: "intervention",
          relatedId: id,
        }),
      );
    }
  }, []);

  const postponeIntervention = useCallback((id: string) => {
    const next = setInterventionStatus(id, "postponed");
    setInterventions(next);
  }, []);

  const addIntervention = useCallback<PulseStore["addIntervention"]>((intervention) => {
    setInterventions(upsertIntervention(intervention));
  }, []);

  const applyRecommendedPlan = useCallback(() => {
    setInterventions(applyRecommendedPlanService());
    setAlerts(
      upsertAlert({
        id: "recommended-plan-applied",
        title: "Planul recomandat a fost aplicat",
        detail:
          "Actiunile recomandate au fost mutate in starea aplicata si sunt vizibile in planificator.",
        department: settings.defaultDepartment,
        level: "info",
        time: "acum cateva secunde",
        source: "intervention",
      }),
    );
  }, [settings.defaultDepartment]);

  const saveScenario = useCallback((scenario: GeneratScenario) => {
    setSavedScenarios(saveScenarioService(scenario));
    setAlerts(
      upsertAlert({
        id: `scenario-saved-${scenario.id}`,
        title: "Scenariu salvat si activ",
        detail: `${scenario.name} - risc ${scenario.riskScore}/100`,
        department: scenario.department,
        level: scenario.riskScore >= 75 ? "warning" : "info",
        time: "acum cateva secunde",
        source: "scenario",
        relatedId: scenario.id,
      }),
    );
  }, []);

  const saveReport = useCallback<PulseStore["saveReport"]>((report) => {
    setSavedReports(saveReportService(report));
  }, []);

  const recordTelemetrySummary = useCallback((summary: TelemetrySummary) => {
    setTelemetry(saveTelemetrySummary(summary));
  }, []);

  const createTelemetryAlert = useCallback(
    (event: LiveTelemetryEvent, prediction: LivePrediction) => {
      const risk = Math.round(prediction.burnout_probability * 100);
      const threshold =
        settings.alertSensitivity === "high" ? 64 : settings.alertSensitivity === "low" ? 82 : 74;
      if (risk < threshold && !prediction.is_anomaly) return;
      const level: ProductAlert["level"] =
        risk >= 82 || prediction.is_anomaly ? "critical" : "warning";
      setAlerts(
        upsertAlert({
          id: `telemetry-${event.staff_id}-${level}`,
          title: prediction.is_anomaly
            ? "Anomalie wearable detectata"
            : `Risc burnout ${risk}/100 pentru ${event.staff_id}`,
          detail: `Stres ${Math.round(event.signals.stress_index)}/100, oboseala ${Math.round(event.signals.fatigue_index)}/100, recuperare ${Math.round(event.signals.recovery_score)}/100.`,
          department: event.department,
          level,
          time: "acum cateva secunde",
          source: "telemetry",
          relatedId: event.staff_id,
        }),
      );
    },
    [settings.alertSensitivity],
  );

  const value = useMemo<PulseStore>(
    () => ({
      settings,
      alerts,
      unreadAlerts: alerts.filter((alert) => !alert.read),
      interventions,
      savedReports,
      savedScenarios,
      telemetry,
      updateSettings,
      markAlertRead,
      markAllAlertsRead,
      addAlert,
      approveIntervention,
      postponeIntervention,
      addIntervention,
      applyRecommendedPlan,
      saveScenario,
      saveReport,
      recordTelemetrySummary,
      createTelemetryAlert,
    }),
    [
      settings,
      alerts,
      interventions,
      savedReports,
      savedScenarios,
      telemetry,
      updateSettings,
      markAlertRead,
      markAllAlertsRead,
      addAlert,
      approveIntervention,
      postponeIntervention,
      addIntervention,
      applyRecommendedPlan,
      saveScenario,
      saveReport,
      recordTelemetrySummary,
      createTelemetryAlert,
    ],
  );

  return <PulseStoreCtx.Provider value={value}>{children}</PulseStoreCtx.Provider>;
}

export function usePulseStore() {
  const ctx = useContext(PulseStoreCtx);
  if (!ctx) throw new Error("usePulseStore must be used within PulseStoreProvider");
  return ctx;
}
