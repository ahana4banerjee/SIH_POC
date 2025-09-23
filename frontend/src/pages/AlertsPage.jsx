import React from 'react';
import { AlertTriangle } from 'lucide-react';

const AlertsPage = ({ alerts }) => {
    return (
        <div className="space-y-4">
             <h1 className="text-2xl font-bold text-gray-900">Alerts History</h1>
            {alerts.length > 0 ? (
                alerts.map((alert, index) => {
                    const isCritical = alert.severity === 'CRITICAL';
                    const isWarning = alert.severity === 'WARNING';
                    
                    return (
                        <div 
                            key={index} 
                            className={`flex items-start p-4 rounded-lg shadow-sm border-l-4 ${isCritical ? 'bg-red-50 border-red-500' : ''} ${isWarning ? 'bg-yellow-50 border-yellow-500' : ''} ${!isCritical && !isWarning ? 'bg-gray-50 border-gray-500' : ''}`}
                        >
                            <AlertTriangle size={24} className={`mr-4 mt-1 flex-shrink-0 ${isCritical ? 'text-red-600' : ''} ${isWarning ? 'text-yellow-600' : ''} ${!isCritical && !isWarning ? 'text-gray-500' : ''}`} />
                            <div>
                                <p className={`font-semibold text-lg ${isCritical ? 'text-red-600' : ''} ${isWarning ? 'text-yellow-600' : ''} ${!isCritical && !isWarning ? 'text-gray-500' : ''}`}>{alert.type}</p>
                                <p className="text-md text-gray-800 mt-1">{alert.message}</p>
                                <p className="text-sm text-gray-500 mt-2">{new Date(alert.timestamp).toLocaleString()}</p>
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-md text-center">
                    <p className="text-gray-500">No alerts have been recorded. The system is stable.</p>
                </div>
            )}
        </div>
    );
};

export default AlertsPage;
