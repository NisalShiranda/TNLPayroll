import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Settings, Bell, Search, Plus, Trash2, Calendar, Download } from 'lucide-react';
import CurrencyInput from './components/CurrencyInput';
import TimeCard from './components/TimeCard';
import DashboardChart from './components/DashboardChart';
import { calculateDailyPay, formatCurrency } from './utils/calculations';

const App = () => {
  const [baseSalary, setBaseSalary] = useState(30000);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEntryForm, setShowEntryForm] = useState(false);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const settingsRes = await fetch(`${API_URL}/settings`, { signal: controller.signal });
      const settingsData = await settingsRes.json();
      setBaseSalary(settingsData.baseSalary || 30000);

      const entriesRes = await fetch(`${API_URL}/entries`, { signal: controller.signal });
      const entriesData = await entriesRes.json();
      setEntries(entriesData);

      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Connection error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryChange = async (val) => {
    setBaseSalary(val);
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseSalary: val })
      });
    } catch (err) { console.error(err); }
  };

  const [notification, setNotification] = useState(null);

  const processedEntries = entries.map(e => ({
    ...e,
    ...calculateDailyPay(e, baseSalary)
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalOT = processedEntries.reduce((acc, curr) => acc + curr.otPay, 0);
  const totalPay = Number(baseSalary) + totalOT;

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddEntry = async (entry) => {
    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        fetchData();
        setShowEntryForm(false);
        // Calculate estimated pay for feedback
        const calc = calculateDailyPay(entry, baseSalary);
        showNotification(`Entry Added! Earned: ${formatCurrency(calc.otPay)} OT`);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans text-slate-800 flex flex-col md:flex-row">

      {/* STELLA SIDEBAR */}
      <aside className="bg-white lg:w-64 w-20 flex-shrink-0 border-r border-slate-100 flex flex-col fixed h-full z-50">
        <div className="p-6 flex items-center gap-3">
          <div className="bg-blue-600 text-white p-2 rounded-xl">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" /></svg>
          </div>
          <span className="font-extrabold text-xl tracking-tight hidden lg:block text-slate-900">Stella</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<Users size={20} />} label="Employee" />
          <NavItem icon={<Calendar size={20} />} label="Payroll" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<FileText size={20} />} label="Report" />
          <NavItem icon={<Settings size={20} />} label="Settings" />
        </nav>

        <div className="p-6 border-t border-slate-50">
          <div className="flex items-center gap-3">
            <img src="https://ui-avatars.com/api/?name=Admin+User&background=0D8ABC&color=fff" className="w-10 h-10 rounded-full" alt="User" />
            <div className="hidden lg:block">
              <p className="text-sm font-bold text-slate-700">Admin User</p>
              <p className="text-xs text-slate-400">admin@tnl.com</p>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 lg:ml-64 ml-20">
        {/* TOP BAR */}
        <header className="bg-white border-b border-slate-100 h-20 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-slate-800">Payroll</h1>
          </div>
          <div className="flex items-center gap-6">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
              <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 bg-slate-50 rounded-lg text-sm border-none focus:ring-2 focus:ring-blue-100 outline-none w-64" />
            </div>
            <div className="flex gap-3">
              <button className="p-2 text-slate-400 hover:text-slate-600 bg-slate-50 rounded-full">
                <Bell size={20} />
              </button>
            </div>
          </div>
        </header>

        {/* Notification Toast */}
        {notification && (
          <div className="fixed top-24 right-8 z-50 animate-bounce-in">
            <div className="bg-emerald-500 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3">
              <div className="bg-white/20 p-1 rounded-full"><Plus size={16} /></div>
              <div>
                <p className="font-bold text-sm tracking-wide">Success</p>
                <p className="text-sm font-medium opacity-90">{notification.message}</p>
              </div>
            </div>
          </div>
        )}

        <div className="p-8 space-y-8 max-w-[1600px] mx-auto">

          {/* ACTION BAR */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <button onClick={() => setShowEntryForm(!showEntryForm)} className="bg-white border border-slate-200 text-slate-600 px-4 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:bg-slate-50 flex items-center gap-2">
              <Settings size={16} />
              {showEntryForm ? 'Hide Form' : 'Payroll Settings'}
            </button>

            <div className="flex gap-3">
              <div className="bg-white border border-slate-200 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-600 flex items-center gap-2 shadow-sm">
                <Calendar size={16} />
                <span>{new Date().toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</span>
              </div>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-200">
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          {/* ENTRY FORM (TOGGLEABLE) */}
          {showEntryForm && (
            <div className="animate-fade-in mb-8">
              <TimeCard onSave={handleAddEntry} />
            </div>
          )}

          {/* METRICS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Monthly Payroll"
              value={formatCurrency(totalPay)}
              trend="-12.5%"
              icon={<div className="bg-blue-50 text-blue-600 p-2 rounded-lg">$</div>}
            />
            <MetricCard
              title="Overtime"
              value={formatCurrency(totalOT)}
              trend="+5.3%"
              isPositive
              icon={<div className="bg-indigo-50 text-indigo-600 p-2 rounded-lg"><Calendar size={20} /></div>}
            />
            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all">
              <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Base Salary Config</p>
              <div className="relative z-10">
                <CurrencyInput value={baseSalary} onChange={handleSalaryChange} label="" />
              </div>
            </div>
          </div>

          {/* CHART & PROMO ROW */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 h-[400px]">
              <DashboardChart data={processedEntries} />
            </div>
            <div className="xl:col-span-1">
              <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-3xl p-8 text-white h-full relative overflow-hidden flex flex-col justify-center items-center text-center">
                <div className="absolute top-0 left-0 w-full h-full bg-white opacity-10" style={{ backgroundImage: 'radial-gradient(circle, #fff 10%, transparent 10%)', backgroundSize: '20px 20px' }}></div>
                <div className="bg-white/20 p-4 rounded-2xl mb-6 backdrop-blur-sm relative z-10">
                  <Plus size={32} />
                </div>
                <h3 className="text-2xl font-bold mb-2 relative z-10">Quick Entry</h3>
                <p className="text-blue-100 mb-6 relative z-10">Log today's work hours instantly with a single click.</p>
                <button
                  onClick={() => setShowEntryForm(true)}
                  className="bg-white text-blue-600 px-8 py-3 rounded-xl font-bold hover:shadow-lg transition-all active:scale-95 relative z-10"
                >
                  Add New Entry
                </button>
              </div>
            </div>
          </div>

          {/* DATA TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">Payroll Entries</h3>
              </div>
              <div className="flex gap-2">
                <button className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">Filter</button>
                <div className="flex bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <button className="p-1 bg-white shadow-sm rounded-md"><LayoutDashboard size={14} /></button>
                  <button className="p-1 text-slate-400"><FileText size={14} /></button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-[#F9FAFB] text-slate-500 font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4 rounded-tl-xl"><div className="w-4 h-4 border-2 border-slate-300 rounded mx-auto"></div></th>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Total Pay</th>
                    <th className="px-6 py-4">Hours</th>
                    <th className="px-6 py-4">OT</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {processedEntries.map((entry) => (
                    <tr key={entry._id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4 text-center">
                        <div className="w-4 h-4 border-2 border-slate-300 rounded mx-auto group-hover:border-blue-400 cursor-pointer"></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-500 text-xs">
                            {new Date(entry.date).getDate()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-700">{new Date(entry.date).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })}</p>
                            {entry.isSpecialDay && <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 rounded">Special Day</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-700">{formatCurrency(entry.otPay)}</td>
                      <td className="px-6 py-4 font-medium text-slate-500">{entry.hours} hrs</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{entry.otHours} hrs</td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${entry.otHours > 0 ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                          {entry.otHours > 0 ? 'Verified' : 'Regular'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDelete(entry._id)} className="p-2 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-lg transition-all">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
};

const NavItem = ({ icon, label, active, onClick }) => (
  <div
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all ${active
      ? 'bg-blue-600 text-white shadow-lg shadow-blue-200'
      : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
      }`}
  >
    {icon}
    <span className="font-semibold hidden lg:block">{label}</span>
  </div>
);

const MetricCard = ({ title, value, trend, isPositive, icon }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      {icon}
      {trend && (
        <span className={`px-2 py-1 rounded-lg text-xs font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-emerald-50 text-emerald-600'}`}>
          {trend}
        </span>
      )}
    </div>
    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
    <p className="text-3xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{value}</p>
  </div>
);

export default App;
