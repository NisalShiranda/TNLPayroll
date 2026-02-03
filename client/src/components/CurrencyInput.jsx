import React from 'react';

const CurrencyInput = ({ value, onChange, label }) => {
    return (
        <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">{label}</label>
            <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                    <span className="text-gray-500 sm:text-lg font-semibold">Rs.</span>
                </div>
                <input
                    type="number"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="block w-full rounded-lg border-gray-300 pl-12 pr-4 py-3 text-lg focus:border-accent focus:ring-accent sm:text-xl"
                    placeholder="0.00"
                />
            </div>
        </div>
    );
};

export default CurrencyInput;
