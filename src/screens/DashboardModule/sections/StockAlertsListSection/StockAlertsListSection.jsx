import React from "react";
import lowStockIcon from "../../../../assets/dashboard/low stock icon.png"; // existing low stock icon
import { AlertOctagon, AlertTriangle } from "lucide-react";

export const StockAlertsListSection = ({ alerts = [] }) => {
  const stockAlerts = alerts.slice(0, 30); // allow more when scrollable (already sorted by parent)
  return (
    <div className="h-full flex flex-col p-6 bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100">
      <div className="flex items-center space-x-2 mb-4 flex-shrink-0">
        <div className="w-6 h-6 bg-red-100 rounded flex items-center justify-center">
          <img src={lowStockIcon} alt="Low stock" className="w-3.5 h-3.5 object-contain" />
        </div>
        <h2 className="[font-family:'Oxygen',Helvetica] font-bold text-black text-xl tracking-[0] leading-[normal]">Stock Alerts</h2>
      </div>
      <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
        {stockAlerts.length === 0 ? (
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 text-gray-500 text-sm">No alerts 🎉</div>
        ) : (
          stockAlerts.map((alert, index) => {
            const severity = alert.severity;
            const icon = severity === 'Critical' ? (
              <AlertOctagon className="w-5 h-5 text-red-500" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            );
            const baseColor = severity === 'Critical'
              ? 'border-red-200 bg-red-50'
              : 'border-amber-200 bg-amber-50';
            return (
              <div key={index} className={`p-4 rounded-lg border ${baseColor} shadow-sm hover:shadow-md transition-shadow`}>                
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{icon}</div>
                  <div className="flex-1">
                    <p className="[font-family:'Inter',Helvetica] font-medium text-gray-900 text-sm mb-1">{alert.item} <span className="text-xs text-gray-500">({alert.category})</span></p>
                    <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-xs">{alert.reason}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};