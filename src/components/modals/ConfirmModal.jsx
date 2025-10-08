import React from 'react';

export const ConfirmModal = ({ open, title, message, onConfirm, onCancel, confirmText = 'Confirm', cancelText = 'Cancel' }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} aria-hidden="true" />
      <div className="relative bg-white w-[90%] max-w-md rounded-2xl shadow-xl p-6 transform transition-all duration-200 ease-out">
        <div className="flex items-start gap-4">
          <div className="bg-[#FFEDD5] text-[#92400E] rounded-full w-12 h-12 flex items-center justify-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M3 6h18" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/><path d="M8 6v14a2 2 0 002 2h4a2 2 0 002-2V6" stroke="#92400E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </div>
          <div className="flex-1">
            <div className="text-lg font-semibold text-gray-900">{title}</div>
            <div className="text-sm text-gray-600 mt-1">{message}</div>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 rounded-full bg-gray-100 text-gray-700 font-medium hover:bg-gray-200">{cancelText}</button>
          <button onClick={onConfirm} className="px-4 py-2 rounded-full bg-[#00B6C9] text-white font-semibold shadow hover:bg-[#00a1ad]">{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
