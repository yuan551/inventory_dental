import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import totalIcon from "../../assets/Alerts/Total Alerts.png";
import unreadIcon from "../../assets/Alerts/Unread.png";
import expiryIcon from "../../assets/Alerts/Expiry Alerts.png";
import stockIcon from "../../assets/Alerts/Stock Alerts.png";
import checkIcon from "../../assets/Alerts/Check square.png";

// AlertsModule
// Renders the Alerts screen with summary cards, tabs, and a list of alerts.
// This implementation uses mock data and local state to reproduce the visuals
// in the provided screenshots: totals, unread indicator, expiry/stock filters,
// and actions like mark-as-read / dismiss / mark-all-as-read.

export const AlertsModule = () => {
	const [alerts, setAlerts] = useState([]);
	const [activeTab, setActiveTab] = useState("all"); // all | unread | expiry | stock

	const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
		try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
	});
	useEffect(() => {
		const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
		window.addEventListener('sidebar:toggle', handler);
		return () => window.removeEventListener('sidebar:toggle', handler);
	}, []);

	useEffect(() => {
		// Mock data: in a real app this would come from an API or firebase.js
		const now = new Date();
		const sample = [
			{
				id: 1,
				title: "Lidocaine 2% Expiring Soon",
				type: "expiry",
				message: "15 vials of Lidocaine 2% will expire in 5 days (Oct 5, 2024)",
				datetime: new Date(now.getFullYear(), 9, 5, 14, 30).toISOString(),
				priority: "high",
				unread: true,
			},
			{
				id: 2,
				title: "Critical Stock Level",
				type: "stock",
				message: "Latex Gloves (Medium) is below minimum threshold (45/100)",
				datetime: new Date(now.getFullYear(), 8, 23, 12, 15).toISOString(),
				priority: "high",
				unread: true,
			},
			{
				id: 3,
				title: "Low Stock Warning",
				type: "stock",
				message: "Dental Masks inventory is running low (78/150)",
				datetime: new Date(now.getFullYear(), 8, 22, 16, 20).toISOString(),
				priority: "medium",
				unread: false,
			},
			{
				id: 4,
				title: "Articaine 4% Expiring Soon",
				type: "expiry",
				message: "25 cartridges of Articaine 4% will expire in 7 days (Sep 30, 2024)",
				datetime: new Date(now.getFullYear(), 8, 30, 9, 45).toISOString(),
				priority: "high",
				unread: false,
			},
			{
				id: 5,
				title: "Critical Stock Level",
				type: "stock",
				message: "15 vials of Lidocaine 2% will expire in 5 days (Oct 5, 2024)",
				datetime: new Date(now.getFullYear(), 9, 5, 11, 0).toISOString(),
				priority: "high",
				unread: true,
			},
			{
				id: 6,
				title: "Low Stock Warning",
				type: "stock",
				message: "Extra suction tips running low",
				datetime: new Date(now.getFullYear(), 9, 1, 10, 0).toISOString(),
				priority: "low",
				unread: false,
			},
		];

		setAlerts(sample);
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

	// Confirmation state for dismissing an alert
	const [dismissConfirmId, setDismissConfirmId] = useState(null);

	function requestDismiss(id) {
		setDismissConfirmId(id);
	}

	function cancelDismiss() {
		setDismissConfirmId(null);
	}

	function proceedDismiss() {
		if (dismissConfirmId != null) {
			dismissAlert(dismissConfirmId);
			setDismissConfirmId(null);
		}
	}

	// Close modal on Escape
	useEffect(() => {
		if (dismissConfirmId == null) return;
		const onKey = (e) => {
			if (e.key === "Escape") cancelDismiss();
		};
		window.addEventListener("keydown", onKey);
		return () => window.removeEventListener("keydown", onKey);
	}, [dismissConfirmId]);

	function markAsRead(id) {
		setAlerts((prev) => prev.map((a) => (a.id === id ? { ...a, unread: false } : a)));
	}

	function dismissAlert(id) {
		setAlerts((prev) => prev.filter((a) => a.id !== id));
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
		<div className="h-screen overflow-hidden flex bg-gray-100">
			{/* Sidebar */}
			<div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'} h-full`}> 
				{/* ensure sidebar fills height so it remains fixed while main content scrolls */}
				<DashboardSidebarSection currentPage="ALERTS" />
			</div>

			<div className="flex-1 flex flex-col">
				<AppHeader title="ALERTS" subtitle="Monitor low stock and expiration alerts" />

				<main className="flex-1 overflow-auto p-8">
					<div className="flex items-center justify-end mb-4">
						<button
							onClick={markAllAsRead}
							className="px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-sm shadow-sm hover:bg-gray-100"
						>
							Mark All as Read
						</button>
					</div>

					<section className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
						{/* Total Alerts (Dashboard-style card) */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 h-36 p-6 flex items-center justify-between transition-shadow duration-150 hover:shadow-lg cursor-pointer">
							<div>
								<div className="text-sm text-gray-500">Total Alerts</div>
								<div className="text-3xl font-semibold mt-2">{counts.total}</div>
								<div className="text-xs text-gray-400 mt-1">Total across all categories</div>
							</div>
							<div className="flex items-center">
								<div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-50 border border-gray-100">
									<img src={totalIcon} alt="Total alerts" className="w-8 h-8 object-contain" />
								</div>
							</div>
						</div>

						{/* Unread (Dashboard-style card) */}
						<div style={{ backgroundColor: 'rgba(255,130,130,0.05)', borderColor: '#DA9361' }} className="rounded-xl shadow-sm h-36 p-6 flex items-center justify-between transition-shadow duration-150 hover:shadow-lg cursor-pointer border">
							<div>
								<div className="text-sm text-black">Unread</div>
								<div className="text-3xl font-semibold mt-2 text-black">{counts.unread}</div>
								<div className="text-xs text-black/80 mt-1">New or unseen alerts</div>
							</div>
							<div className="flex items-center">
								<div className="w-12 h-12 rounded-md flex items-center justify-center bg-transparent" style={{ border: '1px solid #DA9361' }}>
									<img src={unreadIcon} alt="Unread" className="w-7 h-7 object-contain" />
								</div>
							</div>
						</div>

						{/* Expiry Alerts (Dashboard-style card) */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 h-36 p-6 flex items-center justify-between transition-shadow duration-150 hover:shadow-lg cursor-pointer">
							<div>
								<div className="text-sm text-gray-500">Expiry Alerts</div>
								<div className="text-3xl font-semibold mt-2 text-red-500">{counts.expiry}</div>
								<div className="text-xs text-gray-400 mt-1">Items expiring soon</div>
							</div>
							<div className="flex items-center">
								<div className="w-12 h-12 rounded-md flex items-center justify-center bg-red-50 border border-red-100">
									<img src={expiryIcon} alt="Expiry alerts" className="w-7 h-7 object-contain" />
								</div>
							</div>
						</div>

						{/* Stock Alerts (Dashboard-style card) */}
						<div className="bg-white rounded-xl shadow-sm border border-gray-200 h-36 p-6 flex items-center justify-between transition-shadow duration-150 hover:shadow-lg cursor-pointer">
							<div>
								<div className="text-sm text-gray-500">Stock Alerts</div>
								<div className="text-3xl font-semibold mt-2 text-yellow-600">{counts.stock}</div>
								<div className="text-xs text-gray-400 mt-1">Low stock and critical items</div>
							</div>
							<div className="flex items-center">
								<div className="w-12 h-12 rounded-md flex items-center justify-center bg-gray-50 border border-gray-100">
									<img src={stockIcon} alt="Stock alerts" className="w-7 h-7 object-contain" />
								</div>
							</div>
						</div>
					</section>

					<section className="mt-8">
						<div className="bg-white rounded-lg border border-teal-100 p-2 flex gap-2">
							<button
								onClick={() => setActiveTab("all")}
								className={`flex-1 py-3 rounded-md ${activeTab === "all" ? "bg-gray-200" : ""}`}
							>
								All Alerts ({counts.total})
							</button>
							<button
								onClick={() => setActiveTab("unread")}
								className={`flex-1 py-3 rounded-md ${activeTab === "unread" ? "bg-gray-200" : ""}`}
							>
								Unread ({counts.unread})
							</button>
							<button
								onClick={() => setActiveTab("expiry")}
								className={`flex-1 py-3 rounded-md ${activeTab === "expiry" ? "bg-gray-200" : ""}`}
							>
								Expiry ({counts.expiry})
							</button>
							<button
								onClick={() => setActiveTab("stock")}
								className={`flex-1 py-3 rounded-md ${activeTab === "stock" ? "bg-gray-200" : ""}`}
							>
								Stock ({counts.stock})
							</button>
						</div>

						<div className="mt-6 space-y-4">
											{filteredAlerts.map((a) => (
												<div key={a.id} tabIndex={0} className="bg-white rounded-xl border border-teal-200 p-0 shadow-sm hover:shadow-lg active:shadow-2xl focus:shadow-2xl transition-shadow duration-150 flex items-stretch cursor-pointer">
													{/* left colored rounded bar */}
													<div className="rounded-l-xl overflow-hidden">
														<div className="w-3 h-full" style={{ background: a.type === "expiry" ? "#3b82f6" : "#f59e0b" }} />
													</div>

													<div className="flex-1 p-4 flex items-start gap-4">
														{/* icon */}
														<div className="flex-shrink-0 mt-1">
															<img src={a.type === 'expiry' ? expiryIcon : stockIcon} alt={a.type === 'expiry' ? 'Expiry' : 'Stock'} className="w-6 h-6 object-contain" />
														</div>

														<div className="flex-1">
															<div className="flex items-center gap-3">
																<h3 className="text-xl font-bold text-gray-800">{a.title}</h3>
																{a.unread && <span className="w-3 h-3 bg-blue-600 rounded-full" />}
															</div>

															<p className="text-sm text-gray-600 mt-2">{a.message}</p>

															<div className="flex items-center gap-4 mt-3">
																<div className="text-xs text-gray-500">{formatDate(a.datetime)}</div>
																<div>
																	<span className={`inline-block px-3 py-1 text-xs rounded-full border ${
																		a.priority === "high" ? "bg-red-50 text-red-600 border-red-200" : a.priority === "medium" ? "bg-yellow-50 text-yellow-700 border-yellow-200" : "bg-gray-50 text-gray-700 border-gray-200"
																	}`}>{a.priority.charAt(0).toUpperCase() + a.priority.slice(1)} Priority</span>
																</div>
															</div>
														</div>

														{/* right-aligned action buttons - vertically centered */}
														<div className="flex items-center gap-3 pr-4 mt-4">
															<button
																onClick={() => markAsRead(a.id)}
																aria-label={`Mark alert ${a.id} as read`}
																className="w-10 h-10 flex items-center justify-center rounded-md border border-teal-200 bg-white hover:bg-teal-50 text-teal-700 shadow-sm"
															>
																<img src={checkIcon} alt="Mark as read" className="w-4 h-4 object-contain" />
															</button>
															<button
																onClick={() => requestDismiss(a.id)}
																aria-label={`Dismiss alert ${a.id}`}
																className="w-10 h-10 flex items-center justify-center rounded-md border border-gray-200 bg-white hover:bg-gray-50 text-gray-400"
															>
																<svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
																	<path d="M18 6L6 18M6 6l12 12" stroke="#9CA3AF" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
																</svg>
															</button>
														</div>
													</div>
												</div>
											))}

												{dismissConfirmId != null && (() => {
													const alertItem = alerts.find((x) => x.id === dismissConfirmId);
													return (
														<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
															<div className="bg-white rounded-2xl p-6 w-full max-w-sm relative shadow-2xl">
																<button
																	onClick={cancelDismiss}
																	aria-label="Close"
																	className="absolute right-3 top-3 w-8 h-8 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-100"
																>
																	<span className="text-xl">✕</span>
																</button>
																<div className="flex flex-col items-center text-center">
																	<div className="w-16 h-16 rounded-full border-4 border-red-400 flex items-center justify-center mb-4">
																		<span className="text-3xl text-red-500">!</span>
																	</div>
																	<h3 className="text-xl font-bold mb-2">Are you sure you want to remove{alertItem ? ` ${alertItem.title}` : ''}?</h3>
																	<p className="text-sm text-gray-600 mb-6">This action cannot be undone.</p>
																	<div className="flex gap-4">
																		<button onClick={proceedDismiss} className="px-5 py-2 rounded-full bg-red-600 text-white">Remove</button>
																		<button onClick={cancelDismiss} className="px-5 py-2 rounded-full bg-cyan-400 text-white">Cancel</button>
																	</div>
																</div>
															</div>
														</div>
													);
												})()}

							{filteredAlerts.length === 0 && (
								<div className="bg-white rounded-lg border border-teal-100 p-6 text-center text-gray-500">No alerts to show.</div>
							)}
						</div>
					</section>
				</main>
			</div>
		</div>
	);
};

export default AlertsModule;

