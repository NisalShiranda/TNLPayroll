import React, { useState } from 'react';

const TimeCard = ({ onSave }) => {
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(today);
    const [checkIn, setCheckIn] = useState('');
    const [lunchOut, setLunchOut] = useState('');
    const [lunchIn, setLunchIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [isSpecialDay, setIsSpecialDay] = useState(false);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ date, checkIn, lunchOut, lunchIn, checkOut, isSpecialDay });
        // Reset form or keep date?
        // setCheckIn(''); setLunchOut(''); setLunchIn(''); setCheckOut('');
    };

    const InputTime = ({ label, val, setVal }) => (
        <div className="flex flex-col">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
            <input
                type="time"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                className="block w-full rounded-lg border-gray-200 bg-gray-50 p-3 text-xl font-medium focus:bg-white focus:border-accent focus:ring-accent transition-colors"
                required={label.includes('Check')} // Basic validation
            />
        </div>
    );

    return (
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">New Time Entry</h2>
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* Date & Special Day Toggle */}
                <div className="flex flex-col sm:flex-row justify-between gap-4">
                    <div className="flex-1">
                        <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="block w-full rounded-lg border-gray-200 p-2 text-lg"
                        />
                    </div>
                    <div className="flex items-center space-x-3 bg-red-50 p-3 rounded-lg border border-red-100 self-end">
                        <label htmlFor="special-toggle" className="text-sm font-bold text-red-600">Special Day (Sun/Poya)</label>
                        <button
                            type="button"
                            id="special-toggle"
                            onClick={() => setIsSpecialDay(!isSpecialDay)}
                            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${isSpecialDay ? 'bg-red-600' : 'bg-gray-200'}`}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSpecialDay ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>

                {/* Time Inputs Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <InputTime label="Check-In" val={checkIn} setVal={setCheckIn} />
                    <InputTime label="Lunch Out" val={lunchOut} setVal={setLunchOut} />
                    <InputTime label="Lunch In" val={lunchIn} setVal={setLunchIn} />
                    <InputTime label="Check-Out" val={checkOut} setVal={setCheckOut} />
                </div>

                <button
                    type="submit"
                    className="w-full rounded-xl bg-accent py-4 text-white font-bold text-lg shadow-md hover:bg-blue-600 active:scale-[0.98] transition-all"
                >
                    Add Entry
                </button>
            </form>
        </div>
    );
};

export default TimeCard;
