import React from 'react';
// CORRECTED: Added .jsx extension to all component imports for clarity
import { Sun, Wind, BatteryCharging, House } from 'lucide-react';
import StatCard from '../components/ui/StaticCard.jsx';
import EfficiencyProofSection from '../components/features/Efficiency.jsx';
import WhatIfSimulator from '../components/features/WhatIfSimulator.jsx';
import LiveEnergyFlowChart from '../components/charts/LiveEnergy.jsx';
import ConsumptionPieChart from '../components/charts/ConsumptionPie.jsx';
import PredictionChart from '../components/charts/Predictions.jsx';

const DashboardPage = ({ latestData, historicalData, efficiencyProof, onRecalculate, isCalculating,predictionData }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-2 gap-6">
                <EfficiencyProofSection data={efficiencyProof} onRecalculate={onRecalculate} isCalculating={isCalculating} />
                <WhatIfSimulator historicalData={historicalData} initialEfficiency={efficiencyProof?.optimized_efficiency_percent} />
            </div>
            <div className="grid grid-cols-4 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard title="Live Solar" value={latestData?.generation?.solar_kw || 0} unit="kW" icon={<Sun size={24} className="text-white" />} color="bg-yellow-500" />
                <StatCard title="Live Wind" value={latestData?.generation?.wind_kw || 0} unit="kW" icon={<Wind size={24} className="text-white" />} color="bg-cyan-500" />
                <StatCard title="Live Consumption" value={latestData?.consumption_kw || 0} unit="kW" icon={<House size={24} className="text-white" />} color="bg-green-500" />
                <StatCard title="Live Battery" value={`${latestData?.battery_soc_percent || 0}%`} unit="" icon={<BatteryCharging size={24} className="text-white" />} color="bg-blue-500" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                <div className="lg:col-span-2">
                    <LiveEnergyFlowChart data={historicalData} />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
                    <div className="h-full">
                        <ConsumptionPieChart totalConsumption={latestData?.consumption_kw || 0} />
                    </div>
                    <div className="h-full">
                        <PredictionChart predictionData={predictionData} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// CORRECTED: Removed the duplicate, inline definition of EfficiencyProofSection.

export default DashboardPage;

