from __future__ import annotations

import math
import random
from dataclasses import dataclass, field
from datetime import datetime, timezone

from .schemas import Department, DigitalTwinState, OperationalContext, Role, Signals, TelemetryEvent


DEPARTMENT_PROFILES: dict[Department, dict[str, float]] = {
    "ICU": {
        "base_pressure": 78,
        "alarm_rate": 20,
        "noise_db": 70,
        "cognitive": 76,
        "emotional": 66,
        "acuity": 0.92,
        "spike_probability": 0.08,
    },
    "ER": {
        "base_pressure": 74,
        "alarm_rate": 14,
        "noise_db": 74,
        "cognitive": 82,
        "emotional": 62,
        "acuity": 0.78,
        "spike_probability": 0.12,
    },
    "Surgery": {
        "base_pressure": 62,
        "alarm_rate": 7,
        "noise_db": 63,
        "cognitive": 88,
        "emotional": 52,
        "acuity": 0.72,
        "spike_probability": 0.05,
    },
    "Pediatrics": {
        "base_pressure": 52,
        "alarm_rate": 6,
        "noise_db": 58,
        "cognitive": 58,
        "emotional": 58,
        "acuity": 0.55,
        "spike_probability": 0.04,
    },
    "Oncology": {
        "base_pressure": 58,
        "alarm_rate": 5,
        "noise_db": 55,
        "cognitive": 64,
        "emotional": 78,
        "acuity": 0.67,
        "spike_probability": 0.035,
    },
}

ROLE_PROFILES: dict[Role, dict[str, float]] = {
    "doctor": {"stress": 1.08, "movement": 0.78, "cognitive": 1.16, "alarm": 0.82},
    "nurse": {"stress": 1.12, "movement": 1.18, "cognitive": 1.02, "alarm": 1.22},
    "coordinator": {"stress": 0.94, "movement": 0.62, "cognitive": 1.12, "alarm": 0.62},
}


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def logistic(x: float) -> float:
    return 1 / (1 + math.exp(-x))


def circadian_load(hour: int, shift_type: str) -> float:
    day_peak = math.sin(((hour - 10) / 24) * 2 * math.pi)
    night_penalty = 0.18 if shift_type == "night" and (hour >= 1 and hour <= 5) else 0
    return 0.5 + 0.28 * day_peak + night_penalty


def deterministic_wave(staff_index: int, now: datetime, period_minutes: int, amplitude: float) -> float:
    minute = int(now.timestamp() // 60)
    return amplitude * math.sin(((minute + staff_index * 13) / period_minutes) * 2 * math.pi)


@dataclass
class StaffProfile:
    staff_id: str
    device_id: str
    department: Department
    role: Role
    staff_index: int
    resilience: float
    recovery_rate: float
    overtime_sensitivity: float
    burnout_susceptibility: float
    night_shift_adaptation: float
    baseline_hr: float
    baseline_hrv: float


@dataclass
class DigitalTwin:
    profile: StaffProfile
    fatigue_index: float = 28.0
    stress_memory: float = 24.0
    sleep_debt_hours: float = 2.0
    weekly_overtime_hours: float = 0.0
    sleep_quality: float = 0.74
    last_shift_type: str = "off"
    anomaly_cooldown: int = 0
    random_state: random.Random = field(default_factory=random.Random)

    def step(self, now: datetime, load_intensity: float) -> TelemetryEvent:
        shift_type, elapsed_minutes = self._shift_state(now)
        department = DEPARTMENT_PROFILES[self.profile.department]
        role = ROLE_PROFILES[self.profile.role]
        weekend = now.weekday() >= 5

        base_pressure = department["base_pressure"] * load_intensity
        circadian = circadian_load(now.hour, shift_type)
        weekend_bump = 9 if weekend and self.profile.department in {"ER", "Pediatrics"} else 0
        surgery_peak = 13 if self.profile.department == "Surgery" and 8 <= now.hour <= 16 else 0
        er_evening = 12 if self.profile.department == "ER" and (18 <= now.hour or now.hour <= 2) else 0
        icu_wave = deterministic_wave(self.profile.staff_index, now, 37, 10) if self.profile.department == "ICU" else 0

        emergency_surge = self.random_state.random() < department["spike_probability"] * load_intensity
        surge = self.random_state.uniform(10, 24) if emergency_surge else 0
        shift_pressure = 0 if shift_type == "off" else 5 + elapsed_minutes / 720 * 16
        overtime_hours = max(0.0, (elapsed_minutes - 720) / 60) if shift_type != "off" else 0.0

        patient_pressure = clamp(
            base_pressure * (0.78 + circadian)
            + weekend_bump
            + surgery_peak
            + er_evening
            + icu_wave
            + surge
            + shift_pressure,
            0,
            100,
        )

        if shift_type == "off":
            recovery = 3.4 * self.profile.recovery_rate * self.profile.resilience
            self.fatigue_index = clamp(self.fatigue_index - recovery, 4, 100)
            self.stress_memory = clamp(self.stress_memory - 2.8 * self.profile.recovery_rate, 2, 100)
            self.sleep_debt_hours = clamp(self.sleep_debt_hours - 0.26 * self.profile.recovery_rate, 0, 24)
            self.sleep_quality = clamp(self.sleep_quality + 0.012 * self.profile.recovery_rate, 0.2, 1)
        else:
            fatigue_gain = (
                patient_pressure * 0.018
                + overtime_hours * 0.22 * self.profile.overtime_sensitivity
                + (1 - self.profile.night_shift_adaptation) * (0.7 if shift_type == "night" else 0.1)
                + self.sleep_debt_hours * 0.035
            )
            stress_gain = patient_pressure * 0.024 * role["stress"] + surge * 0.08
            self.fatigue_index = clamp(self.fatigue_index + fatigue_gain - self.profile.resilience * 0.18, 5, 100)
            self.stress_memory = clamp(self.stress_memory * 0.88 + stress_gain, 4, 100)
            self.sleep_debt_hours = clamp(
                self.sleep_debt_hours + (0.05 if shift_type == "day" else 0.15) + overtime_hours * 0.04,
                0,
                24,
            )
            self.weekly_overtime_hours = clamp(self.weekly_overtime_hours * 0.997 + overtime_hours * 0.02, 0, 48)
            self.sleep_quality = clamp(self.sleep_quality - 0.004 * self.sleep_debt_hours, 0.15, 1)

        anomaly_type = self._maybe_anomaly(patient_pressure, emergency_surge)
        stress_index = clamp(self.stress_memory + patient_pressure * 0.25 + self.random_state.gauss(0, 2.0), 0, 100)
        cognitive_load = clamp(department["cognitive"] * role["cognitive"] + patient_pressure * 0.18 + self.random_state.gauss(0, 3), 0, 100)
        movement = clamp(24 + patient_pressure * 0.55 * role["movement"] + self.random_state.gauss(0, 5), 0, 100)
        emotional = clamp(department["emotional"] + stress_index * 0.18 + (9 if self.profile.department == "Oncology" else 0), 0, 100)
        alarms = clamp(department["alarm_rate"] * role["alarm"] * (0.65 + patient_pressure / 85) + (12 if anomaly_type == "alarm_storm" else 0), 0, 120)
        noise = clamp(department["noise_db"] + alarms * 0.45 + self.random_state.gauss(0, 2.4), 20, 120)

        burnout_probability = logistic(
            -4.2
            + stress_index * 0.026
            + self.fatigue_index * 0.031
            + self.sleep_debt_hours * 0.18
            + overtime_hours * 0.12 * self.profile.overtime_sensitivity
            + patient_pressure * 0.015
            + self.profile.burnout_susceptibility * 0.85
            - self.profile.resilience * 0.65
        )

        hrv = clamp(
            self.profile.baseline_hrv
            - stress_index * 0.38
            - self.fatigue_index * 0.16
            - self.sleep_debt_hours * 0.75
            + self.random_state.gauss(0, 2.2),
            5,
            160,
        )
        heart_rate = clamp(
            self.profile.baseline_hr
            + stress_index * 0.25
            + self.fatigue_index * 0.08
            + movement * 0.11
            + (9 if anomaly_type == "tachycardia" else 0)
            + self.random_state.gauss(0, 2.0),
            35,
            210,
        )
        skin_temp = clamp(36.35 + stress_index * 0.006 + (0.35 if anomaly_type == "thermal_stress" else 0) + self.random_state.gauss(0, 0.08), 32, 40)
        recovery_score = clamp(100 - self.fatigue_index * 0.68 - self.sleep_debt_hours * 2.4 + self.profile.recovery_rate * 16, 0, 100)

        patient_count = int(clamp(patient_pressure / 4.2 + department["acuity"] * 8 + self.random_state.gauss(0, 2), 0, 60))
        staffing_ratio = clamp(1.3 + patient_pressure / 42 + (0.4 if weekend else 0), 0, 8)
        active_alarms = int(clamp(alarms / 1.7, 0, 80))
        shift_hours = elapsed_minutes / 60 if shift_type != "off" else 0

        event = TelemetryEvent(
            event_id=f"evt_{now.strftime('%Y%m%dT%H%M%SZ')}_{self.profile.staff_id}",
            timestamp=now,
            device_id=self.profile.device_id,
            staff_id=self.profile.staff_id,
            department=self.profile.department,
            role=self.profile.role,
            shift_id=f"shift_{self.profile.staff_id}_{now.strftime('%Y%m%d')}_{shift_type}",
            shift_type=shift_type,
            shift_minutes_elapsed=elapsed_minutes,
            signals=Signals(
                heart_rate_bpm=round(heart_rate, 1),
                hrv_ms=round(hrv, 1),
                stress_index=round(stress_index, 1),
                fatigue_index=round(self.fatigue_index, 1),
                skin_temperature_c=round(skin_temp, 2),
                sleep_debt_hours=round(self.sleep_debt_hours, 2),
                shift_duration_hours=round(shift_hours, 2),
                overtime_hours=round(overtime_hours + self.weekly_overtime_hours, 2),
                cognitive_load=round(cognitive_load, 1),
                movement_activity_level=round(movement, 1),
                emotional_stress_score=round(emotional, 1),
                burnout_probability=round(burnout_probability, 4),
                patient_pressure_index=round(patient_pressure, 1),
                alarm_exposure_frequency=round(alarms, 1),
                noise_exposure_db=round(noise, 1),
                night_shift_adaptation=round(self.profile.night_shift_adaptation, 3),
                recovery_score=round(recovery_score, 1),
            ),
            operational_context=OperationalContext(
                patient_count=patient_count,
                acuity_index=round(department["acuity"], 3),
                staffing_ratio=round(staffing_ratio, 2),
                active_alarms=active_alarms,
                weekend=weekend,
                emergency_surge=emergency_surge,
                anomaly_type=anomaly_type,
                load_intensity=round(load_intensity, 3),
            ),
            digital_twin=DigitalTwinState(
                resilience=round(self.profile.resilience, 3),
                recovery_rate=round(self.profile.recovery_rate, 3),
                overtime_sensitivity=round(self.profile.overtime_sensitivity, 3),
                burnout_susceptibility=round(self.profile.burnout_susceptibility, 3),
                sleep_quality=round(self.sleep_quality, 3),
            ),
        )
        self.last_shift_type = shift_type
        return event

    def _shift_state(self, now: datetime) -> tuple[str, int]:
        # 7-19 and 19-7 rotations; each staff member gets deterministic off-days.
        day_key = int(now.timestamp() // 86400)
        rotation = (day_key + self.profile.staff_index) % 4
        if rotation == 3:
            return "off", 0

        if 7 <= now.hour < 19:
            shift_type = "day" if rotation in {0, 1} else "off"
            start_hour = 7
        else:
            shift_type = "night" if rotation in {1, 2} else "off"
            start_hour = 19 if now.hour >= 19 else -5

        if shift_type == "off":
            return "off", 0
        elapsed = int(((now.hour - start_hour) * 60) + now.minute)
        return shift_type, max(0, elapsed)

    def _maybe_anomaly(self, patient_pressure: float, emergency_surge: bool) -> str | None:
        if self.anomaly_cooldown > 0:
            self.anomaly_cooldown -= 1
            return None

        probability = 0.008 + max(0, patient_pressure - 80) / 2000
        if emergency_surge:
            probability += 0.018
        if self.random_state.random() >= probability:
            return None

        self.anomaly_cooldown = self.random_state.randint(8, 20)
        return self.random_state.choice(
            ["hrv_drop", "tachycardia", "alarm_storm", "thermal_stress", "rapid_burnout_escalation"]
        )


def build_staff_roster(staff_per_department: int = 16, seed: int = 42) -> list[DigitalTwin]:
    rng = random.Random(seed)
    roster: list[DigitalTwin] = []
    role_cycle: list[Role] = ["nurse", "nurse", "nurse", "doctor", "doctor", "coordinator"]
    index = 0
    for department in DEPARTMENT_PROFILES:
        for i in range(staff_per_department):
            role = role_cycle[i % len(role_cycle)]
            staff_id = f"staff_{department.lower()}_{i + 1:03d}"
            resilience = clamp(rng.gauss(0.62, 0.12), 0.25, 0.95)
            recovery_rate = clamp(rng.gauss(0.58, 0.14), 0.2, 0.95)
            overtime_sensitivity = clamp(rng.gauss(0.55, 0.18), 0.12, 0.95)
            burnout_susceptibility = clamp(1.0 - resilience + rng.gauss(0.05, 0.12), 0.1, 0.95)
            night_shift_adaptation = clamp(rng.gauss(0.52, 0.18), 0.08, 0.94)
            profile = StaffProfile(
                staff_id=staff_id,
                device_id=f"headset_{department.lower()}_{i + 1:03d}",
                department=department,  # type: ignore[arg-type]
                role=role,
                staff_index=index,
                resilience=resilience,
                recovery_rate=recovery_rate,
                overtime_sensitivity=overtime_sensitivity,
                burnout_susceptibility=burnout_susceptibility,
                night_shift_adaptation=night_shift_adaptation,
                baseline_hr=clamp(rng.gauss(68, 7), 48, 92),
                baseline_hrv=clamp(rng.gauss(58, 13), 24, 112),
            )
            twin = DigitalTwin(
                profile=profile,
                fatigue_index=clamp(rng.gauss(32, 11), 8, 74),
                stress_memory=clamp(rng.gauss(30, 10), 5, 72),
                sleep_debt_hours=clamp(rng.gauss(2.5, 1.6), 0, 9),
                sleep_quality=clamp(rng.gauss(0.72, 0.14), 0.25, 1),
                random_state=random.Random(seed + index * 17),
            )
            roster.append(twin)
            index += 1
    return roster


def utc_now() -> datetime:
    return datetime.now(timezone.utc)

