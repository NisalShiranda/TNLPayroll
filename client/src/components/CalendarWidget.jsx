import React, { useState } from 'react';
import Calendar from 'react-calendar';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CalendarWidget = ({ entries, onDateSelect, selectedDate }) => {

    // Create a Set of dates that have entries for quick lookup
    const entryDates = new Set(entries.map(e => new Date(e.date).toDateString()));

    const tileClassName = ({ date, view }) => {
        if (view === 'month') {
            if (entryDates.has(date.toDateString())) {
                return 'has-entry';
            }
        }
        return null;
    };

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full flex flex-col">
            <h3 className="text-lg font-bold text-slate-800 mb-4 px-2">Calendar</h3>
            <div className="flex-1 calendar-wrapper">
                <Calendar
                    onChange={onDateSelect}
                    value={selectedDate}
                    tileClassName={tileClassName}
                    prevLabel={<ChevronLeft size={20} className="text-slate-400 hover:text-blue-600" />}
                    nextLabel={<ChevronRight size={20} className="text-slate-400 hover:text-blue-600" />}
                    navigationLabel={({ date }) => (
                        <span className="text-slate-700 text-lg capitalize">
                            {date.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                        </span>
                    )}
                />
            </div>
            <div className="mt-4 flex items-center gap-4 px-2 text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Entry Added</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    <span>Selected</span>
                </div>
            </div>
        </div>
    );
};

export default CalendarWidget;
