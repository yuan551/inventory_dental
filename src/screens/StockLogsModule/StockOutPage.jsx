import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import { db } from "../../firebase";
import { collection, onSnapshot, orderBy, query, updateDoc, doc, getDocs, where, limit } from "firebase/firestore";
import lockStatusIcon from "../../assets/stocklogs/lock status.png";

export const StockOutPage = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Stock Out logs written from Inventory's stock-out confirmation
    const q = query(collection(db, "stock_logs"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      const out = data.filter((r) => r.type === 'stock_out');
      setRows(out);
      // Attempt background backfill for older logs missing supplier or reference
      backfillMissing(out);
    });
    return () => unsub();
  }, []);

  // Cache to avoid repeated supplier lookups per item name
  const supplierCache = React.useRef({});
  const backfillRunning = React.useRef(false);
  const backfillMissing = async (logs) => {
    if (backfillRunning.current) return; // prevent overlap
    const needs = logs.filter(l => (!l.supplier || l.supplier === '—') || !l.reference);
    if (needs.length === 0) return;
    backfillRunning.current = true;
    try {
      const categories = ['consumables','medicines','equipment'];
      for (const log of needs.slice(0, 8)) { // cap per snapshot to avoid bursts
        let supplier = log.supplier || '';
        if (!supplier) {
          const key = `item:${log.item_name}`;
            if (supplierCache.current[key]) {
              supplier = supplierCache.current[key];
            } else {
              // Try each category until found
              for (const cat of categories) {
                try {
                  const q = query(collection(db, cat), where('item','==', log.item_name), limit(1));
                  const snap = await getDocs(q);
                  if (!snap.empty) {
                    supplier = snap.docs[0].data().supplier || '';
                    supplierCache.current[key] = supplier;
                    break;
                  }
                } catch {}
              }
            }
        }
        let reference = log.reference;
        if (!reference) {
          const ts = log.timestamp?.toDate ? log.timestamp.toDate().getTime() : Date.now();
            reference = `SO-${ts.toString(36).toUpperCase()}-${log.id.slice(0,4).toUpperCase()}`;
        }
        try {
          await updateDoc(doc(db, 'stock_logs', log.id), { ...(supplier ? { supplier } : {}), ...(reference ? { reference } : {}) });
        } catch {}
      }
    } finally {
      backfillRunning.current = false;
    }
  };

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.item_name || "").toLowerCase().includes(s) ||
      (r.unit || "").toLowerCase().includes(s) ||
      String(r.quantity || "").toLowerCase().includes(s) ||
      (r.notes || "").toLowerCase().includes(s) ||
      (r.supplier || "").toLowerCase().includes(s) ||
      String(r.reference || "").toLowerCase().includes(s)
    );
  }, [rows, search]);

  return (
    <div className="h-screen overflow-hidden flex" style={{ background: "#F5F8FA" }}>
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? "w-20" : "w-64"}`}>
        <DashboardSidebarSection currentPage="STOCK LOGS" />
      </div>

      <div className="flex-1 flex flex-col">
  <AppHeader title="STOCK OUT" subtitle="All stock out transactions from Inventory" searchPlaceholder="Search stock out" />

        <div className="bg-white rounded-2xl shadow border border-gray-200 p-4 md:p-6 mt-6 mx-2 md:mx-8">
          <div className="font-semibold text-gray-900 text-lg md:text-xl mb-4">Transaction Tracker ({filtered.length} items)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 text-left">Date & Time</th>
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-left">Quantity</th>
                  <th className="py-3 px-4 text-left">Unit</th>
                  <th className="py-3 px-4 text-left">Supplier</th>
                  <th className="py-3 px-4 text-left">Reference</th>
                  <th className="py-3 px-4 text-left">Notes</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-gray-400" colSpan={7}>No transactions found.</td>
                  </tr>
                ) : filtered.map((r) => {
                  const dt = r.timestamp?.toDate ? r.timestamp.toDate() : null;
                  const d = dt ? dt.toLocaleDateString('en-CA') : '—';
                  const t = dt ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
                  return (
                    <tr key={r.id} className="bg-white">
                      <td className="py-3 px-4 text-[#00B6C9]">{d}<div className="text-xs text-gray-400">{t}</div></td>
                      <td className="py-3 px-4">{r.item_name || '—'}</td>
                      <td className="py-3 px-4">{r.quantity ?? '—'}</td>
                      <td className="py-3 px-4">{r.unit || 'units'}</td>
                      <td className="py-3 px-4">{r.supplier || '—'}</td>
                      <td className="py-3 px-4">{r.reference || '—'}</td>
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-1 px-3 py-1 rounded-full border border-gray-300 bg-gray-100 text-gray-600 text-xs font-medium">
                          {(r.locked || /locked/i.test(r.status || '')) && (
                            <img src={lockStatusIcon} alt="Locked" className="w-3.5 h-3.5" />
                          )}
                          {r.notes || '—'}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
