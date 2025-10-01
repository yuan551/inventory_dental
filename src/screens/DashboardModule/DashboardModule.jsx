import { Bell as BellIcon, Search as SearchIcon } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Card, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { DashboardSidebarSection } from "./sections/DashboardSidebarSection/DashboardSidebarSection";
import { InventoryOverviewSection } from "./sections/InventoryOverviewSection/InventoryOverviewSection";
import { LowStockItemsSection } from "./sections/LowStockItemsSection/LowStockItemsSection";
import { MonthlyUsageTrendSection } from "./sections/MonthlyUsageTrendSection/MonthlyUsageTrendSection";
import { PendingOrdersSection } from "./sections/PendingOrdersSection/PendingOrdersSection";
import { StockAlertsListSection } from "./sections/StockAlertsListSection/StockAlertsListSection";
import { StockAlertsSection } from "./sections/StockAlertsSection/StockAlertsSection";
import { useLastName } from "../../hooks/useLastName";
import profilePng from "../../assets/Ellipse 1.png";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";

const chartLegendData = [
  { color: "bg-[#8979ff]", value: "3000" },
  { color: "bg-[#ff928a]", value: "2500" },
  { color: "bg-[#3bc3de]", value: "2000" },
  { color: "bg-[#ffae4c]", value: "1500" },
  { color: "bg-[#527ef0]", value: "1000" },
];

export const DashboardModule = () => {
  const lastName = useLastName();
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
    const CACHE_KEY = 'dashboard_inventory_cache_v1';
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
      return { id: d.id, name, quantity, unit, unit_cost, expiration: exp, category };
    };

    const load = async () => {
      const cached = tryLoadCache();
      if (cached) { setItems(cached); return; }
      setLoading(true);
      try {
        const cols = ['consumables', 'medicines', 'equipment'];
        const snaps = await Promise.all(cols.map((c) => getDocs(collection(db, c))));
        const all = snaps.flatMap((snap, i) => snap.docs.map((d) => mapDoc(d, cols[i])));
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

  const lowStockCount = useMemo(() => items.filter((it) => it.quantity < threshold).length, [items]);
  const expiringSoonCount = useMemo(() => items.filter((it) => it.expiration && it.expiration <= in30 && it.expiration >= now).length, [items]);
  const totalValue = useMemo(() => items.reduce((sum, it) => sum + (Number(it.unit_cost || 0) * Number(it.quantity || 0)), 0), [items]);

  const alerts = useMemo(() => {
    return items.reduce((acc, it) => {
      const reasons = [];
      if (it.quantity < threshold) reasons.push(`Low Stock - ${it.quantity} ${it.unit}`);
      if (it.expiration && it.expiration <= in30 && it.expiration >= now) reasons.push(`Expiring Soon - ${it.expiration.toLocaleDateString('en-US')}`);
      if (reasons.length) acc.push({ item: it.name || '(Unnamed)', reason: reasons.join(' • '), category: it.category });
      return acc;
    }, []);
  }, [items]);

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

      // Build last 6 months window
      const months = [];
      const labels = [];
      const base = new Date();
      base.setDate(1);
      for (let i = 5; i >= 0; i--) {
        const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
        months.push({ y: d.getFullYear(), m: d.getMonth() });
        labels.push(d.toLocaleString('en-US', { month: 'short' }));
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
        stockOut.forEach((l) => {
          const dt = parseTs(l.timestamp);
          if (!dt || dt < start || dt >= end) return;
          const idx = (dt.getFullYear() - months[0].y) * 12 + (dt.getMonth() - months[0].m);
          if (idx < 0 || idx >= 6) return;
          const qty = Number(l.quantity || 0);
          const cat = (l.category || '').toLowerCase();
          if (cat.includes('consum')) buckets.consumables[idx] += qty;
          else if (cat.includes('med')) buckets.medicines[idx] += qty;
          else if (cat.includes('equip')) buckets.equipment[idx] += qty;
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
        {/* Header */}
        <header className="bg-white shadow-sm px-8 py-6 flex items-center justify-between border-b border-gray-200">
          <div>
            <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-3xl tracking-[0] leading-[normal] mb-1">
              DASHBOARD
            </h1>
            <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-sm tracking-[0] leading-[normal]">
              Welcome back, Dr. Johnson. Here's your clinic's inventory overview.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Input
                placeholder="Search inventory"
                className="w-96 h-14 bg-gray-50 rounded-full border border-gray-300 pl-6 pr-14 [font-family:'Oxygen',Helvetica] font-normal text-gray-700 text-sm focus:bg-white focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20"
              />
              <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            </div>

            <div className="relative">
              <BellIcon className="w-6 h-6 text-gray-600 hover:text-gray-800 cursor-pointer" />
              <Badge className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center p-0">
                <span className="[font-family:'Oxygen',Helvetica] font-normal text-white text-xs">
                  3
                </span>
              </Badge>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <img
                className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover"
                alt="Profile"
                src={profilePng}
              />
              <div>
                <div className="[font-family:'Inter',Helvetica] font-semibold text-gray-900 text-sm tracking-[0] leading-[normal]">
                  {lastName ? `Dr. ${lastName}` : 'Dr. Giselle'}
                </div>
                <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[normal]">
                  ADMINISTRATOR
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Content Area */}
  <div className="flex-1 px-8 py-6 overflow-y-auto" style={{backgroundColor: '#F5F5F5'}}>

          <div className="grid grid-cols-4 gap-4 mb-6">
            <LowStockItemsSection count={lowStockCount} />
            <StockAlertsSection count={expiringSoonCount} />
            <PendingOrdersSection count={0} />
            <InventoryOverviewSection totalValue={totalValue} />
          </div>

          <div className="grid grid-cols-3 gap-6 flex-1 min-h-0">
            <Card className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-6">
                <h2 className="[font-family:'Oxygen',Helvetica] font-bold text-gray-900 text-xl tracking-[0] leading-[normal] mb-4">
                  Monthly Usage Trend
                </h2>
                <div className="h-64">
                  <MonthlyUsageTrendSection series={trendSeries} months={trendMonths} />
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 mt-4 pt-4 border-t border-gray-100">
                  {chartLegendData.map((item, index) => (
                    <div
                      key={index}
                      className="inline-flex items-center gap-2"
                    >
                      <div className="relative w-3 h-3">
                        <div
                          className={`w-full h-0.5 ${item.color} absolute top-1/2 transform -translate-y-1/2`}
                        />
                        <div
                          className={`${item.color} w-2 h-2 rounded-full border border-white absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
                        />
                      </div>
                      <span className="[font-family:'Inter',Helvetica] font-normal text-gray-600 text-xs">
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white rounded-xl shadow-sm border border-gray-200">
              <CardContent className="p-0 h-full">
                <StockAlertsListSection alerts={alerts} />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};