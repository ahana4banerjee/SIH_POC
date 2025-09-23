import express from 'express';
import firebase from 'firebase-admin';
import path from 'path';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Note: We need to go up two directories to get to the project root from backend/routes
const projectRoot = path.dirname(path.dirname(__filename)); 

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });



const router = express.Router();

const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING;
if (!serviceAccountString) {
  throw new Error('Firebase credentials not set in .env file!');
}
const serviceAccount = JSON.parse(serviceAccountString);

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
  throw new Error('Firebase DB URL not set in .env file!');
}

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = firebase.database();


// --- API Endpoints ---

router.get('/latest-data', async (req, res) => {
    try {
        const snapshot = await db.ref('live_data').orderByChild('timestamp').limitToLast(1).once('value');
        const data = snapshot.val();
        if (data) {
            const latestKey = Object.keys(data)[0];
            res.json(data[latestKey]);
        } else {
            res.status(404).json({ message: 'No data found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/historical-data', async (req, res) => {
    try {
        const snapshot = await db.ref('live_data').orderByChild('timestamp').limitToLast(100).once('value');
        res.json(Object.values(snapshot.val() || {}));
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/all-reports', async (req, res) => {
    try {
        const snapshot = await db.ref('reports').once('value');
        res.json(snapshot.val() || {});
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/get-latest-report', async (req, res) => {
    try {
        const snapshot = await db.ref('reports/latest').once('value');
        if (snapshot.exists()) { res.json(snapshot.val()); }
        else { res.status(404).json({ message: 'Report not generated yet.' }); }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/alerts', async (req, res) => {
    try {
        const snapshot = await db.ref('alerts').orderByChild('timestamp').limitToLast(50).once('value');
        res.json(Object.values(snapshot.val() || {}).reverse());
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/efficiency-proof', async (req, res) => {
    try {
        const snapshot = await db.ref('efficiency_proof').once('value');
        if (snapshot.exists()) {
            res.json(snapshot.val());
        } else {
            res.status(404).json({ message: 'Efficiency proof not calculated yet.' });
        }
    } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/download-report-pdf', (req, res) => {
    const pdfPath = path.join(projectRoot, 'Microgrid_Performance_Report.pdf');
    res.download(pdfPath, 'Microgrid_Performance_Report.pdf', (err) => {
        if (err) {
            console.error("PDF download error:", err);
            res.status(404).send('Report PDF not found. Please run the report_generator.py script first.');
        }
    });
});

router.get('/ml-prediction', async (req, res) => {
    try {
        const snapshot = await db.ref('predictions_ml').once('value');
        if (snapshot.exists()) {
            res.json(snapshot.val());
        } else {
            res.status(404).json({ message: 'ML Prediction not calculated yet. Please run the prediction.py script.' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


router.post('/recalculate-efficiency', (req, res) => {
    try {
        console.log("Received request to recalculate efficiency...");

        const pythonExecutable = path.join(projectRoot, '..', '.venv', 'Scripts', 'python.exe'); 
        const pythonScriptPath = path.join(projectRoot, '..', 'efficiency_calculator.py');

        const command = `"${pythonExecutable}" "${pythonScriptPath}"`;

        console.log("Running command:", command);

        exec(command, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing script: ${error.message}`);
                return res.status(500).json({ success: false, message: 'Failed to run calculation script.', error: error.message });
            }
            if (stderr) {
                console.error(`Script stderr: ${stderr}`);
                return res.status(500).json({ success: false, message: 'Python script error.', error: stderr });
            }
            console.log(`Script stdout: ${stdout}`);
            res.json({ success: true, message: 'Efficiency calculation complete! Refreshing data.' });
        });
    } catch (err) {
        console.error("Route crashed:", err);
        res.status(500).json({ success: false, message: "Route failed before execution", error: err.message });
    }
});

// ... (Simulated SMS/Email endpoints remain the same)
router.post('/send-report-sms', (req, res) => {
    const { phone } = req.body;
    console.log(`SIMULATING SENDING SMS to ${phone}`);
    res.json({ message: `Report successfully sent to ${phone} (Simulated).` });
});

router.post('/send-report-email', (req, res) => {
    const { email } = req.body;
    console.log(`SIMULATING SENDING EMAIL to ${email}`);
    res.json({ message: `Report successfully sent to ${email} (Simulated).` });
});

export default router;
