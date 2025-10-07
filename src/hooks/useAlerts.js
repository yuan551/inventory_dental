import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { isPlaceholderDoc } from '../lib/placeholders';
import { db } from '../firebase';

// Aggregates alerts (low stock and expiring soon) across consumables, medicines, and equipment.
// Uses a short sessionStorage TTL cache to minimize Firestore reads and shares data with Dashboard.
export function useAlerts(options = {}) {
  // Align with InventoryModule status logic
  const CRITICAL_MAX = options.criticalMax ?? 20;
  const LOW_STOCK_MAX = options.lowStockMax ?? 60;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
  const CACHE_KEY = 'dashboard_inventory_cache_v2';

    const saveCache = (nextItems) => {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: nextItems })); } catch {}
    };

    const parseDate = (v) => {
      if (!v) return null;
      try {
        if (typeof v === 'string') {
          const d = new Date(v);
          return isNaN(d.getTime()) ? null : d;
        }
        if (typeof v === 'object') {
          if (typeof v.toDate === 'function') return v.toDate();
          if ('seconds' in v) return new Date(v.seconds * 1000);
        }
      } catch {}
      return null;
    };

    const mapDoc = (d, category) => {
      const data = d.data() || {};
      const quantity = Number(data.quantity || 0);
      const unit = data.units || data.unit || 'units';
      const name = data.item_name || data.name || '';
      const unit_cost = Number(data.unit_cost || 0);
      const exp = parseDate(data.expired_date || data.expiration || data.expiration_date);
      const status = data.status || null; // may be stale; used to align with UI display
      return { id: d.id, name, quantity, unit, unit_cost, expiration: exp, category, status };
    };

    setLoading(true);
    const unsubs = ['consumables', 'medicines', 'equipment'].map((colName) =>
      onSnapshot(collection(db, colName), (snap) => {
        setItems((prev) => {
          // Merge per-collection updates while keeping others
          const others = prev.filter((it) => it.category !== colName);
          const next = [
            ...others,
            ...snap.docs
              .filter((d) => !isPlaceholderDoc(d.id, d.data()))
              .map((d) => mapDoc(d, colName)),
          ];
          saveCache(next);
          return next;
        });
        setLoading(false);
      }, (err) => {
        console.error('useAlerts: listener error', err);
        setLoading(false);
      })
    );

    return () => { unsubs.forEach((u) => { try { u(); } catch {} }); };
  }, []);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const alerts = useMemo(() => {
    return items.reduce((acc, it) => {
      // Prefer stored status to match what user sees in the Inventory table
      let severity = null;
      if (it.status === 'Critical' || it.status === 'Low Stock') {
        severity = it.status;
      } else if (!it.status) { // fallback if status not stored yet
        if (it.quantity <= CRITICAL_MAX) severity = 'Critical';
        else if (it.quantity <= LOW_STOCK_MAX) severity = 'Low Stock';
      }
      if (severity) {
        acc.push({
          item: it.name || '(Unnamed)',
          reason: `${severity} - ${it.quantity} ${it.unit}`,
          category: it.category,
          severity,
          quantity: it.quantity,
          unit: it.unit,
        });
      }
      return acc;
    }, []).sort((a,b) => {
      const order = { 'Critical':0,'Low Stock':1 };
      const d = order[a.severity]-order[b.severity];
      if (d!==0) return d;
      return a.quantity - b.quantity;
    });
  }, [items, CRITICAL_MAX, LOW_STOCK_MAX]);

  return { alerts, loading, CRITICAL_MAX, LOW_STOCK_MAX };
}
