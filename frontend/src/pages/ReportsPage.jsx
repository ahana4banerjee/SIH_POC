import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';

const ReportsPage = ({ API_BASE_URL }) => {
    const [reports, setReports] = useState({});
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE_URL}/all-reports`)
            .then(res => res.json())
            .then(data => {
                setReports(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Failed to fetch reports:", err);
                setLoading(false);
            });
    }, [API_BASE_URL]);

    if (loading) return <p>Loading reports...</p>;

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900">Generated Reports</h1>
            {Object.entries(reports).length > 0 ? (
                Object.entries(reports).map(([key, report]) => (
                    <div key={key} className="bg-white p-6 rounded-lg shadow-md">
                        <h3 className="text-lg font-bold mb-2">Report: {new Date(report.report_date).toLocaleDateString()}</h3>
                        <p className="text-sm text-gray-500 mb-4">{report.recommendation}</p>
                        <a href={`${API_BASE_URL}/download-report-pdf`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center bg-green-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-green-700">
                            <Download size={18} className="mr-2" />Download PDF
                        </a>
                    </div>
                ))
            ) : (
                <div className="bg-white p-6 rounded-lg shadow-md">
                    <p>No reports found. Please run the `report_generator.py` script to create one.</p>
                </div>
            )}
        </div>
    );
};

export default ReportsPage;
