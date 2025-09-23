import React, { useState } from 'react';
import { TestTube2 } from 'lucide-react';
import ChartContainer from '../ui/Charts';
// CORRECTED: Updated the import path to be explicit for the Vite resolver.


const WhatIfSimulator = ({ historicalData, initialEfficiency }) => {
    const [additionalCapacity, setAdditionalCapacity] = useState(2);
    const [simulatedResult, setSimulatedResult] = useState(null);

    const runSimulation = () => {
        if (!historicalData || historicalData.length === 0 || !initialEfficiency) {
            alert("Not enough data to run simulation. Please wait for initial data to load.");
            return;
        }
        const BASE_BATTERY_CAPACITY_KWH = 15;
        const MAX_CHARGE_KW = 4;
        const MAX_DISCHARGE_KW = 5;
        const INTERVAL_H = 5 / 3600;
        let totalGenerated = 0, totalConsumed = 0, newWastedEnergy = 0;
        let batterySocPercent = 70.0;
        const newBatteryCapacity = BASE_BATTERY_CAPACITY_KWH + additionalCapacity;

        historicalData.forEach(d => {
            const { total_kw: generation } = d.generation;
            const { consumption_kw: consumption } = d;
            totalGenerated += generation * INTERVAL_H;
            totalConsumed += consumption * INTERVAL_H;
            const netPower = generation - consumption;

            if (netPower > 0) {
                const chargePower = Math.min(netPower, MAX_CHARGE_KW);
                const energyAdded = chargePower * INTERVAL_H;
                const potentialSoc = batterySocPercent + (energyAdded / newBatteryCapacity) * 100;
                if (potentialSoc > 100) {
                    const usableEnergy = (100 - batterySocPercent) / 100 * newBatteryCapacity;
                    newWastedEnergy += energyAdded - usableEnergy;
                    batterySocPercent = 100;
                } else {
                    batterySocPercent = potentialSoc;
                }
            } else {
                const dischargePower = Math.min(Math.abs(netPower), MAX_DISCHARGE_KW);
                const energyRemoved = dischargePower * INTERVAL_H;
                batterySocPercent = Math.max(0, batterySocPercent - (energyRemoved / newBatteryCapacity) * 100);
            }
        });

        const newUsedEnergy = totalConsumed;
        const newTotalProduction = totalGenerated - newWastedEnergy;
        const newEfficiency = (newUsedEnergy / newTotalProduction) * 100;
        setSimulatedResult({
            newEfficiency: newEfficiency.toFixed(2),
            improvement: (newEfficiency - initialEfficiency).toFixed(2)
        });
    };

    return (
        <ChartContainer title="What-If Simulator" icon={<TestTube2 className="mr-3 text-indigo-600" size={28} />}>
            <p className="text-sm text-gray-600 mb-4">Calculate how adding more battery storage could improve grid efficiency.</p>
            <div className="flex items-center space-x-4 mb-4">
                <label htmlFor="battery" className="text-sm font-medium text-gray-700">Add Capacity (kWh):</label>
                <input type="number" id="battery" value={additionalCapacity} onChange={(e) => setAdditionalCapacity(parseFloat(e.target.value) || 0)} className="w-24 p-2 border border-gray-300 rounded-md"/>
            </div>
            <button onClick={runSimulation} className="bg-indigo-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-indigo-700 w-full">Recalculate</button>
            {simulatedResult && (
                <div className="mt-4 p-4 bg-indigo-50 border-l-4 border-indigo-400 rounded-md">
                    <p className="text-sm font-semibold text-indigo-800">Result:</p>
                    <p className="text-lg font-bold text-indigo-900">New Efficiency: {simulatedResult.newEfficiency}%</p>
                    <p className="text-md font-medium text-green-700">Improvement of +{simulatedResult.improvement}%</p>
                </div>
            )}
        </ChartContainer>
    );
};

export default WhatIfSimulator;

