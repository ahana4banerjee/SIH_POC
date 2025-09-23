import React from 'react';

const StatCard = ({ title, value, unit, icon, color }) => (
    <div className="bg-white p-4 rounded-lg shadow-md flex items-center h-full">
        <div className={`p-3 rounded-full mr-4 ${color}`}>{icon}</div>
        <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-800">{value} <span className="text-lg font-normal">{unit}</span></p>
        </div>
    </div>
);

export default StatCard;
