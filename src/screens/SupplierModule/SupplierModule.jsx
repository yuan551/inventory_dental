import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

export const SupplierModule = () => {
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
        <DashboardSidebarSection currentPage="SUPPLIER" />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AppHeader title="SUPPLIER" subtitle="Manage your suppliers and vendor relationships" />

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900 mb-4">
              Supplier Directory
            </h2>
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-4">🏢</div>
              <p className="text-lg font-medium mb-2">Supplier Management</p>
              <p className="text-sm">This page will contain your supplier management system</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};