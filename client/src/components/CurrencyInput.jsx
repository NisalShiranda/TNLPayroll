import React from 'react';

const CurrencyInput = ({ value, onChange, label }) => {
    return (
        <div className="flex flex-col space-y-2">
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider ml-1">{label}</label>
            <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <span className="text-slate-400 text-lg font-medium group-focus-within:text-accent transition-colors">Rs.</span>
                </div>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="block w-full rounded-2xl border-0 bg-slate-50 py-4 pl-12 pr-4 text-slate-800 text-2xl font-bold placeholder:text-slate-300 focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-inner"
                    placeholder="0.00"
                />
            </div>
        </div>
    );
};

export default CurrencyInput;
