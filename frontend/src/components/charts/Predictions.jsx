import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { BrainCircuit } from 'lucide-react';
import ChartContainer from '../ui/Charts';

const PredictionChart = ({ predictionData }) => {
    // If no prediction data is available, show a helpful message.
    if (!predictionData || !predictionData.hourly_forecast_kw) {
        return (
            <ChartContainer title="AI Solar Forecast" icon={<BrainCircuit className="mr-3 text-gray-400" size={28} />}>
                <div className="flex items-center justify-center h-full">
                    <p className="text-gray-500 text-center">
                        Prediction not available.
                        <br />
                        Please run the `prediction.py` script to generate the forecast.
                    </p>
                </div>
            </ChartContainer>
        );
    }

    // Transform the hourly forecast object into an array that the chart can use.
    const chartData = Object.entries(predictionData.hourly_forecast_kw).map(([hour, power]) => ({
        hour: hour,
        'Predicted Solar (kW)': power,
    }));

    return (
        <ChartContainer title="AI Solar Forecast for Tomorrow" icon={<BrainCircuit className="mr-3 text-purple-600" size={28} />}>
            <div className="flex justify-between items-center mb-4 text-sm text-gray-600">
                <span>Total Predicted Energy: <span className="font-bold text-lg text-purple-700">{predictionData.predicted_total_kwh} kWh</span></span>
                {predictionData.model_evaluation && (
                    <span className="text-xs text-gray-500">
                        Model MAE: {predictionData.model_evaluation.mean_absolute_error_kw} kW
                    </span>
                )}
            </div>
            <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="hour" angle={-45} textAnchor="end" height={50} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Predicted Solar (kW)" fill="#8b5cf6" />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    );
};

export default PredictionChart;




