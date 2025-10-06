// ...existing code...
import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

const mockAlerts = [
  { id: 1, type: "stock", title: "Low Stock Warning", subtitle: "Dental Masks inventory is running low (78/150)", date: "2024-09-22T16:20:00", priority: "Medium", unread: true },
  { id: 2, type: "stock", title: "Critical Stock Level", subtitle: "Latex Gloves (Medium) is below minimum threshold (45/100)", date: "2024-09-23T12:15:00", priority: "High", unread: true },
  { id: 3, type: "expiry", title: "Lidocaine 2% Expiring Soon", subtitle: "15 vials of Lidocaine 2% will expire in 5 days (Oct 5, 2024)", date: "2024-09-23T14:30:00", priority: "High", unread: true },
  { id: 4, type: "expiry", title: "Articaine 4% Expiring Soon", subtitle: "25 cartridges of Articaine 4% will expire in 7 days (Sep 30, 2024)", date: "2024-09-23T09:45:00", priority: "High", unread: false },
  { id: 5, type: "stock", title: "Low Stock Warning", subtitle: "15 vials of Lidocaine 2% will expire in 5 days (Oct 5, 2024)", date: "2024-09-23T10:00:00", priority: "Low", unread: false },
  { id: 6, type: "stock", title: "Critical Stock Level", subtitle: "Latex Gloves (Medium) is below minimum threshold (45/100)", date: "2024-09-20T08:30:00", priority: "High", unread: false },
];

const PriorityBadge = ({ priority }) => {
  const map = {
    High: "bg-red-100 text-red-700",
    Medium: "bg-yellow-100 text-yellow-800",
    Low: "bg-green-100 text-green-700",
  };
  return <span className={`text-xs px-2 py-1 rounded-full ${map[priority] || "bg-gray-100 text-gray-700"}`}>{priority}</span>;
};

const SummaryCard = ({ label, value, icon, highlight }) => (
  <div className={`flex items-center gap-4 p-4 rounded-lg border ${highlight ? "bg-red-50 border-red-200" : "bg-white border-gray-200"} shadow-sm`}>
    <div className="w-12 h-12 flex items-center justify-center bg-gray-50 rounded-lg text-xl">
      {icon}
    </div>
    <div>
      <div className="text-sm text-gray-500">{label}</div>
      <div className="font-semibold text-xl">{value}</div>
    </div>
  </div>
);

export const AlertsModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
    const [alerts, setAlerts] = useState(mockAlerts); // Initialize alerts with mock data
  const [filter, setFilter] = useState("all"); // all | unread | expiry | stock

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  const counts = useMemo(() => {
    return {
      total: alerts.length,
      unread: alerts.filter(a => a.unread).length,
      expiry: alerts.filter(a => a.type === "expiry").length,
      stock: alerts.filter(a => a.type === "stock").length,
    };
  }, [alerts]);

  const filtered = useMemo(() => {
    switch (filter) {
      case "unread": return alerts.filter(a => a.unread);
      case "expiry": return alerts.filter(a => a.type === "expiry");
      case "stock": return alerts.filter(a => a.type === "stock");
      default: return alerts;
    }
  }, [alerts, filter]);

  const markAllRead = () => setAlerts(prev => prev.map(a => ({ ...a, unread: false })));
  const markRead = (id) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, unread: false } : a));
  const dismiss = (id) => setAlerts(prev => prev.filter(a => a.id !== id));

  const formatDate = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(undefined, { year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch { return iso; }
  };

  return (
    <div className="h-screen overflow-hidden flex" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <DashboardSidebarSection currentPage="ALERTS" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <AppHeader title="ALERTS" subtitle="Monitor low stock and expiration alerts" />

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto">
          <div className="space-y-6">

            {/* Top summary cards - match image 2 layout */}
            <div className="bg-white rounded-xl p-5 border border-gray-100 shadow-sm relative">
              {/* Mark All as Read placed at the top-right of this card container */}
              <div className="absolute right-4 -top-5">
                <button className="px-3 py-2 bg-white border border-gray-200 rounded-md text-sm shadow-sm" onClick={markAllRead}>Mark All as Read</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <SummaryCard label="Total Alerts" value={counts.total} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 22c1.1 0 2-.9 2-2h-4a2 2 0 002 2z" fill="#111827"/><path d="M18 16v-5a6 6 0 10-12 0v5l-2 2v1h16v-1l-2-2z" fill="#111827" /></svg>} />
                <SummaryCard label="Unread" value={counts.unread} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 2l1.5 4.5H18l-3.75 2.75L15 15l-3-2-3 2 1.75-5.75L6 6.5h4.5L12 2z" fill="#DC2626"/></svg>} highlight />
                <SummaryCard label="Expiry Alerts" value={counts.expiry} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M7 10h5v5H7z" fill="#0EA5E9"/><path d="M20 4h-1V2h-2v2H7V2H5v2H4a1 1 0 00-1 1v14a2 2 0 002 2h12a2 2 0 002-2V5a1 1 0 00-1-1z" fill="#0EA5E9"/></svg>} />
                <SummaryCard label="Stock Alerts" value={counts.stock} icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M4 7l8-4 8 4v10l-8 4-8-4V7z" fill="#F59E0B"/></svg>} />
              </div>

              {/* Tabs row */}
              <div className="border-t pt-4">
                <div className="mt-3 bg-white border border-green-200 rounded-full px-3 py-2">
                  <div className="flex items-center gap-3">
                    <button className={`px-5 py-2 text-sm rounded-full transition-colors ${filter === "all" ? "bg-gray-200" : "bg-transparent"}`} onClick={() => setFilter("all")}>All Alerts ({counts.total})</button>
                    <button className={`px-5 py-2 text-sm rounded-full transition-colors ${filter === "unread" ? "bg-gray-200" : "bg-transparent"}`} onClick={() => setFilter("unread")}>Unread ({counts.unread})</button>
                    <button className={`px-5 py-2 text-sm rounded-full transition-colors ${filter === "expiry" ? "bg-gray-200" : "bg-transparent"}`} onClick={() => setFilter("expiry")}>Expiry ({counts.expiry})</button>
                    <button className={`px-5 py-2 text-sm rounded-full transition-colors ${filter === "stock" ? "bg-gray-200" : "bg-transparent"}`} onClick={() => setFilter("stock")}>Stock ({counts.stock})</button>
                  </div>
                </div>
              </div>
            </div>

            {/* Alerts list - match image 2 style */}
            <div className="space-y-4">
              {filtered.length === 0 && (
                <div className="bg-white rounded-xl p-8 border border-gray-100 text-center text-gray-500">
                  <div className="text-4xl mb-3">✅</div>
                  <div className="font-semibold text-lg mb-1">No alerts</div>
                  <div className="text-sm">You're all caught up.</div>
                </div>
              )}

              {filtered.map(alert => (
                <div key={alert.id} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden flex">
                  {/* colored left stripe */}
                  <div className={`w-1.5`} style={{ background: alert.type === "expiry" ? "#3B82F6" : "#F59E0B" }} />
                  <div className="flex-1 p-4 flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="text-2xl">
                          {alert.type === "expiry" ? <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#3B82F6" d="M7 10h5v5H7z"/></svg> : <svg width="20" height="20" viewBox="0 0 24 24"><path fill="#F59E0B" d="M4 7l8-4 8 4v10l-8 4-8-4V7z"/></svg>}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{alert.title}</h3>
                            {alert.unread && <span className="w-2 h-2 bg-blue-500 rounded-full" />}
                          </div>
                          <div className="text-sm text-gray-500 mt-1">{alert.subtitle}</div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <div className="text-xs text-gray-400">{formatDate(alert.date)}</div>
                      <div className="flex items-center gap-2">
                        <PriorityBadge priority={alert.priority} />
                        <button title="Mark read" className="p-1 border rounded text-gray-600 hover:bg-gray-50" onClick={() => markRead(alert.id)}>✓</button>
                        <button title="Dismiss" className="p-1 border rounded text-gray-600 hover:bg-gray-50" onClick={() => dismiss(alert.id)}>✕</button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
};