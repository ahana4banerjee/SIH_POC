import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta

# --- SECURE CONFIGURATION BLOCK (for all Python files) ---
import os
from dotenv import load_dotenv
import json

# Load variables from the .env file in the root directory
load_dotenv()

# Securely load Firebase credentials from the environment variable
firebase_service_account_json_string = os.getenv('FIREBASE_SERVICE_ACCOUNT_JSON_STRING')
if not firebase_service_account_json_string:
    raise ValueError("Firebase credentials are not set in the .env file.")

# Convert the single-line JSON string back into a Python dictionary
service_account_info = json.loads(firebase_service_account_json_string)
credential = credentials.Certificate(service_account_info)

# Securely load the database URL
database_url = os.getenv('FIREBASE_DATABASE_URL')
if not database_url:
    raise ValueError("Firebase database URL is not set in the .env file.")


# --- 2. INITIALIZE FIREBASE ---
try:
    print("Initializing Firebase for Efficiency Calculation...")
    app = firebase_admin.initialize_app(
        credential,
        {'databaseURL': database_url},
        name='efficiencyProofApp'
    )
    print("   -> Firebase Initialized.")
except Exception as e:
    if 'has already been initialized' in str(e):
        app = firebase_admin.get_app(name='efficiencyProofApp')
    else:
        print(f"   -> CRITICAL ERROR: {e}")
        exit()

# --- 3. EFFICIENCY CALCULATION LOGIC ---
def calculate_and_save_efficiency_proof():
    print("\n--- Starting Efficiency Proof Calculation ---")
    
    # Fetch all available historical data from the 'live_data' node
    # For a real demo, you'd want at least 24 hours of simulated data.
    print("Fetching all historical data from Firebase...")
    live_data_ref = db.reference('live_data', app=app)
    historical_data = live_data_ref.get()
    
    if not historical_data or len(historical_data) < 200: # Need some data to be meaningful
        print("   -> Not enough historical data to perform a meaningful calculation.")
        print("      Please run the simulator.py for at least a few hours.")
        return

    data_points = list(historical_data.values())
    print(f"   -> Analyzing {len(data_points)} data points.")

    total_generated_kwh = 0
    total_consumed_kwh = 0
    wasted_overflow_kwh = 0
    
    # The energy in each 5-second interval is Power (kW) * Time (hours)
    energy_per_interval_kwh = 5 / 3600.0

    for point in data_points:
        # Sum up total generation and consumption over the entire period
        total_generated_kwh += point['generation']['total_kw'] * energy_per_interval_kwh
        total_consumed_kwh += point['consumption_kw'] * energy_per_interval_kwh
        
        net_power_kw = point['generation']['total_kw'] - point['consumption_kw']
        
        # This is the key logic: Identify wasted energy in the "Baseline" scenario
        # Wasted energy = Over-generation when the battery is already full.
        if net_power_kw > 0 and point['battery_soc_percent'] >= 99.5:
            wasted_overflow_kwh += net_power_kw * energy_per_interval_kwh

    if total_generated_kwh == 0:
        print("   -> Total generation is zero. Cannot calculate efficiency.")
        return

    # --- CALCULATE SCENARIOS ---
    
    # SCENARIO 1: BASELINE (Unoptimized)
    # The actual energy that was used. The rest was wasted.
    baseline_efficiency = (total_consumed_kwh / total_generated_kwh) * 100

    # SCENARIO 2: OPTIMIZED (With Your System)
    # We assume your system's alerts helped users consume the energy that *would have been* wasted.
    optimized_consumed_kwh = total_consumed_kwh + wasted_overflow_kwh
    optimized_efficiency = (optimized_consumed_kwh / total_generated_kwh) * 100
    
    improvement = optimized_efficiency - baseline_efficiency

    print("\n--- CALCULATION COMPLETE ---")
    print(f"Baseline Efficiency (Before): {baseline_efficiency:.2f}%")
    print(f"Optimized Efficiency (After): {optimized_efficiency:.2f}%")
    print(f"Total Improvement: {improvement:.2f}%")

    # --- SAVE TO FIREBASE ---
    proof_data = {
        'baseline_efficiency_percent': round(baseline_efficiency, 2),
        'optimized_efficiency_percent': round(optimized_efficiency, 2),
        'improvement_percent': round(improvement, 2),
        'last_calculated_timestamp': datetime.now().isoformat()
    }
    
    proof_ref = db.reference('efficiency_proof', app=app)
    proof_ref.set(proof_data) # Use set() to store only this single result
    print("\n✅ Efficiency proof data has been calculated and saved to Firebase.")


# --- 4. RUN THE SCRIPT ---
if __name__ == "__main__":
    calculate_and_save_efficiency_proof()