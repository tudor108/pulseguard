from __future__ import annotations

from .schemas import Recommendation


def build_recommendations(features: dict[str, float], probability: float) -> list[Recommendation]:
    recommendations: list[Recommendation] = []

    if features["fatigue_index"] >= 72 or features["sleep_debt_hours"] >= 6:
        recommendations.append(
            Recommendation(
                action="protected_micro_break",
                priority="high" if probability >= 0.64 else "medium",
                rationale="High fatigue or sleep debt; schedule a protected 15 minute recovery break within the next hour.",
                expected_impact=-0.06,
            )
        )

    if features["overtime_hours"] >= 8 or features["shift_duration_hours"] >= 11:
        recommendations.append(
            Recommendation(
                action="cap_overtime_and_shift_swap",
                priority="critical" if probability >= 0.82 else "high",
                rationale="Overtime and long shift duration are pushing the risk trajectory upward.",
                expected_impact=-0.11,
            )
        )

    if features["patient_pressure_index"] >= 82 or features["staffing_ratio"] >= 3.2:
        recommendations.append(
            Recommendation(
                action="add_float_staff_or_redistribute_patients",
                priority="high",
                rationale="Patient pressure and staffing ratio are above the safe operational band for this department.",
                expected_impact=-0.09,
            )
        )

    if features["alarm_exposure_frequency"] >= 20 or features["noise_exposure_db"] >= 72:
        recommendations.append(
            Recommendation(
                action="alarm_noise_mitigation",
                priority="medium",
                rationale="Sustained alarm and noise exposure can accelerate cognitive fatigue.",
                expected_impact=-0.04,
            )
        )

    if not recommendations:
        recommendations.append(
            Recommendation(
                action="continue_monitoring",
                priority="low",
                rationale="Signals are within expected operational range; continue normal monitoring.",
                expected_impact=-0.01,
            )
        )

    return recommendations[:3]

