import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta

# --- 1. CONFIGURATION ---
# These settings must match your other scripts.
CRED_PATH = 'sih-54b90-firebase-adminsdk-fbsvc-da5e1c6ca4.json'
DATABASE_URL = 'https://sih-54b90-default-rtdb.firebaseio.com/'


# --- 2. INITIALIZE FIREBASE ---
try:
    print("Initializing Firebase for Analytics...")
    cred = credentials.Certificate(CRED_PATH)
    # Give this app a unique name to avoid conflicts
    app = firebase_admin.initialize_app(
        cred,
        {'databaseURL': DATABASE_URL},
        name='analyticsApp'
    )
    print("   -> Firebase Initialized.")
except Exception as e:
    # This can happen if the app is already initialized in another script
    # running in the same process. We try to get the existing app.
    if 'has already been initialized' in str(e):
        print("   -> Firebase app already initialized. Getting existing app.")
        app = firebase_admin.get_app(name='analyticsApp')
    else:
        print(f"   -> CRITICAL ERROR: {e}")
        exit()


# --- 3. ANALYTICS LOGIC ---
def run_analysis():
    """Fetches recent data and performs analysis."""
    print("\n--- Running Analytics Cycle ---")
    
    # Define the time window for analysis (e.g., last 15 minutes)
    end_time = datetime.now()
    start_time = end_time - timedelta(minutes=1)
    start_iso = start_time.isoformat()
    
    print(f"Fetching data from the last 15 minutes...")
    live_data_ref = db.reference('live_data', app=app)
    recent_data = live_data_ref.order_by_child('timestamp').start_at(start_iso).get()
    
    if not recent_data:
        print("No recent data found to analyze. Make sure the simulator is running.")
        return
        
    data_points = list(recent_data.values())
    print(f"   -> Found {len(data_points)} data points to analyze.")
    
    # Initialize counters
    total_generated_kw = 0
    total_consumed_kw = 0
    overflow_events = 0
    underflow_events = 0

    for reading in data_points:
        total_generated_kw += reading['generation']['total_kw']
        total_consumed_kw += reading['consumption_kw']
        
        # Detect Overflow (wasted energy): Generating more than needed AND the battery is full.
        is_overflow = (reading['generation']['total_kw'] > reading['consumption_kw'] and 
                       reading['battery_soc_percent'] >= 99.5)
        if is_overflow:
            overflow_events += 1

        # Detect Underflow (power shortage): Consuming more than generating AND the battery is empty.
        is_underflow = (reading['consumption_kw'] > reading['generation']['total_kw'] and 
                        reading['battery_soc_percent'] <= 0.5)
        if is_underflow:
            underflow_events += 1
            
    # Calculate overall "Grid Utilization Efficiency" for the period
    # This metric shows how much of the generated power was directly used by the load.
    efficiency = (total_consumed_kw / total_generated_kw * 100) if total_generated_kw > 0 else 0
    
    print("\n--- Analysis Results ---")
    print(f"Grid Utilization Efficiency: {efficiency:.2f}%")
    print(f"Wasted Energy Events (Overflow): {overflow_events}")
    print(f"Power Shortage Events (Underflow): {underflow_events}")

    # Log alerts to a new '/alerts' node in Firebase if thresholds are breached
    alerts_ref = db.reference('alerts', app=app)
    timestamp = datetime.now().isoformat()
    
    # If more than 2 overflow events occurred, log an alert.
    if overflow_events > 2:
        alert_msg = f"High energy overflow detected ({overflow_events} instances in 15 mins)."
        print(f"ALERT: {alert_msg}")
        alerts_ref.push({'timestamp': timestamp, 'type': 'Overflow', 'message': alert_msg})
        
    if underflow_events > 2:
        alert_msg = f"Potential power shortage detected ({underflow_events} instances in 15 mins)."
        print(f"ALERT: {alert_msg}")
        alerts_ref.push({'timestamp': timestamp, 'type': 'Underflow', 'message': alert_msg})


# --- 4. RUN THE SCRIPT ---
if __name__ == "__main__":
    run_analysis()