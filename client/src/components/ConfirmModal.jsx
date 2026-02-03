import React from 'react';
import { AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, isDangerous = false }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center transform transition-all scale-100">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${isDangerous ? 'bg-rose-100 text-rose-500' : 'bg-blue-100 text-blue-500'}`}>
                    <AlertTriangle size={32} />
                </div>

                <h3 className="text-lg font-bold text-slate-800 mb-2">{title}</h3>
                <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
                    {message}
                </p>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-2.5 px-4 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-2.5 px-4 rounded-xl font-bold text-white shadow-lg transition-all ${isDangerous
                                ? 'bg-rose-500 hover:bg-rose-600 shadow-rose-200'
                                : 'bg-blue-600 hover:bg-blue-700 shadow-blue-200'
                            }`}
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
