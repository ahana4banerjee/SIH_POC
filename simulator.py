import time
import json
import random
import datetime
import numpy as np
import paho.mqtt.client as mqtt
import requests 
import os
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, db

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


# --- 1. CONFIGURATION ---
MQTT_BROKER = "test.mosquitto.org"
MQTT_PORT = 1883
MQTT_TOPIC = "smartgrid/data"

# --- NEW: Weather API Configuration ---
# TODO: Paste your own free API key from OpenWeatherMap.org here
WEATHER_API_KEY = os.getenv('OPENWEATHER_API_KEY')
# Coordinates for a sample rural area (e.g., a village in Telangana, India)
LATITUDE = 63.5
LONGITUDE = 154.4

# Simulation Parameters (unchanged)
SOLAR_AREA = 25
SOLAR_EFFICIENCY = 0.20
WIND_BLADE_RADIUS = 1.5
AIR_DENSITY = 1.225
WIND_POWER_COEFFICIENT = 0.4
BATTERY_CAPACITY_KWH = 15
MAX_DISCHARGE_KW = 5
MAX_CHARGE_KW = 4

# --- 2. INITIALIZE SERVICES ---
client = mqtt.Client()
# ... (MQTT initialization code is unchanged) ...
def on_connect(client, userdata, flags, rc):
    if rc == 0: print("Connected to MQTT Broker!")
    else: print(f"Failed to connect, return code {rc}\n")
client.on_connect = on_connect
try:
    client.connect(MQTT_BROKER, MQTT_PORT)
    client.loop_start()
except Exception as e:
    print(f"MQTT connection failed: {e}")
    exit()

# --- NEW: Fetch Live Weather Data ---
def get_live_weather_data():
    """Fetches real-world weather data to make the simulation realistic."""
    
    api_url = f"https://api.openweathermap.org/data/2.5/weather?lat={LATITUDE}&lon={LONGITUDE}&appid={WEATHER_API_KEY}&units=metric"
    try:
        response = requests.get(api_url, timeout=10)
        response.raise_for_status() # Raise an exception for bad status codes
        data = response.json()
        print(f"Successfully fetched live weather for {data['name']}: Wind {data['wind']['speed']} m/s, Clouds {data['clouds']['all']}%")
        return {
            'wind_speed': data['wind']['speed'],
            'clouds': data['clouds']['all'] # Cloudiness percentage
        }
    except requests.exceptions.RequestException as e:
        print(f"Could not fetch weather data: {e}. Using default random values.")
        return {'wind_speed': random.uniform(3, 12), 'clouds': random.randint(10, 70)}

# --- 3. UPDATED SIMULATION LOGIC ---
# Initial State
battery_soc = 70.0
current_fault = "None"
solar_efficiency_modifier = 1.0

def get_time_based_value(peak_value, peak_hour):
    now = datetime.datetime.now()
    # hour = now.hour + now.minute / 60
    hour = 13
    return max(0, peak_value * np.sin((hour - (peak_hour - 6)) * np.pi / 12))

def simulate_solar_generation(cloud_cover_percent):
    """UPGRADED: Solar power is now affected by real-world cloud cover."""
    irradiance = get_time_based_value(1000, 13)
    # Reduce irradiance based on cloud cover. 100% cloud cover doesn't mean 0 sun.
    cloud_factor = 1 - (0.75 * (cloud_cover_percent / 100)) # e.g., 100% clouds = 25% power
    effective_irradiance = irradiance * cloud_factor
    power = effective_irradiance * SOLAR_AREA * SOLAR_EFFICIENCY * solar_efficiency_modifier
    return round(power / 1000, 3)

def simulate_wind_generation(wind_speed_ms):
    """UPGRADED: Wind power is now driven by real-world wind speed."""
    blade_area = np.pi * (WIND_BLADE_RADIUS ** 2)
    power = 0.5 * WIND_POWER_COEFFICIENT * AIR_DENSITY * blade_area * (wind_speed_ms ** 3)
    return round(power / 1000, 3)

# ... (consumption and battery logic is unchanged) ...
def simulate_consumption(): return round(get_time_based_value(3.5, 8) + get_time_based_value(4.0, 19) + 0.5, 3)
def update_battery_soc(generation, consumption, current_soc):
    net_power = generation - consumption
    interval_h = 5 / 3600
    if net_power > 0:
        energy_added_kwh = min(net_power, MAX_CHARGE_KW) * interval_h
        return min(100, current_soc + (energy_added_kwh / BATTERY_CAPACITY_KWH) * 100)
    else:
        energy_removed_kwh = min(abs(net_power), MAX_DISCHARGE_KW) * interval_h
        return max(0, current_soc - (energy_removed_kwh / BATTERY_CAPACITY_KWH) * 100)
def inject_fault():
    global solar_efficiency_modifier, current_fault
    if random.random() < 0.05:
        solar_efficiency_modifier = 0.70; current_fault = "Solar panel efficiency degraded"
    elif random.random() < 0.02:
        solar_efficiency_modifier = 1.0; current_fault = "None"
    return current_fault

# --- 4. MAIN SIMULATION LOOP ---
print("Starting weather-grounded simulation...")
live_weather = get_live_weather_data() # Fetch weather once at the start

try:
    while True:
        # UPGRADED: Pass real weather data into the simulation functions
        solar_power = simulate_solar_generation(live_weather['clouds'])
        wind_power = simulate_wind_generation(live_weather['wind_speed'])
        
        total_generation = solar_power + wind_power
        consumption = simulate_consumption()
        battery_soc = update_battery_soc(total_generation, consumption, battery_soc)
        active_fault = inject_fault()

        payload = {
            "source": "virtual_grid_sensor",
            "generation": {"solar_kw": solar_power, "wind_kw": wind_power, "total_kw": round(total_generation, 3)},
            "battery_soc_percent": round(battery_soc, 2), "consumption_kw": consumption,
            "grid_status": {"fault": active_fault, "net_power_kw": round(total_generation - consumption, 3)},
            "timestamp": datetime.datetime.now().isoformat()
        }
        
        client.publish(MQTT_TOPIC, json.dumps(payload))
        print(f"Published weather-grounded data: Solar={solar_power}kW, Wind={wind_power}kW")
        time.sleep(5)

except KeyboardInterrupt:
    print("\nSimulation stopped.")
    client.loop_stop(); client.disconnect()
