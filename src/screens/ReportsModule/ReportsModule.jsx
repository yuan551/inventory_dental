import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import DollarIcon from "../../assets/reports/Total Inventory Value icon.png";
import BoxIcon from "../../assets/reports/Monthly Usage icon.png";

const palette = {
  blue: "#36D0B9",
  green: "#4BD564",
  cardBg1: "#D5F5E4",
  cardBg2: "#D2FFDA",
  tabBg: "#EDEDED",
  tabActive: "#FFFFFF",
  tabInactive: "#EDEDED",
};

export const ReportsModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState("usage");

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'} h-screen`}>
        <DashboardSidebarSection currentPage="REPORTS" />
      </div>

      {/* Main Content with vertical scroll */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <AppHeader title="REPORTS" subtitle="" />

        {/* Main Content Body */}
        <div className="w-full max-w-[1440px] mx-auto px-8 flex flex-col gap-6">
          {/* Filters */}
          <div className="mt-6 flex gap-8 items-center bg-white rounded-xl shadow p-6">
            <div className="flex-1">
              <label className="block text-base font-semibold text-black mb-2">Date Range</label>
              <select
                className="w-full rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none"
                defaultValue="Last 6 Months"
              >
                <option>Last 6 Months</option>
                <option>Last 12 Months</option>
                <option>This Year</option>
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-base font-semibold text-black mb-2">Category</label>
              <select
                className="w-full rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none"
                defaultValue="All Categories"
              >
                <option>All Categories</option>
                <option>Supplies</option>
                <option>Medicine</option>
                <option>Equipment</option>
              </select>
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-base font-semibold text-black mb-2">Custom Date Range</label>
              <div className="flex gap-4">
                <select
                  className="rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none"
                  defaultValue="September"
                >
                  <option>September</option>
                  <option>October</option>
                </select>
                <select
                  className="rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none"
                  defaultValue="September"
                >
                  <option>September</option>
                  <option>October</option>
                </select>
              </div>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-8">
            <div
              className="rounded-xl p-8 flex items-center gap-8 shadow"
              style={{
                background: palette.cardBg1,
                border: `2px solid ${palette.blue}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex-1">
                <div className="text-base text-gray-700 font-semibold mb-2">Total Inventory Value</div>
                <div className="text-4xl font-bold text-black mb-1">$0</div>
                <div className="text-sm text-gray-600 mt-1">0% from last month</div>
              </div>
              <img src={DollarIcon} alt="Total Inventory Value icon" className="w-12 h-12 mr-2" />
            </div>
            <div
              className="rounded-xl p-8 flex items-center gap-8 shadow"
              style={{
                background: palette.cardBg2,
                border: `2px solid ${palette.green}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex-1">
                <div className="text-base text-gray-700 font-semibold mb-2">Monthly Usage</div>
                <div className="text-4xl font-bold text-black mb-1">$0</div>
                <div className="text-sm text-gray-600 mt-1">0% from last month</div>
              </div>
              <img src={BoxIcon} alt="Monthly Usage icon" className="w-12 h-12 mr-2" />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex rounded-xl bg-[#EDEDED] p-3 gap-4 mt-2 mb-2">
            <button
              className={`flex-1 h-14 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "usage"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-[#EDEDED] text-gray-700"}`}
              onClick={() => setActiveTab("usage")}
              style={{
                border: activeTab === "usage" ? "none" : "none",
                boxShadow: activeTab === "usage" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
              }}
            >
              Usage Trends
            </button>
            <button
              className={`flex-1 h-14 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "cost"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-[#EDEDED] text-gray-700"}`}
              onClick={() => setActiveTab("cost")}
              style={{
                border: activeTab === "cost" ? "none" : "none",
                boxShadow: activeTab === "cost" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
              }}
            >
              Cost Analysis
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full">
            {activeTab === "usage" ? (
              <div className="bg-white rounded-xl shadow border p-8 mt-4">
                <div className="font-bold text-2xl mb-6">Monthly Consumption Trends</div>
                <div className="text-gray-700 mb-2">Saint Vincent and the Grenadines</div>
                <div className="text-2xl font-semibold mb-6">0</div>
                {/* Usage Trends Bar Chart */}
                <div className="flex flex-col gap-8 mt-8">
                  {[{ label: "Starbucks", value: 0 }, { label: "McDonald's", value: 0 }, { label: "L'Oréal", value: 0 }].map((item) => (
                    <div key={item.label} className="flex items-center gap-6">
                      <span className="w-48 text-base text-gray-700">{item.label}</span>
                      <div className="flex-1 h-8 bg-gray-100 rounded-lg relative">
                        <div
                          className="h-8 rounded-lg"
                          style={{
                            width: "0%",
                            background: palette.green,
                            transition: "width 0.5s"
                          }}
                        ></div>
                        <span className="absolute right-8 top-2 text-sm text-gray-600">{item.value}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8 mt-4">
                {/* Cost Distribution Pie (placeholder) */}
                <div className="bg-white rounded-xl shadow border p-8">
                  <div className="font-bold text-2xl mb-6">Cost Distribution</div>
                  <div className="flex flex-col items-center">
                    {/* Pie Chart Placeholder */}
                    <div className="w-64 h-64 rounded-full bg-gray-100 flex items-center justify-center mb-6">
                      <span className="text-gray-400">Pie Chart</span>
                    </div>
                  </div>
                </div>
                {/* Cost Breakdown */}
                <div className="bg-white rounded-xl shadow border p-8">
                  <div className="font-bold text-2xl mb-6">Cost Breakdown</div>
                  <div className="space-y-6">
                    {[
                      { label: "Consumables", value: 0, percent: 0, color: "#049FFF" },
                      { label: "Medicine", value: 0, percent: 0, color: "#16D280" },
                      { label: "Equipment", value: 0, percent: 0, color: "#F7F710" },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center gap-4 bg-[#F3FBFB] rounded-xl px-8 py-6"
                      >
                        <span
                          className="inline-block w-4 h-4 rounded-full"
                          style={{ background: item.color }}
                        ></span>
                        <span className="text-base font-medium text-gray-900 flex-1">{item.label}</span>
                        <span className="text-xl font-bold text-gray-900">$0</span>
                        <span className="ml-2 text-sm text-gray-500">0%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}