import React, { useEffect, useMemo, useState } from "react";
import { db } from "../../firebase";
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import lockStatusIcon from "../../assets/stocklogs/lock status.png";

export const OrderedTransactions = () => {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
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
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="font-semibold text-gray-900 text-lg md:text-xl">Transaction Tracker ({filtered.length} items)</div>
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search stock logs"
            className="px-3 py-2 border border-gray-200 rounded-full text-sm w-64"
          />
        </div>
      </div>

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
              const t = dt ? dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '';
              return (
                <tr key={r.id} className="bg-white">
                  <td className="py-3 px-4 text-[#00B6C9]">{d}<div className="text-xs text-gray-400">{t}</div></td>
                  <td className="py-3 px-4">{r.item_name || '—'}</td>
                  <td className="py-3 px-4">{r.supplier || '—'}</td>
                  <td className="py-3 px-4">{r.reference || '—'}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-gray-300 bg-gray-100 text-gray-600 text-xs font-medium">
                      {(r.locked || /locked/i.test(r.status || '')) && (
                        <img src={lockStatusIcon} alt="Locked" className="w-3.5 h-3.5" />
                      )}
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
  );
};

export default OrderedTransactions;
