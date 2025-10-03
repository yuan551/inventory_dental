import { Bell as BellIcon, Search as SearchIcon, Filter as FilterIcon, Package as PackageIcon, X as XIcon, Calendar as CalendarIcon, ChevronDown as ChevronDownIcon, Check as CheckIcon, Plus as PlusIcon, Minus as MinusIcon, Pencil as PencilIcon, Trash as TrashIcon } from "lucide-react";
import { collection, addDoc, getDocs, serverTimestamp, doc, writeBatch, updateDoc, deleteDoc, increment } from "firebase/firestore";
import { db } from "../../firebase";
import React, { useEffect, useState } from "react";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { DashboardSidebarSection } from "../DashboardModule/sections/DashboardSidebarSection/DashboardSidebarSection";
import { AppHeader } from "../../components/layout/AppHeader";
import menuIcon from "../../assets/icon.png";

export const InventoryModule = () => {
  // Sidebar collapse state for consistent width across pages
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebarCollapsed') === '1'; } catch { return false; }
  });
  useEffect(() => {
    const handler = (e) => setSidebarCollapsed(Boolean(e.detail?.collapsed));
    window.addEventListener('sidebar:toggle', handler);
    return () => window.removeEventListener('sidebar:toggle', handler);
  }, []);
  const [activeTab, setActiveTab] = useState("consumables");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierValue, setSupplierValue] = useState("MedSupply Co.");
  const [unitOpen, setUnitOpen] = useState(false);
  const [unitValue, setUnitValue] = useState("boxes");
  const [quantityValue, setQuantityValue] = useState("");
  const [unitCostValue, setUnitCostValue] = useState("");
  const [itemNameValue, setItemNameValue] = useState("");
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [successType, setSuccessType] = useState("newOrder"); // 'newOrder' | 'restock' | 'stockOut'
  const [qaOpen, setQaOpen] = useState(false); // quick actions dropdown
  const [editMode, setEditMode] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockItems, setRestockItems] = useState([]); // [{index, name, unit, addQty}]
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [stockOutItems, setStockOutItems] = useState([]); // [{index, name, unit, currentQty, outQty, status}]
  const [isStockOutSummaryOpen, setIsStockOutSummaryOpen] = useState(false);
  const [stockOutSummary, setStockOutSummary] = useState([]); // [{name,before,out,after}]
  const [editedRows, setEditedRows] = useState({}); // pending inline edits per _id

  // Notes modal state
  const [isNotesOpen, setIsNotesOpen] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [notesItem, setNotesItem] = useState(null); // { id, item, category }
  const [notesList, setNotesList] = useState([]); // [{text, created_at}]
  const [newNote, setNewNote] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [editText, setEditText] = useState("");
  const [isDeleteNoteOpen, setIsDeleteNoteOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState(null);
  const [isDeletingNote, setIsDeletingNote] = useState(false);

  // Numeric input sanitizers
  const handleQuantityChange = (e) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    setQuantityValue(digitsOnly);
  };

  const handleUnitCostChange = (e) => {
    let v = e.target.value.replace(/[^0-9.]/g, "");
    // allow only one dot
    const parts = v.split(".");
    if (parts.length > 2) v = parts[0] + "." + parts.slice(1).join("");
    // limit to two decimals if present
    const [intPart, decPart] = v.split(".");
    v = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
    setUnitCostValue(v);
  };

  // Start with empty lists; we'll fetch Consumables from Firestore
  const initialData = {
    consumables: [],
    medicines: [],
    equipment: [],
  };
  const [dataMap, setDataMap] = useState(initialData);

  const statusStyleMap = {
    Critical: "bg-red-100 text-red-800",
    "Low Stock": "bg-yellow-100 text-yellow-800",
    "In Stock": "bg-green-100 text-green-800",
  };
  // Status filter dropdown state
  const [statusOpen, setStatusOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All Status');
  const statusOptions = ['All Status', 'In Stock', 'Low Stock', 'Critical'];
  const statusDotClass = {
    'All Status': 'bg-gray-300',
    'In Stock': 'bg-green-500',
    'Low Stock': 'bg-yellow-500',
    'Critical': 'bg-red-500',
  };

  const baseRows = dataMap[activeTab] ?? [];
  // Map to keep original index for actions
  const displayRows = baseRows
    .map((r, i) => ({ ...r, _sourceIndex: i }))
    .filter((r) => (statusFilter === 'All Status' ? true : r.status === statusFilter));

  // Map Firestore doc to table row
  const mapDocToRow = (d) => {
    const data = d.data() || {};
    const qtyNum = Number(data.quantity || 0);
    const unit = data.units || data.unit || "units";
    const status = data.status || (qtyNum <= 20 ? "Critical" : qtyNum <= 60 ? "Low Stock" : "In Stock");
    const rawExp = data.expiration || data.expiration_date;
    let expirationStr = "—";
    if (rawExp) {
      if (typeof rawExp === 'string') expirationStr = rawExp;
      else if (typeof rawExp === 'object' && rawExp !== null) {
        if (typeof rawExp.toDate === 'function') expirationStr = rawExp.toDate().toLocaleDateString('en-US');
        else if ('seconds' in rawExp) expirationStr = new Date(rawExp.seconds * 1000).toLocaleDateString('en-US');
      }
    }
    return {
      item: data.item_name || data.name || "",
      quantity: `${qtyNum} ${unit}`,
      expiration: expirationStr,
      supplier: data.supplier || "",
      unitCost: `₱${Number(data.unit_cost || 0).toFixed(2)}`,
      status,
      notesCount: Number(data.notes_count || 0),
      _id: d.id,
    };
  };

  // Per-tab cache helpers to minimize reads
  const getCacheKey = (tab) => `${tab}_cache_v1`;
  const TTL_MS = 60 * 1000; // 60s TTL; adjust if needed
  const tryLoadCache = (tab) => {
    try {
      const raw = sessionStorage.getItem(getCacheKey(tab));
      if (!raw) return null;
      const { at, rows } = JSON.parse(raw);
      if (Date.now() - at > TTL_MS) return null;
      return rows;
    } catch { return null; }
  };
  const saveCache = (tab, rows) => {
    try { sessionStorage.setItem(getCacheKey(tab), JSON.stringify({ at: Date.now(), rows })); } catch {}
  };
  const fetchTabIfNeeded = async (tab) => {
    const cached = tryLoadCache(tab);
    if (cached) {
      setDataMap((prev) => ({ ...prev, [tab]: cached }));
      return;
    }
    const snap = await getDocs(collection(db, tab));
    const rows = snap.docs.map(mapDocToRow);
    setDataMap((prev) => ({ ...prev, [tab]: rows }));
    saveCache(tab, rows);
  };

  // Clear selected rows when tab changes or select mode exits
  useEffect(() => {
    setSelectedRows(new Set());
  }, [activeTab, selectMode]);
  
  // Quick Actions: toggles and inline edit helpers
  const handleToggleEdit = async () => {
    if (editMode && Object.keys(editedRows).length) {
      try {
        const batch = writeBatch(db);
        Object.entries(editedRows).forEach(([id, payload]) => batch.update(doc(db, activeTab, id), payload));
        await batch.commit();
        setDataMap((prev) => {
          const list = [...(prev[activeTab] || [])].map((r) => {
            if (!editedRows[r._id]) return r;
            const p = editedRows[r._id];
            const next = { ...r };
            if (p.item_name !== undefined) next.item = p.item_name;
            if (p.expiration !== undefined) next.expiration = p.expiration || '—';
            if (p.unit_cost !== undefined) next.unitCost = `₱${Number(p.unit_cost || 0).toFixed(2)}`;
            return next;
          });
          try { sessionStorage.setItem(getCacheKey(activeTab), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
          return { ...prev, [activeTab]: list };
        });
        setEditedRows({});
      } catch (e) {
        console.error('Failed to save edits', e);
      }
    }
    setEditMode((v) => !v);
  };
  const handleToggleSelect = () => {
    setSelectMode((v) => {
      const next = !v;
      if (!next) setSelectedRows(new Set());
      return next;
    });
  };
  const toggleRowSelected = (index) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };
  const handleInlineChange = (index, field, value) => {
    setDataMap((prev) => {
      const copy = { ...prev };
      const list = [...(copy[activeTab] || [])];
      const r = { ...list[index] };
      const id = r._id;
      if (field === 'item') {
        r.item = value;
        setEditedRows((prevEdits) => ({ ...prevEdits, [id]: { ...(prevEdits[id] || {}), item_name: value } }));
      } else if (field === 'expiration') {
        r.expiration = value;
        setEditedRows((prevEdits) => ({ ...prevEdits, [id]: { ...(prevEdits[id] || {}), expiration: value } }));
      } else if (field === 'unitCost') {
        let v = String(value ?? '').replace(/[^0-9.]/g, '');
        const parts = v.split('.');
        if (parts.length > 2) v = parts[0] + '.' + parts.slice(1).join('');
        const [intPart, decPart] = v.split('.');
        v = decPart !== undefined ? `${intPart}.${decPart.slice(0, 2)}` : intPart;
        r.unitCost = `₱${v}`;
        const asNum = Number(v || 0);
        setEditedRows((prevEdits) => ({ ...prevEdits, [id]: { ...(prevEdits[id] || {}), unit_cost: asNum } }));
      }
      list[index] = r;
      copy[activeTab] = list;
      return copy;
    });
  };

  // Notes helpers
  const openNotes = async (index) => {
    try {
      const row = baseRows[index];
      if (!row) return;
      const ctx = { id: row._id, item: row.item, category: activeTab };
      setNotesItem(ctx);
      setIsNotesOpen(true);
      setNotesLoading(true);
      setEditingNoteId(null);
      setEditText("");
      // fetch notes subcollection
      const snap = await getDocs(collection(db, activeTab, row._id, 'notes'));
      const list = snap.docs.map((d) => {
        const data = d.data() || {};
        let when = data.created_at;
        let ts = null;
        if (when) {
          if (typeof when.toDate === 'function') ts = when.toDate();
          else if (when.seconds) ts = new Date(when.seconds * 1000);
          else ts = new Date(when);
        }
        return { id: d.id, text: data.text || '', created_at: ts };
      }).sort((a,b) => (b.created_at?.getTime?.()||0) - (a.created_at?.getTime?.()||0));
      setNotesList(list);
    } catch (e) {
      console.error('Failed to load notes', e);
      setNotesList([]);
    } finally {
      setNotesLoading(false);
    }
  };

  const addNoteNow = async () => {
    const text = (newNote || '').trim();
    if (!text || !notesItem?.id) return;
    try {
      const ref = await addDoc(collection(db, notesItem.category, notesItem.id, 'notes'), {
        text,
        created_at: serverTimestamp(),
      });
      // Optimistic: prepend with local timestamp for now; it will match server shortly
      const local = { id: ref.id, text, created_at: new Date() };
      setNotesList((prev) => [local, ...prev]);
      setNewNote("");
      // Increment parent notes_count in Firestore and locally
      try {
        await updateDoc(doc(db, notesItem.category, notesItem.id), { notes_count: increment(1) });
      } catch {}
      setDataMap((prev) => {
        const copy = { ...prev };
        const list = [...(copy[notesItem.category] || [])];
        const idx = list.findIndex((r) => r._id === notesItem.id);
        if (idx >= 0) {
          const curr = list[idx];
          list[idx] = { ...curr, notesCount: Math.max(0, (curr.notesCount || 0) + 1) };
          copy[notesItem.category] = list;
          try { sessionStorage.setItem(getCacheKey(notesItem.category), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
        }
        return copy;
      });
    } catch (e) {
      console.error('Failed to add note', e);
    }
  };

  // Notes edit/delete helpers
  const beginEditNote = (note) => {
    setEditingNoteId(note.id);
    setEditText(note.text || "");
  };

  const cancelEditNote = () => {
    setEditingNoteId(null);
    setEditText("");
  };

  const saveEditNote = async () => {
    if (!editingNoteId || !notesItem?.id) return;
    const text = (editText || '').trim();
    if (!text) return;
    try {
      await updateDoc(doc(db, notesItem.category, notesItem.id, 'notes', editingNoteId), {
        text,
        updated_at: serverTimestamp(),
      });
      setNotesList((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, text } : n)));
      setEditingNoteId(null);
      setEditText("");
    } catch (e) {
      console.error('Failed to save note edit', e);
    }
  };

  const askDeleteNote = (noteId) => {
    setNoteToDelete(noteId);
    setIsDeleteNoteOpen(true);
  };

  const deleteNoteNow = async (noteId) => {
    if (!noteId || !notesItem?.id) return;
    try {
      setIsDeletingNote(true);
      await deleteDoc(doc(db, notesItem.category, notesItem.id, 'notes', noteId));
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      // Decrement parent notes_count in Firestore and locally
      try {
        await updateDoc(doc(db, notesItem.category, notesItem.id), { notes_count: increment(-1) });
      } catch {}
      setDataMap((prev) => {
        const copy = { ...prev };
        const list = [...(copy[notesItem.category] || [])];
        const idx = list.findIndex((r) => r._id === notesItem.id);
        if (idx >= 0) {
          const curr = list[idx];
          const nextCount = Math.max(0, (curr.notesCount || 0) - 1);
          list[idx] = { ...curr, notesCount: nextCount };
          copy[notesItem.category] = list;
          try { sessionStorage.setItem(getCacheKey(notesItem.category), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
        }
        return copy;
      });
      setIsDeleteNoteOpen(false);
      setNoteToDelete(null);
    } catch (e) {
      console.error('Failed to delete note', e);
    } finally {
      setIsDeletingNote(false);
    }
  };

  const legendItems = (() => {
    const counts = baseRows.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] || 0) + 1;
        return acc;
      },
      { Critical: 0, "Low Stock": 0, "In Stock": 0 }
    );
    return [
      { label: "Critical", color: "bg-red-500", count: counts["Critical"] },
      { label: "Low Stock", color: "bg-yellow-500", count: counts["Low Stock"] },
      { label: "In Stock", color: "bg-green-500", count: counts["In Stock"] },
    ];
  })();

  const todayStr = new Date().toLocaleDateString("en-US");
  // Initial fetch for default tab
  useEffect(() => { fetchTabIfNeeded('consumables'); }, []);
  // Fetch on tab change if needed
  useEffect(() => { if (activeTab !== 'consumables') fetchTabIfNeeded(activeTab); }, [activeTab]);

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    try {
      if (isSaving) return;
      setIsSaving(true);
      const itemName = itemNameValue.trim();
      const qty = Number(quantityValue || 0);
      const cost = Number(unitCostValue || 0);
      // Basic validation
      if (!itemName || qty <= 0) {
        // keep it simple; could show a toast later
        setIsSaving(false);
        return;
      }
      const collectionName = activeTab; // write to the current tab collection
      const payload = {
        item_name: itemName,
        quantity: qty,
        supplier: supplierValue,
        unit_cost: cost,
        units: unitValue,
        created_at: serverTimestamp(),
      };

      // Save to ordered (log) and consumables (inventory)
      const [logRef, consRef] = await Promise.all([
        addDoc(collection(db, "ordered"), payload),
        addDoc(collection(db, collectionName), { ...payload, status: "In Stock", notes_count: 0 }),
      ]);

      // Optimistically update UI and cache without refetching
      const status = qty <= 20 ? 'Critical' : qty <= 60 ? 'Low Stock' : 'In Stock';
      const newRow = {
        item: itemName,
        quantity: `${qty} ${unitValue}`,
        expiration: '—',
        supplier: supplierValue,
        unitCost: `₱${cost.toFixed(2)}`,
        status,
        notesCount: 0,
        _id: consRef.id,
      };
      setDataMap((prev) => {
        const rows = [...(prev[collectionName] || []), newRow];
        try { sessionStorage.setItem(getCacheKey(collectionName), JSON.stringify({ at: Date.now(), rows })); } catch {}
        return { ...prev, [collectionName]: rows };
      });

      // reset form
      setItemNameValue("");
      setQuantityValue("");
      setUnitCostValue("");
      setSupplierValue("MedSupply Co.");
      setUnitValue("boxes");

      setIsNewOrderOpen(false);
      setTimeout(() => { setSuccessType('newOrder'); setIsSuccessOpen(true); }, 180);
    } catch (e) {
      console.error("Failed to save order", e);
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = [
    { id: "consumables", label: "Consumables" },
    { id: "medicines", label: "Medicines" },
    { id: "equipment", label: "Equipment" }
  ];

  // Helpers for restock modal
  const openRestock = () => {
    if (!selectMode || selectedRows.size === 0) return;
    const list = Array.from(selectedRows).sort((a,b)=>a-b).map((idx) => {
      const r = baseRows[idx];
      const m = /^\s*(\d+)\s*(.*)$/.exec(r.quantity || "0 units");
      const current = m ? parseInt(m[1], 10) : 0;
      const unit = m ? (m[2] || "units").trim() : "units";
      return { index: idx, name: r.item, unit, currentQty: current, addQty: 1 };
    });
    setRestockItems(list);
    setIsRestockOpen(true);
  };

  const adjustRestockQty = (idx, delta) => {
    setRestockItems((prev) => prev.map((it) => it.index === idx ? { ...it, addQty: Math.max(0, (it.addQty || 0) + delta) } : it));
  };

  const confirmRestock = async () => {
    let updatedList;
    setDataMap((prev) => {
      const copy = { ...prev };
      const list = [...(copy[activeTab] || [])];
      restockItems.forEach(({ index, currentQty, addQty, unit }) => {
        if (!addQty) return;
        const r = { ...list[index] };
        const newQty = Math.max(0, (currentQty || 0) + addQty);
        r.quantity = `${newQty} ${unit}`;
        r.status = newQty <= 20 ? 'Critical' : newQty <= 60 ? 'Low Stock' : 'In Stock';
        list[index] = r;
      });
      copy[activeTab] = list;
      updatedList = list;
      return copy;
    });
    try {
      const batch = writeBatch(db);
      restockItems.forEach(({ index, currentQty, addQty }) => {
        if (!addQty) return;
        const row = baseRows[index];
        const newQty = Math.max(0, (currentQty || 0) + addQty);
        const status = newQty <= 20 ? 'Critical' : newQty <= 60 ? 'Low Stock' : 'In Stock';
        batch.update(doc(db, activeTab, row._id), { quantity: newQty, status });
      });
      await batch.commit();
      try { sessionStorage.setItem(getCacheKey(activeTab), JSON.stringify({ at: Date.now(), rows: updatedList })); } catch {}
    } catch (e) { console.error('Failed to persist restock', e); }
    setIsRestockOpen(false);
    setSelectMode(false);
    setSelectedRows(new Set());
    setTimeout(() => { setSuccessType('restock'); setIsSuccessOpen(true); }, 180);
  };

  // Stock Out helpers
  const openStockOut = () => {
    if (!selectMode || selectedRows.size === 0) return;
    const list = Array.from(selectedRows).sort((a,b)=>a-b).map((idx) => {
      const r = baseRows[idx];
      const m = /^\s*(\d+)\s*(.*)$/.exec(r.quantity || "0 units");
      const current = m ? parseInt(m[1], 10) : 0;
      const unit = m ? (m[2] || "units").trim() : "units";
      return { index: idx, name: r.item, unit, currentQty: current, outQty: 1, status: r.status };
    });
    setStockOutItems(list);
    setIsStockOutOpen(true);
  };

  const adjustStockOutQty = (idx, delta) => {
    setStockOutItems((prev) => prev.map((it) => it.index === idx ? { ...it, outQty: Math.max(0, (it.outQty || 0) + delta) } : it));
  };

  const confirmStockOut = async () => {
    // Precompute summary to avoid side effects inside state updaters (prevents duplicates in StrictMode)
    const summary = stockOutItems.map(({ index, name, currentQty, outQty, unit }) => {
      const after = Math.max(0, (currentQty || 0) - (outQty || 0));
      return { index, name, before: currentQty, out: outQty, after, unit };
    });

    let updatedList;
    setDataMap((prev) => {
      const copy = { ...prev };
      const list = [...(copy[activeTab] || [])];
      summary.forEach(({ index, after, unit }) => {
        const r = { ...list[index] };
        r.quantity = `${after} ${unit}`;
        r.status = after <= 20 ? 'Critical' : after <= 60 ? 'Low Stock' : 'In Stock';
        list[index] = r;
      });
      copy[activeTab] = list;
      updatedList = list;
      return copy;
    });

    try {
      const batch = writeBatch(db);
      summary.forEach(({ index, after }) => {
        const row = baseRows[index];
        const status = after <= 20 ? 'Critical' : after <= 60 ? 'Low Stock' : 'In Stock';
        batch.update(doc(db, activeTab, row._id), { quantity: after, status });
      });
      await batch.commit();
      try { sessionStorage.setItem(getCacheKey(activeTab), JSON.stringify({ at: Date.now(), rows: updatedList })); } catch {}
      // Log stock-out events for dashboard usage trend
      const logs = summary.filter(s => (s.out || 0) > 0).map((s) => ({
        category: activeTab,
        item_name: s.name,
        quantity: Number(s.out || 0),
        unit: s.unit,
        type: 'stock_out',
        timestamp: serverTimestamp(),
      }));
      if (logs.length) {
        try {
          await Promise.all(logs.map((payload) => addDoc(collection(db, 'stock_logs'), payload)));
        } catch (e) {
          console.warn('Failed to write some stock logs', e);
        }
      }
    } catch (e) { console.error('Failed to persist stock out', e); }

    setIsStockOutOpen(false);
    setSelectMode(false);
    setSelectedRows(new Set());
    setStockOutSummary(summary);
    setTimeout(() => setIsStockOutSummaryOpen(true), 120);
  };

  return (
    <div className="h-screen overflow-hidden flex" style={{backgroundColor: '#F5F5F5'}}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="INVENTORY" />
      </div>
      
      {/* Stock Out Summary Modal */}
      <div className={`${isStockOutSummaryOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsStockOutSummaryOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
         className={`relative z-10 w-[560px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isStockOutSummaryOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">Stock Out</div>
            </div>
            <button onClick={() => setIsStockOutSummaryOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="[font-family:'Inter',Helvetica] font-semibold text-[#00b7c2] text-lg">Summary</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{todayStr}</span>
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-4 bg-gray-50 text-gray-700 text-sm [font-family:'Inter',Helvetica]">
                <div className="px-4 py-3">Item Name</div>
                <div className="px-4 py-3">Remaining</div>
                <div className="px-4 py-3">Stock Out</div>
                <div className="px-4 py-3">All stock</div>
              </div>
              <div className="divide-y divide-gray-200">
                {stockOutSummary.map((it, i) => (
                  <div key={i} className="grid grid-cols-4 items-center px-4 py-3">
                    <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.name}</div>
                    <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.before}</div>
                    <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.out}</div>
                    <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.after}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Button
                onClick={() => {
                  setIsStockOutSummaryOpen(false);
                  setTimeout(() => { setSuccessType('stockOut'); setIsSuccessOpen(true); }, 160);
                }}
                className="px-8 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white shadow-lg"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <AppHeader title="INVENTORY" subtitle="Manage your dental supplies and item inventory" />

          {/* Action Buttons */}
          <div className="px-8 py-4 flex justify-end gap-4 relative">
          <div className="relative">
            <Button onClick={() => setStatusOpen((v) => !v)} className="px-8 py-3 bg-[#00b7c2] hover:bg-[#009ba5] text-white rounded-full [font-family:'Oxygen',Helvetica] font-semibold text-lg shadow-lg">
              <FilterIcon className="w-4 h-4 mr-2" />
              {statusFilter}
              <ChevronDownIcon className={`ml-2 w-4 h-4 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </Button>
            <div className={`${statusOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-56 bg-white rounded-2xl border border-gray-100 shadow-[0_12px_40px_rgba(0,0,0,0.18)] transition-all duration-150 origin-top-right`}
                 onMouseLeave={() => setStatusOpen(false)}>
              {/* Arrow */}
              <div className="absolute -top-1.5 right-6 w-3 h-3 bg-white border-t border-l border-gray-100 rotate-45" />
              <div className="py-2">
                {statusOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setStatusFilter(opt);
                      setStatusOpen(false);
                      // reset selection to avoid index mismatches
                      setSelectMode(false);
                      setSelectedRows(new Set());
                    }}
                    className={`w-full px-3.5 py-2.5 flex items-center gap-3 text-[14px] transition-colors ${statusFilter === opt ? 'bg-[#E6F7F9]' : 'hover:bg-gray-50'}`}
                  >
                    <span className={`w-2.5 h-2.5 rounded-full ${statusDotClass[opt] || 'bg-gray-300'}`} />
                    <span className={`flex-1 text-left ${statusFilter === opt ? 'text-[#00b7c2] font-medium' : 'text-gray-800'}`}>{opt}</span>
                    {statusFilter === opt && <CheckIcon className="w-4 h-4 text-[#00b7c2]" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="relative">
            <Button onClick={() => setQaOpen((v) => !v)} className="px-8 py-3 bg-[#00b7c2] hover:bg-[#009ba5] text-white rounded-full [font-family:'Oxygen',Helvetica] font-semibold text-lg shadow-lg">
              Quick Actions
              <ChevronDownIcon className={`ml-2 w-4 h-4 transition-transform ${qaOpen ? 'rotate-180' : ''}`} />
            </Button>
            <div className={`${qaOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-48 bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-150 origin-top-right overflow-hidden`}
                 onMouseLeave={() => setQaOpen(false)}>
              <button onClick={handleToggleEdit} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${editMode ? 'bg-[#00b7c2]' : 'bg-transparent border border-gray-300'}`} />
                {editMode ? 'Done Editing' : 'Edit'}
              </button>
              <div className="h-px bg-gray-100" />
              <button onClick={handleToggleSelect} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${selectMode ? 'bg-[#00b7c2]' : 'bg-transparent border border-gray-300'}`} />
                {selectMode ? 'Exit Select Mode' : 'Select'}
              </button>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 px-8 pb-6">
          {/* Tabs */}
          <div className="mb-6 rounded-xl bg-gray-100/60 border border-gray-200">
            <div className="flex gap-10 px-6">
              {tabs.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative py-4 [font-family:'Inter',Helvetica] text-xl transition-colors ${
                      isActive ? "text-[#00b7c2]" : "text-gray-600 hover:text-gray-800"
                    }`}
                  >
                    {tab.label}
                    <span
                      className={`absolute left-0 -bottom-px h-[3px] rounded-full transition-all duration-200 ${
                        isActive ? "w-full bg-[#00b7c2]" : "w-0 bg-transparent"
                      }`}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Card */}
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-gray-200 p-6 h-full">
            {/* Overview Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900">
                OVERVIEW ({displayRows.length} {displayRows.length === 1 ? 'item' : 'items'})
              </h2>
            </div>

            {/* Inventory Table */}
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {selectMode && (
                      <th className="px-4 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Select</th>
                    )}
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Item</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Quantity</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Expiration Date</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Supplier</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Unit Cost</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Status</th>
                    <th className="px-6 py-4 text-left [font-family:'Inter',Helvetica] font-medium text-gray-700 text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayRows.map((item, index) => (
                    <tr key={item._sourceIndex} className={`transition-colors ${index === 0 ? 'bg-[#E6F7F9]' : 'hover:bg-gray-50'}`}>
                      {selectMode && (
                        <td className="px-4 py-4 align-middle">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded border-gray-300 text-[#00b7c2] focus:ring-[#00b7c2]"
                            checked={selectedRows.has(item._sourceIndex)}
                            onChange={() => toggleRowSelected(item._sourceIndex)}
                          />
                        </td>
                      )}
                      <td className="px-6 py-4">
                        {editMode ? (
                          <Input
                            className="h-9 rounded-full max-w-xs"
                            value={item.item}
                            onChange={(e) => handleInlineChange(item._sourceIndex, 'item', e.target.value)}
                          />
                        ) : (
                          <div className="[font-family:'Inter',Helvetica] font-medium text-gray-900">{item.item}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 [font-family:'Inter',Helvetica] text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 [font-family:'Inter',Helvetica] text-gray-900">
                        {editMode ? (
                          <Input
                            className="h-9 rounded-full w-40"
                            value={item.expiration}
                            onChange={(e) => handleInlineChange(item._sourceIndex, 'expiration', e.target.value)}
                          />
                        ) : (
                          item.expiration
                        )}
                      </td>
                      <td className="px-6 py-4 [font-family:'Inter',Helvetica] text-gray-900">{item.supplier}</td>
                      <td className="px-6 py-4 [font-family:'Inter',Helvetica] font-medium text-gray-900">
                        {editMode ? (
                          <div className="relative inline-block">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 select-none pointer-events-none">₱</span>
                            <Input
                              className="h-9 pl-7 rounded-full w-28"
                              value={item.unitCost.replace('₱','')}
                              onChange={(e) => handleInlineChange(item._sourceIndex, 'unitCost', e.target.value)}
                              inputMode="decimal"
                            />
                          </div>
                        ) : (
                          item.unitCost
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyleMap[item.status] || 'bg-gray-100 text-gray-700'}`}>
                          {item.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative inline-block">
                          <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Row notes" onClick={() => openNotes(item._sourceIndex)}>
                            <img src={menuIcon} alt="Actions" className="w-4 h-4 object-contain" />
                          </button>
                          {Number(item.notesCount || 0) > 0 && (
                            <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#00b7c2] text-white text-[10px] leading-[16px] text-center border border-white">
                              {item.notesCount}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Bottom Actions and Legend */}
            <div className="flex items-center justify-between mt-6">
              {/* Action Buttons */}
              <div className="flex gap-4">
                <Button onClick={() => setIsNewOrderOpen(true)} className="px-6 py-2 bg-[#00b7c2] hover:bg-[#009ba5] text-white rounded-full [font-family:'Oxygen',Helvetica] font-semibold shadow-lg">
                  New Order
                </Button>
                <Button
                  onClick={openStockOut}
                  aria-disabled={!(selectMode && selectedRows.size > 0)}
                  className={`px-6 py-2 rounded-full [font-family:'Oxygen',Helvetica] font-semibold shadow-lg ${selectMode && selectedRows.size > 0 ? 'bg-[#00b7c2] hover:bg-[#009ba5] text-white' : 'bg-[#9CA3AF] text-white pointer-events-none opacity-100'}`}
                >
                  Stock out
                </Button>
                <Button
                  onClick={openRestock}
                  aria-disabled={!(selectMode && selectedRows.size > 0)}
                  className={`px-6 py-2 rounded-full [font-family:'Oxygen',Helvetica] font-semibold shadow-lg ${selectMode && selectedRows.size > 0 ? 'bg-[#00b7c2] hover:bg-[#009ba5] text-white' : 'bg-[#9CA3AF] text-white pointer-events-none opacity-100'}`}
                >
                  Restock
                </Button>
              </div>

              {/* Status Legend */}
              <div className="flex items-center gap-6">
                {legendItems.map((status, index) => (
                  <div key={status.label} className="flex items-center gap-2">
                    <div className={`w-4 h-4 ${status.color} rounded-full border border-gray-400 shadow-inner`} />
                    <span className="[font-family:'Oxygen',Helvetica] text-gray-600 text-sm">
                      {status.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* New Order Modal */}
      <div className={`${isNewOrderOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-50 flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsNewOrderOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[560px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isNewOrderOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">New Order</div>
            </div>
            <button onClick={() => setIsNewOrderOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="[font-family:'Inter',Helvetica] font-semibold text-[#00b7c2] text-lg">New Order Sheet</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{todayStr}</span>
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>

            {/* Form */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Item Name</label>
                <Input className="h-10 rounded-full" value={itemNameValue} onChange={(e) => setItemNameValue(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier Name</label>
                <div className="relative">
                  <button type="button"
                          onClick={() => setSupplierOpen((v) => !v)}
                          className="w-full h-10 pl-4 pr-9 rounded-full border border-gray-300 text-left focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20">
                    <span className="text-gray-700">{supplierValue}</span>
                    <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${supplierOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`${supplierOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute z-10 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-150 origin-top`}
                       onMouseLeave={() => setSupplierOpen(false)}>
                    {['MedSupply Co.', 'DentalCare Ltd.', 'SafeMed Inc'].map(opt => (
                      <div key={opt}
                           onClick={() => { setSupplierValue(opt); setSupplierOpen(false); }}
                           className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${supplierValue === opt ? 'text-[#00b7c2] font-medium' : 'text-gray-700'}`}> {opt} </div>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity</label>
                <Input
                  className="h-10 rounded-full"
                  value={quantityValue}
                  onChange={handleQuantityChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Units <span className="text-xs text-gray-400">(grams, vials, etc.)</span></label>
                <div className="relative">
                  <button type="button"
                          onClick={() => setUnitOpen((v) => !v)}
                          className="w-full h-10 pl-4 pr-9 rounded-full border border-gray-300 text-left focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20">
                    <span className="text-gray-700">{unitValue}</span>
                    <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${unitOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`${unitOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute z-10 mt-2 w-full bg-white rounded-xl border border-gray-200 shadow-lg transition-all duration-150 origin-top`}
                       onMouseLeave={() => setUnitOpen(false)}>
                    {['boxes', 'packs', 'units', 'vials'].map(opt => (
                      <div key={opt}
                           onClick={() => { setUnitValue(opt); setUnitOpen(false); }}
                           className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${unitValue === opt ? 'text-[#00b7c2] font-medium' : 'text-gray-700'}`}> {opt} </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-span-2">
                <label className="block text-sm text-gray-600 mb-1">Unit Cost</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 select-none pointer-events-none">₱</span>
                  <Input
                    className="h-10 pl-10 rounded-full"
                    value={unitCostValue}
                    onChange={handleUnitCostChange}
                    inputMode="decimal"
                    pattern="^\\d*(\\.\\d{0,2})?$"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Button onClick={handleSave} className="px-8 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white shadow-lg">
                Save
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <div className={`${isSuccessOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsSuccessOpen(false)}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          className={`relative z-10 w-[440px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isSuccessOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-gray-100"
            onClick={() => setIsSuccessOpen(false)}
            aria-label="Close"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="px-8 pt-8 pb-7 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500 flex items-center justify-center shadow-md">
              <CheckIcon className="w-9 h-9 text-white" />
            </div>
            <h3 className="mt-4 [font-family:'Inter',Helvetica] font-semibold text-gray-900 text-lg">
              {successType === 'stockOut'
                ? 'Items Successfully Stocked Out!'
                : successType === 'restock'
                ? 'Restock Successfully!'
                : 'New Order Successful!'}
            </h3>
            <p className="mt-1 [font-family:'Oxygen',Helvetica] text-gray-500 text-sm">
              {successType === 'stockOut'
                ? 'The item you selected has been recorded successfully.'
                : 'The item you inputted has been successfully saved.'}
            </p>
            <div className="mt-5">
              <Button onClick={() => setIsSuccessOpen(false)} className="px-6 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white shadow">
                Done
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Restock Modal */}
      <div className={`${isRestockOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsRestockOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[560px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isRestockOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">Restock</div>
            </div>
            <button onClick={() => setIsRestockOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="[font-family:'Inter',Helvetica] font-semibold text-[#00b7c2] text-lg">MedSupply Co.</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{todayStr}</span>
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-2 bg-gray-50 text-gray-700 text-sm [font-family:'Inter',Helvetica]">
                <div className="px-4 py-3">Item Name</div>
                <div className="px-4 py-3">Quantity</div>
              </div>
              <div className="divide-y divide-gray-200">
                {restockItems.map((it) => (
                  <div key={it.index} className="grid grid-cols-2 items-center px-4 py-3">
                    <div>
                      <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.name}</div>
                      <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500">{it.currentQty} {it.unit}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={() => adjustRestockQty(it.index, -1)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 p-0">
                        <MinusIcon className="w-4 h-4" />
                      </Button>
                      <div className="min-w-10 text-center [font-family:'Inter',Helvetica]">{it.addQty}</div>
                      <Button onClick={() => adjustRestockQty(it.index, 1)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 p-0">
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Button onClick={confirmRestock} className="px-8 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white shadow-lg">
                Restock
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Stock Out Modal */}
      <div className={`${isStockOutOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[60] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsStockOutOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[560px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isStockOutOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">Stock Out</div>
            </div>
            <button onClick={() => setIsStockOutOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="[font-family:'Inter',Helvetica] font-semibold text-[#00b7c2] text-lg">Selected Item</div>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{todayStr}</span>
                <CalendarIcon className="w-4 h-4" />
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="grid grid-cols-3 bg-gray-50 text-gray-700 text-sm [font-family:'Inter',Helvetica]">
                <div className="px-4 py-3">Item Name</div>
                <div className="px-4 py-3">Status</div>
                <div className="px-4 py-3">Quantity</div>
              </div>
              <div className="divide-y divide-gray-200">
                {stockOutItems.map((it) => (
                  <div key={it.index} className="grid grid-cols-3 items-center px-4 py-3">
                    <div>
                      <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.name}</div>
                      <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500">{it.currentQty} {it.unit}</div>
                    </div>
                    <div>
                      <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyleMap[it.status] || 'bg-gray-100 text-gray-700'}`}>{it.status}</Badge>
                    </div>
                    <div className="flex items-center gap-3">
                      <Button onClick={() => adjustStockOutQty(it.index, -1)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 p-0">
                        <MinusIcon className="w-4 h-4" />
                      </Button>
                      <div className="min-w-10 text-center [font-family:'Inter',Helvetica]">{it.outQty}</div>
                      <Button onClick={() => adjustStockOutQty(it.index, 1)} className="w-8 h-8 rounded-md bg-gray-100 hover:bg-gray-200 text-gray-700 p-0">
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center">
              <Button onClick={confirmStockOut} className="px-8 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white shadow-lg">
                Stock out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Notes Modal */}
      <div className={`${isNotesOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[70] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => setIsNotesOpen(false)}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[560px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_25px_60px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isNotesOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="rounded-t-2xl bg-[#00b7c2] text-white px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
                <PackageIcon className="w-5 h-5" />
              </div>
              <div className="text-lg font-semibold">Notes{notesItem?.item ? ` • ${notesItem.item}` : ''}</div>
            </div>
            <button onClick={() => setIsNotesOpen(false)} className="p-1 rounded-full hover:bg-white/10 transition-colors">
              <XIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 pt-5 pb-6">
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1">Add Note</label>
              <div className="flex items-start gap-2">
                <textarea
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00b7c2]/20 focus:border-[#00b7c2] min-h-[70px]"
                  placeholder="Write a quick note…"
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                />
                <Button onClick={addNoteNow} className="h-10 px-4 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white whitespace-nowrap">Add</Button>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 text-gray-700 text-sm [font-family:'Inter',Helvetica] px-4 py-3">Notes</div>
              <div className="divide-y divide-gray-200 max-h-64 overflow-auto">
                {notesLoading ? (
                  <div className="px-4 py-3 text-sm text-gray-500">Loading…</div>
                ) : notesList.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-gray-500">No notes yet.</div>
                ) : (
                  notesList.map((n) => (
                    <div key={n.id} className="px-4 py-3">
                      {editingNoteId === n.id ? (
                        <div>
                          <textarea
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#00b7c2]/20 focus:border-[#00b7c2] min-h-[60px]"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <div className="mt-2 flex items-center gap-2">
                            <Button onClick={saveEditNote} className="h-8 px-3 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white text-sm">Save</Button>
                            <Button onClick={cancelEditNote} className="h-8 px-3 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm">Cancel</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="[font-family:'Inter',Helvetica] text-gray-900 text-sm">{n.text}</div>
                            {n.created_at && (
                              <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500 mt-1">{n.created_at.toLocaleString('en-US')}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              className="p-1 rounded hover:bg-gray-100 text-gray-600"
                              title="Edit"
                              onClick={() => beginEditNote(n)}
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="p-1 rounded hover:bg-red-50 text-red-600"
                              title="Delete"
                              onClick={() => askDeleteNote(n.id)}
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Delete Note Confirm Modal */}
      <div className={`${isDeleteNoteOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[80] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => { if (!isDeletingNote) { setIsDeleteNoteOpen(false); setNoteToDelete(null); } }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[420px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isDeleteNoteOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-gray-100"
            onClick={() => { if (!isDeletingNote) { setIsDeleteNoteOpen(false); setNoteToDelete(null); } }}
            aria-label="Close"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center shadow-sm">
              <TrashIcon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="mt-4 [font-family:'Inter',Helvetica] font-semibold text-gray-900 text-lg">Delete this note?</h3>
            <p className="mt-1 [font-family:'Oxygen',Helvetica] text-gray-500 text-sm">This action cannot be undone.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                onClick={() => { if (!isDeletingNote) { setIsDeleteNoteOpen(false); setNoteToDelete(null); } }}
                className="px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                disabled={isDeletingNote}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => { if (noteToDelete) await deleteNoteNow(noteToDelete); }}
                className={`px-5 py-2 rounded-full ${isDeletingNote ? 'bg-red-400' : 'bg-red-500 hover:bg-red-600'} text-white`}
                disabled={isDeletingNote}
              >
                {isDeletingNote ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};