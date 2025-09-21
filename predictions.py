import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime, timedelta
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error
import numpy as np
# --- SECURE CONFIGURATION BLOCK (for all Python files) ---
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db
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


TRAINING_DATA_DAYS = 7

# --- 2. INITIALIZE FIREBASE ---
try:
    print("Initializing Firebase for ML Prediction...")
    app = firebase_admin.initialize_app(
        credential,
        {'databaseURL': database_url},
        name='predictionMLApp'
    )
    print("   -> Firebase Initialized.")
except Exception as e:
    if 'has already been initialized' in str(e):
        app = firebase_admin.get_app(name='predictionMLApp')
    else:
        print(f"   -> CRITICAL ERROR: {e}")
        exit()

# --- 3. MACHINE LEARNING PREDICTION & EVALUATION LOGIC ---
def predict_and_evaluate():
    print(f"\n--- ML Prediction & Evaluation using last {TRAINING_DATA_DAYS} days ---")

    # A. Fetch and prepare data (same as before)
    # ... (Fetching and data preparation code is identical to the previous script)
    end_date = datetime.now()
    start_date = end_date - timedelta(days=TRAINING_DATA_DAYS)
    start_iso = start_date.isoformat()
    print(f"Fetching data since {start_date.strftime('%Y-%m-%d')}...")
    live_data_ref = db.reference('live_data', app=app)
    historical_data = live_data_ref.order_by_child('timestamp').start_at(start_iso).get()
    
    if not historical_data or len(historical_data) < 50: # Increased threshold for a proper test
        print("Not enough historical data to evaluate. Let the simulator run longer.")
        return

    print(f"   -> Found {len(historical_data)} data points.")
    print("Preparing data and creating features...")
    df = pd.DataFrame.from_dict(historical_data, orient='index')
    df['solar_kw'] = df['generation'].apply(lambda x: x.get('solar_kw', 0))
    df['timestamp'] = pd.to_datetime(df['timestamp'])
    df['hour'] = df['timestamp'].dt.hour
    df['day_of_week'] = df['timestamp'].dt.dayofweek
    
    features = ['hour', 'day_of_week']
    target = 'solar_kw'
    X = df[features]
    y = df[target]

    # B. NEW: Split Data into Training and Testing sets
    print("Splitting data into training and testing sets (80/20 split)...")
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    # C. Train the Model on the Training Data ONLY
    print("Training the model...")
    model = LinearRegression()
    model.fit(X_train, y_train)
    
    # D. NEW: Evaluate the Model on the Unseen Testing Data
    print("Evaluating model performance on the test set...")
    predictions_on_test_data = model.predict(X_test)
    mae = mean_absolute_error(y_test, predictions_on_test_data)
    
    print("\n--- MODEL RELIABILITY REPORT ---")
    print(f"📊 Mean Absolute Error (MAE): {mae:.4f} kW")
    print(f"   -> Interpretation: On average, the model's prediction for solar power is off by {mae:.4f} kW.")
    print("   -> (A lower MAE is better).")
    
    # E. Retrain the model on ALL data before making a final forecast
    print("\nRetraining model on all available data for final forecast...")
    model.fit(X, y) # Retrain on the full dataset
    
    # F. Make Predictions for Tomorrow (same as before)
    print("Making predictions for tomorrow...")
    tomorrow = datetime.now() + timedelta(days=1)
    future_data = pd.DataFrame({'hour': range(24), 'day_of_week': tomorrow.weekday()})
    hourly_predictions_kw = np.clip(model.predict(future_data), 0, None)
    total_predicted_kwh = np.sum(hourly_predictions_kw)

    print("\n--- ML Prediction Result ---")
    print(f"👉 Tomorrow's Total Expected Solar Energy: {total_predicted_kwh:.2f} kWh")

    # G. Save results to Firebase
    hourly_forecast = {f"{hour:02d}:00": round(power, 2) for hour, power in enumerate(hourly_predictions_kw)}
    prediction_ref = db.reference('predictions_ml', app=app)
    prediction_data = {
        'prediction_timestamp': datetime.now().isoformat(),
        'predicted_total_kwh': round(total_predicted_kwh, 2),
        'hourly_forecast_kw': hourly_forecast,
        'model_evaluation': {
            'mean_absolute_error_kw': round(mae, 4),
            'data_points_used': len(df)
        }
    }
    prediction_ref.set(prediction_data)
    print("   -> Detailed forecast and reliability report saved to Firebase.")

# --- 4. RUN THE SCRIPT ---
if __name__ == "__main__":
    predict_and_evaluate()