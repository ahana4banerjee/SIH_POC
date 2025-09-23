import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Cpu, Bell, BookOpen, LayoutDashboard } from 'lucide-react';

// Import the Page components you have created
import DashboardPage from './pages/DashboardPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';

function App() {
    const [latestData, setLatestData] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [predictionData, setPredictionData] = useState(null);
    const [alerts, setAlerts] = useState([]);
    const [efficiencyProof, setEfficiencyProof] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCalculating, setIsCalculating] = useState(false);
    const spokenAlerts = useRef(new Set());
    const API_BASE_URL = 'http://localhost:5000/api';

    // Centralized data fetching function
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        try {
            const [latest, historical, alertData, efficiency, prediction] = await Promise.all([
                fetch(`${API_BASE_URL}/latest-data`),
                fetch(`${API_BASE_URL}/historical-data`),
                fetch(`${API_BASE_URL}/alerts`),
                fetch(`${API_BASE_URL}/efficiency-proof`),
                fetch(`${API_BASE_URL}/ml-prediction`)
            ]);
            if (latest.ok) setLatestData(await latest.json());
            if (historical.ok) setHistoricalData(await historical.json());
            if (efficiency.ok) setEfficiencyProof(await efficiency.json());
            if (prediction.ok) setPredictionData(await prediction.json());
            if (alertData.ok) {
                const newAlerts = await alertData.json().then(data => data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)));
                setAlerts(newAlerts);
                newAlerts.forEach(alert => {
                    if (alert.severity === 'CRITICAL' && !spokenAlerts.current.has(alert.timestamp) && 'speechSynthesis' in window) {
                        const utterance = new SpeechSynthesisUtterance(`Critical Alert: ${alert.message}`);
                        window.speechSynthesis.speak(utterance);
                        spokenAlerts.current.add(alert.timestamp);
                    }
                });
            }
        } catch (e) {
            console.error("Fetch failed:", e);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData(true);
        const interval = setInterval(() => fetchData(false), 5000); // Fetch live data periodically
        return () => clearInterval(interval);
    }, [fetchData]);

    const handleRecalculate = async () => {
        setIsCalculating(true);
        try {
            const response = await fetch(`${API_BASE_URL}/recalculate-efficiency`, { method: 'POST' });
            const result = await response.json();
            alert(result.message);
            if (result.success) {
                setTimeout(() => fetchData(false), 2000); // Refetch data after calculation
            }
        } catch (error) {
            alert(`An error occurred: ${error.message}`);
        }
        setIsCalculating(false);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Cpu className="animate-spin h-12 w-12 text-blue-500" />
                <p className="ml-4 text-lg text-gray-600">Loading Microgrid Data...</p>
            </div>
        );
    }

    // Navigation link styles
    const navLinkClasses = ({ isActive }) =>
        `flex items-center px-4 py-2 font-medium text-sm rounded-t-md ${
            isActive
            ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50'
            : 'text-gray-500 hover:text-blue-600'
        }`;

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Renewable Energy Microgrid Monitoring</h1>
                    <p className="text-md text-gray-600">The complete solution for grid optimization and monitoring.</p>
                </header>
                <nav className="mb-6 flex space-x-2 border-b">
                    <NavLink to="/" className={navLinkClasses} end><LayoutDashboard size={16} className="mr-2" />Dashboard</NavLink>
                    <NavLink to="/reports" className={navLinkClasses}><BookOpen size={16} className="mr-2" />Reports</NavLink>
                    <NavLink to="/alerts" className={navLinkClasses}><Bell size={16} className="mr-2" />Alerts</NavLink>
                </nav>
                <main>
                    <Routes>
                        <Route path="/" element={
                            <DashboardPage
                                latestData={latestData}
                                historicalData={historicalData}
                                efficiencyProof={efficiencyProof}
                                predictionData={predictionData}
                                onRecalculate={handleRecalculate}
                                isCalculating={isCalculating}
                            />
                        } />
                        <Route path="/reports" element={<ReportsPage API_BASE_URL={API_BASE_URL} />} />
                        <Route path="/alerts" element={<AlertsPage alerts={alerts} />} />
                    </Routes>
                </main>
            </div>
        </div>
    );
}

export default App;

