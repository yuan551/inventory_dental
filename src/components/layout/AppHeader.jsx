import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { Bell as BellIcon, Search as SearchIcon, AlertOctagon, AlertTriangle, ChevronDown as ChevronDownIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useLastName } from "../../hooks/useLastName";
import profilePng from "../../assets/Ellipse 1.png";
import { useAlerts } from "../../hooks/useAlerts";
import { db, auth } from '../../firebase';
import ConfirmModal from '../modals/ConfirmModal';
import { doc, getDoc, setDoc } from 'firebase/firestore';

export const AppHeader = ({ title, subtitle, searchPlaceholder = "Search inventory" }) => {
  const lastName = useLastName();
  const { stockAlerts, expiryAlerts } = useAlerts();
  // Combine synthetic alerts into a single list for the header notification dropdown
  const alerts = React.useMemo(() => {
    const ex = (expiryAlerts || []).map(e => ({ ...e, type: 'expiry' }));
    const st = (stockAlerts || []).map(s => ({ ...s, type: 'stock' }));
    // show expiry first then stock (this ordering matches AlertsModule)
    return [...ex, ...st];
  }, [stockAlerts, expiryAlerts]);
  const [open, setOpen] = useState(false);
  const [openProfile, setOpenProfile] = useState(false);
  const [position, setPosition] = useState(null);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const navigate = useNavigate();

  const closeLogoutModal = () => setShowLogoutModal(false);
  const confirmLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (e) {
      console.error(e);
    }
  };

  // pick a deterministic color for a given string
  const pickColor = (s) => {
    const palette = ['#F97316', '#06B6D4', '#84CC16', '#A78BFA', '#F43F5E', '#FB923C', '#38BDF8', '#34D399'];
    if (!s) return palette[Math.floor(Math.random() * palette.length)];
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return palette[Math.abs(h) % palette.length];
  };
  const profileInitial = (lastName || 'U').charAt(0).toUpperCase();
  const profileColor = pickColor(lastName || 'user');

  // Persist avatarColor to accounts doc for the logged in user (if any)
  useEffect(() => {
    const persistColor = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const accRef = doc(db, 'accounts', user.uid);
        const snap = await getDoc(accRef);
        const acc = snap.exists() ? snap.data() : {};
        if (!acc || !acc.avatarColor) {
          await setDoc(accRef, { ...(acc || {}), avatarColor: profileColor }, { merge: true });
        }
      } catch (e) { /* ignore errors */ }
    };
    persistColor();
  }, [profileColor]);

  // Load user position/role to display under name
  useEffect(() => {
    let mounted = true;
    const loadPosition = async () => {
      try {
        const user = auth.currentUser;
        if (!user) return;
        const accRef = doc(db, 'accounts', user.uid);
        const snap = await getDoc(accRef);
        if (snap.exists() && mounted) {
          const acc = snap.data();
          setPosition(acc.position || null);
        }
      } catch (e) { /* ignore */ }
    };
    loadPosition();
    return () => { mounted = false; };
  }, []);

  // Mark-as-read storage (local, per browser)
  const READ_KEY = 'read_alerts_v1';
  const loadReadMap = () => {
    try { const raw = localStorage.getItem(READ_KEY); return raw ? JSON.parse(raw) : {}; } catch { return {}; }
  };
  const [readMap, setReadMap] = useState(loadReadMap);
  useEffect(() => { try { localStorage.setItem(READ_KEY, JSON.stringify(readMap)); } catch {} }, [readMap]);
  const keyFor = (a) => `${a?.category || ''}|${a?.item || ''}|${a?.reason || ''}`;

  const unreadAlerts = useMemo(() => (alerts || []).filter((a) => !readMap[keyFor(a)]), [alerts, readMap]);
  const count = unreadAlerts.length;
  // Show all alerts (capped) regardless of read status so they don't disappear when marked read
  const displayedAlerts = useMemo(() => (alerts || []).slice(0, 25), [alerts]);
  const markAsRead = (a) => setReadMap((prev) => ({ ...prev, [keyFor(a)]: Date.now() }));
  const markAllAsRead = () => setReadMap((prev) => ({ ...prev, ...Object.fromEntries((alerts || []).map((a) => [keyFor(a), Date.now()])) }));

  // Search highlighting (non-invasive): highlight matching text in the current page (main)
  const [searchQuery, setSearchQuery] = useState('');

  // inject minimal highlight style once
  useEffect(() => {
    const id = 'search-highlight-style';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.innerHTML = `
        .search-highlight { background: rgba(250, 213, 102, 0.9); padding: 0 2px; border-radius: 2px; color: inherit; }
      `;
      document.head.appendChild(style);
    }
  }, []);

  const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // attempt to locate the sidebar element (by its distinctive teal background) so we can exclude it
  const locateSidebarRoot = () => {
    try {
      const divs = Array.from(document.querySelectorAll('div'));
      for (const d of divs) {
        const bg = getComputedStyle(d).backgroundColor || '';
        if (bg && bg.indexOf('0, 183, 194') !== -1) return d; // rgb(0, 183, 194) matches #00B7C2
      }
    } catch (e) {}
    return null;
  };

  const removeHighlights = (root = document.querySelector('.search-highlight-target')) => {
    try {
      if (!root) return;
      const marks = Array.from(root.querySelectorAll('.search-highlight'));
      for (const m of marks) {
        const txt = document.createTextNode(m.textContent || '');
        m.parentNode.replaceChild(txt, m);
      }
      // normalize text nodes to merge adjacent text nodes
      root.normalize && root.normalize();
    } catch (e) { /* ignore */ }
  };

  const highlightPage = (q) => {
    const root = document.querySelector('.search-highlight-target');
    if (!q) { removeHighlights(root); return; }
    const pattern = new RegExp(escapeRegExp(q), 'gi');

    try {
      const sidebarRoot = locateSidebarRoot();
      // collect text nodes first to avoid modifying the live TreeWalker while iterating
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null, false);
      const nodes = [];
      let node;
      while ((node = walker.nextNode())) {
        // skip inputs, textareas, script, style or nodes inside header/sidebar
        const parentEl = node.parentElement;
        if (!parentEl) continue;
        const tag = parentEl.tagName.toLowerCase();
        if (['script', 'style', 'textarea', 'input', 'select'].includes(tag)) continue;
        if (parentEl.closest && parentEl.closest('header')) continue;
        if (parentEl.closest && parentEl.closest('nav')) continue;
        // exclude if inside the computed sidebar root
        if (sidebarRoot && sidebarRoot.contains(parentEl)) continue;
        if (!node.nodeValue || !pattern.test(node.nodeValue)) continue;
        nodes.push(node);
      }

      for (const textNode of nodes) {
        const val = textNode.nodeValue;
        const frag = document.createDocumentFragment();
        let lastIndex = 0;
        pattern.lastIndex = 0;
        let m;
        while ((m = pattern.exec(val)) !== null) {
          const before = val.slice(lastIndex, m.index);
          if (before) frag.appendChild(document.createTextNode(before));
          const mark = document.createElement('span');
          mark.className = 'search-highlight';
          mark.textContent = m[0];
          frag.appendChild(mark);
          lastIndex = m.index + m[0].length;
        }
        const after = val.slice(lastIndex);
        if (after) frag.appendChild(document.createTextNode(after));
        textNode.parentNode.replaceChild(frag, textNode);
      }
    } catch (e) { console.warn('highlightPage failed', e); }
  };

  // debounce search to avoid heavy DOM ops while typing
  useEffect(() => {
    const q = (searchQuery || '').trim();
    const id = setTimeout(() => {
      if (!q) removeHighlights(); else highlightPage(q);
    }, 180);
    return () => clearTimeout(id);
  }, [searchQuery]);
  return (
    <>
    <header className="bg-white shadow-sm px-8 py-6 flex items-center justify-between border-b border-gray-200">
      <div>
        <h1 className="[font-family:'Inter',Helvetica] font-extrabold text-[#00b7c2] text-3xl tracking-[0] leading-[normal] mb-1">
          {title}
        </h1>
        {subtitle ? (
          <p className="[font-family:'Oxygen',Helvetica] font-normal text-gray-600 text-sm tracking-[0] leading-[normal]">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <Input
            placeholder={searchPlaceholder}
            className="w-96 h-14 bg-gray-50 rounded-full border border-gray-300 pl-6 pr-14 [font-family:'Oxygen',Helvetica] font-normal text-gray-700 text-sm focus:bg-white focus:border-[#00b7c2] focus:ring-2 focus:ring-[#00b7c2]/20"
            onChange={(e) => setSearchQuery(e.target.value)}
            value={searchQuery}
          />
          <SearchIcon className="absolute right-6 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        </div>

        <div className="relative">
          <button
            onClick={() => setOpen((v) => !v)}
            className={`relative grid place-items-center w-10 h-10 rounded-full transition-colors ${open ? 'bg-gray-100' : 'hover:bg-gray-100'}`}
            aria-label="Notifications"
          >
            <BellIcon className={`w-6 h-6 ${open ? 'text-gray-800' : 'text-gray-600'}`} />
            {count > 0 && (
              <Badge className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center p-0 animate-pulse">
                <span className="[font-family:'Oxygen',Helvetica] font-normal text-white text-xs">{count}</span>
              </Badge>
            )}
          </button>
          {/* Dropdown */}
          <div className={`${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-[0_20px_40px_rgba(0,0,0,0.16)] transition-all duration-150 origin-top-right z-50`}
               onMouseLeave={() => setOpen(false)}>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <div className="[font-family:'Inter',Helvetica] text-gray-900 font-semibold text-sm">Notifications</div>
                  <div className="text-xs text-gray-500">{count} alert{count === 1 ? '' : 's'}</div>
                </div>
                {/* Legend */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-600">Expiry</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-gray-600">Critical</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />
                    <span className="text-xs text-gray-600">Low Stock</span>
                  </div>
                </div>
              </div>
              {count > 0 && (
                <div className="mt-2">
                  <button onClick={markAllAsRead} className="text-[#00b7c2] hover:text-[#009ba5]">Mark all as read</button>
                </div>
              )}
            </div>
            <div className="max-h-72 overflow-auto divide-y divide-gray-100">
              {displayedAlerts.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">You're all caught up 🎉</div>
              ) : (
                displayedAlerts.map((a, i) => {
                  const isRead = Boolean(readMap[keyFor(a)]);
                  // Replace per-alert icon with colored dot in the item line
                  const iconDot = a.type === 'expiry'
                    ? <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    : (a.severity === 'Critical'
                      ? <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                      : <span className="inline-block w-3 h-3 rounded-full bg-amber-500" />);
                  return (
                    <div key={i} className={`px-4 py-3 transition-colors cursor-pointer ${isRead ? 'opacity-70 hover:bg-gray-50' : 'hover:bg-gray-50'}`}> 
                      <div className="flex items-start gap-3">
                        <div className="mt-1.5">{iconDot}</div>
                        <div>
                          <div className="[font-family:'Inter',Helvetica] text-gray-900 text-sm font-medium flex items-center gap-2">
                            {a.item} <span className="text-xs text-gray-500">({a.category})</span>
                            {isRead && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">Read</span>}
                          </div>
                          <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-600 mt-0.5">{a.reason}</div>
                        </div>
                        <div className="ml-auto">
                          {!isRead && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markAsRead(a); }}
                              className="text-xs text-[#00b7c2] hover:text-[#009ba5]"
                              title="Mark as read"
                            >
                              Mark as read
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-4 py-2 text-right">
              <button onClick={() => setOpen(false)} className="text-xs text-[#00b7c2] hover:text-[#009ba5]">Close</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200 relative">
          <button
            onClick={() => setOpenProfile(v => !v)}
            className="flex items-center gap-3 rounded-full p-1 hover:bg-gray-100 transition-colors"
            aria-haspopup="true"
            aria-expanded={openProfile}
            aria-label="Profile menu"
          >
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold" style={{ background: profileColor }}>
              {profileInitial}
            </div>
            <div className="text-left">
              <div className="[font-family:'Inter',Helvetica] font-semibold text-gray-900 text-sm tracking-[0] leading-[normal]">
                {lastName ? `Dr. ${lastName}` : ''}
              </div>
              <div className="[font-family:'Oxygen',Helvetica] font-normal text-gray-500 text-xs tracking-[0] leading-[normal]">
                {position ? position.toUpperCase() : ''}
              </div>
            </div>
            {/* dropdown indicator */}
            <ChevronDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          {/* Profile dropdown */}
          <div className={`${openProfile ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 top-full mt-3 w-44 bg-white rounded-xl border border-gray-200 shadow-[0_20px_40px_rgba(0,0,0,0.08)] transition-all duration-150 origin-top-right z-50`}
               onMouseLeave={() => setOpenProfile(false)}>
            <button onClick={() => { setOpenProfile(false); setShowLogoutModal(true); }} className="w-full text-left px-4 py-3 hover:bg-gray-50">Logout</button>
          </div>
        </div>
      </div>
    </header>

      <ConfirmModal
        open={showLogoutModal}
        title="Confirm Logout"
        message="Are you sure you want to log out? You will be returned to the login screen."
        onCancel={closeLogoutModal}
        onConfirm={confirmLogout}
        confirmText="Yes, Logout"
        cancelText="Cancel"
      />
    </>
  );
};

export default AppHeader;
