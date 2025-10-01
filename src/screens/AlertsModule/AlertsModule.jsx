import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

export const AlertsModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);
  return (
    <div className="h-screen overflow-hidden flex" style={{backgroundColor: '#F5F5F5'}}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="ALERTS" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AppHeader title="ALERTS" subtitle="Monitor low stock and expiration alerts" />

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900 mb-4">
              Active Alerts
            </h2>
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">⚠️</div>
              <p className="text-lg font-medium mb-2">Stock Alerts</p>
              <p className="text-sm">This page will contain your stock alerts and notifications</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};