# PulseGuard AI — Data Services

This folder is the **single source of truth** for everything the UI reads or
writes. Components must never hardcode mock values; they import from
`@/lib/pulse/services` (or the compatibility shim `@/lib/pulse/data`).

## Layout

- `types.ts` — canonical domain models (Department, TimeSeriesInput,
  ForecastOutput, Scenario, Report, AlertItem, ChatMessage, UserPreferences,
  Coordinator). These are the **contract**.
- `departments.ts`, `coordinators.ts`, `scenarios.ts`, `reports.ts`,
  `alerts.ts`, `chat.ts` — mock datasets.
- `timeseries.ts`, `forecast.ts` — deterministic mock generators for the
  input series and the 14-day forecast output.
- `preferences.ts` — localStorage-backed user preferences (theme, selected
  department, coordinator, reduced motion, notifications).
- `api.ts` — the **backend-ready facade**. All UI features go through
  `api.listDepartments()`, `api.getForecast()`, etc. Today each call resolves
  a mock; tomorrow swap the body for Supabase / Lovable Cloud / an external
  forecasting endpoint without touching any component.

## Wiring a real backend later

1. Enable Lovable Cloud (or your provider of choice).
2. Replace the body of each method in `api.ts` with the real fetch:

   ```ts
   listDepartments: async () => {
     const { data } = await supabase.from("departments").select("*");
     return data ?? [];
   },
   ```

3. Keep return types unchanged. If the backend shape differs, map it inside
   `api.ts` so the rest of the app stays untouched.