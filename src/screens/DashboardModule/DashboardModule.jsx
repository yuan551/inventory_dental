import { Bell as BellIcon, Search as SearchIcon } from "lucide-react";
import React, { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { DashboardSidebarSection } from "./sections/DashboardSidebarSection/DashboardSidebarSection";
import { InventoryOverviewSection } from "./sections/InventoryOverviewSection/InventoryOverviewSection";
import { LowStockItemsSection } from "./sections/LowStockItemsSection/LowStockItemsSection";
import { MonthlyUsageTrendSection } from "./sections/MonthlyUsageTrendSection/MonthlyUsageTrendSection";
import { PendingOrdersSection } from "./sections/PendingOrdersSection/PendingOrdersSection";
import { StockAlertsListSection } from "./sections/StockAlertsListSection/StockAlertsListSection";
import { StockAlertsSection } from "./sections/StockAlertsSection/StockAlertsSection";

const chartLegendData = [
  { color: "bg-[#8979ff]", value: "3000" },
  { color: "bg-[#ff928a]", value: "2500" },
  { color: "bg-[#3bc3de]", value: "2000" },
  { color: "bg-[#ffae4c]", value: "1500" },
  { color: "bg-[#527ef0]", value: "1000" },
];

export const DashboardModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  return (
    <div style={{backgroundColor: '#F5F5F5'}} className="w-full h-screen overflow-hidden flex">
      <aside className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="DASHBOARD" />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm px-8 py-6 flex items-center justify-between border-b border-gray-200">
          <div>
            <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-3xl tracking-[0] leading-[normal] mb-1">
              DASHBOARD
            </h1>
            <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-sm tracking-[0] leading-[normal]">
              Welcome back, Dr. Johnson. Here's your clinic's inventory overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                placeholder="Search inventory"
                className="w-96 h-14 bg-gray-50 rounded-full border border-gray-300 pl-6 pr-14 [font-family:'Oxygen',Helvetica] font-normal text-gray-700 text-sm focus:bg-white focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20"
              />
              <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <div className="relative">
              <BellIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
              <Badge className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center p-0">
                <span className="[font-family:'Oxygen',Helvetica] font-normal text-white text-xs">
                  3
                </span>
              </Badge>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <img
                className="w-10 h-10 rounded-full border-2 border-gray-200"
                alt="Profile"
                src="/group.png"
              />
              <div>
                <div className="[font-family:'Inter',Helvetica] font-semibold text-gray-900 text-sm tracking-[0] leading-[normal]">
                  Dr. Giselle
                </div>
                <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[normal]">
                  ADMINISTRATOR
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
  <div className="flex-1 px-8 py-6 overflow-y-auto" style={{backgroundColor: '#F5F5F5'}}>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <LowStockItemsSection />
            <StockAlertsSection />
            <PendingOrdersSection />
            <InventoryOverviewSection />
          </div>

          <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
            <Card className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h2 className="[font-family:'Oxygen',Helvetica] font-bold text-gray-900 text-xl tracking-[0] leading-[normal] mb-4">
                  Monthly Usage Trend
                </h2>
                <div className="h-64">
                  <MonthlyUsageTrendSection />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  {chartLegendData.map((item, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2"
                    >
                      <div className="relative w-3 h-3">
                        <div
                          className={`w-full h-0.5 ${item.color} absolute top-1/2 transform -translate-y-1/2`}
                        />
                        <div
                          className={`${item.color} w-2 h-2 rounded-full border border-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
                        />
                      </div>
                      <span className="[font-family:'Inter',Helvetica] font-normal text-gray-600 text-xs">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-0 h-full">
                <StockAlertsListSection />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};