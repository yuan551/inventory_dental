import { Bell as BellIcon, Search as SearchIcon, Filter as FilterIcon, Package as PackageIcon, X as XIcon, Calendar as CalendarIcon, ChevronDown as ChevronDownIcon, Check as CheckIcon, Plus as PlusIcon, Minus as MinusIcon, Pencil as PencilIcon, Trash as TrashIcon } from "lucide-react";
import { collection, addDoc, getDocs, serverTimestamp, doc, writeBatch, updateDoc, deleteDoc, increment, Timestamp, getDoc } from "firebase/firestore";
import { isPlaceholderDoc } from "../../lib/placeholders";
import { db, auth } from "../../firebase";
import React, { useEffect, useState, useRef } from "react";
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
  // Close any open dropdown when clicking outside
  useEffect(() => {
    const closeOnOutside = (e) => {
      const t = e.target;
      if (!t.closest?.('.inv-status-filter')) setStatusOpen(false);
      if (!t.closest?.('.inv-qa')) setQaOpen(false);
      if (!t.closest?.('.inv-supplier')) setSupplierOpen(false);
      if (!t.closest?.('.inv-unit')) setUnitOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutside);
    return () => document.removeEventListener('mousedown', closeOnOutside);
  }, []);
  const [activeTab, setActiveTab] = useState("consumables");
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [supplierOpen, setSupplierOpen] = useState(false);
  const [supplierValue, setSupplierValue] = useState("Select Supplier");
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
  // store selected rows by document id (stable across tabs)
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isRestockOpen, setIsRestockOpen] = useState(false);
  const [restockItems, setRestockItems] = useState([]); // [{index, name, unit, addQty}]
  const [isStockOutOpen, setIsStockOutOpen] = useState(false);
  const [stockOutItems, setStockOutItems] = useState([]); // [{index, name, unit, currentQty, outQty, status}]
  const [stockOutNotes, setStockOutNotes] = useState(""); // shared note input for this stock out batch
  const [perItemNotes, setPerItemNotes] = useState({}); // map id -> note text for per-item notes in stock out modal
  const [noteTarget, setNoteTarget] = useState('ALL'); // 'ALL' or item id
  const [noteOpen, setNoteOpen] = useState(false);
  const noteRef = useRef(null);
  const [supplierList, setSupplierList] = useState([]);

 useEffect(() => {
  const fetchSuppliers = async () => {
    try {
      const snap = await getDocs(collection(db, "suppliers"));
      const names = snap.docs
        .map(doc => doc.data().supplier) // <-- use .supplier instead of .name
        .filter(name => !!name);
      setSupplierList(names);
    } catch (e) {
      console.error("Failed to fetch suppliers", e);
      setSupplierList([]);
    }
  };
  fetchSuppliers();
}, []);

  // close dropdown on outside click
  useEffect(() => {
    if (!noteOpen) return;
    const onDoc = (e) => {
      if (!noteRef.current) return;
      if (!noteRef.current.contains(e.target)) setNoteOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [noteOpen]);
  const [isStockOutSummaryOpen, setIsStockOutSummaryOpen] = useState(false);
  const [stockOutSummary, setStockOutSummary] = useState([]); // [{name,before,out,after}]
  const [stockOutValidationMessage, setStockOutValidationMessage] = useState('');
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
  // Delete inventory item modal state
  const [isDeleteItemOpen, setIsDeleteItemOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // { id, index, category }
  const [isDeletingItem, setIsDeletingItem] = useState(false);

  // Numeric input sanitizers
  const handleQuantityChange = (e) => {
    const digitsOnly = e.target.value.replace(/[^0-9]/g, "");
    setQuantityValue(digitsOnly);
  };

  // Item name: allow letters, spaces, hyphen and apostrophe only (strip numbers/symbols)
  const handleItemNameChange = (e) => {
    const cleaned = e.target.value.replace(/[^A-Za-z\s\-\']/g, "");
    setItemNameValue(cleaned);
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
    Critical: "bg-red-100 text-red-800 hover:bg-red-50 transition-colors",
    "Low Stock": "bg-yellow-100 text-yellow-800 hover:bg-yellow-50 transition-colors",
    "In Stock": "bg-green-100 text-green-800 hover:bg-green-50 transition-colors",
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

  // Base rows already filtered at fetch time, but defensively filter again in case cache contained a placeholder
  const baseRows = (dataMap[activeTab] ?? []).filter(r => r && r._id !== 'dummy');
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
      // Include 'item' (created by StockLogs Received flow) so name appears
      item: data.item_name || data.item || data.name || "",
      quantity: `${qtyNum} ${unit}`,
      expiration: expirationStr,
      supplier: data.supplier || "",
      unitCost: `₱${Number(data.unit_cost || 0).toFixed(2)}`,
      status,
  // notes_count historically stored total notes; prefer unread_notes_count for the notification badge.
  notesCount: Number(data.unread_notes_count ?? data.notes_count ?? 0),
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
    const norm = normalizeCategory(tab);
    let snap = await getDocs(collection(db, norm));
    // Fallback: if empty and norm differs from original or common variant, check variants
    if (snap.empty) {
      const variants = new Set([tab, norm]);
      if (norm === 'medicines') variants.add('medicine');
      if (norm === 'equipment') variants.add('equipments');
      for (const v of variants) {
        if (v === norm) continue;
        const s2 = await getDocs(collection(db, v));
        if (!s2.empty) { snap = s2; break; }
      }
    }
    const rows = snap.docs.filter(d => !isPlaceholderDoc(d.id, d.data())).map(mapDocToRow);
    setDataMap((prev) => ({ ...prev, [tab]: rows }));
    saveCache(tab, rows);
  };

  // Force refetch (skip cache) for a category
  const forceRefetch = async (tab) => {
    try {
      const norm = normalizeCategory(tab);
      let snap = await getDocs(collection(db, norm));
      if (snap.empty) {
        const variants = new Set([tab, norm]);
        if (norm === 'medicines') variants.add('medicine');
        if (norm === 'equipment') variants.add('equipments');
        for (const v of variants) {
          if (v === norm) continue;
          const s2 = await getDocs(collection(db, v));
          if (!s2.empty) { snap = s2; break; }
        }
      }
      const rows = snap.docs.filter(d => !isPlaceholderDoc(d.id, d.data())).map(mapDocToRow);
      setDataMap((prev) => ({ ...prev, [tab]: rows }));
      // Update cache with fresh data
      saveCache(tab, rows);
    } catch (e) { console.error('Failed to force refetch for', tab, e); }
  };

  // Note: selection is kept across tabs now. We still clear selection when
  // exiting select mode inside handleToggleSelect so there's no automatic
  // reset on tab change.
  
  // Quick Actions: toggles and inline edit helpers
  const handleToggleEdit = async () => {
    // If enabling edit mode, clear prior validation errors
    if (!editMode) {
      // disable select mode when entering edit mode
      setSelectMode(false);
      setSelectedRows(new Set());
      setEditValidationErrors([]);
      setEditMode(true);
      return;
    }

    // Attempting to finish editing: validate pending edits
    if (editMode && Object.keys(editedRows).length) {
      const errors = [];

      const parseUnitCost = (v) => {
        try {
          if (v === undefined || v === null) return null;
          if (typeof v === 'number') return v;
          const s = String(v).replace(/[^0-9.\-]/g, '');
          if (s.trim() === '') return null;
          const n = Number(s);
          return Number.isNaN(n) ? null : n;
        } catch (e) { return null; }
      };

      Object.entries(editedRows).forEach(([id, payload]) => {
        if (payload.item_name !== undefined) {
          if (!String(payload.item_name || '').trim()) errors.push({ id, message: 'Item name cannot be empty' });
        }
        if (payload.unit_cost !== undefined) {
          const num = parseUnitCost(payload.unit_cost);
          if (num === null) errors.push({ id, message: 'Unit cost must be a valid number' });
        }
      });

      if (errors.length) {
        setEditValidationErrors(errors);
        setIsValidationModalOpen(true);
        // keep edit mode enabled so user can fix inline values
        return;
      }

      // No validation errors — ask for confirmation before saving
      setIsConfirmSaveOpen(true);
      return;
    }

    setEditMode(false);
  };

  // commit edits after confirmation
  const confirmSaveEdits = async () => {
    setIsConfirmSaveOpen(false);
    if (!Object.keys(editedRows).length) {
      setEditMode(false);
      return;
    }
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
      setEditValidationErrors([]);
      setEditMode(false);
    } catch (e) {
      console.error('Failed to save edits', e);
    }
  };
  const handleToggleSelect = () => {
    setSelectMode((v) => {
      const next = !v;
      if (next) {
        // disable edit mode when entering select mode
        setEditMode(false);
        setEditedRows({});
        setEditValidationErrors([]);
        setIsConfirmSaveOpen(false);
        setIsValidationModalOpen(false);
      }
      if (!next) setSelectedRows(new Set());
      return next;
    });
  };
  // Select all rows across the entire inventory (all categories) and enable select mode
  const handleSelectAll = async () => {
    try {
      // Ensure we consider every known tab (consumables, medicines, equipment)
      const cols = tabs.map(t => t.id);
      const allIds = [];
      for (const col of cols) {
        let rows = dataMap[col];
        // If we don't have rows for this category in memory, fetch them now
        if (!rows || rows.length === 0) {
          try {
            const snap = await getDocs(collection(db, col));
            rows = snap.docs.filter(d => !isPlaceholderDoc(d.id, d.data())).map(mapDocToRow);
            // cache into dataMap so subsequent actions use the in-memory list
            setDataMap((prev) => ({ ...prev, [col]: rows }));
            try { sessionStorage.setItem(getCacheKey(col), JSON.stringify({ at: Date.now(), rows })); } catch {}
          } catch (e) {
            console.warn('Failed fetching tab for select all', col, e);
            rows = [];
          }
        }
        allIds.push(...(rows || []).filter(r => r && r._id !== 'dummy').map(r => r._id));
      }
      setSelectedRows(new Set(allIds.filter(Boolean)));
      setSelectMode(true);
      // keep Quick Actions closed for consistent UX
      setQaOpen(false);
    } catch (e) { console.error('Select all failed', e); }
  };
  // Toggle selection using the stable document id
  const toggleRowSelected = (id) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // Normalize expiration input to MM/DD/YYYY-ish format: accept digits only, auto-insert slashes
  const handleExpirationInput = (index, raw) => {
    try {
      const s = String(raw || '');
      // strip non-digits, limit to 8 digits (MMDDYYYY)
      const digits = s.replace(/[^0-9]/g, '').slice(0, 8);
      const mm = digits.slice(0, 2);
      const dd = digits.slice(2, 4);
      const yyyy = digits.slice(4); // remaining 0-4 digits
      const parts = [];
      if (mm) parts.push(mm);
      if (dd) parts.push(dd);
      if (yyyy) parts.push(yyyy);
      const formatted = parts.join('/');
      // Pass the formatted value to the existing inline change handler
      handleInlineChange(index, 'expiration', formatted);
    } catch (e) {
      console.error('Failed to parse expiration input', e);
      handleInlineChange(index, 'expiration', raw);
    }
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
    return { id: d.id, text: data.text || '', created_at: ts, created_by: data.created_by || null, created_by_name: data.created_by_name || null, read: !!data.read };
      }).sort((a,b) => (b.created_at?.getTime?.()||0) - (a.created_at?.getTime?.()||0));
      setNotesList(list);
    } catch (e) {
      console.error('Failed to load notes', e);
      setNotesList([]);
    } finally {
      setNotesLoading(false);
    }
  };

  // (Per-item notes via dropdown in Stock Out modal, old per-row notes opener removed)

  const addNoteNow = async () => {
    const text = (newNote || '').trim();
    if (!text || !notesItem?.id) return;
    try {
      // Resolve user identity for attribution
      let createdBy = null;
      let createdByName = null;
      try {
        const user = auth.currentUser;
        if (user) {
          createdBy = user.uid;
          createdByName = user.displayName || null;
          if (!createdByName) {
            // Attempt to fetch from accounts collection
            const acctSnap = await getDoc(doc(db, 'accounts', user.uid));
            if (acctSnap.exists()) {
              const ad = acctSnap.data() || {};
              createdByName = ad.full_name || [ad.first_name, ad.last_name].filter(Boolean).join(' ').trim() || null;
            }
          }
        }
      } catch {}
      const ref = await addDoc(collection(db, notesItem.category, notesItem.id, 'notes'), {
        text,
        created_at: serverTimestamp(),
        created_by: createdBy,
        created_by_name: createdByName,
        read: false,
      });
      // Optimistic: prepend with local timestamp for now; it will match server shortly
      const local = { id: ref.id, text, created_at: new Date(), created_by: createdBy, created_by_name: createdByName, read: false };
      setNotesList((prev) => [local, ...prev]);
      setNewNote("");
  // If this note applies to an item currently in the stockOutItems list,
  // attach the latest note text so confirmStockOut can include it in the log entry.
  setStockOutItems(prev => prev.map(p => p.id === notesItem.id ? { ...p, lastNoteText: text } : p));
  // Also store it in perItemNotes so the Stock Out modal dropdown shows it
  setPerItemNotes(prev => ({ ...(prev || {}), [notesItem.id]: text }));
      // Increment parent unread_notes_count in Firestore and locally (this controls the small badge)
      try {
        await updateDoc(doc(db, notesItem.category, notesItem.id), { unread_notes_count: increment(1) });
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
      // Check whether the note was unread to adjust counters
      const local = (notesList || []).find(n => n.id === noteId);
      const wasUnread = local ? !local.read : false;
      await deleteDoc(doc(db, notesItem.category, notesItem.id, 'notes', noteId));
      setNotesList((prev) => prev.filter((n) => n.id !== noteId));
      // Decrement parent unread_notes_count in Firestore and locally if it was unread
      if (wasUnread) {
        try {
          await updateDoc(doc(db, notesItem.category, notesItem.id), { unread_notes_count: increment(-1) });
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
      }
      setIsDeleteNoteOpen(false);
      setNoteToDelete(null);
    } catch (e) {
      console.error('Failed to delete note', e);
    } finally {
      setIsDeletingNote(false);
    }
  };

  // Inventory item delete helpers
  const askDeleteItem = (row) => {
    if (!row) return;
    // row is the display row object from displayRows iteration
    setItemToDelete({ id: row._id, index: row._sourceIndex, category: activeTab });
    setIsDeleteItemOpen(true);
  };

  const deleteItemNow = async () => {
    if (!itemToDelete || !itemToDelete.id) return;
    try {
      setIsDeletingItem(true);
      // Attempt to delete from Firestore using normalized collection names and common variants
      const norm = normalizeCategory(itemToDelete.category);
      const variants = new Set([itemToDelete.category, norm]);
      if (norm === 'medicines') variants.add('medicine');
      if (norm === 'equipment') variants.add('equipments');

      let deletedOnServer = false;
      for (const colName of variants) {
        try {
          const maybeRef = doc(db, colName, itemToDelete.id);
          const snap = await getDoc(maybeRef);
          if (snap.exists()) {
            await deleteDoc(maybeRef);
            deletedOnServer = true;
            break;
          }
        } catch (e) {
          // If a network/permission error occurs, abort and keep modal open
          console.error('Error deleting from firestore collection', colName, e);
          setIsDeletingItem(false);
          return;
        }
      }

      if (!deletedOnServer) {
        // Document wasn't found in any expected collection. Warn but allow local removal to keep UI consistent.
        console.warn('Inventory document not found in expected collections; removing locally only', Array.from(variants));
      }

      // Update in-memory and cache after remote deletion attempt succeeded or doc not found
      setDataMap((prev) => {
        const copy = { ...prev };
        const list = [...(copy[itemToDelete.category] || [])];
        const idx = list.findIndex((r) => r._id === itemToDelete.id);
        if (idx >= 0) {
          list.splice(idx, 1);
        }
        copy[itemToDelete.category] = list;
        try { sessionStorage.setItem(getCacheKey(itemToDelete.category), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
        return copy;
      });
      // Remove from selections if present
      setSelectedRows((prev) => {
        const next = new Set(prev);
        next.delete(itemToDelete.id);
        return next;
      });
      setIsDeleteItemOpen(false);
      setItemToDelete(null);
    } catch (e) {
      console.error('Failed to delete item', e);
    } finally {
      setIsDeletingItem(false);
    }
  };

  // Toggle read/unread for a note (no deletion). Keeps notes_count unchanged.
  // Mark a note as read once. This is one-directional: once read, it cannot be marked unread through this control.
  const toggleNoteRead = async (noteId) => {
    if (!noteId || !notesItem?.id) return;
    try {
      const current = (notesList || []).find(n => n.id === noteId);
      if (!current) return;
      if (current.read) return; // already read - do nothing (only single click allowed)
      // persist read flag and read_at timestamp
      const payload = { read: true, read_at: serverTimestamp() };
      await updateDoc(doc(db, notesItem.category, notesItem.id, 'notes', noteId), payload);
      // update local list
      setNotesList((prev) => prev.map((n) => (n.id === noteId ? { ...n, read: true } : n)));
      // decrement parent unread_notes_count
      try {
        await updateDoc(doc(db, notesItem.category, notesItem.id), { unread_notes_count: increment(-1) });
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
    } catch (e) {
      console.error('Failed to mark note as read', e);
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

  // Listen for inventory refresh events triggered after an order is marked Received
  useEffect(() => {
    const handler = (e) => {
      const cat = e.detail?.category;
      if (!cat) return;
      // Invalidate cache by removing it so future fetch uses Firestore
      try { sessionStorage.removeItem(getCacheKey(cat)); } catch {}
      forceRefetch(cat);
    };
    window.addEventListener('inventory:refresh', handler);
    return () => window.removeEventListener('inventory:refresh', handler);
  }, []);

  const [isSaving, setIsSaving] = useState(false);
  const [editValidationErrors, setEditValidationErrors] = useState([]); // [{id, message}]
  const [isConfirmSaveOpen, setIsConfirmSaveOpen] = useState(false);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  // New Order validation: require item name, positive quantity, unit cost, supplier and unit
  const isNewOrderValid = (() => {
    const name = (itemNameValue || '').toString().trim();
    const qty = Number((quantityValue || '').toString().trim() || 0);
    const supplier = (supplierValue || '').toString().trim();
    // Only require name, quantity, and supplier
    return name.length > 0 && qty > 0 && supplier.length > 0;
  })();

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
      const collectionName = activeTab; // where the item will belong once received
      // Allow dev override for lock window (ms) using localStorage key 'stocklogs.lockMs'
      let lockMs = 48 * 60 * 60 * 1000; // 48h default
      try {
        const override = localStorage.getItem('stocklogs.lockMs');
        if (override) {
          const n = Number(override);
            if (!isNaN(n) && n > 0) lockMs = n;
        }
      } catch {}

      const payload = {
        item_name: itemName,
        item: itemName, // duplicate for downstream consumers expecting either field
        quantity: qty,
        supplier: supplierValue,
        unit_cost: cost,
        units: unitValue,
        created_at: serverTimestamp(),
        lock_until: Timestamp.fromDate(new Date(Date.now() + lockMs)),
        created_by: auth?.currentUser?.uid || null,
        status: "Ordered",
        category: collectionName,
      };

      // Save only to 'ordered' (Transaction Tracker). Inventory item will be created when status becomes 'Received'.
      // Use sequential IDs for ordered documents (e.g., 0001, 0002)
      try {
        // Create patterned random ID like "22-2232" for ordered docs
        const createPattern = (await import('../../lib/idGen')).createPatternDoc;
        await createPattern('ordered', payload, { leftDigits: 2, rightDigits: 4, separator: '-' });
      } catch (e) {
        console.warn('Failed to create ordered doc with patterned id, falling back to sequential or auto-id', e);
        try {
          const createSeq = (await import('../../lib/firestoreSeq')).createSequentialDoc;
          await createSeq('ordered', payload, { counterId: 'ordered_counter', prefix: '', digits: 4 });
        } catch (e2) {
          console.warn('Sequential fallback failed, using default addDoc', e2);
          await addDoc(collection(db, "ordered"), payload);
        }
      }

      // reset form
      setItemNameValue("");
      setQuantityValue("");
      setUnitCostValue("");
      setSupplierValue("Select Supplier");
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

  // Normalize incoming category identifiers to match the canonical collection names used when writing
  function normalizeCategory(c) {
    const v = (c || '').toString().trim().toLowerCase();
    if (v === 'medicine') return 'medicines';
    if (v === 'equipments') return 'equipment';
    if (['consumable','consumables'].includes(v)) return 'consumables';
    if (['medicines'].includes(v)) return 'medicines';
    if (['equipment'].includes(v)) return 'equipment';
    return 'consumables';
  }

  // ==== DEV / DEBUG HELPERS =================================================
  // Deletes all non-placeholder docs in the specified category (handles singular/plural variants)
  const devDeleteCategoryDocs = async (cat) => {
    const norm = normalizeCategory(cat);
    const variants = new Set([norm, cat]);
    if (norm === 'medicines') variants.add('medicine');
    if (norm === 'equipment') variants.add('equipments');
    try {
      for (const colName of variants) {
        const snap = await getDocs(collection(db, colName));
        if (snap.empty) continue;
        const batch = writeBatch(db);
        let any = false;
        snap.docs.forEach(d => {
          const data = d.data() || {};
            if (isPlaceholderDoc(d.id, data)) return; // preserve placeholder/dummy
            batch.delete(doc(db, colName, d.id));
            any = true;
        });
        if (any) await batch.commit();
      }
    } catch (e) { console.error('DEV: failed deleting docs for', cat, e); }
  };

  // Clears in-memory & cached rows for a category and deletes underlying docs.
  const debugClearCategory = async (cat) => {
    const norm = normalizeCategory(cat || activeTab);
    await devDeleteCategoryDocs(norm);
    // Remove cache + in-memory data
    try { sessionStorage.removeItem(getCacheKey(norm)); } catch {}
    setDataMap(prev => ({ ...prev, [norm]: [] }));
  };

  // Expose a global helper for quick console access (window._invClearCategory('medicines'))
  useEffect(() => {
    window._invClearCategory = (c) => debugClearCategory(c);
    return () => { try { delete window._invClearCategory; } catch {} };
  }, []);

  // Helpers for restock modal
  const openRestock = () => {
    if (!selectMode || selectedRows.size === 0) return;
    // Convert selected ids to the actual rows across categories
    const ids = Array.from(selectedRows);
    const list = ids.map((id) => {
      // find the item in any category
      for (const cat of Object.keys(dataMap)) {
        const arr = dataMap[cat] || [];
        const idx = arr.findIndex(r => r._id === id);
        if (idx >= 0) {
          const r = arr[idx];
          const m = /^\s*(\d+)\s*(.*)$/.exec(r.quantity || "0 units");
          const current = m ? parseInt(m[1], 10) : 0;
          const unit = m ? (m[2] || "units").trim() : "units";
          return { id, category: cat, index: idx, name: r.item, unit, currentQty: current, addQty: 1 };
        }
      }
      return null;
    }).filter(Boolean);
    // dedupe by id in case the same id was somehow included multiple times
    const seen = new Set();
    const unique = [];
    for (const it of list) {
      if (!seen.has(it.id)) { seen.add(it.id); unique.push(it); }
    }
    setRestockItems(unique);
    setIsRestockOpen(true);
  };

  const adjustRestockQty = (id, delta) => {
    setRestockItems((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      // coerce to number to avoid string concatenation (e.g. '1225' + 1 -> '12251')
      const cur = Number(it.addQty) || 0;
      let next = Math.max(0, cur + delta);
      // cap to 4 digits
      if (next > 9999) next = 9999;
      return { ...it, addQty: next };
    }));
  };

  const confirmRestock = async () => {
    try {
      // update each item in its originating category
      for (const it of restockItems) {
        const numericAdd = typeof it.addQty === 'number' ? it.addQty : parseInt(it.addQty, 10) || 0;
        if (!numericAdd) continue;
        const row = (dataMap[it.category] || []).find(r => r._id === it.id);
        if (!row) continue;
        const newQty = Math.max(0, (it.currentQty || 0) + numericAdd);
        const status = newQty <= 20 ? 'Critical' : newQty <= 60 ? 'Low Stock' : 'In Stock';
        try {
          await updateDoc(doc(db, it.category, it.id), { quantity: newQty, status });
        } catch (e) { console.warn('Failed updating restock for', it, e); }
        // update cache & in-memory
        setDataMap(prev => {
          const copy = { ...prev };
          const list = [...(copy[it.category] || [])];
          const idx = list.findIndex(r => r._id === it.id);
          if (idx >= 0) {
            const next = { ...list[idx], quantity: `${newQty} ${it.unit}`, status };
            list[idx] = next;
            copy[it.category] = list;
            try { sessionStorage.setItem(getCacheKey(it.category), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
          }
          return copy;
        });
          // Also create a restock log so Stock Logs can show this as a restock transaction
          try {
            // Use sequential ID helper so stock_in documents get readable, incrementing IDs
            const createSeq = (await import('../../lib/firestoreSeq')).createSequentialDoc;
            const currentUser = auth?.currentUser;
            const payload = {
              item_name: row.item || row.item_name || '',
              quantity: numericAdd,
              units: it.unit || '',
              unit_cost: 0,
              supplier: row.supplier || '',
              reference: `RS-${new Date().getFullYear()}`,
              created_by: currentUser ? currentUser.uid : null,
              status: 'Received',
              is_restock: true,
              moved_to_inventory: true,
              category: it.category,
            };
            // counterId 'stock_in_counter' ensures the counter document name is fixed
            await createSeq('stock_in', payload, { counterId: 'stock_in_counter', prefix: `RS-${new Date().getFullYear()}-`, digits: 4 });
          } catch (e) {
            console.warn('Failed to write restock log to stock_in collection', e);
          }
      }
    } catch (e) { console.error('Failed to persist restock', e); }
    setIsRestockOpen(false);
    setSelectMode(false);
    setSelectedRows(new Set());
    setTimeout(() => { setSuccessType('restock'); setIsSuccessOpen(true); }, 180);
  };

  // Stock Out helpers
  const openStockOut = () => {
    if (!selectMode || selectedRows.size === 0) return;
    const ids = Array.from(selectedRows);
    const list = ids.map((id) => {
      for (const cat of Object.keys(dataMap)) {
        const arr = dataMap[cat] || [];
        const idx = arr.findIndex(r => r._id === id);
        if (idx >= 0) {
          const r = arr[idx];
          const m = /^\s*(\d+)\s*(.*)$/.exec(r.quantity || "0 units");
          const current = m ? parseInt(m[1], 10) : 0;
          const unit = m ? (m[2] || "units").trim() : "units";
          // Start with blank outQty so user enters value manually
          return { id, category: cat, index: idx, name: r.item, unit, currentQty: current, outQty: '', status: r.status };
        }
      }
      return null;
    }).filter(Boolean);
    // dedupe by id
    const seen2 = new Set();
    const unique2 = [];
    for (const it of list) {
      if (!seen2.has(it.id)) { seen2.add(it.id); unique2.push(it); }
    }
    setStockOutItems(unique2);
    setIsStockOutOpen(true);
  };

  const adjustStockOutQty = (id, delta) => {
    setStockOutItems((prev) => prev.map((it) => {
      if (it.id !== id) return it;
      const cur = Number(it.currentQty || 0);
      const MIN_REMAINING = 10; // keep at least 10 for constrained items
      const maxAllowed = (it.status === 'Low Stock' || it.status === 'Critical') ? Math.max(0, cur - MIN_REMAINING) : cur;
      const next = Math.max(0, (Number(it.outQty) || 0) + delta);
      const clamped = Math.min(next, maxAllowed);
      return { ...it, outQty: clamped };
    }));
  };

  const confirmStockOut = async () => {
    // Defensive validation: ensure UI requirements met even if button was clickable
    const anyPositive = stockOutItems.some(it => it.status !== 'Critical' && (parseInt(it.outQty,10) || 0) > 0);
    const allFilled = stockOutItems.every(it => it.status === 'Critical' ? true : (it.outQty !== '' && it.outQty !== null && it.outQty !== undefined));
    if (!anyPositive) {
      setStockOutValidationMessage('Enter at least one quantity greater than zero');
      return;
    }
    if (!allFilled) {
      setStockOutValidationMessage('Please fill quantity for all selectable items (enter 0 if not stocking out this item)');
      return;
    }
    // Defensive: ensure no requested stock-out exceeds current available quantity
    const overLimit = stockOutItems.find(it => {
      const outN = parseInt(it.outQty, 10) || 0;
      const cur = Number(it.currentQty || 0);
      return outN > cur;
    });
    if (overLimit) {
      setStockOutValidationMessage(`Quantity for "${overLimit.name}" cannot exceed available (${overLimit.currentQty}).`);
      return;
    }
    setStockOutValidationMessage('');
    // Precompute summary with stable ids to avoid category/index mismatches
    const summary = stockOutItems.map(({ id, category, name, currentQty, outQty, unit, status }) => {
      const numericOut = typeof outQty === 'number' ? outQty : parseInt(outQty, 10) || 0;
      const after = Math.max(0, (currentQty || 0) - numericOut);
      return { id, category, name, before: currentQty, out: numericOut, after, unit, status };
    });

  // Business rule: enforce minimum remaining stock per item (leave at least 10 units)
  // The user requested that items cannot be fully drained; ensure remaining >= 10
  const MIN_REMAINING = 10;
    // Only enforce the minimum remaining rule for items that are already Low Stock or Critical
    const violatesMin = summary.find(s => (s.status === 'Low Stock' || s.status === 'Critical') && s.after < MIN_REMAINING);
    if (violatesMin) {
      setStockOutValidationMessage(`Cannot stock out "${violatesMin.name}" — remaining would be ${violatesMin.after}. Please leave at least ${MIN_REMAINING} ${violatesMin.unit}.`);
      return;
    }

    // Update in-memory data per category
    setDataMap((prev) => {
      const copy = { ...prev };
      for (const s of summary) {
        const list = [...(copy[s.category] || [])];
        const idx = list.findIndex(r => r._id === s.id);
        if (idx >= 0) {
          const status = s.after <= 20 ? 'Critical' : s.after <= 60 ? 'Low Stock' : 'In Stock';
          list[idx] = { ...list[idx], quantity: `${s.after} ${s.unit}`, status };
          copy[s.category] = list;
        }
      }
      return copy;
    });

    try {
      // Persist each affected item using its originating category
      for (const s of summary) {
        const status = s.after <= 20 ? 'Critical' : s.after <= 60 ? 'Low Stock' : 'In Stock';
        try {
          await updateDoc(doc(db, s.category, s.id), { quantity: s.after, status });
        } catch (e) { console.warn('Failed to persist stock out for', s, e); }
        // update cache
        try {
          const list = (dataMap[s.category] || []).map(r => r._id === s.id ? { ...r, quantity: `${s.after} ${s.unit}`, status } : r);
          try { sessionStorage.setItem(getCacheKey(s.category), JSON.stringify({ at: Date.now(), rows: list })); } catch {}
        } catch {}
      }
      // Log stock-out events for dashboard usage trend
      const refBase = Date.now().toString(36).toUpperCase();
      const logs = summary
        .filter(s => (s.out || 0) > 0)
          .map((s, i) => {
          // prefer perItemNotes mapping (set via dropdown / apply-to-all)
          const perNote = (perItemNotes && perItemNotes[s.id]) ? String(perItemNotes[s.id]).trim() : '';
          const batchNote = stockOutNotes.trim() || '';
          const notesForLog = perNote || batchNote;
          // try to read supplier from the in-memory dataMap for the originating category
          let supplierName = '';
          let unitCostForLog = 0;
          try {
            const list = dataMap && dataMap[s.category] ? dataMap[s.category] : [];
            const found = list.find(r => r._id === s.id);
            supplierName = (found && found.supplier) ? found.supplier : '';
            // parse possible formatted unit cost values (e.g. "₱222.00" or "222.00")
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
            if (found) {
              unitCostForLog = parsePossibleCost(found.unit_cost ?? found.unitCost ?? found.unitPrice ?? found.unit_price ?? found.price ?? 0);
            }
          } catch (e) { supplierName = ''; unitCostForLog = 0; }
          return {
            category: s.category,
            item_name: s.name,
            quantity: Number(s.out || 0),
            unit_cost: unitCostForLog,
            unit: s.unit,
            type: 'stock_out',
            created_by: auth?.currentUser?.uid || null,
            supplier: supplierName || '',
            reference: `SO-${refBase}-${i+1}`,
            timestamp: serverTimestamp(),
            timestamp_local: Date.now(),
            notes: notesForLog,
          };
        });
      if (logs.length) {
        try {
          await Promise.all(logs.map((payload) => addDoc(collection(db, 'stock_logs'), payload)));
        } catch (e) {
          console.warn('Failed to write some stock logs', e);
        }
        // Notify dashboard (and any other listeners) to refresh usage trend
        try {
          window.dispatchEvent(new CustomEvent('usage:refresh'));
        } catch (e) {}
      }
    } catch (e) { console.error('Failed to persist stock out', e); }

    setIsStockOutOpen(false);
    setStockOutNotes("");
    setSelectMode(false);
    setSelectedRows(new Set());
    const changed = summary.filter(s => (s.out || 0) > 0);
    setStockOutSummary(changed);
    if (changed.length) {
      setTimeout(() => setIsStockOutSummaryOpen(true), 120);
    } else {
      // No actual changes to show; show simple success flow
      setTimeout(() => { setSuccessType('stockOut'); setIsSuccessOpen(true); }, 160);
    }
  };

  return (
    <div className="h-screen overflow-hidden flex" style={{backgroundColor: '#F5F5F5'}}>
      {/* Sidebar */}
      <div className={`flex-shrink-0 transition-[width] duration-200 ${sidebarCollapsed ? 'w-20' : 'w-64'}`}>
        <DashboardSidebarSection currentPage="INVENTORY" />
      </div>
      {/* Validation Modal: informs user required fields are missing */}
      <div className={`${isValidationModalOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[82] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => { if (!isValidationModalOpen) return; setIsValidationModalOpen(false); }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className={`relative z-10 w-[520px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isValidationModalOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`} onClick={(e) => e.stopPropagation()}>
          <button className="absolute right-3 top-3 p-1 rounded-full hover:bg-gray-100" onClick={() => setIsValidationModalOpen(false)} aria-label="Close">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-red-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.487 0l5.454 9.692A1.75 1.75 0 0116.454 15H3.546a1.75 1.75 0 01-1.744-2.209L8.257 3.1zM11 13a1 1 0 10-2 0 1 1 0 002 0zm-1-9a.75.75 0 00-.75.75v5.5c0 .414.336.75.75.75s.75-.336.75-.75v-5.5A.75.75 0 0010 4z" clipRule="evenodd" /></svg>
            </div>
            <h3 className="mt-4 [font-family:'Inter',Helvetica] font-semibold text-gray-900 text-lg">Missing required fields</h3>
            <p className="mt-2 [font-family:'Oxygen',Helvetica] text-gray-500 text-sm">Please fill required fields before saving. Required: Item name and Unit cost.</p>
            <div className="mt-4 text-left max-h-40 overflow-auto px-4">
              <ul className="list-disc list-inside text-sm text-red-700">
                {editValidationErrors.map((err, i) => (
                  <li key={i}>{err.message}</li>
                ))}
              </ul>
            </div>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button onClick={() => setIsValidationModalOpen(false)} className="px-5 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white">OK</Button>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Save Modal */}
      <div className={`${isConfirmSaveOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[83] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => { if (!isConfirmSaveOpen) return; setIsConfirmSaveOpen(false); }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div className={`relative z-10 w-[440px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isConfirmSaveOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`} onClick={(e) => e.stopPropagation()}>
          <button className="absolute right-3 top-3 p-1 rounded-full hover:bg-gray-100" onClick={() => setIsConfirmSaveOpen(false)} aria-label="Close">
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-yellow-100 flex items-center justify-center shadow-sm">
              <svg className="w-6 h-6 text-yellow-600" viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 7h2v5H9V7zm0 6h2v2H9v-2z"/></svg>
            </div>
            <h3 className="mt-4 [font-family:'Inter',Helvetica] font-semibold text-gray-900 text-lg">Save changes?</h3>
            <p className="mt-1 [font-family:'Oxygen',Helvetica] text-gray-500 text-sm">Are you sure you want to save your inline edits? This will update the inventory records.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button onClick={() => setIsConfirmSaveOpen(false)} className="px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">Cancel</Button>
              <Button onClick={confirmSaveEdits} className="px-5 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white">Yes, save</Button>
            </div>
          </div>
        </div>
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
  <AppHeader title="INVENTORY" subtitle="Manage your dental supplies and item inventory" searchPlaceholder="Search items" />

          {/* Action Buttons */}
          <div className="px-8 py-4 flex justify-end gap-4 relative">
          <div className="relative inv-status-filter">
            <Button onClick={() => { setStatusOpen((v) => { const next = !v; if (next) { setQaOpen(false); setSupplierOpen(false); setUnitOpen(false);} return next; }); }} className="px-8 py-3 bg-[#00b7c2] hover:bg-[#009ba5] text-white rounded-full [font-family:'Oxygen',Helvetica] font-semibold text-lg shadow-lg">
              <FilterIcon className="w-4 h-4 mr-2" />
              {statusFilter}
              <ChevronDownIcon className={`ml-2 w-4 h-4 transition-transform ${statusOpen ? 'rotate-180' : ''}`} />
            </Button>
      <div className={`${statusOpen ? 'opacity-100 scale-100 translate-y-0 dropdown-anim-in' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl ring-1 ring-black/5 transition-all duration-150 origin-top-right overflow-hidden`}
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
          <div className="relative inv-qa">
            <Button onClick={() => { setQaOpen((v) => { const next = !v; if (next) { setStatusOpen(false); setSupplierOpen(false); setUnitOpen(false);} return next; }); }} className="px-8 py-3 bg-[#00b7c2] hover:bg-[#009ba5] text-white rounded-full [font-family:'Oxygen',Helvetica] font-semibold text-lg shadow-lg">
              Quick Actions
              <ChevronDownIcon className={`ml-2 w-4 h-4 transition-transform ${qaOpen ? 'rotate-180' : ''}`} />
            </Button>
      <div className={`${qaOpen ? 'opacity-100 scale-100 translate-y-0 dropdown-anim-in' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl ring-1 ring-black/5 transition-all duration-150 origin-top-right overflow-hidden`}
                 onMouseLeave={() => setQaOpen(false)}>
              <button onClick={handleToggleEdit} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${editMode ? 'bg-[#00b7c2]' : 'bg-transparent border border-gray-300'}`} />
                Edit
              </button>
              <div className="h-px bg-gray-100" />
              <button onClick={handleToggleSelect} className="w-full text-left px-4 py-2 hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                <span className={`inline-block w-2 h-2 rounded-full ${selectMode ? 'bg-[#00b7c2]' : 'bg-transparent border border-gray-300'}`} />
                Select
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
          <div className="bg-white rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.08)] border border-gray-200 p-6 flex flex-col min-h-[440px] max-h-[calc(100vh-300px)]">
            {/* Overview Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="[font-family:'Inter',Helvetica] font-semibold text-xl text-gray-900">
                OVERVIEW ({displayRows.length} {displayRows.length === 1 ? 'item' : 'items'})
              </h2>
              {selectMode && (
                <div>
                  <div className="flex items-center gap-2">
                    <Button onClick={handleToggleSelect} className="px-4 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white [font-family:'Oxygen',Helvetica] font-semibold text-sm">Unselect</Button>
                    <Button onClick={handleSelectAll} className="px-4 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white [font-family:'Oxygen',Helvetica] font-semibold text-sm">Select All</Button>
                  </div>
                </div>
              )}
            </div>

            {/* Inventory Table */}
            {editValidationErrors && editValidationErrors.length > 0 && (
              <div className="mb-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-800">
                <div className="font-medium">Fix the following before saving:</div>
                <ul className="mt-1 list-disc list-inside">
                  {editValidationErrors.slice(0,5).map((err, idx) => (
                    <li key={idx}>{err.message}</li>
                  ))}
                </ul>
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm flex-1 overflow-y-auto min-h-[180px]">
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
                            checked={selectedRows.has(item._id)}
                            onChange={() => toggleRowSelected(item._id)}
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
                            onChange={(e) => handleExpirationInput(item._sourceIndex, e.target.value)}
                            inputMode="numeric"
                            placeholder="MM/DD/YYYY"
                            maxLength={10} /* allow up to 'MM/DD/YYYY' (including slashes) */
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
                        <div className="flex items-center gap-1">
                          <div className="relative">
                            <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors" aria-label="Row notes" onClick={() => openNotes(item._sourceIndex)}>
                              <img src={menuIcon} alt="Notes" className="w-4 h-4 object-contain" />
                            </button>
                            {Number(item.notesCount || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-[3px] rounded-full bg-[#00b7c2] text-white text-[10px] leading-[16px] text-center border border-white shadow-sm">
                                {Math.min(99, Number(item.notesCount || 0))}
                              </span>
                            )}
                          </div>
                          {editMode && (
                            <button
                              className="p-2 hover:bg-gray-100 rounded-lg transition-colors text-green-600"
                              title="Finish editing"
                              onClick={handleToggleEdit}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.42L8.25 10.955 5.7 8.4a1 1 0 10-1.4 1.428l3.25 3.186a1 1 0 001.404-.006l7.75-7.72z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                          {editMode && (
                            <button
                              className="p-2 hover:bg-red-50 rounded-lg transition-colors text-red-600"
                              title="Delete item"
                              onClick={() => askDeleteItem(item)}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H3a1 1 0 100 2h14a1 1 0 100-2h-2V3a1 1 0 00-1-1H6zm2 6a1 1 0 10-2 0v6a1 1 0 102 0V8zm6 0a1 1 0 10-2 0v6a1 1 0 102 0V8z" clipRule="evenodd" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="flex items-center justify-between mt-4">
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
            <div className="flex items-center gap-6">
              {legendItems.map((status) => (
                <div key={status.label} className="flex items-center gap-2">
                  <div className={`w-4 h-4 ${status.color} rounded-full border border-gray-400 shadow-inner`} />
                  <span className="[font-family:'Oxygen',Helvetica] text-gray-600 text-sm">{status.label}</span>
                </div>
              ))}
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
                <label className="block text-sm text-gray-600 mb-1">Item Name <span className="text-red-500">*</span></label>
                <Input className="h-10 rounded-full" value={itemNameValue} onChange={handleItemNameChange} />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Supplier Name <span className="text-red-500">*</span></label>
                <div className="relative inv-supplier">
                  <button
                    type="button"
                    onClick={() => setSupplierOpen((v) => {
                      const next = !v;
                      if (next) { setUnitOpen(false); setStatusOpen(false); setQaOpen(false);}
                      return next;
                    })}
                    className="w-full h-10 pl-4 pr-9 rounded-full border border-gray-300 text-left focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20"
                  >
                    <span className="text-gray-700">{supplierValue}</span>
                    <ChevronDownIcon className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 transition-transform ${supplierOpen ? 'rotate-180' : ''}`} />
                  </button>
                  <div className={`${supplierOpen ? 'opacity-100 scale-100 translate-y-0 dropdown-anim-in' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute z-10 mt-2 w-full bg-white rounded-xl shadow-xl ring-1 ring-black/5 transition-all duration-150 origin-top overflow-hidden`}
                    onMouseLeave={() => setSupplierOpen(false)}>
                    {supplierList.length === 0 ? (
                      <div className="px-4 py-2 text-gray-400">No suppliers found</div>
                    ) : (
                      supplierList.map(opt => (
                        <div key={opt}
                          onClick={() => { setSupplierValue(opt); setSupplierOpen(false); }}
                          className={`px-4 py-2 cursor-pointer hover:bg-gray-50 ${supplierValue === opt ? 'text-[#00b7c2] font-medium' : 'text-gray-700'}`}>
                          {opt}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 mb-1">Quantity <span className="text-red-500">*</span></label>
                <Input
                  className="h-10 rounded-full"
                  value={quantityValue}
                  onChange={handleQuantityChange}
                  inputMode="numeric"
                  pattern="[0-9]*"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Units <span className="text-red-500">*</span></label>
                <div className="relative inv-unit">
                  <input
                    type="text"
                    value="Boxes"
                    disabled
                    className="w-full h-10 pl-4 pr-9 rounded-full border border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed"
                    readOnly
                  />
                </div>
              </div>

            </div>

            <div className="mt-6 flex flex-col items-center gap-2">
              <Button
                onClick={handleSave}
                disabled={!isNewOrderValid || isSaving}
                aria-disabled={!isNewOrderValid || isSaving}
                className={`${!isNewOrderValid || isSaving ? 'px-8 py-2 rounded-full text-white bg-gray-400 cursor-not-allowed' : 'px-8 py-2 rounded-full bg-[#00b7c2] hover:bg-[#009ba5] text-white'} shadow-lg`}
              >
                {isSaving ? 'Saving…' : 'Save'}
              </Button>
              {!isNewOrderValid && <div className="text-xs text-red-500">Please fill all required fields</div>}
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
              {/* limit to ~5 rows and scroll internally to avoid expanding modal */}
              <div className="divide-y divide-gray-200 max-h-[280px] overflow-y-auto overflow-x-hidden">
                {restockItems.map((it) => (
                    <div key={it.id} className="grid grid-cols-2 items-center px-4 py-3">
                    <div>
                      <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.name}</div>
                      <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500">{it.currentQty} {it.unit}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => adjustRestockQty(it.id, -1)}
                        className="w-9 h-9 rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="\\d{0,4}"
                        placeholder="0"
                        value={it.addQty}
                        onChange={(e) => {
                          let raw = e.target.value.replace(/[^0-9]/g, '');
                          if (raw === '') {
                            setRestockItems(prev => prev.map(p => p.id === it.id ? { ...p, addQty: '' } : p));
                            return;
                          }
                          if (raw.length > 4) raw = raw.slice(0,4);
                          const n = parseInt(raw, 10) || 0;
                          setRestockItems(prev => prev.map(p => p.id === it.id ? { ...p, addQty: n } : p));
                        }}
                        className="w-24 h-9 rounded-md border border-gray-300 focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20 text-center [font-family:'Inter',Helvetica] text-gray-800 text-sm tracking-wide"
                      />
                      <button
                        type="button"
                        onClick={() => adjustRestockQty(it.id, 1)}
                        className="w-9 h-9 rounded-md border border-gray-300 bg-white text-gray-700 flex items-center justify-center hover:bg-gray-50"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
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
                <div className="px-4 py-3 text-left">Item Name</div>
                <div className="px-4 py-3 text-center">Status</div>
                <div className="px-4 py-3 text-center">Quantity</div>
              </div>
              {/* limit to ~5 rows and scroll internally to avoid expanding modal */}
              <div className="divide-y divide-gray-200 max-h-[320px] overflow-y-auto overflow-x-hidden">
                {stockOutItems.map((it) => (
                  <div key={it.id} className="grid grid-cols-3 items-center px-4 py-3">
                    <div>
                      <div className="[font-family:'Inter',Helvetica] text-gray-900">{it.name}</div>
                      <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500">{it.currentQty} {it.unit}</div>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Badge className={`px-3 py-1 rounded-full text-xs font-medium ${statusStyleMap[it.status] || 'bg-gray-100 text-gray-700'}`}>{it.status}</Badge>
                    </div>
                    <div className="flex flex-col items-center gap-1">
                      <div className="flex items-center gap-3">
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="\\d{0,4}"
                          placeholder={it.status === 'Critical' ? '—' : '0'}
                          value={it.outQty}
                          onChange={(e) => {
                            // Prevent editing critical items (defensive)
                            if (it.status === 'Critical') return;
                            let raw = e.target.value.replace(/[^0-9]/g, '');
                            if (raw.length > 4) raw = raw.slice(0,4);
                            if (raw !== '') {
                              const n = parseInt(raw, 10) || 0;
                              const cur = Number(it.currentQty || 0);
                              const MIN_REMAINING = 10; // keep at least 10 units for constrained items
                              const maxAllowed = (it.status === 'Low Stock' || it.status === 'Critical') ? Math.max(0, cur - MIN_REMAINING) : cur;
                              const clamped = Math.min(n, maxAllowed);
                              raw = String(clamped);
                            }
                            setStockOutItems(prev => prev.map(p => p.id === it.id ? { ...p, outQty: raw } : p));
                          }}
                          disabled={it.status === 'Critical'}
                          aria-invalid={it.status === 'Critical'}
                          className={`w-28 h-9 rounded-md border ${it.status === 'Critical' ? 'border-red-400 bg-white text-gray-800' : 'border-gray-300'} ${it.status === 'Critical' ? 'focus:border-red-400 focus:ring-2 focus:ring-red-100' : 'focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20'} text-center [font-family:'Inter',Helvetica] text-gray-800 text-sm tracking-wide`}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Notes Input / Per-item dropdown */}
            <div className="mt-6">
              <label className="block text-sm text-gray-600 mb-1">Notes</label>
              <div className="flex items-start gap-3">
                <div className="w-44 relative" ref={noteRef}>
                  <label className="text-xs text-gray-500">Apply note to</label>
                  <button type="button" onClick={() => setNoteOpen(v => !v)} className="w-full mt-1 rounded-md border border-gray-300 px-3 py-2 text-left flex items-center justify-between">
                    <span className="truncate">{noteTarget === 'ALL' ? 'Entire batch (default)' : (stockOutItems.find(i => i.id === noteTarget)?.name || noteTarget)}</span>
                    <svg className={`w-4 h-4 ml-2 transition-transform ${noteOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd"/></svg>
                  </button>
                  <div className={`absolute z-40 left-0 right-0 mt-2 bg-white rounded-lg shadow-lg ring-1 ring-black/5 overflow-hidden transition-all origin-top ${noteOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'}`}>
                    <div className="py-1">
                      <button onClick={() => { setNoteTarget('ALL'); setNoteOpen(false); }} className={`w-full text-left px-3 py-2 text-sm ${noteTarget === 'ALL' ? 'bg-[#E6F7F9] text-[#00b7c2] font-medium' : 'hover:bg-gray-50'}`}>Entire batch (default)</button>
                      {stockOutItems.map(it => (
                        <button key={it.id} onClick={() => { setNoteTarget(it.id); setNoteOpen(false); }} className={`w-full text-left px-3 py-2 text-sm ${noteTarget === it.id ? 'bg-[#E6F7F9] text-[#00b7c2] font-medium' : 'hover:bg-gray-50'}`}>{it.name}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500">Note content</label>
                  <textarea
                    className="w-full min-h-[90px] rounded-lg border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#00b7c2]/20 focus:border-[#00b7c2] text-sm"
                    placeholder="Add optional notes about why items are stocked out, usage context, patient case, etc."
                    value={noteTarget === 'ALL' ? stockOutNotes : (perItemNotes[noteTarget] || '')}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (noteTarget === 'ALL') setStockOutNotes(v);
                      else setPerItemNotes(prev => ({ ...(prev||{}), [noteTarget]: v }));
                    }}
                    maxLength={800}
                  />
                  <div className="mt-1 text-xs text-gray-400 text-right">{(noteTarget === 'ALL' ? stockOutNotes.length : (perItemNotes[noteTarget]||'').length)}/800</div>
                </div>
              </div>
              <div className="mt-2">
                <button type="button" onClick={() => {
                  // apply current note content to all items
                  const content = (noteTarget === 'ALL' ? stockOutNotes : (perItemNotes[noteTarget]||''));
                  if (!content) return;
                  const map = {};
                  stockOutItems.forEach(it => { map[it.id] = content; });
                  setPerItemNotes(map);
                }} className="px-3 py-2 rounded-full bg-[#00b7c2] text-white">Apply to all items</button>
              </div>
            </div>

            {(() => {
              // For validation require:
              // - every non-Critical selectable item must have a quantity entered (can be 0)
              // - at least one non-Critical item must have a positive quantity
              const anyPositive = stockOutItems.some(it => it.status !== 'Critical' && (parseInt(it.outQty,10) || 0) > 0);
              const allFilled = stockOutItems.every(it => it.status === 'Critical' ? true : (it.outQty !== '' && it.outQty !== null && it.outQty !== undefined));
              const canSubmit = anyPositive && allFilled;
              return (
                <div className="mt-6 flex flex-col items-center gap-2">
                  <Button disabled={!canSubmit} onClick={confirmStockOut} className={`px-8 py-2 rounded-full text-white shadow-lg ${!canSubmit ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#00b7c2] hover:bg-[#009ba5]'}`}>
                    Stock out
                  </Button>
                  {!anyPositive && <div className="text-xs text-gray-400">Enter at least one quantity greater than zero</div>}
                  {anyPositive && !allFilled && <div className="text-xs text-red-500">Please fill quantity for all selectable items (enter 0 if not stocking out this item)</div>}
                  {stockOutValidationMessage && (
                    <div role="alert" aria-live="polite" className="text-xs text-red-500 text-center max-w-[520px] px-3">
                      {stockOutValidationMessage}
                    </div>
                  )}
                </div>
              );
            })()}
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
              <div className="text-lg font-semibold">Notes</div>
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
                    <div key={n.id} className={`px-4 py-3 ${n.read ? '' : 'bg-blue-50/60 border-l-4 border-blue-200'}`}>
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
                            <div className="[font-family:'Inter',Helvetica] text-gray-900 text-sm whitespace-pre-wrap break-words max-w-[340px]">{n.text}</div>
                            <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-500 mt-1">
                              {(() => {
                                const name = n.created_by_name || 'Unknown User';
                                const hasDr = /^Dr\.?/i.test(name.trim());
                                const prefixed = hasDr ? name : `Dr. ${name}`;
                                return prefixed + (n.created_at ? ` • ${n.created_at.toLocaleString('en-US')}` : '');
                              })()}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              className={`p-1 rounded ${n.read ? 'bg-gray-50 text-gray-400 cursor-default' : 'hover:bg-green-50 text-green-600'}`}
                              title={n.read ? 'Already read' : 'Mark as read'}
                              onClick={() => { if (!n.read) toggleNoteRead(n.id); }}
                              disabled={!!n.read}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M16.704 5.29a1 1 0 00-1.408-1.42L8.25 10.955 5.7 8.4a1 1 0 10-1.4 1.428l3.25 3.186a1 1 0 001.404-.006l7.75-7.72z" clipRule="evenodd" />
                              </svg>
                            </button>
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
      {/* Delete Item Confirm Modal */}
      <div className={`${isDeleteItemOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'} fixed inset-0 z-[85] flex items-center justify-center transition-opacity duration-200`}
           onClick={() => { if (!isDeletingItem) { setIsDeleteItemOpen(false); setItemToDelete(null); } }}>
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
        <div
          className={`relative z-10 w-[440px] max-w-[92vw] bg-white rounded-2xl border border-gray-200 shadow-[0_20px_50px_rgba(0,0,0,0.25)] transition-all duration-200 transform ${isDeleteItemOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-2'}`}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="absolute right-3 top-3 p-1 rounded-full hover:bg-gray-100"
            onClick={() => { if (!isDeletingItem) { setIsDeleteItemOpen(false); setItemToDelete(null); } }}
            aria-label="Close"
          >
            <XIcon className="w-5 h-5 text-gray-500" />
          </button>
          <div className="px-6 pt-6 pb-5 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-red-500/10 flex items-center justify-center shadow-sm">
              <TrashIcon className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="mt-4 [font-family:'Inter',Helvetica] font-semibold text-gray-900 text-lg">Delete this item?</h3>
            <p className="mt-1 [font-family:'Oxygen',Helvetica] text-gray-500 text-sm">This will permanently remove the item from inventory. This action cannot be undone.</p>
            <div className="mt-5 flex items-center justify-center gap-3">
              <Button
                onClick={() => { if (!isDeletingItem) { setIsDeleteItemOpen(false); setItemToDelete(null); } }}
                className="px-5 py-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700"
                disabled={isDeletingItem}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => { await deleteItemNow(); }}
                className={`px-5 py-2 rounded-full ${isDeletingItem ? 'bg-red-400' : 'bg-red-500 hover:bg-red-600'} text-white`}
                disabled={isDeletingItem}
              >
                {isDeletingItem ? 'Deleting…' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};