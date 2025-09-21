import express from 'express';
import admin from 'firebase-admin';
import firebase from 'firebase-admin';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

// --- ESM FIX FOR __dirname ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Securely parse the service account key from the environment variable
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_JSON_STRING;
if (!serviceAccountString) {
  throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON_STRING is not set in .env file!');
}
const serviceAccount = JSON.parse(serviceAccountString);

// Securely get the database URL
const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
  throw new Error('FIREBASE_DATABASE_URL is not set in .env file!');
}
const PORT = 5000;

// Initialize Firebase with secure credentials
firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: databaseURL
});

const db = firebase.database();
const app = express();
app.use(cors());
app.use(express.json());

// --- CORE API ENDPOINTS ---
app.get('/api/latest-data', async (req, res) => { try { const s = await db.ref('live_data').orderByKey().limitToLast(1).once('value'); s.exists() ? res.json(Object.values(s.val())[0]) : res.status(404).send('No live data.'); } catch (e) { res.status(500).send(e.message); } });
app.get('/api/historical-data', async (req, res) => { try { const s = await db.ref('live_data').orderByKey().limitToLast(100).once('value'); s.exists() ? res.json(Object.values(s.val())) : res.status(404).send('No historical data.'); } catch (e) { res.status(500).send(e.message); } });
app.get('/api/alerts', async (req, res) => { try { const s = await db.ref('alerts').once('value'); res.json(s.exists() ? Object.values(s.val()).reverse() : []); } catch (e) { res.status(500).send(e.message); } });
app.get('/api/efficiency-proof', async (req, res) => { try { const s = await db.ref('efficiency_proof').once('value'); s.exists() ? res.json(s.val()) : res.status(404).send('No efficiency proof data.'); } catch (e) { res.status(500).send(e.message); } });

// --- REPORTING ENDPOINTS ---
app.get('/api/all-reports', async (req, res) => {
    try {
        const snapshot = await db.ref('reports').once('value');
        res.json(snapshot.exists() ? snapshot.val() : {});
    } catch (error) { res.status(500).send(error.message); }
});
app.get('/api/download-report-pdf', (req, res) => {
    const pdfPath = path.join(__dirname, '../reports/latest_report.pdf');
    res.download(pdfPath, 'Microgrid_Performance_Report.pdf', (err) => {
        if (err) { res.status(404).send("Could not find the report PDF. Please run 'report_generator.py'."); }
    });
});
app.post('/api/send-report-sms', (req, res) => { const { phone } = req.body; console.log(`SIMULATION: SMS to ${phone}`); res.json({ success: true, message: `Report sent to ${phone} (Simulated)` }); });
app.post('/api/send-report-email', (req, res) => { const { email } = req.body; console.log(`SIMULATION: Email to ${email}`); res.json({ success: true, message: `Report sent to ${email} (Simulated)` }); });

// --- START THE SERVER ---
app.listen(PORT, () => {
    console.log(`✅ Definitive Backend Server running on http://localhost:${PORT}`);
});

