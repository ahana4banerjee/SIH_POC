import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, CheckCircle, RefreshCw } from 'lucide-react';
import ChartContainer from '../ui/Charts';

const EfficiencyProofSection = ({ data, onRecalculate, isCalculating }) => {
    // Render a placeholder with a recalculate button if no data is available
    if (!data) {
        return (
            <ChartContainer>
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <TrendingUp className="mr-3 text-gray-400" size={28} />
                        <h2 className="text-xl font-semibold text-gray-500">System Efficiency Impact</h2>
                    </div>
                </div>
                <div className="flex flex-col items-center justify-center h-full text-center">
                    <p className="text-gray-500">Efficiency data has not been calculated yet.</p>
                    <p className="text-gray-500 mb-4">Run the simulation and click below.</p>
                    <button 
                        onClick={onRecalculate} 
                        disabled={isCalculating} 
                        className="mt-4 w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center"
                    >
                        <RefreshCw size={18} className={`mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                        {isCalculating ? 'Calculating...' : 'Calculate Initial Efficiency'}
                    </button>
                </div>
            </ChartContainer>
        );
    }

    // Prepare data for the comparison chart
    const chartData = [
        { name: 'Before', Efficiency: data.baseline_efficiency_percent, fill: '#6b7280' },
        { name: 'After', Efficiency: data.optimized_efficiency_percent, fill: '#16a34a' }
    ];

    return (
        <ChartContainer>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <TrendingUp className="mr-3 text-green-600" size={28} />
                    <h2 className="text-xl font-semibold text-gray-900">System Efficiency Impact</h2>
                </div>
                <button 
                    onClick={onRecalculate} 
                    disabled={isCalculating} 
                    className="bg-blue-600 text-white font-semibold py-2 px-3 rounded-md hover:bg-blue-700 disabled:bg-gray-400 flex items-center"
                >
                    <RefreshCw size={16} className={`mr-2 ${isCalculating ? 'animate-spin' : ''}`} />
                    {isCalculating ? '...' : 'Recalculate'}
                </button>
            </div>
            <div className="bg-green-100 border-l-4 border-green-500 text-green-800 p-4 rounded-md mb-6" role="alert">
                <div className="flex items-center">
                    <CheckCircle className="mr-3" />
                    <p className="font-bold">System Improves Grid Efficiency by {data.improvement_percent}%</p>
                </div>
            </div>
            <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} unit="%" />
                    <YAxis type="category" dataKey="name" width={60} />
                    <Tooltip formatter={(value) => `${value}%`} />
                    <Bar dataKey="Efficiency" barSize={40} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default EfficiencyProofSection;
