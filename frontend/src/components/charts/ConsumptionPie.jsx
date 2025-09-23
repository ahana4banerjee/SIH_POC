import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import ChartContainer from '../ui/Charts';
// CORRECTED: Updated the import path to correctly locate the ChartContainer component.

const ConsumptionPieChart = ({ totalConsumption }) => {
    const categories = [
        { name: 'HVAC', value: 0.40 }, { name: 'Lighting', value: 0.15 },
        { name: 'Appliances', value: 0.25 }, { name: 'EV Charging', value: 0.12 },
        { name: 'Other', value: 0.08 }
    ];
    const pieData = categories.map(cat => ({
        name: cat.name,
        value: parseFloat((totalConsumption * cat.value).toFixed(2))
    }));
    const COLORS = ['#3b82f6', '#16a34a', '#f59e0b', '#06b6d4', '#6366f1'];

    const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
        const RADIAN = Math.PI / 180;
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * RADIAN);
        const y = cy + radius * Math.sin(-midAngle * RADIAN);
        if (percent < 0.05) return null;
        return (<text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="font-semibold">{`${(percent * 100).toFixed(0)}%`}</text>);
    };

    return (
        <ChartContainer title="Live Load Distribution">
            <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} fill="#8884d8" paddingAngle={2} labelLine={false} label={renderCustomizedLabel}>
                        {pieData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}
                    </Pie>
                    <Tooltip formatter={(value) => `${value} kW`} />
                    <Legend />
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default ConsumptionPieChart;