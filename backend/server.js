import express from 'express';
import firebase from 'firebase-admin';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js'; // Import the API routes

// --- SECURE CONFIGURATION ---
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const app = express();
app.use(cors());
app.use(express.json());

// --- FIREBASE INITIALIZATION ---

// --- USE API ROUTES ---
// Tell Express to use the routes defined in api.js for any URL starting with /api
app.use('/api', apiRoutes);

// --- Server Start ---
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));


