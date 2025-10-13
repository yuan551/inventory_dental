import React from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../lib/portal';

const LoadingOverlay = ({ open = false, text = 'medicare' }) => {
  if (!open) return null;
  const el = (
    <div className="fixed inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3 transform scale-90">
        <img src="/group.png" alt="logo" className="w-24 h-24 opacity-95 animate-logo-bounce" />
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 rounded-full animate-spin border-gray-200 border-t-[#00b7c2]" />
        </div>
        <div className="text-[#00b7c2] font-semibold text-2xl tracking-wide">MediCare</div>
      </div>
      <style>{`
        @keyframes logo-bounce { 0% { transform: translateY(0); } 50% { transform: translateY(-6px); } 100% { transform: translateY(0); } }
        .animate-logo-bounce { animation: logo-bounce 900ms ease-in-out infinite; }
      `}</style>
    </div>
  );
  return createPortal(el, getPortalRoot() || document.body);
};

export default LoadingOverlay;
