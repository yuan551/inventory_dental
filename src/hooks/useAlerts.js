import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { isPlaceholderDoc } from '../lib/placeholders';
import { db } from '../firebase';

// Aggregates alerts (low stock and expiring soon) across consumables, medicines, and equipment.
// Returns two arrays: stockAlerts and expiryAlerts for the Alerts screen to merge.
export function useAlerts(options = {}) {
  const CRITICAL_MAX = options.criticalMax ?? 20;
  const LOW_STOCK_MAX = options.lowStockMax ?? 60;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'dashboard_inventory_cache_v2';
    const saveCache = (nextItems) => {
      try {
        sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items: nextItems }));
      } catch (e) {
        // ignore sessionStorage errors
      }
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
      } catch (e) {
        // ignore
      }
      return null;
    };

    const mapDoc = (d, category) => {
      const data = d.data() || {};
      const quantity = Number(data.quantity || 0);
      const unit = data.units || data.unit || 'units';
      const name = data.item_name || data.name || '';
      const unit_cost = Number(data.unit_cost || 0);
      const rawVal = data.expired_date || data.expiration || data.expiration_date;
      const exp = parseDate(rawVal);
      // Preserve the user's raw input where possible (string input from Inventory inline edit)
      let expirationRaw = null;
      try {
        if (typeof rawVal === 'string') expirationRaw = rawVal;
        else if (rawVal && typeof rawVal === 'object') {
          if (typeof rawVal.toDate === 'function') expirationRaw = rawVal.toDate().toLocaleDateString('en-US');
          else if ('seconds' in rawVal) expirationRaw = new Date(rawVal.seconds * 1000).toLocaleDateString('en-US');
        }
      } catch (e) { /* ignore */ }
      const status = data.status || null;
      return { id: d.id, name, quantity, unit, unit_cost, expiration: exp, expirationRaw, category, status };
    };

    setLoading(true);
    const unsubs = ['consumables', 'medicines', 'equipment'].map((colName) =>
      onSnapshot(
        collection(db, colName),
        (snap) => {
          setItems((prev) => {
            const others = prev.filter((it) => it.category !== colName);
            const next = [
              ...others,
              ...snap.docs.filter((d) => !isPlaceholderDoc(d.id, d.data())).map((d) => mapDoc(d, colName)),
            ];
            saveCache(next);
            return next;
          });
          setLoading(false);
        },
        (err) => {
          console.error('useAlerts: listener error', err);
          setLoading(false);
        }
      )
    );

    return () => {
      unsubs.forEach((u) => {
        try {
          u();
        } catch (e) {
          // ignore
        }
      });
    };
  }, []);

  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const { stockAlerts, expiryAlerts } = useMemo(() => {
    const stockAcc = [];
    const expiryAcc = [];

    for (const it of items) {
      // stock-derived alerts
      let severity = null;
      if (it.status === 'Critical' || it.status === 'Low Stock') {
        severity = it.status;
      } else if (!it.status) {
        if (it.quantity <= CRITICAL_MAX) severity = 'Critical';
        else if (it.quantity <= LOW_STOCK_MAX) severity = 'Low Stock';
      }
      if (severity) {
        stockAcc.push({
          id: it.id,
          item: it.name || '(Unnamed)',
          reason: `${severity} - ${it.quantity} ${it.unit}`,
          category: it.category,
          severity,
          quantity: it.quantity,
          unit: it.unit,
        });
      }

      // expiry-derived alerts within next 30 days
      try {
        const exp = it.expiration instanceof Date ? it.expiration : it.expiration ? new Date(it.expiration) : null;
        if (exp && !isNaN(exp.getTime()) && exp >= now && exp <= in30) {
          expiryAcc.push({
            id: it.id,
            item: it.name || '(Unnamed)',
            reason: `Expiring on ${exp.toLocaleDateString()}`,
            category: it.category,
            severity: 'high',
            datetime: exp.toISOString(),
          });
        }
      } catch (e) {
        // ignore parse errors
      }
    }

    stockAcc.sort((a, b) => {
      const order = { Critical: 0, 'Low Stock': 1 };
      const d = (order[a.severity] ?? 99) - (order[b.severity] ?? 99);
      if (d !== 0) return d;
      return a.quantity - b.quantity;
    });

    return { stockAlerts: stockAcc, expiryAlerts: expiryAcc };
  }, [items, CRITICAL_MAX, LOW_STOCK_MAX]);

  return { stockAlerts, expiryAlerts, loading, CRITICAL_MAX, LOW_STOCK_MAX };
}
