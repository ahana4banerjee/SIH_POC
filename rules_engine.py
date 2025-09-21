import firebase_admin
from firebase_admin import credentials, db
import time
from datetime import datetime

# --- 1. CONFIGURATION ---
CRED_PATH = 'sih-54b90-firebase-adminsdk-fbsvc-da5e1c6ca4.json'
DATABASE_URL = 'https://sih-54b90-default-rtdb.firebaseio.com/'
CHECK_INTERVAL_SECONDS = 10 # Check for new data every 10 seconds

# --- 2. INITIALIZE FIREBASE ---
try:
    print("Initializing Firebase for Rules Engine...")
    app = firebase_admin.initialize_app(
        credentials.Certificate(CRED_PATH),
        {'databaseURL': DATABASE_URL},
        name='rulesEngineApp'
    )
    db_ref_live_data = db.reference('live_data', app=app)
    db_ref_alerts = db.reference('alerts', app=app)
    print("   -> Firebase Initialized.")
except Exception as e:
    if 'has already been initialized' in str(e):
        app = firebase_admin.get_app(name='rulesEngineApp')
        db_ref_live_data = db.reference('live_data', app=app)
        db_ref_alerts = db.reference('alerts', app=app)
    else:
        print(f"   -> CRITICAL ERROR: {e}")
        exit()

# --- 3. THE RULES ENGINE LOGIC ---
def run_rules_engine():
    """Monitors the latest data and triggers alerts based on predefined rules."""
    last_processed_timestamp = None
    
    while True:
        try:
            # Fetch the single most recent data point
            query = db_ref_live_data.order_by_child('timestamp').limit_to_last(1)
            latest_data_snapshot = query.get()

            if not latest_data_snapshot:
                print("Waiting for data...")
                time.sleep(CHECK_INTERVAL_SECONDS)
                continue

            # Extract the data
            key = list(latest_data_snapshot.keys())[0]
            data = latest_data_snapshot[key]
            
            # Avoid re-processing the same alert
            if data['timestamp'] == last_processed_timestamp:
                time.sleep(CHECK_INTERVAL_SECONDS)
                continue
                
            last_processed_timestamp = data['timestamp']
            print(f"Processing data from {data['timestamp']}...")

            # --- Rule 1: Low Battery Alert (CRITICAL) ---
            if data['battery_soc_percent'] < 20:
                create_alert(
                    alert_type="Low Battery",
                    message=f"Battery SOC is critically low at {data['battery_soc_percent']}%.",
                    severity="CRITICAL" # NEW: Added severity
                )

            # --- Rule 2: Overflow Alert (WARNING) ---
            is_overflow = (data['battery_soc_percent'] > 95 and 
                           data['generation']['total_kw'] > data['consumption_kw'])
            if is_overflow:
                create_alert(
                    alert_type="Energy Overflow",
                    message="Battery is full but generation exceeds consumption. Potential energy waste.",
                    severity="WARNING" # NEW: Added severity
                )

            # --- Rule 3: Panel Fault Alert (WARNING) ---
            now = datetime.fromisoformat(data['timestamp'])
            is_daytime = 7 <= now.hour < 18 # Is it between 7 AM and 6 PM?
            if is_daytime and data['generation']['solar_kw'] < 0.1:
                 create_alert(
                    alert_type="Potential Solar Panel Fault",
                    message="Solar generation is near zero during daytime. Maintenance may be required.",
                    severity="WARNING" # NEW: Added severity
                )

        except Exception as e:
            print(f"An error occurred in the rules engine loop: {e}")
        
        time.sleep(CHECK_INTERVAL_SECONDS)


def create_alert(alert_type, message, severity):
    """Pushes a new, structured alert to Firebase."""
    timestamp = datetime.now().isoformat()
    alert_data = {
        'timestamp': timestamp,
        'type': alert_type,
        'message': message,
        'severity': severity # NEW: Added severity
    }
    db_ref_alerts.push(alert_data)
    print(f"ALERT CREATED ({severity}): {message}")

# --- 4. START THE ENGINE ---
if __name__ == "__main__":
    print("--- Smart Rules Engine is now running ---")
    run_rules_engine()
