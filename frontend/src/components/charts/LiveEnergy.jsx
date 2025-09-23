import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Cpu } from 'lucide-react';
import ChartContainer from '../ui/Charts';
// CORRECTED: Updated the import path to correctly locate the ChartContainer component.


const LiveEnergyFlowChart = ({ data }) => {
    const chartData = data.map(d => ({
        time: new Date(d.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        'Solar (kW)': d.generation.solar_kw,
        'Wind (kW)': d.generation.wind_kw,
        'Consumption (kW)': d.consumption_kw,
    }));

    return (
        <ChartContainer title="Live Energy Flow" icon={<Cpu className="mr-3 text-gray-600" size={28} />}>
            <ResponsiveContainer width="100%" height={350}>
                <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="time" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Area type="monotone" dataKey="Solar (kW)" stackId="1" stroke="#f59e0b" fill="#f59e0b" />
                    <Area type="monotone" dataKey="Wind (kW)" stackId="1" stroke="#06b6d4" fill="#06b6d4" />
                    <Area type="monotone" dataKey="Consumption (kW)" stackId="2" stroke="#16a34a" fill="#16a34a" fillOpacity={0.3} />
                </AreaChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default LiveEnergyFlowChart;

