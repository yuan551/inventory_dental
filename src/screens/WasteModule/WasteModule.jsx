import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

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

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} }, [items]);

  const [form, setForm] = useState({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All items');
  const [openStatusMenu, setOpenStatusMenu] = useState(null);

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
  const newItem = { id: `wst-${Date.now()}`, name: form.name, quantity: String(qty), reason: form.reason || 'Damaged', disposalDate: form.disposalDate || '', valueLost: Number(form.valueLost) || 0, status: 'Pending Disposal', notes: form.notes || '' };
    setItems(prev => [newItem, ...prev]);
    setForm({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
    setError('');
  };

  const updateStatus = (id, status) => setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));

  const filtered = items.filter(it => {
    if (filter !== 'All items' && it.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || (it.reason || '').toLowerCase().includes(q) || (it.notes || '').toLowerCase().includes(q);
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
                <div className="text-2xl font-semibold text-red-600">₱{stats.valueLost.toFixed(2)}</div>
              </div>
              <div>
                <img src={TotalValueLostIcon} alt="Total Value Lost" className="w-10 h-10 object-contain" />
              </div>
            </div>
          </div>

            <div className="grid grid-cols-1 lg:flex lg:items-start gap-2 items-start">
              <div className="bg-white shadow-sm border border-green-50 p-5 w-full lg:w-64 min-h-[320px]" style={{borderRadius:10}}>
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2"><span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-gray-100 text-gray-700">+</span> Add Waste Item</h3>
              <form onSubmit={addItem} className="space-y-3 relative">
                <div>
                  <label className="text-xs font-semibold text-black block">Item Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm placeholder-gray-400 font-semibold" placeholder="Enter Item Name" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Quantity</label>
                  <input name="quantity" value={form.quantity} onChange={handleChange} className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm font-semibold" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Disposal Reason</label>
                  <select name="reason" value={form.reason} onChange={handleChange} className="w-full mt-2 border border-gray-200 rounded-md text-sm px-3 py-2">
                    <option value="">Select reason</option>
                    <option>Expired</option>
                    <option>Damaged</option>
                    <option>Disposed</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Disposal Date</label>
                  <div>
                    {/* native date picker - value will be converted by handleChange to MM/DD/YYYY */}
                      <input name="disposalDate" type="date" value={form.disposalDate ? (() => { const p = form.disposalDate.split('/'); return p.length===3 ? `${p[2]}-${p[0].padStart(2,'0')}-${p[1].padStart(2,'0')}` : '' })() : ''} onChange={handleChange} className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm font-semibold" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-black block">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full mt-2 border border-gray-200 rounded-md px-3 py-2 text-sm font-semibold" rows={4} placeholder="Additional notes..."></textarea>
                </div>
                <div>
                  <button type="submit" aria-label="Add waste item" className="mx-auto block w-40 px-6 py-2 bg-[#00B7C2] text-white rounded-full text-base font-semibold shadow-sm hover:shadow-md focus:outline-none">Add</button>
                </div>
                {error && <div className="text-sm text-red-600 mt-2">{error}</div>}
              </form>
            </div>

              <div className="flex-1 bg-[#FEF6F6] shadow-sm border border-transparent p-6 min-h-[320px] flex flex-col" style={{borderRadius:12}}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-3"><img src={LogIcon} alt="Waste & Disposal Log" className="w-5 h-5" />Waste & Disposal Log ({items.length} items)</h3>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search waste items..." className="pl-10 pr-4 py-2 w-96 bg-white rounded-full text-sm shadow-sm" />
                  </div>
                  <select value={filter} onChange={e => setFilter(e.target.value)} className="bg-white px-4 py-2 rounded-full text-sm shadow-sm">
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
              `}</style>

              <div className="waste-scroll-container overflow-x-auto">
                <div className="min-w-full">
                  <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-sm text-gray-600">
                      <th className="pt-2 pb-4">Item</th>
                      <th className="pt-2 pb-4">Quantity</th>
                      <th className="pt-2 pb-4">Reason</th>
                      <th className="pt-2 pb-4">Disposal Date</th>
                      <th className="pt-2 pb-4">Value Lost</th>
                      <th className="pt-2 pb-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} className="border-t last:border-b-0 border-gray-200">
                        <td className="py-3 align-top" style={{width: '38%'}}><div className="font-semibold text-sm leading-5 text-gray-900">{it.name}</div></td>
                        <td className="py-3 text-sm align-top"><div className="font-semibold text-gray-900">{it.quantity}</div></td>
                        <td className="py-3 align-top"><ReasonBadge reason={it.reason} /></td>
                        <td className="py-3 text-sm align-top"><div className="font-semibold text-gray-900">{it.disposalDate || '-'}</div></td>
                        <td className="py-3 text-sm text-red-600 align-top">${(Number(it.valueLost) || 0).toFixed(2)}</td>
                        <td className="py-3 text-sm align-top">
                          <div className="relative inline-block">
                            <button onClick={() => setOpenStatusMenu(openStatusMenu === it.id ? null : it.id)} className="inline-flex items-center gap-2">
                              <StatusBadge status={it.status} />
                              <svg className="w-3 h-3 text-gray-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                            </button>
                            {openStatusMenu === it.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-20">
                                <button onClick={() => { updateStatus(it.id, 'Disposed'); setOpenStatusMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Disposed</button>
                                <button onClick={() => { updateStatus(it.id, 'Pending Disposal'); setOpenStatusMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Pending Disposal</button>
                                {/* Rejected option removed as requested */}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-gray-500">No waste items found.</td></tr>)}
                  </tbody>
                  </table>
                </div>
              </div>
            </div>
            </div>
            {/* legend placed outside the table card to match design (right-aligned) */}
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