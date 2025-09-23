import React from 'react';

const ChartContainer = ({ title, icon, children, extraContent }) => (
    <div className="bg-white p-6 rounded-lg shadow-md flex flex-col h-full">
        {title && (
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    {icon}
                    <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
                </div>
                {extraContent}
            </div>
        )}
        <div className="flex-grow">{children}</div>
    </div>
);

export default ChartContainer;
