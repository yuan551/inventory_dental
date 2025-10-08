import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import totalIcon from "../../assets/Alerts/Total Alerts.png";
import unreadIcon from "../../assets/Alerts/Unread.png";
import expiryIcon from "../../assets/Alerts/Expiry Alerts.png";
import stockIcon from "../../assets/Alerts/Stock Alerts.png";
import checkIcon from "../../assets/Alerts/Check square.png";

const palette = {
  blue: "#78ADFD",
  unreadBg: "#FFE6E6",
  unreadBorder: "#DA9361",
  unreadText: "#170707",
  unreadIcon: "#2A7A6E",
  expiryBorder: "#2A7A6E",
  expiryIcon: "#B71C1C",
  stockBorder: "#2A7A6E",
  stockIcon: "#FBC02D",
  highPriorityBg: "#FFF5F5",
  highPriorityBorder: "#FF5C5C",
  highPriorityText: "#F22727",
};

// AlertsModule
// Renders the Alerts screen with summary cards, tabs, and a list of alerts.
// This implementation uses mock data and local state to reproduce the visuals
// in the provided screenshots: totals, unread indicator, expiry/stock filters,
// and actions like mark-as-read / dismiss / mark-all-as-read.

export const AlertsModule = () => {
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  // Add deleted state
  const [deletedIds, setDeletedIds] = useState([]);

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);

  useEffect(() => {
    // Mock data
    setAlerts([]); // <-- No alerts
  }, []);

  const counts = useMemo(() => {
    const total = alerts.length;
    const unread = alerts.filter((a) => a.unread).length;
    const expiry = alerts.filter((a) => a.type === "expiry").length;
    const stock = alerts.filter((a) => a.type === "stock").length;
    return { total, unread, expiry, stock };
  }, [alerts]);

  const filteredAlerts = useMemo(() => {
    switch (activeTab) {
      case "unread":
        return alerts.filter((a) => a.unread);
      case "expiry":
        return alerts.filter((a) => a.type === "expiry");
      case "stock":
        return alerts.filter((a) => a.type === "stock");
      default:
        return alerts;
    }
  }, [alerts, activeTab]);

  // Group alerts into two buckets: Today and Yesterday (Yesterday contains all non-Today items)
  const groupedAlerts = useMemo(() => {
    if (!filteredAlerts || filteredAlerts.length === 0) return [];

    const isSameDay = (d1, d2) => d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
    const today = new Date();

    // priority ordering: high -> medium -> low
    const priorityRank = (p) => (p === 'high' ? 0 : p === 'medium' ? 1 : 2);

	const todayItems = [];
		const yesterdayItems = []; // will hold everything that's not today per Option A

		for (const a of filteredAlerts) {
			const dt = new Date(a.datetime);
			if (isSameDay(dt, today)) todayItems.push(a);
			else yesterdayItems.push(a);
		}

		const sortGroup = (items) => {
			items.sort((x, y) => {
				if (x.unread === y.unread) {
					const pr = priorityRank(x.priority) - priorityRank(y.priority);
					if (pr === 0) return new Date(y.datetime) - new Date(x.datetime);
					return pr;
				}
				return x.unread ? -1 : 1; // unread first
			});
		};

		sortGroup(todayItems);
		sortGroup(yesterdayItems);

		const groups = [];
	if (todayItems.length > 0) groups.push({ label: 'New', items: todayItems });
		if (yesterdayItems.length > 0) groups.push({ label: 'Yesterday', items: yesterdayItems });

		return groups;
	}, [filteredAlerts]);

	// (dismiss functionality removed) — the UI no longer supports dismissing alerts

  // Mark as read
  function markAsRead(id) {
    setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, unread: false } : a)));
  }

  // Delete alert
  function deleteAlert(id) {
    setDeletedIds((prev) => [...prev, id]);
  }

	function markAllAsRead() {
		setAlerts((prev) => prev.map((a) => ({ ...a, unread: false })));
	}

	function formatDate(iso) {
		try {
			const d = new Date(iso);
			return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
				" at " +
				d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
		} catch (e) {
			return iso;
		}
	}

	return (
		<div className="min-h-screen flex bg-[#F5F5F5]">
			{/* Sidebar - fixed so it doesn't scroll with content */}
			<div
				className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'} h-screen`}
				style={{
					position: "sticky",
					left: 0,
					top: 0,
					zIndex: 20,
					height: "100vh",
					overflow: "hidden",
					background: "#13B3C5",
				}}
			>
				<DashboardSidebarSection currentPage="ALERTS" />
			</div>

			{/* Main content - scrollable */}
			<div className="flex-1 flex flex-col h-screen">
				<AppHeader title="ALERTS" subtitle="Monitor low stock and expiration alerts" />
				<main
					className="flex-1 overflow-y-auto p-8"
					style={{
						height: "calc(100vh - 64px)", // adjust if AppHeader height changes
						minHeight: 0,
						background: "#F5F5F5",
					}}
				>
					<div className="flex items-center justify-end mb-4">
						<button
							onClick={() => {
                markAllAsRead();
                alert("All alerts marked as read.");
              }}
							className="px-4 py-2 border border-[#2A7A6E] rounded-lg bg-white text-[#2A7A6E] text-sm shadow-sm hover:bg-[#E5F6F5] font-semibold"
						>
							Mark All as Read
						</button>
					</div>

					{/* Summary Cards */}
					<section className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Total Alerts */}
  <div className="bg-white rounded-xl border border-[#2A7A6E] h-32 p-5 flex items-center justify-between">
    <div>
      <div className="text-base text-[#170707] font-normal">Total Alerts</div>
      <div className="text-2xl font-bold mt-2 text-[#170707]">{counts.total}</div>
    </div>
    <div>
      <img src={totalIcon} alt="Total alerts" className="w-7 h-7 object-contain" />
    </div>
  </div>
  {/* Unread */}
  <div
    className="rounded-xl h-32 p-5 flex items-center justify-between"
    style={{
      background: "#F5CFCF",
      border: "1.5px solid #DA9361",
    }}
  >
    <div>
      <div className="text-base font-normal text-[#170707]">Unread</div>
      <div className="text-2xl font-bold mt-2 text-[#170707]">{counts.unread}</div>
    </div>
    <div>
      <img src={unreadIcon} alt="Unread" className="w-7 h-7 object-contain" />
    </div>
  </div>
  {/* Expiry Alerts */}
  <div className="bg-white rounded-xl border border-[#2A7A6E] h-32 p-5 flex items-center justify-between">
    <div>
      <div className="text-base text-[#170707] font-normal">Expiry Alerts</div>
      <div className="text-2xl font-bold mt-2" style={{ color: "#B71C1C" }}>{counts.expiry}</div>
    </div>
    <div>
      <img src={expiryIcon} alt="Expiry alerts" className="w-7 h-7 object-contain" />
    </div>
  </div>
  {/* Stock Alerts */}
  <div className="bg-white rounded-xl border border-[#2A7A6E] h-32 p-5 flex items-center justify-between">
    <div>
      <div className="text-base text-[#170707] font-normal">Stock Alerts</div>
      <div className="text-2xl font-bold mt-2" style={{ color: "#FBC02D" }}>{counts.stock}</div>
    </div>
    <div>
      <img src={stockIcon} alt="Stock alerts" className="w-7 h-7 object-contain" />
    </div>
  </div>
</section>

{/* Tabs */}
<section className="mt-8">
  <div
    className="flex bg-[#F7F7F7] border border-[#2A7A6E] rounded-xl p-2 gap-0"
    style={{ borderRadius: 16 }}
  >
    <button
      onClick={() => setActiveTab("all")}
      className={`flex-1 py-2 rounded-md font-semibold text-base transition ${activeTab === "all" ? "bg-[#D9D9D9] text-black" : "text-[#666]"}`}
    >
      All Alerts ({counts.total})
    </button>
    <button
      onClick={() => setActiveTab("unread")}
      className={`flex-1 py-2 rounded-md font-semibold text-base transition ${activeTab === "unread" ? "bg-[#D9D9D9] text-black" : "text-[#666]"}`}
    >
      Unread ({counts.unread})
    </button>
    <button
      onClick={() => setActiveTab("expiry")}
      className={`flex-1 py-2 rounded-md font-semibold text-base transition ${activeTab === "expiry" ? "bg-[#D9D9D9] text-black" : "text-[#666]"}`}
    >
      Expiry ({counts.expiry})
    </button>
    <button
      onClick={() => setActiveTab("stock")}
      className={`flex-1 py-2 rounded-md font-semibold text-base transition ${activeTab === "stock" ? "bg-[#D9D9D9] text-black" : "text-[#666]"}`}
    >
      Stock ({counts.stock})
    </button>
  </div>

  {/* Alerts List - Show all as "Yesterday" group only */}
  <div className="mt-8">
    <div
      className="text-lg font-semibold text-[#707070] mb-2"
      style={{
        marginLeft: "8px",
        marginBottom: "12px",
      }}
    >
      Yesterday ({filteredAlerts.length})
    </div>
    <div>
      {[
        ...filteredAlerts.filter(a => !deletedIds.includes(a.id) && a.priority === "high"),
        ...filteredAlerts.filter(a => !deletedIds.includes(a.id) && a.priority === "medium"),
        ...filteredAlerts.filter(a => !deletedIds.includes(a.id) && a.priority === "low"),
      ].map((a) => (
        <div
          key={a.id}
          className="flex items-stretch rounded-2xl border relative"
          style={{
            background: a.unread ? "#fff" : "#F5F5F5",
            border: `1.5px solid #78ADFD`,
            borderLeft: a.unread ? `8px solid #78ADFD` : `1.5px solid #C3D6DF`,
            minHeight: "80px",
            padding: "20px",
            alignItems: "center",
            marginBottom: "16px",
            transition: "background 0.2s, border-left 0.2s",
          }}
        >
          <div className="flex items-center pr-4">
            <div
              className="w-10 h-10 rounded-md flex items-center justify-center"
              style={{
                background: "#F5F8FE",
                border: `2px solid #78ADFD`,
              }}
            >
              <img
                src={a.type === "expiry" ? expiryIcon : stockIcon}
                alt={a.type === "expiry" ? "Expiry" : "Stock"}
                className="w-6 h-6 object-contain"
              />
            </div>
          </div>
          <div className="flex-1 pr-4">
            <div className="flex items-center gap-2">
              <h3 className="text-[24px] font-bold text-[#170707]">{a.title}</h3>
              {a.unread && <span className="w-3 h-3 bg-[#78ADFD] rounded-full" />}
            </div>
            <p className="text-[17px] text-[#707070] mt-1">{a.message}</p>
            <div className="flex items-center gap-4 mt-2">
              <div className="text-[16px] text-[#707070]">{formatDate(a.datetime)}</div>
              <span
                className="inline-block px-4 py-1 text-[16px] rounded-full border font-bold"
                style={{
                  background: a.priority === "high"
                    ? "#FFE6E6"
                    : a.priority === "medium"
                    ? "#FFF8E1"
                    : "#F5F5F5",
                  borderColor: a.priority === "high"
                    ? "#F22727"
                    : a.priority === "medium"
                    ? "#FBC02D"
                    : "#B0B0B0",
                  color: a.priority === "high"
                    ? "#F22727"
                    : a.priority === "medium"
                    ? "#FBC02D"
                    : "#707070",
                }}
              >
                {a.priority === "high"
                  ? "High Priority"
                  : a.priority === "medium"
                  ? "Medium Priority"
                  : "Low Priority"}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {a.unread ? (
              <button
                onClick={() => markAsRead(a.id)}
                aria-label={`Mark alert ${a.id} as read`}
                className="w-8 h-8 flex items-center justify-center rounded-md bg-transparent border border-transparent shadow-none"
              >
                <img src={checkIcon} alt="Mark as read" className="w-5 h-5 object-contain" />
              </button>
            ) : null}
          </div>
        </div>
      ))}
      {filteredAlerts
        .filter(a => !deletedIds.includes(a.id))
        .length === 0 && (
        <div className="bg-white rounded-lg border border-[#78ADFD] p-4 text-center text-[#707070]">No alerts to show.</div>
      )}
    </div>
  </div>
      </section> {/* <-- Add this closing tag for <section> */}
    </main>
  </div>
</div>
  );
};

export default AlertsModule;

