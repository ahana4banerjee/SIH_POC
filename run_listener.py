print("--- EXECUTING run_listener.py v1.0 (Clean Slate Version) ---")
print("If you do not see this message, you are running the wrong file.")
print("-" * 50)

import json
import paho.mqtt.client as mqtt
import firebase_admin
from firebase_admin import credentials, db
import time

# --- CONFIGURATION ---
# These are the settings from our successful test.
CRED_PATH = 'sih-54b90-firebase-adminsdk-fbsvc-da5e1c6ca4.json'
DATABASE_URL = 'https://sih-54b90-default-rtdb.firebaseio.com/'
MQTT_BROKER_ADDRESS = "test.mosquitto.org"
MQTT_TOPIC_TO_SUBSCRIBE = "smartgrid/data"
# --- END OF CONFIGURATION ---

# --- 2. INITIALIZE FIREBASE (FINAL CORRECTED VERSION) ---
try:
    print("STEP 1: Initializing Firebase...")
    cred = credentials.Certificate(CRED_PATH)
    
    # CHANGE #1: We capture the initialized app in a variable called 'app'.
    app = firebase_admin.initialize_app(
        cred,
        {'databaseURL': DATABASE_URL},
        name='myFinalListenerApp'
    )
    
    # CHANGE #2: We explicitly tell db.reference() to use our named 'app'.
    firebase_db_ref = db.reference('live_data', app=app)
    
    print("   -> SUCCESS: Firebase initialized and database reference created.")

except Exception as e:
    print(f"\n   -> ❌ CRITICAL ERROR: Firebase initialization failed.")
    print(f"      The specific error is: {e}\n")
    exit()

    
# --- MQTT Functions ---
def on_mqtt_connect(client, userdata, flags, rc):
    if rc == 0:
        print("STEP 2: Connected to MQTT Broker!")
        client.subscribe(MQTT_TOPIC_TO_SUBSCRIBE)
        print(f"   -> Subscribed to topic: '{MQTT_TOPIC_TO_SUBSCRIBE}'")
    else:
        print(f"   -> ❌ ERROR: Failed to connect to MQTT Broker. Code: {rc}")

def on_mqtt_message(client, userdata, msg):
    print(f"   -> Message received on '{msg.topic}'...")
    try:
        payload_string = msg.payload.decode('utf-8')
        data_dict = json.loads(payload_string)
        firebase_db_ref.push(data_dict)
    except Exception as e:
        print(f"      -> ERROR processing message: {e}")

# --- Main Script Logic ---
mqtt_client = mqtt.Client()
mqtt_client.on_connect = on_mqtt_connect
mqtt_client.on_message = on_mqtt_message

try:
    print("\nSTEP 3: Connecting to MQTT Broker...")
    mqtt_client.connect(MQTT_BROKER_ADDRESS)
    print("   -> Listener is now running. Press CTRL+C to stop.")
    mqtt_client.loop_forever()
except KeyboardInterrupt:
    print("\nScript stopped by user.")
    mqtt_client.disconnect()
except Exception as e:
    print(f"\n   -> ❌ CRITICAL ERROR: Could not connect to MQTT. Error: {e}")