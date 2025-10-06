import React, { useEffect, useMemo, useState } from "react";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";

const STORAGE_KEY = "wasteItems_v1";

const sampleItems = [
  { id: 'wst-1', name: 'Lidocaine 2% WST001', quantity: '5 Vials', reason: 'Expired', disposalDate: '09/20/2024', valueLost: 42.5, status: 'Disposed', notes: '' },
  { id: 'wst-2', name: 'Latex Gloves (Large) WST002', quantity: '2 boxes', reason: 'Damaged', disposalDate: '09/18/2024', valueLost: 5.0, status: 'Disposed', notes: '' },
  { id: 'wst-3', name: 'Articaine 4% WST004', quantity: '3 cartridges', reason: 'Expired', disposalDate: '', valueLost: 38.4, status: 'Pending Disposal', notes: '' },
  { id: 'wst-4', name: 'Cotton Rolls WST005', quantity: '1 pack', reason: 'Contaminated', disposalDate: '09/11/2024', valueLost: 4.5, status: 'Disposed', notes: '' },
  { id: 'wst-5', name: 'Syringe 5ml WST006', quantity: '10 pcs', reason: 'Other', disposalDate: '09/02/2024', valueLost: 10.0, status: 'Disposed', notes: '' }
];

const ReasonBadge = ({ reason }) => {
  const map = { Expired: 'bg-red-100 text-red-700', Damaged: 'bg-yellow-100 text-yellow-800', Contaminated: 'bg-red-100 text-red-700', Other: 'bg-gray-100 text-gray-800' };
  const cls = map[reason] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{reason}</span>;
};

const StatusBadge = ({ status }) => {
  const map = { 'Pending Disposal': 'bg-yellow-100 text-yellow-800', 'Disposed': 'bg-green-100 text-green-800', 'Rejected': 'bg-red-100 text-red-800' };
  const cls = map[status] || 'bg-gray-100 text-gray-800';
  return <span className={`px-2 py-1 rounded-full text-xs ${cls}`}>{status}</span>;
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
      return JSON.parse(raw);
    } catch { return sampleItems; }
  });

  useEffect(() => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {} }, [items]);

  const [form, setForm] = useState({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
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

  const handleChange = (e) => setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const historyDates = useMemo(() => {
    const set = new Set();
    items.forEach(it => { if (it.disposalDate) set.add(it.disposalDate); });
    return Array.from(set).sort((a,b) => new Date(b) - new Date(a));
  }, [items]);

  const addItem = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const newItem = { id: `wst-${Date.now()}`, name: form.name, quantity: form.quantity || '1', reason: form.reason || 'Other', disposalDate: form.disposalDate || '', valueLost: Number(form.valueLost) || 0, status: 'Pending Disposal', notes: form.notes || '' };
    setItems(prev => [newItem, ...prev]);
    setForm({ name: '', quantity: '', reason: '', disposalDate: '', valueLost: '', notes: '' });
  };

  const updateStatus = (id, status) => setItems(prev => prev.map(it => it.id === id ? { ...it, status } : it));

  const filtered = items.filter(it => {
    if (filter !== 'All' && it.status !== filter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return it.name.toLowerCase().includes(q) || (it.reason || '').toLowerCase().includes(q) || (it.notes || '').toLowerCase().includes(q);
  });

  return (
    <div className="h-screen overflow-hidden flex" style={{backgroundColor: '#F5F5F5'}}>
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="WASTE & DISPOSAL" />
      </div>

      <div className="flex-1 flex flex-col">
        <AppHeader title="WASTE & DISPOSAL" subtitle="Track waste and disposal management" />

        {/* header */}

        <div className="flex-1 p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto w-full">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-xl px-6 py-10 shadow-sm border border-green-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Total Waste Items</div>
                <div className="text-2xl font-semibold">{stats.total}</div>
              </div>
              <div className="text-gray-400">🗃️</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-10 shadow-sm border border-green-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Pending Disposal</div>
                <div className="text-2xl font-semibold">{stats.pending}</div>
              </div>
              <div className="text-yellow-500">⚠️</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-10 shadow-sm border border-green-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">This Month</div>
                <div className="text-2xl font-semibold">{stats.monthCount}</div>
              </div>
              <div className="text-teal-500">📅</div>
            </div>
            <div className="bg-white rounded-xl px-6 py-10 shadow-sm border border-green-100 flex items-center justify-between">
              <div>
                <div className="text-xs text-gray-500">Total Value Lost</div>
                <div className="text-2xl font-semibold text-red-600">₱{stats.valueLost.toFixed(2)}</div>
              </div>
              <div className="text-red-400">💰</div>
            </div>
          </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="col-span-1 bg-white rounded-xl shadow-sm border border-green-100 p-6 w-full lg:w-80 min-h-[320px]">
              <h3 className="font-semibold text-lg mb-4">+ Add Waste Item</h3>
              <form onSubmit={addItem} className="space-y-3 relative">
                <div>
                  <label className="text-xs text-gray-500 block">Item Name</label>
                  <input name="name" value={form.name} onChange={handleChange} className="w-full mt-1 input bg-gray-50" placeholder="Enter Item Name" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Quantity</label>
                  <input name="quantity" value={form.quantity} onChange={handleChange} className="w-full mt-1 input bg-gray-50" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Disposal Reason</label>
                  <select name="reason" value={form.reason} onChange={handleChange} className="w-full mt-1 input bg-white">
                    <option value="">Select reason</option>
                    <option>Expired</option>
                    <option>Damaged</option>
                    <option>Contaminated</option>
                    <option>Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Disposal Date</label>
                  <div>
                    <input name="disposalDate" value={form.disposalDate} onChange={handleChange} className="w-full mt-1 input bg-gray-50" placeholder="mm/dd/yyyy" />
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} className="w-full mt-1 input bg-gray-50" rows={3} placeholder="Additional notes..."></textarea>
                </div>
                <div>
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">Add Waste Item</button>
                </div>
              </form>
            </div>

              <div className="col-span-2 bg-white rounded-xl shadow-sm border border-green-100 p-8 min-h-[320px]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Waste & Disposal Log ({items.length} items)</h3>
                <div className="flex items-center gap-3">
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search waste items..." className="input px-3 py-2 w-56" />
                  <select value={filter} onChange={e => setFilter(e.target.value)} className="input px-3 py-2">
                    <option>All</option>
                    <option>Pending Disposal</option>
                    <option>Disposed</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full table-auto text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-500 border-b">
                      <th className="py-3">Item</th>
                      <th className="py-3">Quantity</th>
                      <th className="py-3">Reason</th>
                      <th className="py-3">Disposal Date</th>
                      <th className="py-3">Value Lost</th>
                      <th className="py-3">Status</th>
                      {/* Actions column removed to match reference layout */}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(it => (
                      <tr key={it.id} className="border-b last:border-b-0">
                        <td className="py-4"><div className="font-medium">{it.name}</div></td>
                        <td className="py-4">{it.quantity}</td>
                        <td className="py-4"><ReasonBadge reason={it.reason} /></td>
                        <td className="py-4">{it.disposalDate || '-'}</td>
                        <td className="py-4">₱{(Number(it.valueLost) || 0).toFixed(2)}</td>
                        <td className="py-4">
                          <div className="relative inline-block">
                            <button onClick={() => setOpenStatusMenu(openStatusMenu === it.id ? null : it.id)} className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${it.status === 'Disposed' ? 'bg-green-50 text-green-700' : it.status === 'Pending Disposal' ? 'bg-yellow-50 text-yellow-800' : 'bg-red-50 text-red-700'}`}>
                              <span>{it.status}</span>
                              <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                            </button>
                            {openStatusMenu === it.id && (
                              <div className="absolute right-0 mt-2 w-40 bg-white border rounded shadow z-20">
                                <button onClick={() => { updateStatus(it.id, 'Disposed'); setOpenStatusMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Disposed</button>
                                <button onClick={() => { updateStatus(it.id, 'Pending Disposal'); setOpenStatusMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Pending Disposal</button>
                                <button onClick={() => { updateStatus(it.id, 'Rejected'); setOpenStatusMenu(null); }} className="w-full text-left px-3 py-2 hover:bg-gray-50">Rejected</button>
                              </div>
                            )}
                          </div>
                        </td>
                        {/* Actions removed: status control is inline in the Status column */}
                      </tr>
                    ))}
                    {filtered.length === 0 && (<tr><td colSpan={6} className="py-8 text-center text-gray-500">No waste items found.</td></tr>)}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};