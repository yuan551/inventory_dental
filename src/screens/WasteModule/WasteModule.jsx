import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Search as SearchIcon } from "lucide-react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import { db } from "../../firebase";
import { collection, addDoc, onSnapshot, query, orderBy, updateDoc, doc, serverTimestamp, getDocs, where } from "firebase/firestore";

// icons (swapped from emoji to project's asset icons)
import TotalWasteIcon from '../../assets/Waste and Disposal/Total Waste Items.png';
import PendingDisposalIcon from '../../assets/Waste and Disposal/Pending Disposal.png';
import ThisMonthIcon from '../../assets/Waste and Disposal/This Month.png';
import TotalValueLostIcon from '../../assets/Waste and Disposal/Total Value Lost.png';
import LogIcon from '../../assets/Waste and Disposal/Waste & Disposal Log.png';

const STORAGE_KEY = "wasteItems_v1";

const sampleItems = [
  // Reasons limited to: Expired, Damaged, Disposed (map older values to these)
  { id: 'wst-1', name: 'Lidocaine 2% WST001', quantity: '5 Vials', reason: 'Expired', disposalDate: '09/20/2024', valueLost: 42.5, status: 'Disposed', notes: '' },
  { id: 'wst-2', name: 'Latex Gloves (Large) WST002', quantity: '2 boxes', reason: 'Damaged', disposalDate: '09/18/2024', valueLost: 5.0, status: 'Disposed', notes: '' },
  { id: 'wst-3', name: 'Articaine 4% WST004', quantity: '3 cartridges', reason: 'Expired', disposalDate: '', valueLost: 38.4, status: 'Pending Disposal', notes: '' },
  { id: 'wst-4', name: 'Cotton Rolls WST005', quantity: '1 pack', reason: 'Damaged', disposalDate: '09/11/2024', valueLost: 4.5, status: 'Disposed', notes: '' },
  { id: 'wst-5', name: 'Syringe 5ml WST006', quantity: '10 pcs', reason: 'Damaged', disposalDate: '09/02/2024', valueLost: 10.0, status: 'Disposed', notes: '' }
];

  const ReasonBadge = ({ reason }) => {
  // Tag styles: only three reason categories supported (Expired, Damaged, Disposed)
  const map = {
    Expired: 'bg-red-100 text-red-600 border border-red-200',
    Damaged: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    Disposed: 'bg-green-100 text-green-700 border border-green-200'
  };
  // default to Damaged if unknown to keep rows visible in yellow
  const cls = map[reason] || map['Damaged'];
  return <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${cls}`}>{reason}</span>;
};

  const StatusBadge = ({ status }) => {
  // Display shorter labels and pills with matching palette
  const label = status === 'Pending Disposal' ? 'Pending' : status === 'Disposed' ? 'Disposed' : status;
  const map = {
    Pending: 'bg-yellow-100 text-yellow-700 border border-yellow-200',
    Disposed: 'bg-green-100 text-green-700 border border-green-200',
    Rejected: 'bg-red-100 text-red-600 border border-red-200'
  };
  const cls = map[label] || 'bg-gray-100 text-gray-700 border border-gray-200';
  return <span className={`inline-block px-3 py-1 rounded-full text-sm ${cls}`}>{label}</span>;
};

export const WasteModule = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });

  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);

  const [items, setItems] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return sampleItems;
      const parsed = JSON.parse(raw);
      // Normalize reason values to the supported set: Expired, Damaged, Disposed
      const allowed = new Set(['Expired', 'Damaged', 'Disposed']);
      const normalized = parsed.map((it) => {
        const r = (it.reason || '').toString();
        return { ...it, reason: allowed.has(r) ? r : 'Damaged' };
      });
      return normalized;
    } catch { return sampleItems; }
  });

  // Persist locally to storage for offline UX
  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} }, [items]);

  // Firestore integration: subscribe to `waste_items` collection and keep local state in sync.
  useEffect(() => {
    try {
      const col = collection(db, 'waste_items');
      const q = query(col, orderBy('created_at', 'desc'));
      const unsub = onSnapshot(q, (snap) => {
        const arr = [];
        snap.forEach((s) => {
          const d = s.data();
          if (s.id === 'dummy' || d?.placeholder) return;
          arr.push({ id: s.id, ...d });
        });
        if (arr.length > 0) {
          setItems(arr.map(it => ({
            id: it.id,
            name: it.name || it.item || '',
            quantity: String(it.quantity || ''),
            reason: it.reason || 'Damaged',
            disposalDate: it.disposalDate || '',
            valueLost: Number(it.valueLost) || 0,
            status: it.status || 'Pending Disposal',
            notes: it.notes || []
          })));
        }
      });
      return () => unsub();
    } catch (e) {
      // Firestore not configured or permission denied — keep using local state
      return () => {};
    }
  }, []);

  const [form, setForm] = useState({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All items');
  const [openStatusMenu, setOpenStatusMenu] = useState(null);
  // Notes modal state
  const [notesOpen, setNotesOpen] = useState(false);
  const [notesItemId, setNotesItemId] = useState(null);
  const [notesList, setNotesList] = useState([]);
  const [newNoteText, setNewNoteText] = useState('');

  const stats = useMemo(() => {
  const total = items.length;
    const pending = items.filter(i => i.status === 'Pending Disposal').length;
    const now = new Date();
    const monthCount = items.filter(it => {
      if (!it.disposalDate) return false;
      const d = new Date(it.disposalDate);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const valueLost = items.reduce((s, it) => s + (Number(it.valueLost) || 0), 0);
    return { total, pending, monthCount, valueLost };
  }, [items]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    // Quantity: accept only numbers (no letters/symbols)
    if (name === 'quantity') {
      const sanitized = value.replace(/[^0-9]/g, '');
      setForm(prev => ({ ...prev, quantity: sanitized }));
      return;
    }

    // Disposal date: when coming from <input type="date"/> value will be yyyy-mm-dd, convert to MM/DD/YYYY
    if (name === 'disposalDate') {
      if (!value) {
        setForm(prev => ({ ...prev, disposalDate: '' }));
        return;
      }
      // value expected in yyyy-mm-dd
      const parts = value.split('-');
      if (parts.length === 3) {
        const mmddyyyy = `${parts[1].padStart(2, '0')}/${parts[2].padStart(2, '0')}/${parts[0]}`;
        setForm(prev => ({ ...prev, disposalDate: mmddyyyy }));
        return;
      }
      setForm(prev => ({ ...prev, disposalDate: value }));
      return;
    }

    setForm(prev => ({ ...prev, [name]: value }));
  };

  const historyDates = useMemo(() => {
    const set = new Set();
    items.forEach(it => { if (it.disposalDate) set.add(it.disposalDate); });
    return Array.from(set).sort((a,b) => new Date(b) - new Date(a));
  }, [items]);

  // Simple MM/DD/YYYY date format validator
  const isValidDateFormat = (d) => /^(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/\d{4}$/.test(d);

  const addItem = (e) => {
    e.preventDefault();
    setError('');

    // Required fields: name, quantity, reason, disposalDate (assumption)
    if (!form.name.trim() || !form.quantity || !form.reason || !form.disposalDate) {
      setError('Please complete all required fields.');
      return;
    }

    // Quantity must be numeric and > 0
    const qty = Number(form.quantity);
    if (Number.isNaN(qty) || qty <= 0) {
      setError('Quantity must be a number greater than zero.');
      return;
    }

    // Date format check MM/DD/YYYY
    if (!isValidDateFormat(form.disposalDate)) {
      setError('Please enter a valid date in MM/DD/YYYY format.');
      return;
    }

  // default reason to 'Damaged' if user doesn't pick one (we only support three reasons)
  (async () => {
    const payloadBase = {
      name: form.name,
      quantity: String(qty),
      reason: form.reason || 'Damaged',
      disposalDate: form.disposalDate || '',
      valueLost: Number(form.valueLost) || 0,
      status: 'Pending Disposal',
      notes: form.notes ? [{ text: form.notes, created_at: new Date().toISOString() }] : [],
      created_at: serverTimestamp()
    };

    // Try to find a matching inventory item across categories to decrement quantity and compute valueLost
    const cols = ['consumables', 'medicines', 'equipment'];
    let matched = null;
    for (const colName of cols) {
      try {
        // try matching by item_name or item fields
        const q1 = query(collection(db, colName), where('item_name', '==', form.name));
        let snap = await getDocs(q1);
        if (snap.empty) {
          const q2 = query(collection(db, colName), where('item', '==', form.name));
          snap = await getDocs(q2);
        }
        if (!snap.empty) {
          const docSnap = snap.docs[0];
          const d = docSnap.data() || {};
          matched = { col: colName, id: docSnap.id, data: d };
          break;
        }
      } catch (e) {
        console.warn('Failed searching inventory for waste match in', colName, e);
      }
    }

    let finalPayload = { ...payloadBase };
    // If no inventory match found, block the add and show validation error
    if (!matched) {
      setError('Item not found in inventory. Please enter an exact existing item name.');
      return;
    }
    // If matched, compute valueLost and decrement inventory
    if (matched) {
      try {
        // read numeric current quantity
        let curQty = 0;
        try {
          if (typeof matched.data.quantity === 'number') curQty = Number(matched.data.quantity || 0);
          else if (typeof matched.data.quantity === 'string') {
            const m = /^\s*(\d+)/.exec(matched.data.quantity || '0');
            curQty = m ? Number(m[1]) : 0;
          }
        } catch (e) { curQty = 0; }

        // parse unit cost from various fields
        const parsePossibleCost = (v) => {
          try {
            if (v === null || v === undefined) return 0;
            if (typeof v === 'number') return v;
            if (typeof v === 'string') {
              const cleaned = v.replace(/[^0-9.\-]/g, '');
              const m = cleaned.match(/-?\d+(?:\.\d+)?/);
              return m ? Number(m[0]) : 0;
            }
            return Number(v) || 0;
          } catch (e) { return 0; }
        };

        const unitCost = parsePossibleCost(matched.data.unit_cost ?? matched.data.unitCost ?? matched.data.unitPrice ?? matched.data.price ?? 0);
        const unitLabel = (matched.data.units || matched.data.unit || 'boxes');
        const removeQty = Math.min(curQty, qty);
        const newQty = Math.max(0, curQty - removeQty);

        // compute value lost
        const loss = unitCost * removeQty;
        finalPayload = { ...payloadBase, quantity: `${removeQty}`, valueLost: loss };

        // Persist inventory decrement
        try {
          const docRef = doc(db, matched.col, matched.id);
          // update numeric quantity field in firestore
          await updateDoc(docRef, { quantity: newQty });
        } catch (e) { console.warn('Failed to update inventory quantity for waste', e); }

        // Update sessionStorage cache for the category if present so inventory table updates immediately
        try {
          const cacheKey = `${matched.col}_cache_v1`;
          const raw = sessionStorage.getItem(cacheKey);
          if (raw) {
            const parsed = JSON.parse(raw);
            const rows = (parsed.rows || []).map(r => r._id === matched.id ? { ...r, quantity: `${newQty} ${unitLabel}`, status: newQty <= 20 ? 'Critical' : newQty <= 60 ? 'Low Stock' : 'In Stock' } : r);
            sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), rows }));
          }
        } catch (e) { /* non-critical */ }

        // Notify other parts of app to refresh usage/dashboard
        try { window.dispatchEvent(new CustomEvent('usage:refresh')); } catch (e) {}

      } catch (e) { console.warn('Failed computing/decrementing matched inventory', e); }
    }

    // Use unit label if matched to append to displayed quantity
    if (matched) {
      finalPayload.quantity = `${finalPayload.quantity} ${matched.data.units || matched.data.unit || 'boxes'}`;
    } else {
      finalPayload.quantity = `${finalPayload.quantity} boxes`;
    }

    // Optimistic local update for snappy UI
    const localId = `wst-${Date.now()}`;
    const newItem = { id: localId, ...finalPayload, notes: finalPayload.notes };
    setItems(prev => [newItem, ...prev]);
    setForm({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
    setError('');

    // Try to persist to Firestore; if it fails, we keep the local state so the UI still works offline
    try {
      const col = collection(db, 'waste_items');
      const ref = await addDoc(col, finalPayload);
      // Replace the optimistic local id with the server id when available
      setItems(prev => prev.map(it => it.id === localId ? { ...it, id: ref.id } : it));
    } catch (err) {
      console.warn('Failed to save waste item to Firestore:', err);
    }
  })();
  };

  const updateStatus = (id, status) => setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));

  // Dropdown portal position for status menu
  const [dropdownStyle, setDropdownStyle] = useState(null);

  const handleToggleStatus = (e, it) => {
    try {
      // If already open for this id, close it
      if (openStatusMenu === it.id) {
        setOpenStatusMenu(null);
        setDropdownStyle(null);
        return;
      }

      const el = e.currentTarget || e.target;
      const rect = el.getBoundingClientRect();
      const dropdownWidth = 160; // px
      const gap = 6;
      let left = Math.round(rect.right - dropdownWidth);
      if (left < 8) left = Math.round(rect.left);
      const top = Math.round(rect.bottom + gap);
      setDropdownStyle({ top: `${top}px`, left: `${left}px`, minWidth: `${dropdownWidth}px` });
      setOpenStatusMenu(it.id);
    } catch (err) {
      // fallback: just toggle
      setOpenStatusMenu(openStatusMenu === it.id ? null : it.id);
      setDropdownStyle(null);
    }
  };

  const filtered = items.filter(it => {
    if (filter !== 'All items' && it.status !== filter) return false;
    if (!search) return true;
    const q = (search || '').toLowerCase();
    // Handle notes stored as string or as an array of { text, created_at }
    const notesText = Array.isArray(it.notes)
      ? it.notes.map(n => (n && typeof n.text === 'string' ? n.text : '')).join(' ')
      : (typeof it.notes === 'string' ? it.notes : '');
    return (
      (it.name || '').toLowerCase().includes(q) ||
      (it.reason || '').toLowerCase().includes(q) ||
      notesText.toLowerCase().includes(q)
    );
  });

  return (
    <div className="h-screen overflow-hidden flex" style={{backgroundColor: '#F5F5F5', fontFamily: "'Poppins', system-ui, -apple-system, 'Segoe UI', Roboto, Arial"}}>
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="WASTE & DISPOSAL" />
      </div>

      <div className="flex-1 flex flex-col">
  <AppHeader title="WASTE AND DISPOSAL" subtitle="Track expired, damaged, and disposed inventory items." />

        {/* header */}

        <div className="flex-1 p-3 overflow-y-auto">
          <div className="max-w-full mx-auto w-full">
            <div className="grid grid-cols-4 gap-4 mb-6 flex-shrink-0">
            <div className="flex items-center justify-between p-6 min-h-[96px]" style={{backgroundColor: '#FEF2F2', borderRadius: 14, boxShadow: '0 8px 20px rgba(16,24,40,0.06)', border: '1px solid rgba(0,0,0,0.03)'}}>
              <div>
                <div className="text-xs font-semibold text-black">Total Waste Items</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="text-gray-400">
                <img src={TotalWasteIcon} alt="Total Waste" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <div className="flex items-center justify-between p-6 min-h-[96px]" style={{backgroundColor: '#FFFBEB', borderRadius: 14, boxShadow: '0 8px 20px rgba(16,24,40,0.06)', border: '1px solid rgba(0,0,0,0.03)'}}>
              <div>
                <div className="text-xs font-semibold text-black">Pending Disposal</div>
                <div className="text-2xl font-semibold">{stats.pending}</div>
              </div>
              <div>
                <img src={PendingDisposalIcon} alt="Pending Disposal" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <div className="flex items-center justify-between p-6 min-h-[96px]" style={{backgroundColor: '#ECFEFF', borderRadius: 14, boxShadow: '0 8px 20px rgba(16,24,40,0.06)', border: '1px solid rgba(0,0,0,0.03)'}}>
              <div>
                <div className="text-xs font-semibold text-black">This Month</div>
                <div className="text-2xl font-semibold">{stats.monthCount}</div>
              </div>
              <div>
                <img src={ThisMonthIcon} alt="This Month" className="w-10 h-10 object-contain" />
              </div>
            </div>
            <div className="flex items-center justify-between p-6 min-h-[96px]" style={{backgroundColor: '#FEF6F6', borderRadius: 14, boxShadow: '0 8px 20px rgba(16,24,40,0.06)', border: '1px solid rgba(0,0,0,0.03)'}}>
              <div>
                <div className="text-xs font-semibold text-black">Total Value Lost</div>
                <div className="text-2xl font-semibold text-red-600">{stats.valueLost.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</div>
              </div>
              <div>
                <img src={TotalValueLostIcon} alt="Total Value Lost" className="w-10 h-10 object-contain" />
              </div>
            </div>
          </div>

            <div className="grid grid-cols-1 lg:flex lg:items-start gap-6 items-start">
              <div className="bg-white shadow-sm border border-green-50 p-6 w-full lg:w-[360px] min-h-[320px]" style={{borderRadius:12}}>
              <h3 className="font-semibold text-lg mb-5 flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700">+</span> Add Waste Item</h3>
              <form onSubmit={addItem} className="space-y-4 relative">
                <div>
                  <label className="text-xs font-semibold text-black block">Item Name <span className="text-red-600">*</span></label>
                  <input name="name" value={form.name} onChange={handleChange} required aria-required="true" className="w-full mt-2.5 border border-gray-200 rounded-md px-4 h-11 text-sm placeholder-gray-400 font-semibold" placeholder="Enter Item Name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Quantity <span className="text-red-600">*</span></label>
                  <input name="quantity" value={form.quantity} onChange={handleChange} required aria-required="true" className="w-full mt-2.5 border border-gray-200 rounded-md px-4 h-11 text-sm font-semibold" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Disposal Reason <span className="text-red-600">*</span></label>
                  <select name="reason" value={form.reason} onChange={handleChange} required aria-required="true" className="w-full mt-2.5 border border-gray-200 rounded-md text-sm px-4 h-11">
                    <option value="">Select reason</option>
                    <option>Expired</option>
                    <option>Damaged</option>
                    <option>Disposed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Disposal Date <span className="text-red-600">*</span></label>
                  <div>
                    {/* native date picker - value will be converted by handleChange to MM/DD/YYYY */}
                      <input name="disposalDate" type="date" value={form.disposalDate ? (() => { const p = form.disposalDate.split('/'); return p.length===3 ? `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}` : '' })() : ''} onChange={handleChange} required aria-required="true" className="w-full mt-2.5 border border-gray-200 rounded-md px-4 h-11 text-sm font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full mt-2.5 border border-gray-200 rounded-md px-4 py-3 text-sm font-semibold min-h-[96px]" rows={4} placeholder="Additional notes..."></textarea>
                </div>
                <div>
                  <button type="submit" aria-label="Add waste item" className="mx-auto block w-40 h-10 px-6 bg-[#00B7C2] text-white rounded-full text-base font-semibold shadow-sm hover:shadow-md focus:outline-none">Add</button>
                </div>
                {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
              </form>
            </div>

              <div className="flex-1 bg-white shadow-sm border border-green-50 p-6 min-h-[320px] flex flex-col gap-4" style={{borderRadius:12}}>
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="font-semibold flex items-center gap-3"><img src={LogIcon} alt="Waste & Disposal Log" className="w-5 h-5" />Waste & Disposal Log ({items.length} items)</h3>
                <div className="flex items-center gap-1 w-full sm:w-auto justify-end">
                  <div className="relative w-full sm:w-[360px] md:w-[420px] lg:w-[520px] min-w-[260px]">
                    <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search waste items..."
                      className="pl-10 pr-4 h-10 w-full bg-white rounded-full text-sm border border-gray-300 focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20 outline-none transition-colors"
                    />
                  </div>
                  <select
                    value={filter}
                    onChange={e => setFilter(e.target.value)}
                    className="bg-white px-3 h-10 rounded-full text-sm w-28 border border-gray-300 focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20 outline-none"
                  >
                    <option>All items</option>
                    <option>Pending Disposal</option>
                    <option>Disposed</option>
                  </select>
                </div>
              </div>

              {/* fixed rectangle container for waste log with internal scroll */}
              <style>{`
                /* Scoped scrollbar for the waste log container */
                .waste-scroll-container { max-height: 460px; overflow-y: auto; }
                .waste-scroll-container::-webkit-scrollbar { width: 8px; }
                .waste-scroll-container::-webkit-scrollbar-track { background: transparent; }
                .waste-scroll-container::-webkit-scrollbar-thumb { background: #00B7C2; border-radius: 6px; }
                .waste-scroll-container { scrollbar-width: thin; scrollbar-color: #00B7C2 transparent; }
                /* Smooth interactions */
                .waste-scroll-container { scroll-behavior: smooth; }
                /* Dropdown animation helpers used across the page */
                .animate-dropdown, .dropdown-anim-in { animation: dropdown-anim 160ms cubic-bezier(.2,.9,.2,1); }
                .dropdown-anim-out { animation: dropdown-out 120ms ease forwards; }
                @keyframes dropdown-anim { from { opacity: 0; transform: translateY(-6px) scale(.995); } to { opacity: 1; transform: translateY(0) scale(1); } }
                @keyframes dropdown-out { from { opacity: 1; transform: translateY(0) scale(1); } to { opacity: 0; transform: translateY(-6px) scale(.995); } }
                /* Small default transition for interactive elements on this page */
                .inline-flex, button, select { transition: all 140ms cubic-bezier(.2,.9,.2,1); }
              `}</style>

              <div className="waste-scroll-container overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full table-auto text-sm align-top">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pt-2 pb-4">Item</th>
                      <th className="pt-2 pb-4">Quantity</th>
                      <th className="pt-2 pb-4">Reason</th>
                      <th className="pt-2 pb-4">Disposal Date</th>
                      <th className="pt-2 pb-4">Value Lost</th>
                      <th className="pt-2 pb-4">Status</th>
                      <th className="pt-2 pb-4">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} className="border-t last:border-b-0 border-gray-200">
                        <td className="py-3 align-top" style={{width: '38%'}}><div className="font-semibold text-sm leading-5 text-gray-900">{it.name}</div></td>
                        <td className="py-3 text-sm align-top"><div className="font-semibold text-gray-900">{(() => {
                          const q = String(it.quantity || '');
                          // If quantity already includes non-digit characters assume it has units
                          if (/\D/.test(q)) return q;
                          return `${q} boxes`;
                        })()}</div></td>
                        <td className="py-3 align-top"><ReasonBadge reason={it.reason} /></td>
                        <td className="py-3 text-sm align-top"><div className="font-semibold text-gray-900">{it.disposalDate || '-'}</div></td>
                        <td className="py-3 text-sm text-red-600 align-top">{(Number(it.valueLost) || 0).toLocaleString('en-PH', { style: 'currency', currency: 'PHP' })}</td>
                        <td className="py-3 text-sm align-top">
                          <div className="relative inline-block">
                            <button onClick={(e) => handleToggleStatus(e, it)} className="inline-flex items-center gap-2 transition-all duration-150">
                              <StatusBadge status={it.status} />
                              <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                            </button>
                          </div>
                        </td>
                        <td className="py-3 text-sm align-top">
                          {/* Notes / Actions column */}
                          <div className="flex items-center gap-2">
                            {(() => {
                              const hasNotes = Array.isArray(it.notes) ? it.notes.length > 0 : (typeof it.notes === 'string' && it.notes.trim());
                              const count = Array.isArray(it.notes) ? it.notes.length : (typeof it.notes === 'string' && it.notes.trim() ? 1 : 0);
                              return (
                                <button title={hasNotes ? `Notes (${count})` : 'Notes'} onClick={() => {
                                  // open notes modal for this item
                                  const item = items.find(x => x.id === it.id);
                                  let notes = [];
                                  if (item) {
                                    if (Array.isArray(item.notes)) notes = item.notes.slice();
                                    else if (typeof item.notes === 'string' && item.notes.trim()) notes = [{ text: item.notes, created_at: new Date().toISOString() }];
                                    else notes = [];
                                  }
                                  setNotesList(notes);
                                  setNotesItemId(it.id);
                                  setNewNoteText('');
                                  setNotesOpen(true);
                                }} className={`p-2 rounded-md border ${hasNotes ? 'bg-[#E6FFFE] border-teal-200' : 'bg-white hover:bg-gray-50'}`}>
                                  {hasNotes ? (
                                    // filled note icon (teal)
                                    <svg className="w-4 h-4 text-teal-600" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2C6.477 2 2 5.582 2 10c0 2.38 1.28 4.54 3.5 6.02V22l4.08-2.04C11.02 19.38 11.99 19.5 12.99 19.5c5.523 0 10-3.582 10-8.5S17.523 2 12 2z"/></svg>
                                  ) : (
                                    // outline note icon
                                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 10h8M8 14h6M21 12c0 4.418-4.03 8-9 8s-9-3.582-9-8 4.03-8 9-8 9 3.582 9 8z"></path></svg>
                                  )}
                                </button>
                              );
                            })()}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-gray-500">No waste items found.</td></tr>)}
                  </tbody>
                  </table>
                </div>
              </div>
                {/* Portal dropdown for status menu to avoid clipping by scroll containers */}
                {openStatusMenu && typeof document !== 'undefined' && createPortal(
                  <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }} onMouseDown={() => { setOpenStatusMenu(null); }}>
                    <div style={{ position: 'fixed', top: dropdownStyle?.top || 0, left: dropdownStyle?.left || 0, minWidth: dropdownStyle?.minWidth || 160 }} onMouseDown={(e) => e.stopPropagation()}>
                      <div className="bg-white border rounded shadow z-50 animate-dropdown" style={{ overflow: 'hidden' }}>
                        <button onClick={async () => {
                          const id = openStatusMenu;
                          updateStatus(id, 'Disposed');
                          setOpenStatusMenu(null);
                          try { if (id && !id.startsWith('wst-')) await updateDoc(doc(db, 'waste_items', id), { status: 'Disposed' }); } catch (e) { console.warn('Failed to persist status', e); }
                        }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Disposed</button>
                        <button onClick={async () => {
                          const id = openStatusMenu;
                          updateStatus(id, 'Pending Disposal');
                          setOpenStatusMenu(null);
                          try { if (id && !id.startsWith('wst-')) await updateDoc(doc(db, 'waste_items', id), { status: 'Pending Disposal' }); } catch (e) { console.warn('Failed to persist status', e); }
                        }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Pending Disposal</button>
                      </div>
                    </div>
                  </div>,
                  document.body
                )}
                </div>
            </div>
            {/* legend placed outside the table card to match design (right-aligned) */}
            {/* Notes modal */}
            {notesOpen && (
              <div className="fixed inset-0 z-50 flex items-center justify-center">
                <div className="absolute inset-0 bg-black opacity-40" onClick={() => setNotesOpen(false)}></div>
                <div className="relative w-full max-w-md mx-4 bg-white rounded-lg shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-teal-500 text-white">
                    <div className="font-semibold">Notes</div>
                    <button onClick={() => setNotesOpen(false)} className="text-white">✕</button>
                  </div>
                  <div className="p-4">
                    <label className="text-xs font-semibold text-gray-700">Add Note</label>
                    <textarea value={newNoteText} onChange={e => setNewNoteText(e.target.value)} className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm" rows={3} placeholder="Write a quick note..."></textarea>
                    <div className="mt-3 flex items-center justify-end gap-2">
                      <button onClick={() => setNewNoteText('')} className="px-3 py-2 rounded-md bg-gray-100">Cancel</button>
                      <button onClick={async () => {
                        if (!notesItemId) return;
                        const text = (newNoteText || '').trim();
                        if (!text) return;
                        const note = { text, created_at: new Date().toISOString() };
                        // update items state: append note to item's notes array
                        setItems(prev => prev.map(it => {
                          if (it.id !== notesItemId) return it;
                          const existing = Array.isArray(it.notes) ? it.notes.slice() : (typeof it.notes === 'string' && it.notes ? [{ text: it.notes, created_at: new Date().toISOString() }] : []);
                          return { ...it, notes: [note, ...existing] };
                        }));
                        // reflect in modal list immediately
                        setNotesList(prev => [note, ...prev]);
                        setNewNoteText('');

                        // Persist to Firestore if this item has a server id (not the optimistic local id)
                        try {
                          if (notesItemId && !notesItemId.startsWith('wst-')) {
                            const item = items.find(x => x.id === notesItemId) || {};
                            const existing = Array.isArray(item.notes) ? item.notes : (typeof item.notes === 'string' && item.notes ? [{ text: item.notes, created_at: new Date().toISOString() }] : []);
                            const newNotes = [note, ...existing];
                            await updateDoc(doc(db, 'waste_items', notesItemId), { notes: newNotes });
                          }
                        } catch (err) {
                          console.warn('Failed to persist note to Firestore', err);
                        }
                      }} className="px-4 py-2 rounded-full bg-[#00B7C2] text-white">Add</button>
                    </div>

                    <div className="mt-4 border-t pt-3">
                      <div className="text-sm font-semibold text-gray-700 mb-2">Notes</div>
                      {notesList.length === 0 ? (
                        <div className="text-sm text-gray-400">No notes yet.</div>
                      ) : (
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {notesList.map((n, idx) => (
                            <div key={idx} className="p-2 bg-gray-50 border rounded">
                              <div className="text-sm text-gray-800">{n.text}</div>
                              <div className="text-xs text-gray-400 mt-1">{new Date(n.created_at).toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end pr-6">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>Expired</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-yellow-300 inline-block"></span>Pending Disposed & Damaged</div>
                <div className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-green-300 inline-block"></span>Disposed</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};