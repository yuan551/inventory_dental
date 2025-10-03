import React, { useEffect, useMemo, useState } from "react";
import { Bell as BellIcon, Search as SearchIcon } from "lucide-react";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { useLastName } from "../../hooks/useLastName";
import profilePng from "../../assets/Ellipse 1.png";
import { useAlerts } from "../../hooks/useAlerts";

export const AppHeader = ({ title, subtitle, searchPlaceholder = "Search inventory" }) => {
  const lastName = useLastName();
  const { alerts } = useAlerts();
  const [open, setOpen] = useState(false);

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
  const topAlerts = useMemo(() => unreadAlerts.slice(0, 6), [unreadAlerts]);
  const markAsRead = (a) => setReadMap((prev) => ({ ...prev, [keyFor(a)]: Date.now() }));
  const markAllAsRead = () => setReadMap((prev) => ({ ...prev, ...Object.fromEntries((alerts || []).map((a) => [keyFor(a), Date.now()])) }));
  return (
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
            <Badge className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center p-0 animate-pulse">
              <span className="[font-family:'Oxygen',Helvetica] font-normal text-white text-xs">{count}</span>
            </Badge>
          </button>
          {/* Dropdown */}
          <div className={`${open ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-1 pointer-events-none'} absolute right-0 mt-2 w-80 bg-white rounded-xl border border-gray-200 shadow-[0_20px_40px_rgba(0,0,0,0.16)] transition-all duration-150 origin-top-right z-50`}
               onMouseLeave={() => setOpen(false)}>
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="[font-family:'Inter',Helvetica] text-gray-900 font-semibold text-sm">Notifications</div>
              <div className="text-xs text-gray-500 flex items-center justify-between">
                <span>{count} alert{count === 1 ? '' : 's'}</span>
                {count > 0 && (
                  <button onClick={markAllAsRead} className="text-[#00b7c2] hover:text-[#009ba5]">Mark all as read</button>
                )}
              </div>
            </div>
            <div className="max-h-72 overflow-auto divide-y divide-gray-100">
              {topAlerts.length === 0 ? (
                <div className="p-4 text-sm text-gray-500">You're all caught up 🎉</div>
              ) : (
                topAlerts.map((a, i) => (
                  <div key={i} className="px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => markAsRead(a)}>
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 w-2 h-2 rounded-full bg-red-500" />
                      <div>
                        <div className="[font-family:'Inter',Helvetica] text-gray-900 text-sm font-medium">{a.item} <span className="text-xs text-gray-500">({a.category})</span></div>
                        <div className="[font-family:'Oxygen',Helvetica] text-xs text-gray-600 mt-0.5">{a.reason}</div>
                      </div>
                      <div className="ml-auto">
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(a); }}
                          className="text-xs text-gray-500 hover:text-gray-700"
                          title="Mark as read"
                        >
                          Mark as read
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="px-4 py-2 text-right">
              <button onClick={() => setOpen(false)} className="text-xs text-[#00b7c2] hover:text-[#009ba5]">Close</button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
          <img className="w-10 h-10 rounded-full border-2 border-gray-200 object-cover" alt="Profile" src={profilePng} />
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
  );
};

export default AppHeader;
