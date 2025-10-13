import React, { useEffect, useState, useRef } from "react";
import { getDocs, collection, query as fq, where, orderBy } from "firebase/firestore";
import { db } from "../../firebase";
import { isPlaceholderDoc } from "../../lib/placeholders";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import BoxIcon from "../../assets/reports/tabler--currency-peso (1).png";
import PesoIcon from "../../assets/reports/Monthly Usage icon.png";

const palette = {
  blue: "#36D0B9",
  green: "#4BD564",
  cardBg1: "#D5F5E4",
  cardBg2: "#D2FFDA",
  tabBg: "#EDEDED",
  tabActive: "#FFFFFF",
  tabInactive: "#EDEDED",
};

const MONTHS = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];

// Project start date: reports must not include data before this date
// Update this if the project start year changes
const PROJECT_START_DATE = new Date(2025, 9, 1); // October 1, 2025

function monthNameToIndex(name) {
  if (!name) return 0;
  try {
    const m = String(name).toLowerCase().slice(0,3);
    const map = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
    return map[m] ?? 0;
  } catch (e) { return 0; }
}

function tsToDate(ts) {
  if (!ts) return null;
  try {
    if (typeof ts === 'number') return new Date(ts);
    if (ts.toDate && typeof ts.toDate === 'function') return ts.toDate();
    // Firestore sometimes stores serverTimestamp placeholders; if it's an object with seconds
    if (ts.seconds) return new Date(ts.seconds * 1000 + Math.floor((ts.nanoseconds||0)/1e6));
    // fallback: try to construct Date
    const d = new Date(ts);
    if (!isNaN(d.getTime())) return d;
  } catch (e) {}
  return null;
  }

  // AnimatedSelect: simple accessible select with smooth open/close animation
  function AnimatedSelect({ options = [], value, onChange, className = "" }) {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
      function onDoc(e) {
        if (!ref.current) return;
        if (!ref.current.contains(e.target)) setOpen(false);
      }
      function onKey(e) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("touchstart", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("touchstart", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none flex items-center justify-between"
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span>{value}</span>
        <svg className={`w-4 h-4 ml-3 transform transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div
        role="listbox"
        aria-hidden={!open}
        className={`absolute right-0 left-0 mt-2 z-50 bg-white rounded-lg shadow-lg overflow-hidden transform origin-top transition-all duration-200 ${open ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"}`}
      >
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => { onChange(opt); setOpen(false); }}
            className="w-full text-left px-5 py-3 hover:bg-gray-50"
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

export const ReportsModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  const [activeTab, setActiveTab] = useState("usage");
  // filter states for animated selects
  const [dateRange, setDateRange] = useState("Last 6 Months");
  const [category, setCategory] = useState("All Categories");
  const [customStart, setCustomStart] = useState("September");
  const [customEnd, setCustomEnd] = useState("September");
  const [totals, setTotals] = useState({ consumables: 0, medicine: 0, equipment: 0 });
  const [loadingTotals, setLoadingTotals] = useState(false);
  const [prevTotals, setPrevTotals] = useState({ consumables: 0, medicine: 0, equipment: 0 });
  const [totalsValue, setTotalsValue] = useState(0); // monetary totals (₱) based on stock_logs quantity * unit_cost
  const [prevTotalsValue, setPrevTotalsValue] = useState(0);
  const [refreshCounter, setRefreshCounter] = useState(0);
  const [rangeInventoryValue, setRangeInventoryValue] = useState(null);
  const [prevRangeInventoryValue, setPrevRangeInventoryValue] = useState(null);
  const [prevInventoryTotal, setPrevInventoryTotal] = useState(0);
  const [totalsByCategory, setTotalsByCategory] = useState({ consumables: 0, medicine: 0, equipment: 0 });
  const [prevTotalsByCategory, setPrevTotalsByCategory] = useState({ consumables: 0, medicine: 0, equipment: 0 });
  
  const [inventoryTotal, setInventoryTotal] = useState(0);
  const [loadingInventoryTotal, setLoadingInventoryTotal] = useState(false);
  const [inventoryQtyTotal, setInventoryQtyTotal] = useState(0);
  const [inventoryCategoryTotals, setInventoryCategoryTotals] = useState({
    consumables: { value: 0, qty: 0 },
    medicines: { value: 0, qty: 0 },
    equipment: { value: 0, qty: 0 },
  });
  // debug UI removed

  // caching helpers
  const TTL_MS = 5 * 60 * 1000; // 5 minutes cache
  const getCacheKey = (prefix, key) => `reports_cache:${prefix}:${key}`;
  const tryLoadCache = (key) => {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.at) return null;
      if (Date.now() - parsed.at > (parsed.ttl || TTL_MS)) return null;
      return parsed.value;
    } catch { return null; }
  };
  const saveCache = (key, value, ttl = TTL_MS) => {
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), ttl, value })); } catch {}
  };

  

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);

  // Listen for usage refresh events (dispatched after stock_out writes) and force reload
  useEffect(() => {
    function onUsageRefresh() {
      try {
        // clear any reports cache so next load recomputes fresh totals
        const keysToRemove = [];
        for (let i = 0; i < sessionStorage.length; i++) {
          const k = sessionStorage.key(i);
          if (typeof k === 'string' && k.startsWith('reports_cache:')) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => sessionStorage.removeItem(k));
      } catch (e) {
        // ignore
      }
      // bump counter to cause totals useEffect to re-run
      setRefreshCounter(c => c + 1);
    }
    window.addEventListener('usage:refresh', onUsageRefresh);
    return () => window.removeEventListener('usage:refresh', onUsageRefresh);
  }, []);

  // load consumption totals (stock_out quantities) from stock_logs
  useEffect(() => {
    let cancelled = false;
    async function loadTotals() {
      setLoadingTotals(true);
      try {
        // helper to match selected category to log/category strings
        const matchesSelectedCategory = (selected, itemCat) => {
          if (!selected || selected === 'All Categories') return true;
          if (!itemCat) return false;
          const s = String(selected).toLowerCase();
          const c = String(itemCat).toLowerCase();
          if (s.includes('suppl') || s.includes('consum')) return c.includes('consum') || c.includes('supply');
          if (s.includes('medic')) return c.includes('medic');
          if (s.includes('equip')) return c.includes('equip');
          return c.includes(s);
        };
        // compute date range based on selected filter
        const now = new Date();
        let startDate = new Date(0);
        let endDate = new Date();

        const monthNameToIndex = (name) => {
          const m = name.toLowerCase().slice(0,3);
          const map = { jan:0, feb:1, mar:2, apr:3, may:4, jun:5, jul:6, aug:7, sep:8, oct:9, nov:10, dec:11 };
          return map[m] ?? 0;
        };

        // compute end-of-current-month for consistent month-bucket windows
        const endOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        const endOfCurrentMonthInclusive = new Date(endOfCurrentMonth.getTime() - 1);

        if (dateRange === 'Last 6 Months') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          endDate = endOfCurrentMonthInclusive;
        } else if (dateRange === 'Last 12 Months') {
          startDate = new Date(now.getFullYear(), now.getMonth() - 11, 1);
          endDate = endOfCurrentMonthInclusive;
        } else if (dateRange === 'This Year') {
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = endOfCurrentMonthInclusive;
        } else {
          // default to last 6 months
          startDate = new Date(now.getFullYear(), now.getMonth() - 5, 1);
          endDate = endOfCurrentMonthInclusive;
        }

        // If custom months are provided, use them to form a month-range in the current year
        if (customStart && customEnd) {
          try {
            const y = now.getFullYear();
            const sIdx = monthNameToIndex(customStart);
            const eIdx = monthNameToIndex(customEnd);
            // If user selected a reversed range (start month after end month), consider it invalid
            if (sIdx > eIdx) {
              // set empty results: range before/invalid relative to project start -> no data
              if (!cancelled) {
                setTotals({ consumables: 0, medicine: 0, equipment: 0 });
                setTotalsValue(0);
                setTotalsByCategory({ consumables: 0, medicine: 0, equipment: 0 });
              }
              setLoadingTotals(false);
              return;
            }
            const s = sIdx;
            const e = eIdx;
            startDate = new Date(y, s, 1);
            // endDate: last millisecond of the end month
            endDate = new Date(y, e + 1, 1);
            endDate = new Date(endDate.getTime() - 1);
          } catch (e) {
            // ignore and keep previous range
          }
        }

        // Ensure the requested date range does not begin before the project start date
        if (startDate < PROJECT_START_DATE) startDate = new Date(PROJECT_START_DATE.getTime());
        if (endDate < PROJECT_START_DATE) endDate = new Date(PROJECT_START_DATE.getTime());

  // Build Firestore query: timestamp between startDate and endDate (inclusive)
  const rangeKey = `${dateRange}|${customStart}|${customEnd}|${category}`;
  const cacheKey = getCacheKey('totals', rangeKey);
  const cached = tryLoadCache(cacheKey);
  const cachedValue = tryLoadCache(getCacheKey('totals_value', rangeKey));
        let acc = { consumables: 0, medicine: 0, equipment: 0 };
        let accValue = { consumables: 0, medicine: 0, equipment: 0 };
        let snap;
        if (cached) {
          acc = cached;
          if (cachedValue) accValue = cachedValue;
          // If counts are cached but monetary totals are not, compute monetary totals now
          if (!cachedValue) {
            try {
              const colQuick = collection(db, 'stock_logs');
              try {
                const qQuick = fq(colQuick, where('timestamp', '>=', startDate), where('timestamp', '<=', endDate), orderBy('timestamp', 'desc'));
                const snapQuick = await getDocs(qQuick);
                snapQuick.forEach((doc) => {
                  const d = doc.data();
                  if (!d) return;
                  if (d.type !== 'stock_out') return;
                  const when = tsToDate(d.timestamp) || (d.timestamp_local ? new Date(Number(d.timestamp_local)) : null);
                  if (!when) return;
                  if (when < startDate || when > endDate) return;
                  const qty = Number(d.quantity) || 0;
                  const cost = parseNumber(d.unit_cost ?? d.unitCost ?? d.unit_price ?? d.unitPrice ?? d.price ?? 0);
                  const catRaw = d.category || d.type || d.kind || '';
                  const cat = String(catRaw || '').toLowerCase();
                  if (!matchesSelectedCategory(category, cat)) return;
                  const addTo = (key, q, v) => { accValue[key] += v; };
                  if (cat.includes('consum')) addTo('consumables', qty, qty * cost);
                  else if (cat.includes('medic')) addTo('medicine', qty, qty * cost);
                  else if (cat.includes('equip')) addTo('equipment', qty, qty * cost);
                  else {
                    if (cat === 'consumables' || cat === 'consumable' || cat.includes('supply')) addTo('consumables', qty, qty * cost);
                    else if (cat === 'medicine' || cat === 'medicines') addTo('medicine', qty, qty * cost);
                    else if (cat === 'equipment' || cat === 'equipments') addTo('equipment', qty, qty * cost);
                  }
                });
                // save computed monetary totals
                try { saveCache(getCacheKey('totals_value', rangeKey), accValue); } catch (e) {}
              } catch (errQuick) {
                // fallback to client-side full scan
                const allQuick = await getDocs(colQuick);
                const rowsQuick = allQuick.docs.filter(d => {
                  try {
                    const data = d.data() || {};
                    const when = tsToDate(data.timestamp) || (data.timestamp_local ? new Date(Number(data.timestamp_local)) : null);
                    if (!when) return false;
                    return when >= startDate && when <= endDate;
                  } catch { return false; }
                });
                rowsQuick.forEach((doc) => {
                  const d = doc.data();
                  if (!d) return;
                  if (d.type !== 'stock_out') return;
                  const qty = Number(d.quantity) || 0;
                  const cost = parseNumber(d.unit_cost ?? d.unitCost ?? d.unit_price ?? d.unitPrice ?? d.price ?? 0);
                  const catRaw = d.category || d.type || d.kind || '';
                  const cat = String(catRaw || '').toLowerCase();
                  if (!matchesSelectedCategory(category, cat)) return;
                  const addTo = (key, q, v) => { accValue[key] += v; };
                  if (cat.includes('consum')) addTo('consumables', qty, qty * cost);
                  else if (cat.includes('medic')) addTo('medicine', qty, qty * cost);
                  else if (cat.includes('equip')) addTo('equipment', qty, qty * cost);
                  else {
                    if (cat === 'consumables' || cat === 'consumable' || cat.includes('supply')) addTo('consumables', qty, qty * cost);
                    else if (cat === 'medicine' || cat === 'medicines') addTo('medicine', qty, qty * cost);
                    else if (cat === 'equipment' || cat === 'equipments') addTo('equipment', qty, qty * cost);
                  }
                });
                try { saveCache(getCacheKey('totals_value', rangeKey), accValue); } catch (e) {}
              }
            } catch (e) {
              // ignore compute failures
            }
          }
        } else {
          const col = collection(db, 'stock_logs');
          try {
            const q = fq(col, where('timestamp', '>=', startDate), where('timestamp', '<=', endDate), orderBy('timestamp', 'desc'));
            snap = await getDocs(q);
          } catch (err) {
            console.warn('Firestore range query failed (index?), falling back to client-side filter', err);
            const all = await getDocs(col);
            const rows = all.docs.filter(d => {
              try {
                const data = d.data() || {};
                const ts = data.timestamp;
                const when = tsToDate(ts) || (data.timestamp_local ? new Date(Number(data.timestamp_local)) : null);
                if (!when) return false;
                return when >= startDate && when <= endDate;
              } catch { return false; }
            });
            snap = { forEach: (fn) => rows.forEach(fn) };
          }
            if (snap) {
              snap.forEach((doc) => {
                const d = doc.data();
                if (!d) return;
                if (d.type !== 'stock_out') return;
                // determine timestamp (server Timestamp or local ms fallback)
                let when = tsToDate(d.timestamp) || (d.timestamp_local ? new Date(Number(d.timestamp_local)) : null);
                if (!when) return;
                if (when < startDate || when > endDate) return;
                const qty = Number(d.quantity) || 0;
                // parse unit cost if available; fallback to 0
                const cost = parseNumber(d.unit_cost ?? d.unitCost ?? d.unit_price ?? d.unitPrice ?? d.price ?? 0);
                const catRaw = d.category || d.type || d.kind || '';
                const cat = String(catRaw || '').toLowerCase();
                // apply category filter if set (skip if doesn't match)
                if (!matchesSelectedCategory(category, cat)) return;
                const addTo = (key, q, v) => { acc[key] += q; accValue[key] += v; };
                if (cat.includes('consum')) addTo('consumables', qty, qty * cost);
                else if (cat.includes('medic')) addTo('medicine', qty, qty * cost);
                else if (cat.includes('equip')) addTo('equipment', qty, qty * cost);
                else {
                  if (cat === 'consumables' || cat === 'consumable' || cat.includes('supply')) addTo('consumables', qty, qty * cost);
                  else if (cat === 'medicine' || cat === 'medicines') addTo('medicine', qty, qty * cost);
                  else if (cat === 'equipment' || cat === 'equipments') addTo('equipment', qty, qty * cost);
                }
              });
            }
          saveCache(cacheKey, acc);
          // cache monetary totals separately
          try { saveCache(getCacheKey('totals_value', rangeKey), accValue); } catch (e) {}
        }
        if (!cancelled) {
          setTotals(acc);
          const totalMoney = (accValue.consumables || 0) + (accValue.medicine || 0) + (accValue.equipment || 0);
          setTotalsValue(totalMoney);
          // populate per-category monetary totals for Cost Breakdown
          try { setTotalsByCategory({ consumables: accValue.consumables || 0, medicine: accValue.medicine || 0, equipment: accValue.equipment || 0 }); } catch (e) {}
          // Try to load cached range inventory in/out totals
          try {
              const cachedRange = tryLoadCache(getCacheKey('inventory_range_value', rangeKey));
              if (cachedRange && (cachedRange.in !== undefined || cachedRange.out !== undefined)) {
                setRangeInventoryValue((cachedRange.in || 0) - (cachedRange.out || 0));
              } else {
              // compute a light in/out scan (no strict indexing required)
              (async () => {
                try {
                  const colQ = collection(db, 'stock_logs');
                  const qQ = fq(colQ, where('timestamp', '>=', startDate), where('timestamp', '<=', endDate));
                  let snapQ;
                  try { snapQ = await getDocs(qQ); } catch (e) { snapQ = await getDocs(colQ); }
                  let inAcc = 0; let outAcc = 0;
                  snapQ.forEach((doc) => {
                    const d = doc.data();
                    if (!d) return;
                    const when = tsToDate(d.timestamp) || (d.timestamp_local ? new Date(Number(d.timestamp_local)) : null);
                    if (!when) return;
                    if (when < startDate || when > endDate) return;
                    const qty = Number(d.quantity) || 0;
                    const cost = parseNumber(d.unit_cost ?? d.unitCost ?? d.unit_price ?? d.unitPrice ?? d.price ?? 0);
                    if (d.type === 'stock_out') outAcc += qty * cost;
                    else if (d.type === 'stock_in' || d.is_restock) inAcc += qty * cost;
                  });
                  try { saveCache(getCacheKey('inventory_range_value', rangeKey), { in: inAcc, out: outAcc }); } catch (e) {}
                  setRangeInventoryValue(inAcc - outAcc);
                } catch (e) {}
              })();
            }
          } catch (e) {}
        }

        // compute previous period totals for percent change
        // previous range has same duration and ends just before startDate
        const prevEnd = new Date(startDate.getTime() - 1);
        const duration = endDate.getTime() - startDate.getTime();
        const prevStart = new Date(prevEnd.getTime() - duration + 1);
  const prevCacheKey = getCacheKey('totals_prev', rangeKey);
  const cachedPrev = tryLoadCache(prevCacheKey);
  const cachedPrevValue = tryLoadCache(getCacheKey('totals_value_prev', rangeKey));
        let prevAcc = { consumables: 0, medicine: 0, equipment: 0 };
        let prevAccValue = { consumables: 0, medicine: 0, equipment: 0 };
        if (cachedPrev) {
          prevAcc = cachedPrev;
          if (cachedPrevValue) prevAccValue = cachedPrevValue;
        } else {
          try {
            const col2 = collection(db, 'stock_logs');
            let snap2;
            try {
              const q2 = fq(col2, where('timestamp', '>=', prevStart), where('timestamp', '<=', prevEnd), orderBy('timestamp', 'desc'));
              snap2 = await getDocs(q2);
            } catch (err) {
              const all2 = await getDocs(col2);
              const rows2 = all2.docs.filter(d => {
                try {
                  const data = d.data() || {};
                  const ts = data.timestamp;
                  const when = tsToDate(ts) || (data.timestamp_local ? new Date(Number(data.timestamp_local)) : null);
                  if (!when) return false;
                  return when >= prevStart && when <= prevEnd;
                } catch { return false; }
              });
              snap2 = { forEach: (fn) => rows2.forEach(fn) };
            }
            if (snap2) {
              snap2.forEach((doc) => {
                const d = doc.data();
                if (!d) return;
                if (d.type !== 'stock_out') return;
                let when = tsToDate(d.timestamp) || (d.timestamp_local ? new Date(Number(d.timestamp_local)) : null);
                if (!when) return;
                if (when < prevStart || when > prevEnd) return;
                const qty = Number(d.quantity) || 0;
                const cost = parseNumber(d.unit_cost ?? d.unitCost ?? d.unit_price ?? d.unitPrice ?? d.price ?? 0);
                const catRaw2 = d.category || d.type || d.kind || '';
                const cat2 = String(catRaw2 || '').toLowerCase();
                if (!matchesSelectedCategory(category, cat2)) return;
                const addPrev = (key, q, v) => { prevAcc[key] += q; prevAccValue[key] += v; };
                if (cat2.includes('consum')) addPrev('consumables', qty, qty * cost);
                else if (cat2.includes('medic')) addPrev('medicine', qty, qty * cost);
                else if (cat2.includes('equip')) addPrev('equipment', qty, qty * cost);
                else {
                  if (cat2 === 'consumables' || cat2 === 'consumable' || cat2.includes('supply')) addPrev('consumables', qty, qty * cost);
                  else if (cat2 === 'medicine' || cat2 === 'medicines') addPrev('medicine', qty, qty * cost);
                  else if (cat2 === 'equipment' || cat2 === 'equipments') addPrev('equipment', qty, qty * cost);
                }
              });
            }
            saveCache(prevCacheKey, prevAcc);
            try { saveCache(getCacheKey('totals_value_prev', rangeKey), prevAccValue); } catch (e) {}
          } catch (e) { console.warn('Failed to load previous totals', e); }
        }
        if (!cancelled) {
          setPrevTotals(prevAcc);
          const prevMoney = (prevAccValue.consumables || 0) + (prevAccValue.medicine || 0) + (prevAccValue.equipment || 0);
          setPrevTotalsValue(prevMoney);
          try { setPrevTotalsByCategory({ consumables: prevAccValue.consumables || 0, medicine: prevAccValue.medicine || 0, equipment: prevAccValue.equipment || 0 }); } catch (e) {}
        }
      } catch (err) {
        console.error('Failed to load stock_logs totals', err);
      } finally {
        if (!cancelled) setLoadingTotals(false);
      }
    }
    loadTotals();
    return () => { cancelled = true; };
  }, [dateRange, customStart, customEnd, category, refreshCounter]);

  // compute total inventory value across categories (quantity * unit_cost)
  useEffect(() => {
    let cancelled = false;
    async function loadInventoryValue() {
      setLoadingInventoryTotal(true);
      try {
        // Alias map covers plural/singular possibilities
        const aliasMap = {
          consumables: ['consumables','consumable'],
          medicines: ['medicines','medicine'],
          equipment: ['equipment','equipments']
        };
        const normalize = (c) => {
          if (!c) return 'all';
          const s = c.toLowerCase();
          if (s.includes('consum')) return 'consumables';
          if (s.includes('medic')) return 'medicines';
          if (s.includes('equip')) return 'equipment';
          return 'all';
        };
        const selectedKey = normalize(category);
        const catsToProcess = selectedKey === 'all' ? Object.keys(aliasMap) : [selectedKey];
        const catTotals = { consumables: { value:0, qty:0 }, medicines: { value:0, qty:0 }, equipment: { value:0, qty:0 } };
        const debugCollections = [];

        // Fetch all needed collections (with aliases) sequentially to avoid Firestore concurrency limits (still few)
        for (const cat of catsToProcess) {
          for (const colName of aliasMap[cat]) {
            try {
              const snap = await getDocs(collection(db, colName));
              debugCollections.push({ col: colName, count: snap.size });
              snap.docs.filter(d => !isPlaceholderDoc(d.id, d.data())).forEach(doc => {
                const data = doc.data() || {};
                const qty = parseNumber(data.quantity ?? data.qty ?? data.quantity_value ?? data.stock ?? data.on_hand);
                const cost = parseNumber(data.unit_cost ?? data.unitCost ?? data.unit_price ?? data.unitPrice ?? data.price);
                catTotals[cat].qty += Number(qty || 0);
                catTotals[cat].value += (Number(qty || 0) * Number(cost || 0));
              });
            } catch (e) {
              debugCollections.push({ col: colName, error: true });
            }
          }
        }
        let displayValue = 0; let displayQty = 0;
        if (selectedKey === 'all') {
          displayValue = catTotals.consumables.value + catTotals.medicines.value + catTotals.equipment.value;
          displayQty = catTotals.consumables.qty + catTotals.medicines.qty + catTotals.equipment.qty;
        } else {
          displayValue = catTotals[selectedKey].value;
          displayQty = catTotals[selectedKey].qty;
        }
        if (!cancelled) {
          setInventoryCategoryTotals(catTotals);
          setInventoryTotal(displayValue);
          setInventoryQtyTotal(displayQty);
          // store computed breakdown internally
          // (no debug logging in production)
        }
      } catch (err) {
        console.error('Failed to load inventory value', err);
      } finally {
        if (!cancelled) setLoadingInventoryTotal(false);
      }
    }
    loadInventoryValue();
    return () => { cancelled = true; };
  }, [category]);

  // previous inventory total for percent change (store daily cache)
  useEffect(() => {
    try {
      const cacheKey = getCacheKey('inventory_total', 'latest');
      const cached = tryLoadCache(cacheKey);
      if (cached !== null && typeof cached === 'number') setPrevInventoryTotal(cached);
      // persist current inventory total as prev for next load
      const saveKey = getCacheKey('inventory_total', 'latest');
      saveCache(saveKey, inventoryTotal, 24 * 60 * 60 * 1000); // keep for 24h
    } catch (e) {}
  }, [inventoryTotal]);

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "#F5F5F5" }}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'} h-screen`}>
        <DashboardSidebarSection currentPage="REPORTS" />
      </div>

      {/* Main Content with vertical scroll */}
      <div className="flex-1 flex flex-col h-screen overflow-y-auto">
        {/* Header */}
        <AppHeader title="REPORTS" subtitle="" />

        {/* Main Content Body */}
        <div className="w-full max-w-[1440px] mx-auto px-8 flex flex-col gap-6">
          {/* debug UI removed */}
          {/* Filters */}
          {/* Filters */}
          <div className="mt-6 flex gap-8 items-center bg-white rounded-xl shadow p-6">
            <div className="flex-1">
              <label className="block text-base font-semibold text-black mb-2">Date Range</label>
              <AnimatedSelect
                options={["Last 6 Months", "Last 12 Months", "This Year"]}
                value={dateRange}
                onChange={setDateRange}
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label className="block text-base font-semibold text-black mb-2">Category</label>
              <AnimatedSelect
                options={["All Categories", "Consumables", "Medicine", "Equipment"]}
                value={category}
                onChange={setCategory}
                className="w-full"
              />
            </div>
            <div className="flex-1 flex flex-col">
              <label className="block text-base font-semibold text-black mb-2">Custom Date Range</label>
              <div className="flex gap-4">
                <div className="flex-1">
                  <MonthOnlyPicker
                    value={customStart}
                    onChange={setCustomStart}
                    className="w-full"
                  />
                </div>
                <div className="flex-1">
                  <MonthOnlyPicker
                    value={customEnd}
                    onChange={setCustomEnd}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
            {/* recompute button removed */}
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-2 gap-8">
            <div
              className="rounded-xl p-8 flex items-center gap-8 shadow"
              style={{
                background: palette.cardBg1,
                border: `2px solid ${palette.blue}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex-1">
                <div className="text-base text-gray-700 font-semibold mb-2">Total Inventory Value</div>
                <div className="text-4xl font-bold text-black mb-1">
                  {loadingInventoryTotal ? (
                    'Loading…'
                  ) : (
                    `₱${inventoryTotal.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                  )}
                </div>
                {/* percent change placeholder removed per request */}
                
              </div>
              <img src={BoxIcon} alt="Monthly Usage icon" className="w-12 h-12 mr-2" />
            </div>
            
            <div
              className="rounded-xl p-8 flex items-center gap-8 shadow"
              style={{
                background: palette.cardBg2,
                border: `2px solid ${palette.green}`,
                boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
              }}
            >
              <div className="flex-1">
                <div className="text-base text-gray-700 font-semibold mb-2">Monthly Usage</div>
                <div className="text-4xl font-bold text-black mb-1">{
                  (() => {
                    const money = totalsValue || 0;
                    return `₱${Number(money).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
                  })()
                }</div>
                {/* percent change placeholder removed per request */}
              </div>
              <img src={PesoIcon} alt="Peso" className="w-12 h-12 mr-2" />
            </div>
          </div>

          {/* Tab Bar */}
          <div className="flex rounded-xl bg-[#EDEDED] p-3 gap-4 mt-2 mb-2">
            <button
              className={`flex-1 h-14 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "usage"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-[#EDEDED] text-gray-700"}`}
              onClick={() => setActiveTab("usage")}
              style={{
                border: activeTab === "usage" ? "none" : "none",
                boxShadow: activeTab === "usage" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
              }}
            >
              Usage Trends
            </button>
            <button
              className={`flex-1 h-14 text-lg rounded-xl font-medium transition-all duration-150
                ${activeTab === "cost"
                  ? "bg-white text-gray-900 shadow"
                  : "bg-[#EDEDED] text-gray-700"}`}
              onClick={() => setActiveTab("cost")}
              style={{
                border: activeTab === "cost" ? "none" : "none",
                boxShadow: activeTab === "cost" ? "0 2px 8px rgba(0,0,0,0.04)" : "none",
              }}
            >
              Cost Analysis
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 w-full">
            {activeTab === "usage" ? (
              <div className="bg-white rounded-xl shadow border p-8 mt-4">
                <div className="font-bold text-2xl mb-6">Monthly Consumption Trends</div>
                <div className="text-gray-700 mb-2" />
                <div className="text-2xl font-semibold mb-6">{totals.consumables + totals.medicine + totals.equipment}</div>
                {/* Usage Trends Bar Chart - categories: consumables, medicine, equipment */}
                <div className="flex flex-col gap-6 mt-8">
                  {[
                    { label: 'Consumables', key: 'consumables', color: '#16D280' },
                    { label: 'Medicine', key: 'medicine', color: '#049FFF' },
                    { label: 'Equipment', key: 'equipment', color: '#F7C710' },
                  ].map((c) => {
                    const value = totals[c.key] || 0;
                    // compute percent width (avoid div by zero)
                    const totalSum = Math.max(1, totals.consumables + totals.medicine + totals.equipment);
                    const pct = Math.round((value / totalSum) * 100);
                    return (
                      <div key={c.key} className="flex items-center gap-6">
                        <span className="w-48 text-base text-gray-700">{c.label}</span>
                        <div className="flex-1 h-8 bg-gray-100 rounded-lg relative">
                          <div
                            className="h-8 rounded-lg"
                            style={{
                              width: `${pct}%`,
                              background: c.color,
                              transition: 'width 0.6s ease'
                            }}
                          ></div>
                          <span className="absolute right-6 top-2 text-sm text-gray-600">{value}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-8 mt-4">
                {/* Cost Distribution Pie (placeholder) */}
                <div className="bg-white rounded-xl shadow border p-8">
                  <div className="font-bold text-2xl mb-6">Cost Distribution</div>
                    <div className="flex flex-col items-center">
                      <PieChart
                        size={260}
                        data={[
                          { key: 'consumables', label: 'Consumables', value: totalsByCategory.consumables || 0, color: '#049FFF' },
                          { key: 'medicine', label: 'Medicine', value: totalsByCategory.medicine || 0, color: '#16D280' },
                          { key: 'equipment', label: 'Equipment', value: totalsByCategory.equipment || 0, color: '#F7C710' },
                        ]}
                      />
                      <div className="mt-6 grid grid-cols-3 gap-4 w-full px-6">
                        {[
                          { key: 'consumables', label: 'Consumables', color: '#049FFF' },
                          { key: 'medicine', label: 'Medicine', color: '#16D280' },
                          { key: 'equipment', label: 'Equipment', color: '#F7C710' },
                        ].map((it) => {
                          const val = totalsByCategory[it.key] || 0;
                          const totalSum = (totalsByCategory.consumables || 0) + (totalsByCategory.medicine || 0) + (totalsByCategory.equipment || 0) || 1;
                          const pct = Math.round((val / totalSum) * 100);
                          return (
                            <div key={it.key} className="flex items-center gap-3">
                              <span className="inline-block w-3 h-3 rounded-full" style={{ background: it.color }}></span>
                              <div className="text-sm text-gray-700">{it.label} • <span className="font-semibold">{pct}%</span></div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                </div>
                {/* Cost Breakdown */}
                <div className="bg-white rounded-xl shadow border p-8">
                  <div className="font-bold text-2xl mb-6">Cost Breakdown</div>
                    <div className="space-y-6">
                      {[
                        { key: 'consumables', label: 'Consumables', color: '#049FFF' },
                        { key: 'medicine', label: 'Medicine', color: '#16D280' },
                        { key: 'equipment', label: 'Equipment', color: '#F7F710' },
                      ].map((item) => {
                        const money = totalsByCategory[item.key] || 0;
                        const units = totals[item.key] || 0;
                        const totalAll = (totalsByCategory.consumables || 0) + (totalsByCategory.medicine || 0) + (totalsByCategory.equipment || 0) || 1;
                        const pct = Math.round((money / totalAll) * 100);
                        const prev = prevTotalsByCategory[item.key] || 0;
                        let changeLabel = '0%';
                        if (!prev && !money) changeLabel = '0%';
                        else if (!prev && money) changeLabel = 'New since last month';
                        else {
                          let ch = ((money - prev) / Math.abs(prev)) * 100;
                          if (!isFinite(ch) || Math.abs(ch) > 9999) changeLabel = '>9999%';
                          else changeLabel = `${ch > 0 ? '+' : ''}${ch.toFixed(1)}%`;
                        }
                        return (
                          <div key={item.key} className="flex items-center gap-4 bg-[#F3FBFB] rounded-xl px-8 py-6">
                            <span className="inline-block w-4 h-4 rounded-full" style={{ background: item.color }}></span>
                            <span className="text-base font-medium text-gray-900 flex-1">{item.label}</span>
                            <div className="text-right">
                              <div className="text-xl font-bold text-gray-900">{`₱${Number(money || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}</div>
                              <div className="text-sm text-gray-500">{units} units • {pct}% • {changeLabel}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function parseNumber(v) {
  if (v === null || v === undefined) return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    // remove commas and common currency symbols, then extract first number
    const cleaned = v.replace(/[,\s]/g, '');
    const m = cleaned.match(/-?\d+(?:\.\d+)?/);
    return m ? Number(m[0]) : 0;
  }
  try {
    return Number(v) || 0;
  } catch { return 0; }
}

// Simple SVG PieChart component: expects data = [{ key, label, value, color }]
function PieChart({ data = [], size = 200, innerRadius = 40, duration = 400 }) {
  // animate slice transitions by interpolating numeric values
  const [animValues, setAnimValues] = useState(() => data.map(d => Number(d.value) || 0));
  const rafRef = useRef(null);
  const prevRef = useRef(data.map(d => Number(d.value) || 0));

  useEffect(() => {
    const from = prevRef.current.slice();
    const to = data.map(d => Number(d.value) || 0);
    // if identical, just set and return
    let same = true;
    if (from.length !== to.length) same = false;
    else for (let i=0;i<to.length;i++) if (from[i] !== to[i]) { same = false; break; }
    if (same) {
      prevRef.current = to.slice();
      setAnimValues(to.slice());
      return;
    }

    const start = performance.now();
    const dur = Math.max(50, duration);

    function ease(t) { return 1 - Math.pow(1 - t, 3); } // easeOutCubic

    function step(now) {
      const t = Math.min(1, (now - start) / dur);
      const e = ease(t);
      const cur = to.map((v, i) => from[i] + (v - (from[i]||0)) * e);
      setAnimValues(cur);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        prevRef.current = to.slice();
        rafRef.current = null;
      }
    }
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [data, duration]);

  const total = animValues.reduce((s, n) => s + (Number(n) || 0), 0);
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;

  const deg2rad = (deg) => (deg * Math.PI) / 180;
  const polarToCartesian = (cx, cy, r, angleDeg) => {
    const a = deg2rad(angleDeg - 90);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };

  const describeArc = (cx, cy, r, startAngle, endAngle) => {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
    return ['M', cx, cy, 'L', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y, 'Z'].join(' ');
  };

  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="block">
      {total <= 0 ? (
        <g>
          <circle cx={cx} cy={cy} r={r - 2} fill="#F3F4F6" />
          <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fill="#9CA3AF" fontSize={12}>No data</text>
        </g>
      ) : (
        (() => {
          // build slice geometry first so we can also place labels
          const slices = [];
          let running = 0;
          const totalSafe = total || 1;
          for (let i = 0; i < data.length; i++) {
            const val = Number(animValues[i] || 0);
            const startAngle = (running / totalSafe) * 360;
            running += val;
            const endAngle = (running / totalSafe) * 360;
            slices.push({
              key: data[i].key || i,
              color: data[i].color,
              startAngle,
              endAngle,
              value: val,
              label: data[i].label || data[i].key || ''
            });
          }
          // helper to decide label color for contrast
          const textColorFor = (hex) => {
            try {
              const h = (hex || '#000').replace('#','');
              const r = parseInt(h.slice(0,2),16);
              const g = parseInt(h.slice(2,4),16);
              const b = parseInt(h.slice(4,6),16);
              const lum = (r*299 + g*587 + b*114) / 1000;
              return lum > 150 ? '#111827' : '#ffffff';
            } catch { return '#fff'; }
          };
          return (
            <g>
              {slices.map((s, i) => {
                const span = s.endAngle - s.startAngle;
                // if slice essentially covers full circle, render a circle element instead of an arc path
                if (span >= 359.9) {
                  return <circle key={`p-full-${s.key}-${i}`} cx={cx} cy={cy} r={r - 2} fill={s.color} stroke="#fff" strokeWidth="1" />;
                }
                const pathD = describeArc(cx, cy, r - 2, s.startAngle, s.endAngle);
                return <path key={`p-${s.key}-${i}`} d={pathD} fill={s.color || '#fff'} stroke="#fff" strokeWidth="1" style={{ transition: 'opacity 200ms' }} />;
              })}
              {slices.map((s, i) => {
                if (!s.value) return null;
                const mid = (s.startAngle + s.endAngle) / 2;
                const labelR = r * 0.62;
                const pos = polarToCartesian(cx, cy, labelR, mid);
                const pct = Math.round((s.value / (total || 1)) * 100);
                // avoid clutter for extremely small slices
                if ((s.endAngle - s.startAngle) < 6) return null;
                return (
                  <text
                    key={`t-${s.key}-${i}`}
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={12}
                    fill="#111827"
                    style={{ pointerEvents: 'none', fontWeight: 600 }}
                  >
                    {`${s.label} - ${pct}%`}
                  </text>
                );
              })}
            </g>
          );
        })()
      )}
      {/* center label intentionally removed to match design (no currency number in middle) */}
    </svg>
  );
}

// MonthPicker: compact grid of months in a popover to avoid a long dropdown
function MonthPicker({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function onDoc(e) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('touchstart', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="w-full text-left rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none flex items-center justify-between"
      >
        <span>{value}</span>
        <svg className={`w-4 h-4 ml-3 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div className={`absolute right-0 mt-2 z-50 bg-white rounded-lg shadow-lg overflow-hidden transform origin-top transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{ width: 240 }}>
        <div className="p-3">
          <div className="grid grid-cols-3 gap-2">
            {MONTHS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { onChange(m); setOpen(false); }}
                className={`block px-2 py-2 rounded-md text-sm text-center w-full whitespace-normal ${m === value ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// DatePicker: calendar popover that lets user pick a specific date (returns string like "October 9, 2025")
function DatePicker({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = new Date();

  // derive selected date from value if it starts with a month name
  const parseSelected = () => {
    if (!value) return null;
    try {
      const d = new Date(value);
      if (!isNaN(d.getTime())) return d;
    } catch {}
    // fallback: try to parse when value starts with month name like 'October'
    try {
      const parts = value.split(' ');
      const m = parts[0];
      const day = parts[1] ? parseInt(parts[1].replace(',',''),10) : 1;
      const yr = parts[2] ? parseInt(parts[2],10) : today.getFullYear();
      const mi = monthNameToIndex(m);
      return new Date(yr, mi, day);
    } catch { return null; }
  };

  const initialSelected = parseSelected();
  const [shown, setShown] = useState(() => initialSelected ? new Date(initialSelected.getFullYear(), initialSelected.getMonth(), 1) : new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(initialSelected);

  useEffect(() => {
    function onDoc(e) { if (!ref.current) return; if (!ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => { // update selected when external value changes
    const s = parseSelected();
    setSelected(s);
    if (s) setShown(new Date(s.getFullYear(), s.getMonth(), 1));
  }, [value]);

  const startOfMonth = (d) => new Date(d.getFullYear(), d.getMonth(), 1);
  const endOfMonth = (d) => new Date(d.getFullYear(), d.getMonth()+1, 0);

  const weeks = (() => {
    const first = startOfMonth(shown);
    const last = endOfMonth(shown);
    const days = [];
    // find start day of calendar (Sunday)
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay());
    for (let i = 0; i < 42; i++) {
      const dd = new Date(start);
      dd.setDate(start.getDate() + i);
      days.push(dd);
    }
    return days;
  })();

  const fmt = (d) => {
    if (!d) return '';
    return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="w-full text-left rounded-lg border border-[#E0E0E0] px-5 py-3 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none flex items-center justify-between"
      >
        <span>{value || fmt(selected) || 'Select date'}</span>
        <svg className={`w-4 h-4 ml-3 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div className={`absolute right-0 mt-2 z-50 bg-white rounded-lg shadow-lg overflow-hidden transform origin-top transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{ width: 300 }}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth()-1, 1))} className="px-2 py-1 rounded hover:bg-gray-100">◀</button>
              <div className="font-semibold">{shown.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</div>
              <button type="button" onClick={() => setShown(new Date(shown.getFullYear(), shown.getMonth()+1, 1))} className="px-2 py-1 rounded hover:bg-gray-100">▶</button>
            </div>
            <div className="text-sm text-gray-500">{selected ? fmt(selected) : ''}</div>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 mb-1">
            {['S','M','T','W','T','F','S'].map(d => <div key={d} className="py-1">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {weeks.map((d, i) => {
              const isCurrentMonth = d.getMonth() === shown.getMonth();
              const isToday = d.toDateString() === (new Date()).toDateString();
              const isSelected = selected && d.toDateString() === selected.toDateString();
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setSelected(new Date(d));
                    setOpen(false);
                    const s = `${d.toLocaleDateString(undefined, { month: 'long' })} ${d.getDate()}, ${d.getFullYear()}`;
                    onChange && onChange(s);
                  }}
                  className={`py-2 rounded text-sm ${isCurrentMonth ? 'text-gray-800' : 'text-gray-400'} ${isSelected ? 'bg-blue-500 text-white' : ''} ${isToday && !isSelected ? 'ring-1 ring-blue-200' : ''}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

// MonthOnlyPicker: shows a month grid with year navigation, returns strings like "October 2025"
function MonthOnlyPicker({ value, onChange, className = "" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const today = new Date();

  // parse incoming value like 'October 2025' or just 'October'
  const parse = (v) => {
    if (!v) return null;
    const str = String(v).trim();
    const m = str.match(/^[A-Za-z]+/);
    const y = str.match(/(\d{4})$/);
    const mi = m ? monthNameToIndex(m[0]) : 0;
    const yr = y ? Number(y[1]) : today.getFullYear();
    return { mi, yr };
  };

  const parsed = parse(value);
  const [shownYear, setShownYear] = useState(parsed ? parsed.yr : today.getFullYear());

  useEffect(() => {
    function onDoc(e) { if (!ref.current) return; if (!ref.current.contains(e.target)) setOpen(false); }
    function onKey(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('touchstart', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('touchstart', onDoc); document.removeEventListener('keydown', onKey); };
  }, []);

  useEffect(() => {
    const p = parse(value);
    if (p) setShownYear(p.yr);
  }, [value]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(s => !s)}
        className="w-full text-left rounded-lg border border-[#E0E0E0] px-3 py-2 text-base bg-[#F5F5F5] text-gray-700 focus:outline-none flex items-center justify-between"
      >
        <div className="flex-1 text-left">
          {value ? (
            <div className="leading-tight">
              <div className="font-semibold text-sm">{String(value).split(' ')[0]}</div>
              <div className="text-xs text-gray-500">{String(value).split(' ').slice(1).join(' ')}</div>
            </div>
          ) : (
            <div className="leading-tight">
              <div className="font-semibold text-sm">{MONTHS[(new Date()).getMonth()]}</div>
              <div className="text-xs text-gray-500">{shownYear}</div>
            </div>
          )}
        </div>
        <svg className={`w-4 h-4 ml-3 transform transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6 8l4 4 4-4" stroke="#333" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
      </button>

      <div className={`absolute right-0 mt-2 z-50 bg-white rounded-lg shadow-lg overflow-hidden transform origin-top transition-all duration-150 ${open ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'}`} style={{ width: 260 }}>
        <div className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => setShownYear(y => y - 1)} className="px-2 py-1 rounded hover:bg-gray-100">◀</button>
              <div className="font-semibold">{shownYear}</div>
              <button type="button" onClick={() => setShownYear(y => y + 1)} className="px-2 py-1 rounded hover:bg-gray-100">▶</button>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {MONTHS.map((m, i) => (
              <button
                key={m}
                type="button"
                onClick={() => { onChange && onChange(`${m} ${shownYear}`); setOpen(false); }}
                className={`h-10 flex items-center justify-center rounded-md text-sm w-full px-2 ${value === `${m} ${shownYear}` ? 'bg-gray-100 font-semibold' : 'hover:bg-gray-50'}`}
                title={m}
              >
                <span className="truncate block w-full text-center">{m}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}