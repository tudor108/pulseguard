import argparse
import datetime
import json

import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_squared_error, r2_score

def generate_pulseguard_data(num_records=1000):
    np.random.seed(42)

    # 1. Base Information
    start_time = datetime.datetime.now()
    timestamps = [start_time + datetime.timedelta(hours=2 * i) for i in range(num_records)]

    domains = ['Ginecologie', 'Urologie', 'Cardiologie', 'Neurologie', 'Ortopedie', 'Chirurgie Generala', 'ATI']

    # Pre-generate basic operational metrics and counts
    env_domain = np.random.choice(domains, num_records)
    doc_domain = env_domain # For simplicity, assuming the doctor works in the environment's domain

    # Environment stats
    env_total_doctors = np.random.randint(5, 30, num_records)
    env_total_nurses = np.random.randint(10, 60, num_records)
    env_total_patients_easy = np.random.randint(20, 100, num_records)
    env_total_patients_medium = np.random.randint(10, 50, num_records)
    env_total_patients_severe = np.random.randint(2, 20, num_records)

    env_total_treatments_by_hour = np.random.randint(5, 40, num_records)
    env_total_visits_by_hour = np.random.randint(10, 50, num_records)

    # Doctor stats (subset of environment)
    doc_patients_easy = np.floor(env_total_patients_easy / env_total_doctors * np.random.uniform(0.8, 1.2, num_records)).astype(int)
    doc_patients_medium = np.floor(env_total_patients_medium / env_total_doctors * np.random.uniform(0.8, 1.2, num_records)).astype(int)
    doc_patients_severe = np.floor(env_total_patients_severe / env_total_doctors * np.random.uniform(0.8, 1.2, num_records)).astype(int)
    doc_treatments_by_hour = np.floor(env_total_treatments_by_hour / env_total_doctors * np.random.uniform(0.8, 1.2, num_records)).astype(int)
    doc_visits_by_hour = np.floor(env_total_visits_by_hour / env_total_doctors * np.random.uniform(0.8, 1.2, num_records)).astype(int)

    # Biometric Sensors (0-100 scale)
    eeg_signal_stress = np.random.uniform(20, 95, num_records)
    vocal_biomarker_stress = np.random.uniform(20, 95, num_records)

    # Operational Metrics
    total_staff = env_total_doctors + env_total_nurses
    total_patients = env_total_patients_easy + env_total_patients_medium + env_total_patients_severe
    patient_staff_ratio = np.round(total_patients / total_staff, 2)

    overtime_accumulation = np.random.uniform(0, 25, num_records) # Hours
    night_shift_clustering = np.random.randint(0, 6, num_records) # Consecutive nights
    recovery_time = np.random.uniform(6, 16, num_records) # Hours between shifts
    sick_leave_incidence = np.random.uniform(-5, 15, num_records) # Trend %
    incident_report_frequency = np.random.randint(0, 5, num_records)
    stress_survey_scores = np.random.uniform(30, 100, num_records)
    staff_occupancy = np.random.uniform(60, 100, num_records) # %

    # Mathematical Functions for KPIs
    def calc_staff_deficit_risk(occupancy, sick_leave):
        return np.clip(occupancy * 0.7 + (sick_leave > 5) * 20, 0, 100)

    def calc_staff_pressure_index(ratio, occupancy, severe_patients):
        return np.clip((ratio * 10) + (occupancy * 0.5) + (severe_patients * 2), 0, 100)

    def calc_fatigue_index(eeg, vocal, overtime, recovery, nights):
        # High eeg/vocal, high overtime, low recovery, high consecutive nights -> High fatigue
        fatigue = (eeg * 0.3) + (vocal * 0.2) + (overtime * 1.5) + ((12 - recovery) * 3) + (nights * 5)
        return np.clip(fatigue, 0, 100)

    def calc_intervention_urgency(pressure, incidents, severe):
        urgency = (pressure * 0.6) + (incidents * 10) + (severe * 1.5)
        return np.clip(urgency, 0, 100)

    def calc_burnout_risk(fatigue, survey, overtime, nights):
        risk = (fatigue * 0.4) + (survey * 0.3) + (overtime * 1.2) + (nights * 4)
        return np.clip(risk, 0, 100)

    # Calculate KPIs
    staff_deficit_risk = calc_staff_deficit_risk(staff_occupancy, sick_leave_incidence)
    staff_pressure_index = calc_staff_pressure_index(patient_staff_ratio, staff_occupancy, env_total_patients_severe)
    fatigue_index = calc_fatigue_index(eeg_signal_stress, vocal_biomarker_stress, overtime_accumulation, recovery_time, night_shift_clustering)
    intervention_urgency = calc_intervention_urgency(staff_pressure_index, incident_report_frequency, env_total_patients_severe)
    burnout_risk = calc_burnout_risk(fatigue_index, stress_survey_scores, overtime_accumulation, night_shift_clustering)

    # Forecasting & Predictive Data
    # 14-Day Trajectory: slight variation of current risk based on overtime and occupancy trends
    forecast_14_day = np.clip(burnout_risk + np.random.uniform(-10, 20, num_records) + (overtime_accumulation * 0.5), 0, 100)
    window_to_peak = np.where(forecast_14_day > burnout_risk, np.random.randint(1, 14, num_records), 0)
    affected_staff_count = np.floor((burnout_risk / 100) * total_staff * np.random.uniform(0.7, 1.0, num_records)).astype(int)
    impact_delta = np.random.uniform(-5, -25, num_records) # e.g. reducing burnout risk by 15 points

    # Build DataFrame
    data = {
        'Timestamp': timestamps,
        'EEG_Signal_Stress': np.round(eeg_signal_stress, 2),
        'Vocal_Biomarker_Stress': np.round(vocal_biomarker_stress, 2),
        'Doctor_Domain': doc_domain,
        'Doctor_Patients_Easy': doc_patients_easy,
        'Doctor_Patients_Medium': doc_patients_medium,
        'Doctor_Patients_Severe': doc_patients_severe,
        'Doctor_Treatments_By_Hour': doc_treatments_by_hour,
        'Doctor_Visits_By_Hour': doc_visits_by_hour,
        'Env_Domain': env_domain,
        'Env_Total_Doctors': env_total_doctors,
        'Env_Total_Nurses': env_total_nurses,
        'Env_Total_Patients_Easy': env_total_patients_easy,
        'Env_Total_Patients_Medium': env_total_patients_medium,
        'Env_Total_Patients_Severe': env_total_patients_severe,
        'Env_Total_Treatments_By_Hour': env_total_treatments_by_hour,
        'Env_Total_Visits_By_Hour': env_total_visits_by_hour,
        'Patient_Staff_Ratio': patient_staff_ratio,
        'Overtime_Accumulation_Hours': np.round(overtime_accumulation, 2),
        'Night_Shift_Clustering': night_shift_clustering,
        'Recovery_Time_Hours': np.round(recovery_time, 2),
        'Sick_Leave_Incidence_Trend': np.round(sick_leave_incidence, 2),
        'Incident_Report_Frequency': incident_report_frequency,
        'Stress_Survey_Scores': np.round(stress_survey_scores, 2),
        'Staff_Occupancy_Pct': np.round(staff_occupancy, 2),
        'Staff_Deficit_Risk': np.round(staff_deficit_risk, 2),
        'Staff_Pressure_Index': np.round(staff_pressure_index, 2),
        'Fatigue_Index': np.round(fatigue_index, 2),
        'Intervention_Urgency': np.round(intervention_urgency, 2),
        'Burnout_Risk': np.round(burnout_risk, 2),
        'Forecast_14_Day_Trajectory': np.round(forecast_14_day, 2),
        'Window_to_Peak_Days': window_to_peak,
        'Affected_Staff_Count': affected_staff_count,
        'Impact_Delta_Points': np.round(impact_delta, 2)
    }

    df = pd.DataFrame(data)
    df.set_index('Timestamp', inplace=True)
    return df

def build_ml_pipeline(df):
    """
    Builds a Machine Learning pipeline to predict Burnout Risk
    based on operational and environmental metrics.
    """
    print("\n--- Starting ML Pipeline ---")

    # 1. Feature Selection
    # We predict Burnout Risk using features that would be available BEFORE calculating the KPI
    features = [
        'EEG_Signal_Stress', 'Vocal_Biomarker_Stress',
        'Patient_Staff_Ratio', 'Overtime_Accumulation_Hours',
        'Night_Shift_Clustering', 'Recovery_Time_Hours',
        'Sick_Leave_Incidence_Trend', 'Incident_Report_Frequency',
        'Stress_Survey_Scores', 'Staff_Occupancy_Pct',
        'Env_Total_Patients_Severe', 'Env_Total_Doctors', 'Env_Total_Nurses'
    ]
    target = 'Burnout_Risk'

    X = df[features]
    y = df[target]

    # 2. Train-Test Split
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

    # 3. Preprocessing
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)

    # 4. Model Training
    print("Training Random Forest Regressor to predict Burnout Risk...")
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train_scaled, y_train)

    # 5. Evaluation
    y_pred = rf_model.predict(X_test_scaled)

    mse = mean_squared_error(y_test, y_pred)
    rmse = np.sqrt(mse)
    r2 = r2_score(y_test, y_pred)

    print("\n--- Model Evaluation ---")
    print(f"Root Mean Squared Error (RMSE): {rmse:.2f} (Scale: 0-100)")
    print(f"R-squared (R2) Score:         {r2:.4f}")

    # Feature Importance
    importances = rf_model.feature_importances_
    feature_importance_df = pd.DataFrame({
        'Feature': features,
        'Importance': importances
    }).sort_values(by='Importance', ascending=False)

    print("\n--- Top 5 Feature Importances ---")
    print(feature_importance_df.head(5).to_string(index=False))

    return rf_model, scaler, feature_importance_df

def build_ml_summary(df, model, scaler, feature_importance_df, sample_idx=0):
    features = [
        'EEG_Signal_Stress', 'Vocal_Biomarker_Stress',
        'Patient_Staff_Ratio', 'Overtime_Accumulation_Hours',
        'Night_Shift_Clustering', 'Recovery_Time_Hours',
        'Sick_Leave_Incidence_Trend', 'Incident_Report_Frequency',
        'Stress_Survey_Scores', 'Staff_Occupancy_Pct',
        'Env_Total_Patients_Severe', 'Env_Total_Doctors', 'Env_Total_Nurses'
    ]
    sample_data = df.iloc[sample_idx]
    sample_features = sample_data[features].values.reshape(1, -1)
    sample_scaled = scaler.transform(sample_features)
    predicted_risk = float(model.predict(sample_scaled)[0])
    actual_risk = float(sample_data['Burnout_Risk'])

    return {
        "actualBurnoutRisk": round(actual_risk, 2),
        "predictedBurnoutRisk": round(predicted_risk, 2),
        "forecast14DayTrajectory": round(float(sample_data["Forecast_14_Day_Trajectory"]), 2),
        "staffPressureIndex": round(float(sample_data["Staff_Pressure_Index"]), 2),
        "fatigueIndex": round(float(sample_data["Fatigue_Index"]), 2),
        "staffDeficitRisk": round(float(sample_data["Staff_Deficit_Risk"]), 2),
        "interventionUrgency": round(float(sample_data["Intervention_Urgency"]), 2),
        "patientStaffRatio": round(float(sample_data["Patient_Staff_Ratio"]), 2),
        "affectedStaffCount": int(sample_data["Affected_Staff_Count"]),
        "topFeatures": feature_importance_df.head(5).to_dict(orient="records"),
    }

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generate PulseGuard synthetic data and train a burnout-risk ML model.")
    parser.add_argument("--records", type=int, default=2000, help="Number of synthetic records to generate.")
    parser.add_argument("--json", action="store_true", help="Print a compact JSON summary for agent prompts.")
    args = parser.parse_args()

    # 1. Generate Dataset
    print("Generating PulseGuard Synthetic Dataset...")
    df = generate_pulseguard_data(num_records=args.records)

    # Save to CSV
    output_file = 'pulseguard_synthetic_data.csv'
    df.to_csv(output_file)
    print(f"Dataset generated with {len(df)} records and saved to {output_file}.")

    # 2. Run ML Pipeline
    model, scaler, importances = build_ml_pipeline(df)

    # Display a sample prediction
    print("\n--- Sample Prediction ---")
    sample_idx = 0
    sample_data = df.iloc[sample_idx]

    features = [
        'EEG_Signal_Stress', 'Vocal_Biomarker_Stress',
        'Patient_Staff_Ratio', 'Overtime_Accumulation_Hours',
        'Night_Shift_Clustering', 'Recovery_Time_Hours',
        'Sick_Leave_Incidence_Trend', 'Incident_Report_Frequency',
        'Stress_Survey_Scores', 'Staff_Occupancy_Pct',
        'Env_Total_Patients_Severe', 'Env_Total_Doctors', 'Env_Total_Nurses'
    ]

    sample_features = sample_data[features].values.reshape(1, -1)
    sample_scaled = scaler.transform(sample_features)
    predicted_risk = model.predict(sample_scaled)[0]
    actual_risk = sample_data['Burnout_Risk']

    print(f"Actual Burnout Risk:    {actual_risk:.2f}")
    print(f"Predicted Burnout Risk: {predicted_risk:.2f}")
    if args.json:
        print("\n--- Agent JSON Summary ---")
        print(json.dumps(build_ml_summary(df, model, scaler, importances, sample_idx), indent=2))
    print("Pipeline Execution Completed Successfully.")
