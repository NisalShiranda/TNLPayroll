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

        // Validation
        if (!checkIn || !checkOut) {
            alert("Please fill in Check-In and Check-Out times.");
            return;
        }

        onSave({ date, checkIn, lunchOut, lunchIn, checkOut, isSpecialDay });

        // Optional: Reset form after save (not requested but good UX, though App.jsx hides form)
    };

    const InputTime = ({ label, val, setVal }) => (
        <div className="group">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
            <div className="relative">
                <input
                    type="time"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="block w-full rounded-xl border-slate-200 bg-slate-50/50 p-3 text-sm font-semibold text-slate-700 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-slate-300"
                />
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-3xl shadow-lg shadow-slate-200/50 p-6 border border-slate-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-slate-800">New Entry</h2>
                <div className="flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100">
                    <label htmlFor="special-toggle" className={`text-xs font-bold transition-colors ${isSpecialDay ? 'text-rose-500' : 'text-slate-400'}`}>
                        {isSpecialDay ? 'Special Day Active' : 'Special Day'}
                    </label>
                    <button
                        type="button"
                        id="special-toggle"
                        onClick={() => setIsSpecialDay(!isSpecialDay)}
                        className={`relative w-10 h-6 rounded-full transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-rose-500/20 ${isSpecialDay ? 'bg-rose-500' : 'bg-slate-200'}`}
                    >
                        <span className={`absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition-transform duration-200 shadow-sm ${isSpecialDay ? 'translate-x-4' : 'translate-x-0'}`} />
                    </button>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block w-full rounded-xl border-slate-200 bg-slate-50 p-3 text-slate-700 font-medium outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all"
                    />
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-5">
                    <InputTime label="Check-In" val={checkIn} setVal={setCheckIn} />
                    <InputTime label="Lunch Out" val={lunchOut} setVal={setLunchOut} />
                    <InputTime label="Lunch In" val={lunchIn} setVal={setLunchIn} />
                    <InputTime label="Check-Out" val={checkOut} setVal={setCheckOut} />
                </div>

                <button
                    type="submit"
                    className="w-full mt-4 bg-accent hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span>Add Time Entry</span>
                </button>
            </form>
        </div>
    );
};

export default TimeCard;
