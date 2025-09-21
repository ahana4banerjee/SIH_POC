import firebase_admin
from firebase_admin import credentials, db
from datetime import datetime
from fpdf import FPDF
import os
# --- SECURE CONFIGURATION BLOCK (for all Python files) ---
from dotenv import load_dotenv
import firebase_admin
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
    print("Initializing Firebase for Report Generation...")
    app = firebase_admin.initialize_app(
        credential,
        {'databaseURL': database_url},
        name='reportGeneratorApp'
    )
    print("   -> Firebase Initialized.")
except Exception as e:
    if 'has already been initialized' in str(e):
        app = firebase_admin.get_app(name='reportGeneratorApp')
    else:
        print(f"   -> CRITICAL ERROR: {e}")
        exit()

# --- 3. REPORT GENERATION LOGIC ---
def generate_report():
    print("\n--- Starting On-Demand Report Generation ---")
    
    # A. Fetch all historical data
    print("Fetching all historical data from Firebase...")
    live_data_ref = db.reference('live_data', app=app)
    historical_data = live_data_ref.get()
    
    if not historical_data or len(historical_data) < 100:
        print("   -> Not enough data for a meaningful report. Run the simulator longer.")
        return

    data_points = list(historical_data.values())
    print(f"   -> Analyzing {len(data_points)} data points.")

    # B. Calculate Key Metrics
    total_generated_kwh = 0
    total_consumed_kwh = 0
    wasted_overflow_kwh = 0
    underflow_events = 0
    energy_per_interval_kwh = 5 / 3600.0

    for point in data_points:
        total_generated_kwh += point['generation']['total_kw'] * energy_per_interval_kwh
        total_consumed_kwh += point['consumption_kw'] * energy_per_interval_kwh
        
        net_power = point['generation']['total_kw'] - point['consumption_kw']
        if net_power > 0 and point['battery_soc_percent'] >= 99.5:
            wasted_overflow_kwh += net_power * energy_per_interval_kwh
        if net_power < 0 and point['battery_soc_percent'] <= 0.5:
            underflow_events += 1

    downtime_avoided_minutes = (underflow_events * 5) / 60
    baseline_efficiency = (total_consumed_kwh / total_generated_kwh * 100) if total_generated_kwh > 0 else 0
    optimized_consumed_kwh = total_consumed_kwh + wasted_overflow_kwh
    optimized_efficiency = (optimized_consumed_kwh / total_generated_kwh * 100) if total_generated_kwh > 0 else 0

    # C. Generate Smart Recommendation
    recommendation = "System is running optimally."
    if wasted_overflow_kwh > (total_generated_kwh * 0.1): # If more than 10% of energy is wasted
        recommendation = f"Consider adding ~{wasted_overflow_kwh / 30:.1f} kWh of battery storage to capture wasted energy during peak generation."
    elif underflow_events > 50:
        recommendation = "Frequent power shortages detected. Consider adding more generation capacity or increasing battery storage."

    # D. Prepare the report data object
    report_data = {
        'report_date': datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        'total_generation_kwh': round(total_generated_kwh, 2),
        'total_consumption_kwh': round(total_consumed_kwh, 2),
        'downtime_avoided_minutes': round(downtime_avoided_minutes, 2),
        'baseline_efficiency_percent': round(baseline_efficiency, 2),
        'optimized_efficiency_percent': round(optimized_efficiency, 2),
        'recommendation': recommendation,
        'data_points_analyzed': len(data_points)
    }

    # E. Save JSON report to Firebase
    report_ref = db.reference('reports/latest', app=app)
    report_ref.set(report_data)
    print("✅ JSON report saved to Firebase under /reports/latest.")
    
    # F. Generate and save PDF report
    pdf = FPDF()
    pdf.add_page()
    pdf.set_font("Arial", 'B', 16)
    pdf.cell(200, 10, txt="Microgrid Performance Report", ln=True, align='C')
    pdf.set_font("Arial", '', 12)
    pdf.cell(200, 10, txt=f"Date: {report_data['report_date']}", ln=True, align='C')
    pdf.ln(10)

    for key, value in report_data.items():
        pdf.set_font("Arial", 'B', 12)
        pdf.cell(80, 10, txt=key.replace('_', ' ').title())
        pdf.set_font("Arial", '', 12)
        pdf.cell(100, 10, txt=str(value), ln=True)
    
    # Create a 'reports' directory if it doesn't exist
    if not os.path.exists('reports'):
        os.makedirs('reports')
    pdf_filename = 'reports/latest_report.pdf'
    pdf.output(pdf_filename)
    print(f"✅ PDF report saved locally as '{pdf_filename}'.")

# --- 4. RUN THE SCRIPT ---
if __name__ == "__main__":
    generate_report()