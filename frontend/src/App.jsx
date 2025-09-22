import React, { useState, useEffect, useRef } from 'react';
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Sun, Wind, BatteryCharging, House, AlertTriangle, Cpu, TrendingUp, CheckCircle, FileText, Download, MessageSquare, Mail, TestTube2, BookOpen, Bell } from 'lucide-react';

// --- Reusable UI Components ---
const StatCard = ({ title, value, unit, icon, color }) => ( <div className="bg-white p-4 rounded-lg shadow-md flex items-center h-full"><div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div><div><p className="text-sm text-gray-500 font-medium">{title}</p><p className="text-2xl font-bold text-gray-800">{value} <span className="text-lg font-normal">{unit}</span></p></div></div> );
const ChartContainer = ({ title, icon, children }) => ( <div className="bg-white p-6 rounded-lg shadow-md h-full flex flex-col">{title && (<div className="flex items-center mb-4">{icon}<h2 className="text-xl font-semibold text-gray-900">{title}</h2></div>)}<div className="flex-grow">{children}</div></div> );

// --- View Components ---

// CORRECTED: ConsumptionPieChart with labels inside the slices
const ConsumptionPieChart = ({ totalConsumption }) => {
    const categories = [ { name: 'HVAC', value: 0.40 }, { name: 'Lighting', value: 0.15 }, { name: 'Appliances', value: 0.25 }, { name: 'EV Charging', value: 0.12 }, { name: 'Other', value: 0.08 } ];
    const pieData = categories.map(cat => ({ name: cat.name, value: parseFloat((totalConsumption * cat.value).toFixed(2)) }));
    const COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#06b6d4', '#6366f1'];
    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.05) { return null; }
        return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-semibold">{`${(percent * 100).toFixed(0)}%`}</text>);
    };
    return (<ResponsiveContainer width="100%" height={350}><PieChart><Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" paddingAngle={2} labelLine={false} label={renderCustomizedLabel}>{pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => `${value} kW`} /><Legend /></PieChart></ResponsiveContainer>);
};

// ... (All other components remain unchanged)
const EfficiencyProofSection = ({ data }) => { if (!data) return null; const chartData = [{ name: 'Before', Efficiency: data.baseline_efficiency_percent, fill: '#6b7280' }, { name: 'After', Efficiency: data.optimized_efficiency_percent, fill: '#16a34a' }]; return (<ChartContainer><div className="flex items-center mb-4"><TrendingUp className="mr-3 text-green-600" size={28} /><h2 className="text-xl font-semibold text-gray-900">System Efficiency Impact</h2></div><div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md mb-6" role="alert"><div className="flex items-center"><CheckCircle className="mr-3" /><p className="font-bold">System Improves Grid Efficiency by {data.improvement_percent}%</p></div></div><ResponsiveContainer width="100%" height={250}><BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis type="number" domain={[0, 100]} unit="%" /><YAxis type="category" dataKey="name" width={60} /><Tooltip formatter={(value) => `${value}%`} /><Bar dataKey="Efficiency" barSize={40} /></BarChart></ResponsiveContainer></ChartContainer>); };

const LiveEnergyFlowChart = ({ data }) => { const chartData = data.map(d => ({ time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), 'Solar (kW)': d.generation.solar_kw, 'Wind (kW)': d.generation.wind_kw, 'Consumption (kW)': d.consumption_kw, })); return (<ResponsiveContainer width="100%" height={350}><AreaChart data={chartData}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="time" /><YAxis /><Tooltip /><Legend /><Area type="monotone" dataKey="Solar (kW)" stackId="1" stroke="#f59e0b" fill="#f59e0b" /><Area type="monotone" dataKey="Wind (kW)" stackId="1" stroke="#06b6d4" fill="#06b6d4" /><Area type="monotone" dataKey="Consumption (kW)" stackId="2" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} /></AreaChart></ResponsiveContainer>); };

const WhatIfSimulator = ({ historicalData, initialEfficiency }) => { const [additionalCapacity, setAdditionalCapacity] = useState(2); const [simulatedResult, setSimulatedResult] = useState(null); const runSimulation = () => { if (!historicalData || historicalData.length === 0 || !initialEfficiency) { alert("Not enough data to run simulation. Please wait for initial data to load."); return; } const BASE_BATTERY_CAPACITY_KWH = 15; const MAX_CHARGE_KW = 4; const MAX_DISCHARGE_KW = 5; const INTERVAL_H = 5 / 3600; let totalGenerated = 0; let totalConsumed = 0; let newWastedEnergy = 0; let batterySocPercent = 70.0; const newBatteryCapacity = BASE_BATTERY_CAPACITY_KWH + additionalCapacity; historicalData.forEach(d => { const generation = d.generation.total_kw; const consumption = d.consumption_kw; totalGenerated += generation * INTERVAL_H; totalConsumed += consumption * INTERVAL_H; const netPower = generation - consumption; if (netPower > 0) { const chargePower = Math.min(netPower, MAX_CHARGE_KW); const energyAdded = chargePower * INTERVAL_H; const potentialSoc = batterySocPercent + (energyAdded / newBatteryCapacity) * 100; if (potentialSoc > 100) { const usableEnergy = (100 - batterySocPercent) / 100 * newBatteryCapacity; newWastedEnergy += energyAdded - usableEnergy; batterySocPercent = 100; } else { batterySocPercent = potentialSoc; } } else { const dischargePower = Math.min(Math.abs(netPower), MAX_DISCHARGE_KW); const energyRemoved = dischargePower * INTERVAL_H; batterySocPercent = Math.max(0, batterySocPercent - (energyRemoved / newBatteryCapacity) * 100); } }); const newUsedEnergy = totalConsumed; const newTotalProduction = totalGenerated - newWastedEnergy; const newEfficiency = (newUsedEnergy / newTotalProduction) * 100; setSimulatedResult({ newEfficiency: newEfficiency.toFixed(2), improvement: (newEfficiency - initialEfficiency).toFixed(2) }); }; return (<ChartContainer title="What-If Simulator" icon={<TestTube2 className="mr-3 text-indigo-600" size={28} />}><p className="text-sm text-gray-600 mb-4">Calculate how adding more battery storage could improve grid efficiency.</p><div className="flex items-center space-x-4 mb-4"><label htmlFor="battery" className="text-sm font-medium text-gray-700">Add Capacity (kWh):</label><input type="number" id="battery" value={additionalCapacity} onChange={(e) => setAdditionalCapacity(parseFloat(e.target.value) || 0)} className="w-24 p-2 border border-gray-300 rounded-md"/></div><button onClick={runSimulation} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 w-full">Recalculate</button>{simulatedResult && (<div className="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-md"><p className="text-sm font-semibold text-indigo-800">Result:</p><p className="text-lg font-bold text-indigo-900">New Efficiency: {simulatedResult.newEfficiency}%</p><p className="text-md font-medium text-green-700">Improvement of +{simulatedResult.improvement}%</p></div>)}</ChartContainer>); };

const ReportsView = ({ API_BASE_URL }) => { const [reports, setReports] = useState({}); useEffect(() => { fetch(`${API_BASE_URL}/all-reports`).then(res => res.json()).then(data => setReports(data)); }, [API_BASE_URL]); return (<div className="space-y-6">{Object.entries(reports).length > 0 ? Object.entries(reports).map(([key, report]) => (<div key={key} className="bg-white p-6 rounded-lg shadow-md"><h3 className="text-lg font-bold mb-2">Report: {new Date(report.report_date).toLocaleDateString()}</h3><p className="text-sm text-gray-500 mb-4">{report.recommendation}</p><a href={`${API_BASE_URL}/download-report-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700"><Download size={18} className="mr-2" />Download PDF</a></div>)) : <div className="bg-white p-6 rounded-lg shadow-md"><p>No reports found. Please run the `report_generator.py` script to create one.</p></div>}</div>); };

// CORRECTED: AlertsView component with more robust class rendering
const AlertsView = ({ alerts }) => {
    return (
        <div className="space-y-4">
            {alerts.length > 0 ? alerts.map((alert, index) => {
                const severity = alert.severity?.toUpperCase();
                const isCritical = severity === 'CRITICAL';
                const isWarning = severity === 'WARNING';
                console.log(alerts);
                
                return (
                    <div 
                        key={index} 
                        className={`
                            flex items-start p-4 rounded-lg shadow-sm border-l-4 
                            ${isCritical ? 'bg-red-50 border-red-500' : 'bg-black-20'}
                            ${isWarning ? 'bg-yellow-50 border-yellow-500' : ''}
                            ${!isCritical && !isWarning ? 'bg-gray-50 border-gray-500' : ''}
                        `}
                    >
                        <AlertTriangle 
                            size={24} 
                            className={`
                                mr-4 mt-1 flex-shrink-0 
                                ${isCritical ? 'text-red-600' : ''}
                                ${isWarning ? 'text-yellow-600' : ''}
                                ${!isCritical && !isWarning ? 'text-gray-500' : ''}
                            `} 
                        />
                        <div>
                            <p 
                                className={`
                                    font-semibold text-lg
                                    ${isCritical ? 'text-red-600' : ''}
                                    ${isWarning ? 'text-yellow-600' : ''}
                                    ${!isCritical && !isWarning ? 'text-gray-500' : ''}
                                `}
                            >
                                {alert.type}
                            </p>
                            <p className="text-md text-gray-800 mt-1">{alert.message}</p>
                            <p className="text-sm text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                );
            }) : (
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-gray-500">No alerts have been recorded. The system is stable.</p>
                </div>
            )}
        </div>
    );
};


function App() {
    const [activeView, setActiveView] = useState('dashboard');
    const [latestData, setLatestData] = useState(null);
    const [historicalData, setHistoricalData] = useState([]);
    const [alerts, setAlerts] = useState([]);
    const [efficiencyProof, setEfficiencyProof] = useState(null);
    const [loading, setLoading] = useState(true);
    const spokenAlerts = useRef(new Set());
    const API_BASE_URL = 'http://localhost:5000/api';

    useEffect(() => {
        const fetchData = async () => { try { const [latest, historical, alertData, efficiency] = await Promise.all([ fetch(`${API_BASE_URL}/latest-data`), fetch(`${API_BASE_URL}/historical-data`), fetch(`${API_BASE_URL}/alerts`), fetch(`${API_BASE_URL}/efficiency-proof`) ]); if (latest.ok) setLatestData(await latest.json()); if (historical.ok) setHistoricalData(await historical.json()); if (efficiency.ok) setEfficiencyProof(await efficiency.json()); if (alertData.ok) { const newAlerts = await alertData.json().then(data => data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))); setAlerts(newAlerts); newAlerts.forEach(alert => { if (alert.severity === 'CRITICAL' && !spokenAlerts.current.has(alert.timestamp) && 'speechSynthesis' in window) { const utterance = new SpeechSynthesisUtterance(`Critical Alert: ${alert.message}`); window.speechSynthesis.speak(utterance); spokenAlerts.current.add(alert.timestamp); } }); } } catch (e) { console.error("Fetch failed:", e); } finally { setLoading(false); } };
        fetchData(); const interval = setInterval(fetchData, 5000); return () => clearInterval(interval);
    }, []);

    const renderView = () => {
        switch (activeView) {
            case 'reports': return <ReportsView API_BASE_URL={API_BASE_URL} />;
            case 'alerts': return <AlertsView alerts={alerts} />;
            default: return (
                <>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <EfficiencyProofSection data={efficiencyProof} />
                        <WhatIfSimulator historicalData={historicalData} initialEfficiency={efficiencyProof?.optimized_efficiency_percent} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                        <StatCard title="Live Solar" value={latestData?.generation?.solar_kw || 0} unit="kW" icon={<Sun size={24} className="text-white" />} color="bg-yellow-500" />
                        <StatCard title="Live Wind" value={latestData?.generation?.wind_kw || 0} unit="kW" icon={<Wind size={24} className="text-white" />} color="bg-cyan-500" />
                        <StatCard title="Live Consumption" value={latestData?.consumption_kw || 0} unit="kW" icon={<House size={24} className="text-white" />} color="bg-green-500" />
                        <StatCard title="Live Battery" value={`${latestData?.battery_soc_percent || 0}%`} unit="" icon={<BatteryCharging size={24} className="text-white" />} color="bg-blue-500" />
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2"><ChartContainer title="Live Energy Flow" icon={<Cpu className="mr-3 text-gray-600" size={28} />}><LiveEnergyFlowChart data={historicalData} /></ChartContainer></div>
                        <div className="lg:col-span-1"><ChartContainer title="Live Load Distribution"><ConsumptionPieChart totalConsumption={latestData?.consumption_kw || 0} /></ChartContainer></div>
                    </div>
                </>
            );
        }
    };
    
    if (loading) { return (<div className="min-h-screen bg-gray-50 flex items-center justify-center"><Cpu className="animate-spin h-12 w-12 text-blue-500" /><p className="ml-4 text-lg text-gray-600">Loading Microgrid Data...</p></div>); }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-800 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="mb-6">
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900">Renewable Energy Microgrid Monitoring</h1>
                    <p className="text-md text-gray-600">The complete solution for grid optimization and monitoring.</p>
                </header>
                <nav className="mb-6 flex space-x-2 border-b">
                    <button onClick={() => setActiveView('dashboard')} className={`px-4 py-2 font-medium text-sm rounded-t-md ${activeView === 'dashboard' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600'}`}>Dashboard</button>
                    <button onClick={() => setActiveView('reports')} className={`px-4 py-2 font-medium text-sm rounded-t-md ${activeView === 'reports' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600'}`}><BookOpen size={16} className="inline-block mr-2" />Reports</button>
                    <button onClick={() => setActiveView('alerts')} className={`px-4 py-2 font-medium text-sm rounded-t-md ${activeView === 'alerts' ? 'border-b-2 border-blue-600 text-blue-600 bg-blue-50' : 'text-gray-500 hover:text-blue-600'}`}><Bell size={16} className="inline-block mr-2" />Alerts</button>
                </nav>
                <main>{renderView()}</main>
            </div>
        </div>
    );
}

export default App;
