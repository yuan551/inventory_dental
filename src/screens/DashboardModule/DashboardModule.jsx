import React, { useEffect, useMemo, useState } from "react";
import monthlyUsageIcon from "../../assets/dashboard/monthly usage.png";
import { Card, CardContent } from "../../components/ui/card";
import { DashboardSidebarSection } from "./sections/DashboardSidebarSection/DashboardSidebarSection";
import { InventoryOverviewSection } from "./sections/InventoryOverviewSection/InventoryOverviewSection";
import { LowStockItemsSection } from "./sections/LowStockItemsSection/LowStockItemsSection";
import { MonthlyUsageTrendSection } from "./sections/MonthlyUsageTrendSection/MonthlyUsageTrendSection";
import { PendingOrdersSection } from "./sections/PendingOrdersSection/PendingOrdersSection";
import { StockAlertsListSection } from "./sections/StockAlertsListSection/StockAlertsListSection";
import { StockAlertsSection } from "./sections/StockAlertsSection/StockAlertsSection";
import { AppHeader } from "../../components/layout/AppHeader";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { isPlaceholderDoc } from "../../lib/placeholders";
import { db } from "../../firebase";

export const DashboardModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebarCollapsed") === "1"; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener("sidebar:toggle", handler);
    return () => window.removeEventListener("sidebar:toggle", handler);
  }, []);

  // Fetch inventory across collections with a small TTL cache to minimize reads
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]); // unified list across categories

  useEffect(() => {
  const TTL_MS = 60 * 1000;
  const CACHE_KEY = 'dashboard_inventory_cache_v2'; // bumped to flush placeholder remnants
    const tryLoadCache = () => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { at, items } = JSON.parse(raw);
        if (Date.now() - at > TTL_MS) return null;
        return items;
      } catch { return null; }
    };
    const saveCache = (items) => {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), items })); } catch {}
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
      const status = data.status || null;
      return { id: d.id, name, quantity, unit, unit_cost, expiration: exp, category, status };
    };

    const load = async () => {
      const cached = tryLoadCache();
      if (cached) { setItems(cached); return; }
      setLoading(true);
      try {
        const cols = ['consumables', 'medicines', 'equipment'];
        const snaps = await Promise.all(cols.map((c) => getDocs(collection(db, c))));
        const all = snaps.flatMap((snap, i) => snap.docs
          .filter(d => !isPlaceholderDoc(d.id, d.data()))
          .map((d) => mapDoc(d, cols[i])));
        setItems(all);
        saveCache(all);
      } catch (e) {
        console.error('Failed to load dashboard inventory', e);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  // Derived metrics
  const threshold = 5;
  const now = new Date();
  const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Defensive filter (in case cache still held a placeholder before code update)
  const realItems = useMemo(() => items.filter(it => it && it.id !== 'dummy' && (it.name || it.quantity > 0)), [items]);
  // Count both 'Critical' and 'Low Stock' items. Fallback to quantity-based rule for items missing status.
  const lowStockCount = useMemo(() => realItems.filter((it) => {
    if (it.status === 'Critical' || it.status === 'Low Stock') return true;
    // fallback: treat items with quantity <= 60 as low/critical when status missing
    if (!it.status) return (Number(it.quantity || 0) <= 60);
    return false;
  }).length, [realItems]);
  const expiringSoonCount = useMemo(() => realItems.filter((it) => it.expiration && it.expiration <= in30 && it.expiration >= now).length, [realItems]);
  const totalValue = useMemo(() => realItems.reduce((sum, it) => sum + (Number(it.unit_cost || 0) * Number(it.quantity || 0)), 0), [realItems]);

  const alerts = useMemo(() => {
    return realItems.reduce((acc, it) => {
      let severity = null;
      if (it.status === 'Critical' || it.status === 'Low Stock') {
        severity = it.status;
      } else if (!it.status) { // fallback if status missing
        if (it.quantity <= 20) severity = 'Critical';
        else if (it.quantity <= 60) severity = 'Low Stock';
      }
      if (severity) {
        acc.push({
          item: it.name || '(Unnamed)',
          reason: `${severity} - ${it.quantity} ${it.unit}`,
          category: it.category,
          severity,
          quantity: it.quantity,
        });
      }
      return acc;
    }, []).sort((a,b) => {
      const order = { 'Critical':0,'Low Stock':1 };
      const ret = order[a.severity]-order[b.severity];
      if (ret!==0) return ret;
      return a.quantity - b.quantity;
    });
  }, [items, realItems]);

  // Monthly usage trend from 'stock_logs' (type='stock_out')
  const [trendSeries, setTrendSeries] = useState([]);
  const [trendMonths, setTrendMonths] = useState(["Jan","Feb","Mar","Apr","May","Jun"]);

  useEffect(() => {
    const TTL_MS = 60 * 1000;
    const CACHE_KEY = 'dashboard_usage_trend_v1';
    const tryLoad = () => {
      try {
        const raw = sessionStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const { at, months, series } = JSON.parse(raw);
        if (Date.now() - at > TTL_MS) return null;
        return { months, series };
      } catch { return null; }
    };
    const save = (months, series) => {
      try { sessionStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), months, series })); } catch {}
    };

    const load = async () => {
      const cached = tryLoad();
      if (cached) { setTrendMonths(cached.months); setTrendSeries(cached.series); return; }

      // Fixed window: July -> December for the current year
      const year = new Date().getFullYear();
      const months = [];
      // Labels explicitly July to Dec
      const labels = ['Jul','Aug','Sep','Oct','Nov','Dec'];
      for (let m = 6; m <= 11; m++) {
        months.push({ y: year, m });
      }

      // Fetch stock_out logs within the earliest month start to the end of latest month
  const start = new Date(months[0].y, months[0].m, 1);
  const end = new Date(months[5].y, months[5].m + 1, 1);
      try {
        // We may not have composite indexes; get all and filter client-side to avoid index issues
        const snap = await getDocs(collection(db, 'stock_logs'));
        const logs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const stockOut = logs.filter((l) => (l.type === 'stock_out'));
        const parseTs = (t) => {
          if (!t) return null;
          if (typeof t.toDate === 'function') return t.toDate();
          if (t.seconds) return new Date(t.seconds * 1000);
          const d = new Date(t);
          return isNaN(d.getTime()) ? null : d;
        };

        const buckets = {
          consumables: Array(6).fill(0),
          medicines: Array(6).fill(0),
          equipment: Array(6).fill(0),
        };
        const normalizeCat = (c) => {
          const v = (c || '').toString().trim().toLowerCase();
          if (v === 'medicine' || v === 'med' || v === 'medicines') return 'medicines';
          if (v === 'equipment' || v === 'equipments' || v === 'equip') return 'equipment';
          if (v === 'consumable' || v === 'consumables' || v === 'consum') return 'consumables';
          return v; // fallback — leave as-is
        };
        stockOut.forEach((l) => {
          const dt = parseTs(l.timestamp);
          if (!dt || dt < start || dt >= end) return;
          const idx = (dt.getFullYear() - months[0].y) * 12 + (dt.getMonth() - months[0].m);
          if (idx < 0 || idx >= 6) return;
          const qty = Number(l.quantity || 0);
          const cat = normalizeCat(l.category);
          if (cat === 'consumables') buckets.consumables[idx] += qty;
          else if (cat === 'medicines') buckets.medicines[idx] += qty;
          else if (cat === 'equipment') buckets.equipment[idx] += qty;
        });

        const series = [
          { label: 'Consumables', color: '#3bc3de', data: buckets.consumables },
          { label: 'Medicines',   color: '#ff928a', data: buckets.medicines },
          { label: 'Equipment',   color: '#527ef0', data: buckets.equipment },
        ];
        setTrendMonths(labels);
        setTrendSeries(series);
        save(labels, series);
      } catch (e) {
        console.error('Failed to load usage trend', e);
      }
    };

    load();
  }, []);

  return (
    <div style={{backgroundColor: '#F5F5F5'}} className="w-full h-screen overflow-hidden flex">
      <aside className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="DASHBOARD" />
      </aside>

      <main className="flex-1 flex flex-col overflow-hidden">
        <AppHeader title="DASHBOARD" subtitle="Welcome back, Dr. Johnson. Here's your clinic's inventory overview." />

        {/* Content Area */}
  <div className="flex-1 flex flex-col px-8 py-6 overflow-hidden" style={{backgroundColor: '#F5F5F5'}}>

          <div className="grid grid-cols-4 gap-4 mb-6 flex-shrink-0">
            <LowStockItemsSection count={lowStockCount} />
            <StockAlertsSection count={expiringSoonCount} />
            <PendingOrdersSection count={0} />
            <InventoryOverviewSection totalValue={totalValue} />
          </div>
          <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
            {/* Monthly Usage Trend (takes 2 columns) */}
            <Card className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
              <CardContent className="p-6 flex flex-col flex-1 min-h-0">
                <h2 className="[font-family:'Oxygen',Helvetica] font-bold text-gray-900 text-xl tracking-[0] leading-[normal] mb-4 flex items-center gap-2 flex-shrink-0">
                  <img src={monthlyUsageIcon} alt="Monthly Usage" className="w-5 h-5 object-contain" />
                  Monthly Usage Trend
                </h2>
                <div className="flex-1 min-h-0">
                  <MonthlyUsageTrendSection series={trendSeries} months={trendMonths} />
                </div>
              </CardContent>
            </Card>

            {/* Stock Alerts List */}
            <Card className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-h-0">
              <CardContent className="p-0 h-full flex flex-col min-h-0">
                <StockAlertsListSection alerts={alerts} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

// Provide default export alongside named export for compatibility with any default imports
export default DashboardModule;