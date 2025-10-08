import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Import icons from assets
import dashboardIcon from "../../../../assets/dashboard.png";
import inventoryIcon from "../../../../assets/inventory.png";
import stockLogsIcon from "../../../../assets/stock logs.png";
import supplierIcon from "../../../../assets/supplier.png";
import alertsIcon from "../../../../assets/alerts.png";
import wasteIcon from "../../../../assets/waste and disposal.png";
import reportsIcon from "../../../../assets/reports.png";

export const DashboardSidebarSection = ({ currentPage = "DASHBOARD" }) => {
  const navigate = useNavigate();

  // Collapsed state with persistence
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem("sidebarCollapsed") === "1";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("sidebarCollapsed", collapsed ? "1" : "0");
    } catch {}
    // Notify listeners (pages) to update layout widths
    try {
      window.dispatchEvent(
        new CustomEvent("sidebar:toggle", { detail: { collapsed } })
      );
    } catch {}
  }, [collapsed]);

  // Logout is handled from the profile dropdown in the header; sidebar no longer contains logout controls.

  const handleNavigation = (itemName) => {
    const routes = {
      "DASHBOARD": "/dashboard",
      "INVENTORY": "/inventory",
      "STOCK LOGS": "/stock-logs",
      "SUPPLIER": "/supplier",
      "ALERTS": "/alerts",
      "WASTE & DISPOSAL": "/waste",
      "REPORTS": "/reports"
    };
    
    if (routes[itemName]) {
      navigate(routes[itemName]);
    }
  };

  const sidebarItems = [
    { name: "DASHBOARD", icon: dashboardIcon, route: "/dashboard" },
    { name: "INVENTORY", icon: inventoryIcon, route: "/inventory" },
    { name: "STOCK LOGS", icon: stockLogsIcon, route: "/stock-logs" },
    { name: "SUPPLIER", icon: supplierIcon, route: "/supplier" },
    { name: "ALERTS", icon: alertsIcon, route: "/alerts" },
    { name: "WASTE & DISPOSAL", icon: wasteIcon, route: "/waste" },
    { name: "REPORTS", icon: reportsIcon, route: "/reports" }
  ];

  return (
    <div className="w-full h-screen bg-[#00b7c2] text-white flex flex-col shadow-xl">
      {/* Logo + Collapse Toggle */}
      <div className={`border-b border-white/10 ${collapsed ? "p-4" : "p-6"}`}>
        <div className={`flex items-center ${collapsed ? "justify-between" : "justify-between"}`}>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center p-2">
              <img
                src="/group.png"
                alt="Medicare Logo"
                className="w-full h-full object-contain"
              />
            </div>
            {!collapsed && (
              <div>
                <div className="[font-family:'Inter',Helvetica] font-bold text-base tracking-wider">
                  MEDICARE
                </div>
                <div className="[font-family:'Inter',Helvetica] text-xs tracking-widest opacity-90">
                  DENTAL CLINIC
                </div>
              </div>
            )}
          </div>
          <button
            onClick={() => setCollapsed((v) => !v)}
            className="p-2 rounded-md hover:bg-white/10 transition-colors"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand" : "Collapse"}
          >
            {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4">
        {sidebarItems.map((item, index) => {
          const isActive = item.name === currentPage;
          return (
            <div
              key={index}
              onClick={() => handleNavigation(item.name)}
              className={`group flex items-center ${collapsed ? "justify-center px-2" : "space-x-3 px-6"} py-3 mx-3 rounded-lg cursor-pointer transition-all duration-200 ${
                isActive ? "bg-white text-[#00b7c2] shadow-sm" : "hover:bg-white/10 text-white"
              }`}
              title={collapsed ? item.name : undefined}
            >
              <div className="w-5 h-5 flex items-center justify-center">
                <img 
                  src={item.icon} 
                  alt={item.name} 
                  className={`w-4 h-4 ${
                    isActive 
                      ? 'brightness-0 saturate-100' 
                      : 'opacity-70 brightness-0 invert'
                  }`}
                />
              </div>
              {!collapsed && (
                <span className="[font-family:'Inter',Helvetica] font-medium text-sm uppercase tracking-wide">
                  {item.name}
                </span>
              )}
            </div>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-white/10" />
    </div>
  );
};