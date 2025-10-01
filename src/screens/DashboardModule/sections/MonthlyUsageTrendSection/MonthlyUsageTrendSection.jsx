import React from "react";

export const MonthlyUsageTrendSection = () => {
  return (
    <div className="h-64 bg-gradient-to-br from-purple-100 via-blue-100 to-teal-100 rounded-xl shadow-lg hover:shadow-xl transition-shadow border border-gray-100 relative overflow-hidden p-4">
      {/* Y-axis labels */}
      <div className="absolute left-2 top-4 bottom-8 flex flex-col justify-between text-xs text-gray-500">
        <span>3000</span>
        <span>2500</span>
        <span>2000</span>
        <span>1500</span>
        <span>1000</span>
        <span>500</span>
        <span>0</span>
      </div>
      
      {/* Chart Area */}
      <div className="ml-8 mr-4 h-full relative">
        <svg viewBox="0 0 400 200" className="w-full h-full absolute inset-0">
          {/* Chart lines */}
          <path
            d="M20,160 Q80,120 140,130 Q200,110 260,90 Q320,75 380,70"
            stroke="#8979ff"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M20,140 Q80,100 140,110 Q200,90 260,75 Q320,60 380,55"
            stroke="#ff928a"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M20,120 Q80,80 140,90 Q200,70 260,55 Q320,45 380,40"
            stroke="#3bc3de"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M20,180 Q80,140 140,150 Q200,130 260,110 Q320,95 380,90"
            stroke="#ffae4c"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
          <path
            d="M20,100 Q80,60 140,70 Q200,50 260,35 Q320,25 380,20"
            stroke="#527ef0"
            strokeWidth="3"
            fill="none"
            opacity="0.8"
          />
        </svg>
      </div>
      
      {/* X-axis labels */}
      <div className="absolute bottom-2 left-8 right-4 flex justify-between text-xs text-gray-500">
        <span>Jan</span>
        <span>Feb</span>
        <span>Mar</span>
        <span>Apr</span>
        <span>May</span>
        <span>June</span>
      </div>
    </div>
  );
};