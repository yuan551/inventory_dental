import React, { useEffect, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";

const initialLogs = [
    {
        date: "2024-09-23",
        item: "Latex Gloves (Medium)",
        user: "Dr. Sarah Johnson",
        supplier: "MedSupply Co.",
        reference: "PO-2024-0156",
        status: "Ordered",
    },
    {
        date: "2024-09-23",
        item: "Latex Gloves (Medium)",
        user: "Dr. Sarah Johnson",
        supplier: "MedSupply Co.",
        reference: "PO-2024-0156",
        status: "Received",
    },
    {
        date: "2024-09-23",
        item: "Latex Gloves (Medium)",
        user: "Dr. Sarah Johnson",
        supplier: "MedSupply Co.",
        reference: "PO-2024-0156",
        status: "Pending",
    },
];

const statusOptions = [
    "All Status",
    "Ordered",
    "Received",
    "Pending",
    "Cancelled",
];

export const StockLogsModule = () => {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        try {
            return localStorage.getItem("sidebarCollapsed") === "1";
        } catch {
            return false;
        }
    });
    const [tab, setTab] = useState("in");
    const [showStatusDropdown, setShowStatusDropdown] = useState(false);
    const [selectedStatus, setSelectedStatus] = useState("All Status");
    const [showExportModal, setShowExportModal] = useState(false);
    const [logs, setLogs] = useState(initialLogs);
    const [search, setSearch] = useState("");
    const [showLockedModal, setShowLockedModal] = useState(false);

    useEffect(() => {
        const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
        window.addEventListener("sidebar:toggle", handler);
        return () => window.removeEventListener("sidebar:toggle", handler);
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (!e.target.closest(".status-dropdown")) setShowStatusDropdown(false);
        };
        if (showStatusDropdown) document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, [showStatusDropdown]);

    // Filter logs by status and search
    const filteredLogs = logs.filter((log) => {
        const matchesStatus =
            selectedStatus === "All Status" || log.status === selectedStatus;
        const matchesSearch =
            search.trim() === "" ||
            log.item.toLowerCase().includes(search.toLowerCase()) ||
            log.user.toLowerCase().includes(search.toLowerCase()) ||
            log.supplier.toLowerCase().includes(search.toLowerCase()) ||
            log.reference.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // Optionally, filter by tab (Stock In/Stock Out) if you have such data
    // For now, just show all logs for both tabs

    const handleChangeStatus = (idx) => {
        setLogs((prevLogs) =>
            prevLogs.map((log, i) =>
                i === idx && log.status === "Ordered"
                    ? { ...log, status: "Received" }
                    : log
            )
        );
    };

    return (
        <div className="h-screen overflow-hidden flex" style={{ background: "#F5F8FA" }}>
            {/* Sidebar */}
            <div
                className={`flex-shrink-0 transition-[width] duration-200 ${
                    sidebarCollapsed ? "w-20" : "w-64"
                }`}
            >
                <DashboardSidebarSection currentPage="STOCK LOGS" />
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 pt-6 pb-4 bg-white border-b border-[#E5EAF2]">
                    <div>
                        <div
                            className="text-3xl font-extrabold uppercase"
                            style={{
                                color: "#00B6C9",
                                letterSpacing: "-1px",
                                fontFamily: "Inter, sans-serif",
                            }}
                        >
                            STOCK LOGS
                        </div>
                        <div
                            className="text-sm text-[#434A54] mt-1 font-normal"
                            style={{ fontFamily: "Inter, sans-serif" }}
                        >
                            Track all inventory movements and transactions
                        </div>
                    </div>
                    <div className="flex items-center gap-6">
                        {/* Search bar */}
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Search stock logs"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="border border-[#D5DDE5] bg-[#F8F9FA] rounded-full px-6 py-3 w-96 text-base text-[#4B5C6B] font-normal outline-none focus:ring-2 focus:ring-[#00B6C9] transition"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            />
                            <span className="absolute right-5 top-1/2 -translate-y-1/2 text-gray-400">
                                <svg width="22" height="22" fill="none">
                                    <circle cx="10" cy="10" r="8" stroke="#A0AEC0" strokeWidth="2" />
                                    <path
                                        d="M16 16L21 21"
                                        stroke="#A0AEC0"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </span>
                        </div>
                        {/* Notification bell with red dot and count */}
                        <div className="relative">
                            <svg
                                width="36"
                                height="36"
                                fill="none"
                                viewBox="0 0 36 36"
                                className="text-gray-400"
                            >
                                <path
                                    d="M18 30c1.38 0 2.5-1.12 2.5-2.5h-5A2.5 2.5 0 0018 30zm8.5-6.5V16c0-4.97-2.63-9.13-8.5-10.17V5a1.5 1.5 0 10-3 0v.83C9.63 6.87 7 11.03 7 16v7.5L5.36 25.14A1.5 1.5 0 006.5 28h23a1.5 1.5 0 001.14-2.86L26.5 23.5z"
                                    fill="#434A54"
                                />
                            </svg>
                            <span
                                className="absolute -top-2 -right-2 flex items-center justify-center w-8 h-8 bg-[#F44336] text-white text-lg font-bold rounded-full border-4 border-white shadow"
                                style={{ fontFamily: "Inter, sans-serif" }}
                            >
                                3
                            </span>
                        </div>
                        {/* User avatar and name */}
                        <div className="flex items-center gap-3">
                            <img
                                src="/user-avatar.png"
                                alt="User"
                                className="w-10 h-10 rounded-full object-cover border border-gray-300"
                            />
                            <div className="text-left leading-tight">
                                <div
                                    className="font-semibold text-gray-900 text-base"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                    Dr. Rotono
                                </div>
                                <div
                                    className="text-xs text-gray-500 tracking-wide"
                                    style={{ fontFamily: "Inter, sans-serif" }}
                                >
                                    ADMINISTRATOR
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Tabs moved to center below header */}
                <div className="w-full flex justify-center bg-[#F7F7F7]">
                    <div
                        className="w-full max-w-5xl rounded-2xl bg-[#ECECEC] flex mt-4 mb-6 shadow-sm"
                        style={{ height: 48, alignItems: "center", marginLeft: 16, marginRight: 16 }}
                    >
                        <button
                            className={`flex-1 h-10 mx-1 my-1 rounded-lg font-medium text-center transition-all
                                ${tab === "in"
                                    ? "bg-white text-black shadow"
                                    : "bg-transparent text-gray-600"
                                }`}
                            style={{
                                boxShadow: tab === "in" ? "0 2px 6px 0 #0001" : "none",
                                fontWeight: tab === "in" ? 500 : 400,
                                fontSize: "1rem",
                            }}
                            onClick={() => setTab("in")}
                        >
                            Stock In
                        </button>
                        <button
                            className={`flex-1 h-10 mx-1 my-1 rounded-lg font-medium text-center transition-all
                                ${tab === "out"
                                    ? "bg-white text-black shadow"
                                    : "bg-transparent text-gray-600"
                                }`}
                            style={{
                                boxShadow: tab === "out" ? "0 2px 6px 0 #0001" : "none",
                                fontWeight: tab === "out" ? 500 : 400,
                                fontSize: "1rem",
                            }}
                            onClick={() => setTab("out")}
                        >
                            Stock Out
                        </button>
                    </div>
                </div>

                {/* Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 py-4">
                    {/* Stock In/Out Today Card */}
                    <div className={`bg-white rounded-xl border p-6 flex flex-col justify-between min-h-[110px] ${
                        tab === "in"
                            ? "border-[#D6E6EA] bg-white"
                            : "border-[#FDEBC8] bg-[#FEF6EC]"
                    }`}>
                        <div className={`text-base mb-1 ${
                            tab === "in" ? "text-gray-500" : "text-[#B0883B]"
                        }`}>
                            {tab === "in" ? "Stock In today" : "Stock Out today"}
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-gray-900">
                                {tab === "in"
                                    ? logs.filter(l => l.status === "Ordered").length
                                    : logs.filter(l => l.status === "Out").length}
                            </div>
                            <div className={`flex items-center justify-center w-9 h-9 rounded-full ${
                                tab === "in" ? "bg-green-50" : "bg-[#FDEBC8]"
                            }`}>
                                {tab === "in" ? (
                                    <svg width="24" height="24" fill="none">
                                        <path
                                            d="M12 19V7M12 7l-5 5M12 7l5 5"
                                            stroke="#22C55E"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                ) : (
                                    <svg width="24" height="24" fill="none">
                                        <path
                                            d="M12 5v12M12 17l5-5M12 17l-5-5"
                                            stroke="#B0883B"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                )}
                            </div>
                        </div>
                    </div>
                    {/* Total Transactions Card */}
                    <div className="bg-white rounded-xl border border-[#D6E6EA] p-6 flex flex-col justify-between min-h-[110px]">
                        <div className="text-gray-500 text-base mb-1">Total Transactions</div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-gray-900">{logs.length}</div>
                            <div className="flex items-center justify-center w-9 h-9 rounded-full bg-cyan-50">
                                <svg width="24" height="24" fill="none">
                                    <rect
                                        x="4"
                                        y="6"
                                        width="14"
                                        height="10"
                                        rx="2"
                                        stroke="#00B6C9"
                                        strokeWidth="2"
                                    />
                                    <path
                                        d="M8 10h7M8 14h4"
                                        stroke="#00B6C9"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Header & Controls */}
                <div className="bg-white rounded-2xl shadow border border-gray-200 p-4 md:p-6 mt-2 mx-2 md:mx-8">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 md:mb-6 gap-2">
                        <div className="font-semibold text-gray-900 text-lg md:text-xl mb-2 md:mb-0 font-sans">
                            Transaction Tracker ({filteredLogs.length} items)
                        </div>
                        <div className="flex gap-2 md:gap-3">
                            {/* All Status Dropdown */}
                            <div className="relative status-dropdown">
                                <button
                                    className="bg-[#00B6C9] text-white px-4 md:px-6 py-2 rounded-full font-semibold flex items-center gap-2 shadow text-base font-sans focus:outline-none"
                                    onClick={() => setShowStatusDropdown((v) => !v)}
                                    type="button"
                                >
                                    <svg width="18" height="18" fill="none">
                                        <path
                                            d="M9 2v14M2 9h14"
                                            stroke="#fff"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                        />
                                    </svg>
                                    {selectedStatus}
                                    <svg width="14" height="14" fill="none">
                                        <path
                                            d="M5 6l2 2 2-2"
                                            stroke="#fff"
                                            strokeWidth="1.5"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </button>
                                {showStatusDropdown && (
                                    <div className="absolute right-0 mt-2 w-44 bg-white rounded-xl shadow-lg border border-gray-100 z-20 py-2">
                                        {statusOptions.map((status) => (
                                            <button
                                                key={status}
                                                className={`w-full text-left px-4 py-2 text-base font-sans hover:bg-[#E9F7FA] ${
                                                    selectedStatus === status
                                                        ? "bg-[#E9F7FA] text-[#00B6C9] font-semibold"
                                                        : "text-gray-700"
                                                } flex items-center gap-2`}
                                                onClick={() => {
                                                    setSelectedStatus(status);
                                                    setShowStatusDropdown(false);
                                                }}
                                                type="button"
                                            >
                                                {selectedStatus === status && (
                                                    <svg width="18" height="18" fill="none" className="mr-2">
                                                        <circle cx="9" cy="9" r="8" stroke="#00B6C9" strokeWidth="2" />
                                                        <path
                                                            d="M6 9l2 2 4-4"
                                                            stroke="#00B6C9"
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                        />
                                                    </svg>
                                                )}
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <button
                                className="bg-[#00B6C9] text-white px-4 md:px-6 py-2 rounded-full font-semibold flex items-center gap-2 shadow text-base font-sans"
                                onClick={() => setShowExportModal(true)}
                            >
                                <svg width="18" height="18" fill="none">
                                    <rect width="18" height="18" rx="3" fill="#fff" fillOpacity="0.2" />
                                    <path d="M5 9h8M9 5v8" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
                                </svg>
                                Export Logs
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                        <table className="min-w-full text-sm text-left font-sans">
                            <thead className="bg-[#F7F7F7]">
                                <tr className="text-gray-400 text-base font-semibold">
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Date & Time</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Item</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">User</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Supplier</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Reference</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="text-center py-8 text-gray-400">
                                            No transactions found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredLogs.map((log, idx) => (
                                        <tr key={idx} className={idx === 0 ? "bg-[#E9F7FA]" : "bg-white"}>
                                            {/* Date & Time */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 font-medium text-[#00B6C9] whitespace-nowrap align-top">
                                                <div>{log.date}</div>
                                                <div className="text-xs text-gray-400 font-normal">
                                                    14:30
                                                </div>
                                            </td>
                                            {/* Item */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                <div>{log.item}</div>
                                                <div className="text-xs text-gray-400 font-normal">
                                                    LOG001
                                                </div>
                                            </td>
                                            {/* User */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                <span className="flex items-center gap-2">
                                                    <svg width="16" height="16" fill="none" className="text-gray-400">
                                                        <circle cx="8" cy="8" r="7" stroke="#B0B0B0" strokeWidth="1.2" />
                                                        <circle cx="8" cy="7" r="2" stroke="#B0B0B0" strokeWidth="1.2" />
                                                        <path d="M4.5 12c.5-1.5 2-2.5 3.5-2.5s3 .9 3.5 2.5" stroke="#B0B0B0" strokeWidth="1.2" />
                                                    </svg>
                                                    {log.user}
                                                </span>
                                            </td>
                                            {/* Supplier */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">{log.supplier}</td>
                                            {/* Reference */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">{log.reference}</td>
                                            {/* Status & Edit */}
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-flex items-center gap-1 bg-[#F4F4F4] text-gray-400 px-2 md:px-3 py-1 rounded-full text-xs font-semibold border border-gray-200 select-none cursor-not-allowed" style={{ fontSize: '13px' }}>
                                                        <svg width="14" height="14" fill="none" className="mr-1">
                                                            <rect x="2" y="2" width="10" height="10" rx="3" stroke="#B0B0B0" strokeWidth="1" />
                                                            <path d="M7 5.5v2" stroke="#B0B0B0" strokeWidth="1" strokeLinecap="round" />
                                                            <circle cx="7" cy="9" r="0.5" fill="#B0B0B0" />
                                                        </svg>
                                                        {log.status}
                                                    </span>
                                                    {log.status === "Ordered" ? (
                                                        <button
                                                            className="p-1 rounded hover:bg-green-100 text-green-600"
                                                            title="Mark as Received"
                                                            onClick={() => handleChangeStatus(logs.findIndex(l => l === log))}
                                                        >
                                                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                                                                <path d="M6 9l3 3 6-6" stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            </svg>
                                                            <span className="sr-only">Mark as Received</span>
                                                        </button>
                                                    ) : (
                                                        <button
                                                            className="p-1 rounded hover:bg-gray-100"
                                                            title="Edit"
                                                            onClick={() => setShowLockedModal(true)}
                                                        >
                                                            <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                                                                <path d="M12.13 3.87a1.5 1.5 0 012.12 2.12l-7.06 7.06-2.12.71.71-2.12 7.06-7.06z" stroke="#00B6C9" strokeWidth="1.2" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Locked Modal */}
                {showLockedModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                        <div className="bg-white rounded-2xl shadow-xl p-8 w-[320px] relative flex flex-col items-center">
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                                onClick={() => setShowLockedModal(false)}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                            <div className="flex items-center justify-center mb-4 mt-2">
                                <div className="bg-[#FACC15] rounded-full w-14 h-14 flex items-center justify-center">
                                    <svg width="36" height="36" fill="none">
                                        <circle cx="18" cy="18" r="18" fill="#FACC15" />
                                        <path d="M18 11v6M18 23h.01" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-xl font-bold text-center mb-2">Status Locked!</div>
                            <div className="text-gray-500 text-center mb-6 text-sm">
                                Go back after 48 hours to change the status of this item.
                            </div>
                            <button
                                className="bg-[#00B6C9] text-white px-8 py-2 rounded-full font-semibold text-base"
                                onClick={() => setShowLockedModal(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}

                {/* Export Success Modal */}
                {showExportModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-30">
                        <div className="bg-white rounded-2xl shadow-xl p-8 w-[320px] relative flex flex-col items-center">
                            <button
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 text-xl"
                                onClick={() => setShowExportModal(false)}
                                aria-label="Close"
                            >
                                &times;
                            </button>
                            <div className="flex items-center justify-center mb-4 mt-2">
                                <div className="bg-[#22C55E] rounded-full w-14 h-14 flex items-center justify-center">
                                    <svg width="36" height="36" fill="none">
                                        <circle cx="18" cy="18" r="18" fill="#22C55E" />
                                        <path d="M11 18l5 5 9-9" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                </div>
                            </div>
                            <div className="text-xl font-bold text-center mb-2">Log Exported!</div>
                            <div className="text-gray-500 text-center mb-6 text-sm">
                                Your log has been exported successfully.
                            </div>
                            <button
                                className="bg-[#00B6C9] text-white px-8 py-2 rounded-full font-semibold text-base"
                                onClick={() => setShowExportModal(false)}
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
	);
};