from __future__ import annotations

import random
from dataclasses import dataclass, field
from datetime import datetime

from .digital_twin import DigitalTwin, clamp
from .schemas import Department, TelemetryEvent


@dataclass
class DepartmentState:
    load_multiplier: float = 1.0
    absence_rate: float = 0.04
    cascade_pressure: float = 0.0
    overload_minutes: int = 0
    open_beds_pressure: float = 0.0
    shift_swap_pressure: float = 0.0


@dataclass
class HospitalCalendar:
    flu_season_intensity: float = 0.0
    holiday_overload: float = 0.0
    weekend_overload: float = 0.0
    emergency_spike: float = 0.0
    staffing_shock: float = 0.0


@dataclass
class HospitalSimulationEngine:
    twins: list[DigitalTwin]
    seed: int = 42
    departments: dict[Department, DepartmentState] = field(default_factory=dict)
    rng: random.Random = field(init=False)
    last_events: dict[str, TelemetryEvent] = field(default_factory=dict)

    def __post_init__(self) -> None:
        self.rng = random.Random(self.seed + 10_000)
        if not self.departments:
            self.departments = {
                "ICU": DepartmentState(load_multiplier=1.08, absence_rate=0.055),
                "ER": DepartmentState(load_multiplier=1.04, absence_rate=0.06),
                "Surgery": DepartmentState(load_multiplier=0.94, absence_rate=0.04),
                "Pediatrics": DepartmentState(load_multiplier=0.82, absence_rate=0.045),
                "Oncology": DepartmentState(load_multiplier=0.88, absence_rate=0.035),
            }

    def step(self, now: datetime, base_load_intensity: float) -> list[TelemetryEvent]:
        calendar = self._calendar(now)
        self._update_department_state(calendar)

        events: list[TelemetryEvent] = []
        for twin in self.twins:
            dept = twin.profile.department
            dept_state = self.departments[dept]
            staff_available = self.rng.random() > dept_state.absence_rate
            if not staff_available and twin.last_shift_type == "off":
                continue

            load = base_load_intensity * dept_state.load_multiplier
            event = twin.step(now, clamp(load, 0.2, 1.5))
            if not staff_available:
                event.operational_context.anomaly_type = event.operational_context.anomaly_type or "staff_absence_backfill"
                event.signals.overtime_hours = round(clamp(event.signals.overtime_hours + 1.5, 0, 48), 2)
                event.signals.fatigue_index = round(clamp(event.signals.fatigue_index + 4.5, 0, 100), 1)
                event.signals.burnout_probability = round(clamp(event.signals.burnout_probability + 0.045, 0, 1), 4)

            if dept_state.cascade_pressure > 0.18:
                event.operational_context.anomaly_type = event.operational_context.anomaly_type or "cascade_pressure"
                event.signals.patient_pressure_index = round(clamp(event.signals.patient_pressure_index + dept_state.cascade_pressure * 18, 0, 100), 1)
                event.signals.cognitive_load = round(clamp(event.signals.cognitive_load + dept_state.cascade_pressure * 12, 0, 100), 1)

            if dept_state.shift_swap_pressure > 0.2:
                event.operational_context.anomaly_type = event.operational_context.anomaly_type or "shift_swap_disruption"
                event.signals.sleep_debt_hours = round(clamp(event.signals.sleep_debt_hours + dept_state.shift_swap_pressure * 1.6, 0, 24), 2)

            events.append(event)
            self.last_events[event.staff_id] = event

        self._learn_from_events(events)
        return events

    def _calendar(self, now: datetime) -> HospitalCalendar:
        winter = now.month in {11, 12, 1, 2, 3}
        holiday = (now.month, now.day) in {(12, 24), (12, 25), (12, 31), (1, 1), (5, 1)}
        weekend = now.weekday() >= 5
        emergency_spike = 0.0
        if now.hour in {18, 19, 20, 21, 22, 23, 0, 1} and self.rng.random() < 0.22:
            emergency_spike = self.rng.uniform(0.08, 0.26)
        staffing_shock = self.rng.uniform(0.02, 0.18) if self.rng.random() < 0.015 else 0.0
        return HospitalCalendar(
            flu_season_intensity=0.16 if winter else 0.0,
            holiday_overload=0.18 if holiday else 0.0,
            weekend_overload=0.09 if weekend else 0.0,
            emergency_spike=emergency_spike,
            staffing_shock=staffing_shock,
        )

    def _update_department_state(self, calendar: HospitalCalendar) -> None:
        for department, state in self.departments.items():
            seasonal = calendar.flu_season_intensity if department in {"ER", "Pediatrics", "ICU"} else 0.0
            emergency = calendar.emergency_spike if department in {"ER", "ICU"} else calendar.emergency_spike * 0.35
            holiday = calendar.holiday_overload * (1.2 if department in {"ER", "ICU"} else 0.65)
            weekend = calendar.weekend_overload * (1.1 if department in {"ER", "Pediatrics"} else 0.55)

            state.load_multiplier = clamp(
                state.load_multiplier * 0.93
                + 0.07 * (1 + seasonal + emergency + holiday + weekend + state.cascade_pressure),
                0.68,
                1.55,
            )
            state.absence_rate = clamp(
                state.absence_rate * 0.96 + 0.04 * (0.035 + seasonal * 0.22 + calendar.staffing_shock),
                0.01,
                0.22,
            )
            state.shift_swap_pressure = clamp(
                state.shift_swap_pressure * 0.9 + (calendar.staffing_shock * 1.2) + max(0, state.absence_rate - 0.09),
                0,
                1,
            )

    def _learn_from_events(self, events: list[TelemetryEvent]) -> None:
        grouped: dict[Department, list[TelemetryEvent]] = {department: [] for department in self.departments}
        for event in events:
            grouped[event.department].append(event)

        for department, rows in grouped.items():
            if not rows:
                continue
            avg_pressure = sum(row.signals.patient_pressure_index for row in rows) / len(rows)
            avg_fatigue = sum(row.signals.fatigue_index for row in rows) / len(rows)
            critical_count = sum(1 for row in rows if row.signals.burnout_probability >= 0.82)
            state = self.departments[department]
            overload = avg_pressure >= 86 or avg_fatigue >= 78 or critical_count >= max(2, len(rows) // 5)
            state.overload_minutes = state.overload_minutes + 2 if overload else max(0, state.overload_minutes - 4)
            state.cascade_pressure = clamp(state.cascade_pressure * 0.88 + (0.05 if state.overload_minutes >= 20 else -0.03), 0, 1)

        # ICU and ER overload spill into Surgery and Pediatrics via boarding and bed pressure.
        icu_spill = self.departments["ICU"].cascade_pressure * 0.22
        er_spill = self.departments["ER"].cascade_pressure * 0.28
        self.departments["Surgery"].cascade_pressure = clamp(self.departments["Surgery"].cascade_pressure + icu_spill, 0, 1)
        self.departments["Pediatrics"].cascade_pressure = clamp(self.departments["Pediatrics"].cascade_pressure + er_spill * 0.7, 0, 1)
        self.departments["Oncology"].cascade_pressure = clamp(self.departments["Oncology"].cascade_pressure + icu_spill * 0.35, 0, 1)

