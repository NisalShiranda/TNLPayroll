import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const DashboardChart = ({ data }) => {
    // Transform data for chart: group by day, sum OT pay
    const chartData = data.slice(0, 7).reverse().map(entry => ({
        name: new Date(entry.date).toLocaleDateString(undefined, { weekday: 'short' }),
        amount: entry.otPay,
        date: new Date(entry.date).toLocaleDateString()
    }));

    return (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm h-full">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <span className="bg-blue-50 p-2 rounded-lg text-blue-600">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>
                    </span>
                    <h3 className="font-bold text-slate-800">Overview</h3>
                </div>
                <div className="flex bg-slate-50 p-1 rounded-lg">
                    <button className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600">Day</button>
                    <button className="px-3 py-1 text-xs font-bold text-slate-400 hover:text-slate-600">Week</button>
                    <button className="px-3 py-1 text-xs font-bold bg-white text-blue-600 shadow-sm rounded-md">Month</button>
                </div>
            </div>

            <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} barSize={20}>
                        <XAxis
                            dataKey="name"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <Tooltip
                            cursor={{ fill: 'transparent' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Bar dataKey="amount" radius={[4, 4, 4, 4]}>
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.amount > 1000 ? '#2563eb' : '#93c5fd'} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="flex justify-center gap-6 mt-4">
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600"></span>
                    <span className="text-xs text-slate-400 font-medium">High OT</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-300"></span>
                    <span className="text-xs text-slate-400 font-medium">Regular OT</span>
                </div>
            </div>
        </div>
    );
};

export default DashboardChart;
