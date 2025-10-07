import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import { db } from "../../firebase";
import { collection, getDocs, onSnapshot, orderBy, query } from "firebase/firestore";
// Lock icon for locked statuses (filename contains a space)
import lockStatusIcon from "../../assets/stocklogs/lock status.png";

export const StockInPage = () => {
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
    // Stock In: show 'ordered' logs (new orders)
    const q = query(collection(db, "ordered"), orderBy("created_at", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setRows(data);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter((r) =>
      (r.item_name || "").toLowerCase().includes(s) ||
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
        <AppHeader title="STOCK IN" subtitle="All new orders added to inventory" />

        <div className="bg-white rounded-2xl shadow border border-gray-200 p-4 md:p-6 mt-6 mx-2 md:mx-8">
          <div className="font-semibold text-gray-900 text-lg md:text-xl mb-4">Transaction Tracker ({filtered.length} items)</div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="py-3 px-4 text-left">Date & Time</th>
                  <th className="py-3 px-4 text-left">Item</th>
                  <th className="py-3 px-4 text-left">Supplier</th>
                  <th className="py-3 px-4 text-left">Reference</th>
                  <th className="py-3 px-4 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td className="py-8 text-center text-gray-400" colSpan={5}>No transactions found.</td>
                  </tr>
                ) : filtered.map((r) => {
                  const dt = r.created_at?.toDate ? r.created_at.toDate() : null;
                  const d = dt ? dt.toLocaleDateString('en-CA') : '—';
                  const t = dt ? dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
                  return (
                    <tr key={r.id} className="bg-white">
                      <td className="py-3 px-4 text-[#00B6C9]">{d}<div className="text-xs text-gray-400">{t}</div></td>
                      <td className="py-3 px-4">{r.item_name || '—'}</td>
                      <td className="py-3 px-4">{r.supplier || '—'}</td>
                      <td className="py-3 px-4">{r.reference || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-gray-300 bg-gray-100 text-gray-600 text-xs font-medium">
                          {/* Assumption: a record is locked if r.locked === true OR status equals 'Locked'. Adjust logic as needed. */}
                          { (r.locked || /locked/i.test(r.status || '')) && (
                            <img src={lockStatusIcon} alt="Locked" className="w-3.5 h-3.5" />
                          ) }
                          {r.status || 'Ordered'}
                        </span>
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
