import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import OrderedTransactions from "./OrderedTransactions";

export const StockInPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  const [activeTab, setActiveTab] = useState("ordered");

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "#F5F8FA" }}>
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <DashboardSidebarSection currentPage="STOCK LOGS" />
      </div>

      <div className="flex-1 flex flex-col">
        <AppHeader title="STOCK IN" subtitle="All new orders added to inventory" />

        {/* (Outer navigation is handled by the top tabs; inner tabs below control Stock In views) */}

        <div className="bg-white rounded-2xl shadow border border-gray-200 p-4 md:p-6 mt-4 mx-2 md:mx-8">
          {/* Inner tabs: Stock In / Ordered */}
          <div className="mb-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab("stockin")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === "stockin" ? "bg-[#E6F7F7] text-[#007B7E] border border-teal-100" : "bg-transparent text-gray-500"}`}>
                Stock In
              </button>
              <button
                onClick={() => setActiveTab("ordered")}
                className={`px-4 py-2 rounded-full text-sm font-medium transition ${activeTab === "ordered" ? "bg-[#E6F7F7] text-[#007B7E] border border-teal-100" : "bg-transparent text-gray-500"}`}>
                Ordered
              </button>
            </div>
          </div>

          {activeTab === "ordered" ? (
            <OrderedTransactions />
          ) : (
            <div className="py-12 text-center text-gray-500">
              <div className="text-lg font-medium">Stock In</div>
              <div className="mt-2">This area will show stock-in (received) transactions. Ordered transactions have been moved to the Ordered tab.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
