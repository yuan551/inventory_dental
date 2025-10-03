import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

// Aggregates alerts (low stock and expiring soon) across consumables, medicines, and equipment.
// Uses a short sessionStorage TTL cache to minimize Firestore reads and shares data with Dashboard.
export function useAlerts(options = {}) {
  const threshold = options.threshold ?? 5;
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const CACHE_KEY = 'dashboard_inventory_cache_v1';

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
      return { id: d.id, name, quantity, unit, unit_cost, expiration: exp, category };
    };

    setLoading(true);
    const unsubs = ['consumables', 'medicines', 'equipment'].map((colName) =>
      onSnapshot(collection(db, colName), (snap) => {
        setItems((prev) => {
          // Merge per-collection updates while keeping others
          const others = prev.filter((it) => it.category !== colName);
          const next = [
            ...others,
            ...snap.docs.map((d) => mapDoc(d, colName)),
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
      const reasons = [];
      if (it.quantity < threshold) reasons.push(`Low Stock - ${it.quantity} ${it.unit}`);
      if (it.expiration && it.expiration <= in30 && it.expiration >= now) reasons.push(`Expiring Soon - ${it.expiration.toLocaleDateString('en-US')}`);
      if (reasons.length) acc.push({ item: it.name || '(Unnamed)', reason: reasons.join(' • '), category: it.category });
      return acc;
    }, []);
  }, [items, threshold]);

  return { alerts, loading };
}
