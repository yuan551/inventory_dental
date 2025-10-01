import React from "react";

export const StockAlertsListSection = ({ alerts = [] }) => {
  const stockAlerts = alerts.slice(0, 10); // show top 10
  return (
    <div className="p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <div className="flex items-center space-x-2 mb-6">
        <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
          <span className="text-red-500 text-sm">⚠</span>
        </div>
        <h2 className="[font-family:'Oxygen',Helvetica] font-bold text-black text-2xl tracking-[0] leading-[normal]">
          Stock Alerts
        </h2>
      </div>
      
      <div className="space-y-4">
        {stockAlerts.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">No alerts 🎉</div>
        ) : (
          stockAlerts.map((alert, index) => (
            <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
              <p className="[font-family:'Inter',Helvetica] font-medium text-gray-900 text-sm mb-1">{alert.item} <span className="text-xs text-gray-500">({alert.category})</span></p>
              <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-xs">{alert.reason}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
};