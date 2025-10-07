import React, { useEffect, useState, useRef, useLayoutEffect } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { PendingModal } from "../../components/modals/PendingModal";
import { AppHeader } from "../../components/layout/AppHeader";
import { db } from "../../firebase";
import {
  collection,
  addDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { isPlaceholderDoc } from "../../lib/placeholders";

// Assets
import stockintodayIcon from "../../assets/stocklogs/stockintoday.png";
import stockoutIcon from "../../assets/stocklogs/stockout.png"; // new icon for stock out card
import totaltransactionIcon from "../../assets/stocklogs/totaltransaction.png";
import lockstatusIcon from "../../assets/stocklogs/lock status.png";
import allstatusIcon from "../../assets/stocklogs/allstatus.png";
import exportlogIcon from "../../assets/stocklogs/exportlog.png";
// Use logo from public folder
const siteLogoPath = "/group.png"; // served from public/group.png
// PDF libs (added to package.json):
import jsPDF from "jspdf";
import "jspdf-autotable";

// Helper functions
const pad2 = (n) => String(n).padStart(2, "0");
const fmtDate = (d) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = (d) => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const genReferenceFrom = (itemName) => {
  const prefix = "PO-";
  const year = new Date().getFullYear();
  const randomNum = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${prefix}${year}-${randomNum}`;
};
const normalizeCategory = (cat) => {
  if (!cat) return "consumables";
  const c = cat.trim().toLowerCase();
  if (c === "medicine" || c === "medicines") return "medicines";
  if (c === "equipment") return "equipment";
  return "consumables";
};

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
    const [logs, setLogs] = useState([]);
    const [outLogs, setOutLogs] = useState([]);
    const [accountsMap, setAccountsMap] = useState({});
    const [openStatusFor, setOpenStatusFor] = useState(null);
    const [search, setSearch] = useState("");
    // Removed Status Locked modal usage; only Ordered is locked silently
    const [showPendingModal, setShowPendingModal] = useState(false);
    // Dynamic table height refs/state
    const headerRef = useRef(null);
    const tabsRef = useRef(null);
    const metricsRef = useRef(null);
    const tableHeadRef = useRef(null);
    const firstRowRef = useRef(null);
    const [tableMaxHeight, setTableMaxHeight] = useState(450); // fallback
    const [availableHeight, setAvailableHeight] = useState(450);

    const recomputeTableHeight = () => {
        try {
            const headerH = headerRef.current?.offsetHeight || 0;
            const tabsH = tabsRef.current?.offsetHeight || 0;
            const metricsH = metricsRef.current?.offsetHeight || 0;
            // 24px extra spacing (margins/padding buffer)
            const buffer = 64; // some breathing room below
            const h = window.innerHeight - headerH - tabsH - metricsH - buffer;
            const avail = h > 260 ? h : 260;
            setAvailableHeight(avail);
            // We'll clamp to 5 rows later once we measure row height
            setTableMaxHeight(avail);
        } catch { /* ignore measurement errors */ }
    };

    useLayoutEffect(() => {
        recomputeTableHeight();
    }, [sidebarCollapsed, tab]);
    useEffect(() => {
        const handler = () => recomputeTableHeight();
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);

    // (moved height clamp effect below after filteredLogs definition)

    // Helper to get user's full name from accounts collection
    const getUserFullName = (uid) => {
        if (!uid || !accountsMap[uid]) return "Unknown User";
        
        const acc = accountsMap[uid];
        
        // Try all possible field name variations
        const firstName = acc.firstName || acc.firstname || acc.first_name || acc.FirstName || "";
        const lastName = acc.lastName || acc.lastname || acc.last_name || acc.LastName || "";
        
        // Format: "Dr. LastName FirstName"
        if (lastName && firstName) {
            return `Dr. ${lastName} ${firstName}`;
        } else if (lastName) {
            return `Dr. ${lastName}`;
        } else if (firstName) {
            return `Dr. ${firstName}`;
        }
        
        // If no names found, try to get email or any identifier
        if (acc.email) {
            return acc.email.split('@')[0];
        }
        
        return "Unknown User";
    };

    useEffect(() => {
        const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
        window.addEventListener("sidebar:toggle", handler);
        return () => window.removeEventListener("sidebar:toggle", handler);
    }, []);

    // Load accounts map
    useEffect(() => {
        const accountsCol = collection(db, "accounts");
        const unsubscribe = onSnapshot(accountsCol, (snap) => {
            const map = {};
            snap.forEach((docSnap) => {
                if (docSnap.id !== 'dummy' && !docSnap.data().placeholder) {
                    map[docSnap.id] = docSnap.data();
                }
            });
            setAccountsMap(map);
        });
        return () => unsubscribe();
    }, []);

    // Load Stock In logs from "ordered" collection
    useEffect(() => {
        const orderedCol = collection(db, "ordered");
        const q = query(orderedCol, orderBy("created_at", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const arr = [];
            snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (docSnap.id !== 'dummy' && !data.placeholder) {
                    // Generate a reference if missing / placeholder
                    if (!data.reference || data.reference === 'N/A') {
                        try {
                            const newRef = genReferenceFrom(data.item_name || data.item || 'ITEM');
                            updateDoc(doc(db, 'ordered', docSnap.id), { reference: newRef });
                            data.reference = newRef; // reflect immediately in UI
                        } catch (e) {
                            console.warn('Failed to set reference for', docSnap.id, e);
                        }
                    }
                    arr.push({ id: docSnap.id, ...data });
                }
            });
            setLogs(arr);
        });
        return () => unsubscribe();
    }, []);

    // Load Stock Out logs from "stock_logs" collection (uses 'timestamp' field instead of 'created_at')
    useEffect(() => {
        const logsCol = collection(db, "stock_logs");
        // Order by timestamp (stock out entries); fall back to created_at if later added
        const q = query(logsCol, orderBy("timestamp", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const arr = [];
            snap.forEach((docSnap) => {
                const data = docSnap.data();
                if (docSnap.id !== 'dummy' && !data.placeholder) {
                    // Normalize created_at so rest of component can format without branching
                    const created_at = data.created_at || data.timestamp || null;
                    arr.push({ id: docSnap.id, ...data, created_at });
                }
            });
            setOutLogs(arr);
        });
        return () => unsubscribe();
    }, []);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e) => {
            if (!e.target.closest(".status-dropdown-container")) {
                setOpenStatusFor(null);
            }
        };
        if (openStatusFor !== null) {
            document.addEventListener("mousedown", handler);
        }
        return () => document.removeEventListener("mousedown", handler);
    }, [openStatusFor]);

    // Determine which logs to show based on tab
    const activeRows = tab === "out" ? outLogs : logs;

    // Filter logs by status and search
    const filteredLogs = activeRows.filter((log) => {
        const matchesStatus =
            selectedStatus === "All Status" || log.status === selectedStatus;
        
        const item = log.item_name || log.item || "";
        const supplier = log.supplier || "";
        const reference = log.reference || "";
        const createdBy = getUserFullName(log.created_by || log.createdBy);

        const matchesSearch =
            search.trim() === "" ||
            item.toLowerCase().includes(search.toLowerCase()) ||
            createdBy.toLowerCase().includes(search.toLowerCase()) ||
            supplier.toLowerCase().includes(search.toLowerCase()) ||
            reference.toLowerCase().includes(search.toLowerCase());
        return matchesStatus && matchesSearch;
    });

    // After filteredLogs is available, clamp height to show only 5 rows (plus header) if space allows.
    useLayoutEffect(() => {
        requestAnimationFrame(() => {
            try {
                const headH = tableHeadRef.current?.offsetHeight || 0;
                const rowH = firstRowRef.current?.offsetHeight || 0;
                if (rowH > 0) {
                    const rowsToShow = Math.min(5, filteredLogs.length || 5);
                    const desired = headH + rowH * rowsToShow;
                    const padded = desired + 8;
                    setTableMaxHeight(Math.min(availableHeight, padded));
                }
            } catch { /* ignore */ }
        });
    }, [filteredLogs, availableHeight]);

    // 48‑hour lock logic (Ordered only)
    //  - Locked for configured duration (default 48h) from created_at
    //  - Can be manually overridden by adding boolean field `unlock` or `force_unlock` (true) in Firestore
    //  - If created_at is missing -> not locked
    //  - If created_at was edited to a future date, lock counts from that future date
    const LOCK_MS = (() => {
        const overrideSpan = localStorage.getItem('stocklogs.lockMs');
        const span = overrideSpan ? parseInt(overrideSpan, 10) : 48 * 60 * 60 * 1000; // 48h default
        return Number.isFinite(span) && span > 0 ? span : 48 * 60 * 60 * 1000;
    })();

    const getTimestampMs = (ts) => {
        if (!ts) return null;
        if (ts instanceof Timestamp) return ts.toMillis();
        if (typeof ts === 'number') return ts;
        if (typeof ts === 'object' && typeof ts.seconds === 'number') return ts.seconds * 1000;
        return null;
    };

    // Determine lock end timestamp (ms). Priority:
    // 1. Explicit lock_until / lock_until_ms field (Firestore Timestamp or number)
    // 2. created_at + LOCK_MS
    const getLockUntilMs = (log) => {
        const explicit = getTimestampMs(log.lock_until_ms) || getTimestampMs(log.lock_until);
        if (explicit) return explicit;
        const createdMs = getTimestampMs(log.created_at);
        if (!createdMs) return null;
        return createdMs + LOCK_MS;
    };

    const isOrderedLocked = (log) => {
        if (log.unlock === true || log.force_unlock === true) return false; // manual override
        const until = getLockUntilMs(log);
        if (!until) return false; // missing timing data => unlocked
        return Date.now() < until; // locked if current time before lock-until
    };

    const isLockControlled = (log) => log.status === 'Ordered';
    const isUnlocked = (log) => !isLockControlled(log) || !isOrderedLocked(log);
    const remainingLockMs = (log) => {
        if (!isLockControlled(log)) return 0;
        if (log.unlock === true || log.force_unlock === true) return 0;
        const until = getLockUntilMs(log);
        if (!until) return 0;
        const left = until - Date.now();
        return left > 0 ? left : 0;
    };

    // Keep "unlock" boolean in sync for Ordered docs:
    //  - While within lock window: unlock = false
    //  - After lock window passes: unlock = true
    //  - If created_at edited backwards (making it older) it flips to true accordingly
    //  - If created_at edited forwards (making it newer) it flips back to false (unless force_unlock)
    useEffect(() => {
        if (!logs || logs.length === 0) return;
        const now = Date.now();
        logs.forEach((log) => {
            if (log.status !== 'Ordered') return;
            if (log.force_unlock === true) return; // explicit override
            const until = getLockUntilMs(log);
            if (!until) return; // no timing data -> ignore
            const locked = now < until;
            const desired = locked ? false : true;
            if (log.unlock !== desired) {
                try {
                    updateDoc(doc(db, 'ordered', log.id), { unlock: desired });
                } catch (e) {
                    console.warn('Failed to sync unlock flag for', log.id, e);
                }
            }
        });
    }, [logs]);

    // Handle status updates with Firebase
    const handleUpdateStatus = async (log, newStatus) => {
        if (isLockControlled(log) && !isUnlocked(log)) return; // silently ignore while locked

        try {
            const docRef = doc(db, tab === "out" ? "stock_logs" : "ordered", log.id);
            const updates = {
                status: newStatus,
                status_updated_at: serverTimestamp(),
            };
            await updateDoc(docRef, updates);

            // If changing to "Received", move item to inventory
            if (newStatus === "Received" && !log.moved_to_inventory) {
                const cat = normalizeCategory(log.category);
                const invCol = collection(db, cat);
                // Ensure we have latest doc (in case local log object lacked item_name)
                let name = log.item_name || log.item || "";
                if (!name) {
                    try {
                        const freshSnap = await getDoc(docRef);
                        const freshData = freshSnap.data() || {};
                        name = freshData.item_name || freshData.item || "";
                    } catch {}
                }
                await addDoc(invCol, {
                    item: name,              // for inventory display mapping
                    item_name: name,         // keep consistency if other code expects item_name
                    quantity: log.quantity || 0,
                    unit_cost: log.unit_cost || 0,
                    units: log.units || "",
                    supplier: log.supplier || "",
                    category: cat,
                    created_at: serverTimestamp(),
                });
                await updateDoc(docRef, { moved_to_inventory: true });
                // Alert inventory screen to refresh that category immediately
                try {
                    window.dispatchEvent(new CustomEvent('inventory:refresh', { detail: { category: cat } }));
                } catch {}
            }

            // Show PendingModal if status changed to "Pending"
            if (newStatus === "Pending") {
                setShowPendingModal(true);
            }

            setOpenStatusFor(null);
        } catch (err) {
            console.error("Error updating status:", err);
            alert("Failed to update status. Please try again.");
        }
    };

    // Export current filtered logs to PDF
    const handleExportPDF = async () => {
        try {
            const clinicName = 'MEDICARE DENTAL CLINIC';
            const title = tab === 'out' ? 'Stock Out Records' : 'Stock In Records';
            const generated = new Date();
            const monthAbbrev = generated.toLocaleString('en-US', { month: 'short' }); // e.g. Oct
            const fileName = `${monthAbbrev} ${title}.pdf`; // e.g. Oct Stock In Records.pdf

            const docPdf = new jsPDF({ orientation: 'landscape' });

            // Load logo from public folder as data URL
            let logoData = null;
            try {
                const resp = await fetch(siteLogoPath);
                const blob = await resp.blob();
                logoData = await new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(blob); });
            } catch (e) { console.warn('Logo load failed', e); }

            if (logoData) {
                docPdf.addImage(logoData, 'PNG', 14, 8, 14, 14); // x,y,w,h
            }

            // Header text
            docPdf.setFontSize(14);
            docPdf.setFont(undefined, 'bold');
            docPdf.text(clinicName, 32, 14);
            docPdf.setFontSize(11);
            docPdf.setFont(undefined, 'normal');
            docPdf.text(`${title}`, 32, 21);
            docPdf.setFontSize(8);
            docPdf.text(`Generated: ${generated.toLocaleString()}`, 32, 26);
            docPdf.text(`Total Records: ${filteredLogs.length}`, 250, 14, { align: 'right' });

            // Build rows (dynamic last column: Status for Stock In, Notes for Stock Out)
            const rows = filteredLogs.map((l) => {
                const created = l.created_at ? (
                    l.created_at instanceof Timestamp
                        ? l.created_at.toDate()
                        : l.created_at.seconds
                            ? new Date(l.created_at.seconds * 1000)
                            : null
                ) : null;
                const dateStr = created ? `${fmtDate(created)} ${fmtTime(created)}` : '';
                if (tab === 'out') {
                    return [
                        dateStr,
                        l.item_name || l.item || '',
                        getUserFullName(l.created_by || l.createdBy),
                        l.supplier || '',
                        l.reference || '',
                        (l.notes || '').toString(),
                    ];
                }
                return [
                    dateStr,
                    l.item_name || l.item || '',
                    getUserFullName(l.created_by || l.createdBy),
                    l.supplier || '',
                    l.reference || '',
                    l.status || '',
                ];
            });

            const head = tab === 'out'
                ? [["Date & Time", "Item", "User", "Supplier", "Reference", "Notes"]]
                : [["Date & Time", "Item", "User", "Supplier", "Reference", "Status"]];
            docPdf.autoTable({
                head,
                body: rows,
                startY: 32,
                styles: { fontSize: 8 },
                headStyles: { fillColor: [0, 182, 201] },
                alternateRowStyles: { fillColor: [240, 250, 252] },
                didDrawPage: (data) => {
                    const pageCount = docPdf.getNumberOfPages();
                    docPdf.setFontSize(8);
                    docPdf.text(`Page ${data.pageNumber} / ${pageCount}`, data.settings.margin.left, docPdf.internal.pageSize.getHeight() - 4);
                },
            });

            docPdf.save(fileName);
        } catch (e) {
            console.error('PDF export failed', e);
            alert('Failed to export PDF');
        }
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
                <div ref={headerRef}>
                <AppHeader
                    title="STOCK LOGS"
                    subtitle="Track all inventory movements and transactions"
                    searchPlaceholder="Search stock logs"
                    searchValue={search}
                    onSearchChange={setSearch}
                />
                </div>

                {/* Full-width Tabs capsule aligned with cards */}
                <div className="w-full bg-[#F7F7F7] mt-4 mb-4 px-4 md:px-8" ref={tabsRef}>
                    <div
                        className="w-full rounded-2xl bg-[#ECECEC] flex shadow-sm"
                        style={{ height: 48, alignItems: "center" }}
                    >
                        <button
                            className={`flex-1 h-10 mx-1 my-1 rounded-lg font-medium text-center transition-all
                                ${tab === "in" ? "bg-white text-black shadow" : "bg-transparent text-gray-600"}`}
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
                                ${tab === "out" ? "bg-white text-black shadow" : "bg-transparent text-gray-600"}`}
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-8 py-4" ref={metricsRef}>
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
                                    ? activeRows.filter((log) => {
                                          if (!log.created_at) return false;
                                          const logDate =
                                              log.created_at instanceof Timestamp
                                                  ? fmtDate(log.created_at.toDate())
                                                  : log.created_at.seconds
                                                  ? fmtDate(new Date(log.created_at.seconds * 1000))
                                                  : "";
                                          return logDate === fmtDate(new Date());
                                      }).length
                                    : activeRows.filter((log) => {
                                          if (!log.created_at) return false;
                                          const logDate =
                                              log.created_at instanceof Timestamp
                                                  ? fmtDate(log.created_at.toDate())
                                                  : log.created_at.seconds
                                                  ? fmtDate(new Date(log.created_at.seconds * 1000))
                                                  : "";
                                          return logDate === fmtDate(new Date());
                                      }).length}
                            </div>
                            <img src={tab === 'out' ? stockoutIcon : stockintodayIcon} alt={tab === 'out' ? 'Stock Out Today' : 'Stock In Today'} className="w-9 h-9" />
                        </div>
                    </div>
                    {/* Total Transactions Card */}
                    <div className="bg-white rounded-xl border border-[#D6E6EA] p-6 flex flex-col justify-between min-h-[110px]">
                        <div className="text-gray-500 text-base mb-1">Total Transactions</div>
                        <div className="flex items-center justify-between">
                            <div className="text-3xl font-bold text-gray-900">{activeRows.length}</div>
                            <img src={totaltransactionIcon} alt="Total Transactions" className="w-9 h-9" />
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
                                    <img src={allstatusIcon} alt="All Status" className="w-5 h-5" />
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
                                    <div
                                        className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 z-30 py-2 dropdown-anim-in origin-top-right"
                                        style={{
                                            maxHeight: 'unset',
                                            overflow: 'visible',
                                            animationDuration: '140ms'
                                        }}
                                    >
                                        {statusOptions.map((status) => (
                                            <button
                                                key={status}
                                                className={`w-full text-left px-4 py-2 text-sm font-sans hover:bg-[#E9F7FA] transition-colors ${
                                                    selectedStatus === status
                                                        ? 'bg-[#E9F7FA] text-[#00B6C9] font-semibold'
                                                        : 'text-gray-700'
                                                } flex items-center gap-2`}
                                                onClick={() => {
                                                    setSelectedStatus(status);
                                                    setShowStatusDropdown(false);
                                                }}
                                                type="button"
                                            >
                                                {selectedStatus === status && (
                                                    <svg width="16" height="16" fill="none" className="mr-1">
                                                        <circle cx="8" cy="8" r="7" stroke="#00B6C9" strokeWidth="2" />
                                                        <path d="M5.2 8l2 2 3.6-3.6" stroke="#00B6C9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
                                onClick={handleExportPDF}
                                type="button"
                            >
                                <img src={exportlogIcon} alt="Export" className="w-5 h-5" />
                                Export Logs
                            </button>
                        </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto" style={{ maxHeight: tableMaxHeight, overflowY: 'auto', scrollbarWidth: 'thin', scrollbarColor: '#00B6C9 #f0f0f0' }}>
                        <table className="min-w-full text-sm text-left font-sans">
                            <thead ref={tableHeadRef} className="bg-[#F7F7F7] sticky top-0 z-10">
                                <tr className="text-gray-400 text-base font-semibold">
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Date & Time</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Item</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">User</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Supplier</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">Reference</th>
                                    <th className="py-2 px-2 md:py-3 md:px-4 font-semibold">{tab === 'out' ? 'Notes' : 'Status'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.length === 0 ? null : filteredLogs.map((log, idx) => {
                                    const logDate = log.created_at
                                        ? log.created_at instanceof Timestamp
                                            ? fmtDate(log.created_at.toDate())
                                            : log.created_at.seconds
                                                ? fmtDate(new Date(log.created_at.seconds * 1000))
                                                : ""
                                        : "";
                                    const logTime = log.created_at
                                        ? log.created_at instanceof Timestamp
                                            ? fmtTime(log.created_at.toDate())
                                            : log.created_at.seconds
                                                ? fmtTime(new Date(log.created_at.seconds * 1000))
                                                : ""
                                        : "";
                                    const userName = getUserFullName(log.created_by || log.createdBy);
                                    const isLocked = isLockControlled(log) && !isUnlocked(log);
                                    const lockMsLeft = remainingLockMs(log);
                                    return (
                                        <tr key={log.id} ref={idx === 0 ? firstRowRef : null} className={idx === 0 ? "bg-[#E9F7FA]" : "bg-white"}>
                                            <td className="py-2 px-2 md:py-3 md:px-4 font-medium text-[#00B6C9] whitespace-nowrap align-top">
                                                <div>{logDate}</div>
                                                <div className="text-xs text-gray-400 font-normal">{logTime}</div>
                                            </td>
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                <div>{log.item_name || log.item || "N/A"}</div>
                                            </td>
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                <span className="flex items-center gap-2">
                                                    <svg width="16" height="16" fill="none" className="text-gray-400">
                                                        <circle cx="8" cy="8" r="7" stroke="#B0B0B0" strokeWidth="1.2" />
                                                        <circle cx="8" cy="7" r="2" stroke="#B0B0B0" strokeWidth="1.2" />
                                                        <path d="M4.5 12c.5-1.5 2-2.5 3.5-2.5s3 .9 3.5 2.5" stroke="#B0B0B0" strokeWidth="1.2" />
                                                    </svg>
                                                    {userName}
                                                </span>
                                            </td>
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">{log.supplier || "N/A"}</td>
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">{log.reference || "N/A"}</td>
                                            <td className="py-2 px-2 md:py-3 md:px-4 align-top">
                                                {tab === 'out' ? (
                                                    <div className="text-gray-600 text-sm max-w-xs break-words whitespace-pre-wrap">{log.notes || '—'}</div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        {(() => {
                                                            const base = "inline-flex items-center gap-1 px-2 md:px-3 py-1 rounded-full text-xs font-semibold border select-none";
                                                            const size = { fontSize: "13px" };
                                                            if (log.status === "Ordered") {
                                                                return (
                                                                    <span className={`${base} bg-[#F4F4F4] text-gray-500 border-gray-300`} style={size}>
                                                                        <img src={lockstatusIcon} alt="Locked" className="w-3.5 h-3.5" />
                                                                        Ordered
                                                                    </span>
                                                                );
                                                            }
                                                            const map = { Pending: "bg-[#FEF3C7] text-[#92400E] border-[#FDE68A]", Received: "bg-green-100 text-green-700 border-green-300", Cancelled: "bg-red-100 text-red-600 border-red-300" };
                                                            const cls = map[log.status] || "bg-gray-100 text-gray-600 border-gray-300";
                                                            return <span className={`${base} ${cls}`} style={size}>{log.status}</span>;
                                                        })()}
                                                        <div className="relative status-dropdown-container">
                                                            <button
                                                                className="p-1 rounded hover:bg-gray-100 disabled:opacity-40"
                                                                title={isLocked ? (() => { const hrs = Math.ceil(lockMsLeft / (1000 * 60 * 60)); return `Locked (${hrs}h left).`; })() : "Change Status"}
                                                                onClick={() => { if (isLocked) return; setOpenStatusFor(openStatusFor === log.id ? null : log.id); }}
                                                                disabled={isLocked}
                                                            >
                                                                <svg width="18" height="18" fill="none" viewBox="0 0 18 18"><path d="M12.13 3.87a1.5 1.5 0 012.12 2.12l-7.06 7.06-2.12.71.71-2.12 7.06-7.06z" stroke="#00B6C9" strokeWidth="1.2" /></svg>
                                                            </button>
                                                            {openStatusFor === log.id && (
                                                                <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border border-gray-200 z-30 py-1 dropdown-anim-in origin-top-right">
                                                                    {['Received','Pending','Cancelled'].map(status => (
                                                                        <button key={status} className="w-full text-left px-3 py-2 text-sm hover:bg-[#E9F7FA] text-gray-700 transition-colors" onClick={() => handleUpdateStatus(log, status)}>{status}</button>
                                                                    ))}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Status Locked Modal removed (silent lock for Ordered only) */}

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

                {/* Pending Modal */}
                <PendingModal isOpen={showPendingModal} onClose={() => setShowPendingModal(false)} />
            </div>
        </div>
	);
};