import React from 'react';

export const PendingModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-md transition-all duration-300"
            style={{ animation: 'fade-in 0.25s cubic-bezier(0.4, 0, 0.2, 1)' }}
            onClick={onClose}
        >
            <div 
                className="bg-gradient-to-br from-white to-gray-50 rounded-3xl shadow-2xl p-8 w-[420px] relative flex flex-col items-center"
                style={{ 
                    animation: 'fade-up 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close Button */}
                <button
                    className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center transition-all duration-200 hover:rotate-90"
                    onClick={onClose}
                    aria-label="Close"
                >
                    <svg width="18" height="18" fill="none" viewBox="0 0 18 18">
                        <path d="M4.5 4.5l9 9M13.5 4.5l-9 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </button>
                
                {/* Animated Icon */}
                <div className="relative flex items-center justify-center mb-6 mt-2">
                    <div className="absolute w-20 h-20 bg-yellow-200 rounded-full opacity-30 animate-ping" style={{ animationDuration: '2s' }}></div>
                    <div className="relative bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                        <svg width="28" height="28" fill="none" viewBox="0 0 28 28">
                            <path d="M14 9v7M14 20h.01" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                    </div>
                </div>

                {/* Title */}
                <div className="text-2xl font-bold text-center mb-3 text-gray-800">
                    Status Changed to Pending
                </div>

                {/* Description */}
                <div className="text-gray-600 text-center mb-6 text-base leading-relaxed px-2">
                    You have successfully changed this order to <span className="font-bold text-yellow-600">Pending</span> status. It's now waiting for your confirmation before proceeding further.
                </div>

                {/* Info Box */}
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 w-full">
                    <div className="flex items-start gap-3">
                        <svg width="20" height="20" fill="none" viewBox="0 0 20 20" className="flex-shrink-0 mt-0.5">
                            <circle cx="10" cy="10" r="8" stroke="#D97706" strokeWidth="1.5" />
                            <path d="M10 6v4M10 14h.01" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
                        </svg>
                        <div className="flex-1">
                            <p className="text-sm font-semibold text-yellow-800 mb-1">Review Reminder</p>
                            <p className="text-xs text-yellow-700 leading-relaxed">
                                Please review and confirm this order when you're ready. You can change the status again at any time.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                <button
                    className="bg-gradient-to-r from-cyan-500 to-cyan-600 hover:from-cyan-600 hover:to-cyan-700 text-white px-10 py-3 rounded-full font-semibold text-base shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all duration-200"
                    onClick={onClose}
                >
                    Got it, Thanks!
                </button>
            </div>
        </div>
    );
};
