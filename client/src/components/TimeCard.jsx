import React, { useState } from 'react';
import { Clock } from 'lucide-react';

const TimeCard = ({ onSave, initialDate, existingEntry }) => {
    // ... (state lines 4-68 remain same, omitted for brevity in tool call, but I will target specific lines to avoid replacing whole file)
    const today = new Date().toISOString().split('T')[0];
    const [date, setDate] = useState(initialDate || today);

    const [checkIn, setCheckIn] = useState('');
    const [lunchOut, setLunchOut] = useState('');
    const [lunchIn, setLunchIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [isSpecialDay, setIsSpecialDay] = useState(false);

    // Update local state if prop changes
    React.useEffect(() => {
        if (initialDate) setDate(initialDate);
    }, [initialDate]);

    // Populate form if existingEntry is provided
    React.useEffect(() => {
        if (existingEntry) {
            setCheckIn(existingEntry.checkIn || '');
            setLunchOut(existingEntry.lunchOut || '');
            setLunchIn(existingEntry.lunchIn || '');
            setCheckOut(existingEntry.checkOut || '');
            setIsSpecialDay(existingEntry.isSpecialDay || false);
        } else {
            // Reset form if no entry (but keep date)
            setCheckIn('');
            setLunchOut('');
            setLunchIn('');
            setCheckOut('');
            // Special day auto-toggle logic handles the default
            const day = new Date(date).getDay();
            setIsSpecialDay(day === 0);
        }
    }, [existingEntry, date]);

    // Auto-toggle Special Day for Sundays (Only if NOT editing an existing entry, or if we want to enforce it always on change)
    // We'll keep it simple: date change triggers this, but existingEntry triggers the block above.
    React.useEffect(() => {
        if (!existingEntry) {
            const day = new Date(date).getDay();
            if (day === 0) {
                setIsSpecialDay(true);
            } else {
                setIsSpecialDay(false);
            }
        }
    }, [date, existingEntry]);


    const handleSubmit = (e) => {
        e.preventDefault();

        // Validation
        if (!checkIn || !checkOut) {
            alert("Please fill in Check-In and Check-Out times.");
            return;
        }

        onSave({
            _id: existingEntry ? existingEntry._id : null,
            date,
            checkIn,
            lunchOut,
            lunchIn,
            checkOut,
            isSpecialDay
        });
    };

    const InputTime = ({ label, val, setVal }) => (
        <div className="group">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">{label}</label>
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-20">
                    <Clock size={18} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <input
                    type="time"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    onClick={(e) => e.target.showPicker && e.target.showPicker()}
                    className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 pl-11 text-sm font-bold text-slate-700 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all placeholder:text-slate-300 shadow-sm cursor-pointer relative z-10"
                />
            </div>
        </div>
    );

    return (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 p-8 border border-white">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Time Entry</h2>
                    <p className="text-slate-400 text-xs font-medium mt-1">Log your work hours</p>
                </div>

                <div
                    onClick={() => setIsSpecialDay(!isSpecialDay)}
                    className={`flex items-center gap-3 px-5 py-2.5 rounded-2xl cursor-pointer border-2 transition-all select-none group ${isSpecialDay ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-100 hover:border-slate-200'}`}
                >
                    <div className={`w-11 h-6 rounded-full relative transition-colors flex-shrink-0 ${isSpecialDay ? 'bg-rose-500' : 'bg-slate-300 group-hover:bg-slate-400'}`}>
                        <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform duration-300 ${isSpecialDay ? 'translate-x-5' : 'translate-x-0'}`}></div>
                    </div>
                    <div className="flex flex-col text-left">
                        <span className={`font-bold text-sm leading-none ${isSpecialDay ? 'text-rose-600' : 'text-slate-500'}`}>
                            {isSpecialDay ? 'Special Day' : 'Normal Day'}
                        </span>
                        <span className={`text-[10px] font-semibold mt-1 ${isSpecialDay ? 'text-rose-400' : 'text-slate-400'}`}>
                            {isSpecialDay ? 'Sun & Poya Days' : 'Mon - Sat'}
                        </span>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">Date</label>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="block w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-slate-800 font-bold outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                    />
                </div>

                <div className="grid grid-cols-2 gap-x-6 gap-y-6">
                    <InputTime label="Check-In" val={checkIn} setVal={setCheckIn} />
                    <InputTime label="Lunch Out" val={lunchOut} setVal={setLunchOut} />
                    <InputTime label="Lunch In" val={lunchIn} setVal={setLunchIn} />
                    <InputTime label="Check-Out" val={checkOut} setVal={setCheckOut} />
                </div>

                <button
                    type="submit"
                    className={`w-full mt-6 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${existingEntry
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-200 hover:shadow-emerald-300'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 shadow-blue-200 hover:shadow-blue-300 hover:translate-y-[-2px]'
                        }`}
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
                    <span className="text-lg">{existingEntry ? 'Update Entry' : 'Add Entry'}</span>
                </button>
            </form>
        </div>
    );
};

export default TimeCard;
