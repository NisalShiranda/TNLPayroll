import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Settings, Bell, Search, Plus, Trash2, Calendar, Download } from 'lucide-react';
import CurrencyInput from './components/CurrencyInput';
import TimeCard from './components/TimeCard';
import CalendarWidget from './components/CalendarWidget';
import { calculateDailyPay, formatCurrency } from './utils/calculations';
import logo from './assets/logo.png';

const App = () => {
  const [baseSalary, setBaseSalary] = useState(30000);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());

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
  const [billingDate, setBillingDate] = useState(new Date());

  const processedEntries = entries.map(e => ({
    ...e,
    ...calculateDailyPay(e, baseSalary)
  })).sort((a, b) => new Date(b.date) - new Date(a.date));

  // Filter entries based on Salary Range: 20th of Prev Month to 19th of Current Month
  const getBillingRange = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    // Example: Feb 2026 (Month 1) -> Start: Jan 20, End: Feb 19
    const start = new Date(year, month - 1, 20);
    const end = new Date(year, month, 19, 23, 59, 59);
    start.setHours(0, 0, 0, 0); // Ensure start is beginning of day
    return { start, end };
  };

  const { start: billingStart, end: billingEnd } = getBillingRange(billingDate);

  const filteredEntries = processedEntries.filter(e => {
    const d = new Date(e.date);
    // Include 20th and 19th fully
    return d >= billingStart && d <= billingEnd;
  });

  const totalOT = filteredEntries.reduce((acc, curr) => acc + curr.otPay, 0);
  const totalPay = Number(baseSalary) + totalOT;

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleAddEntry = async (entry) => {
    try {
      const method = entry._id ? 'PUT' : 'POST';
      const url = entry._id ? `${API_URL}/entries/${entry._id}` : `${API_URL}/entries`;

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        fetchData();
        setShowEntryForm(false);
        // Calculate estimated pay for feedback
        const calc = calculateDailyPay(entry, baseSalary);
        showNotification(entry._id ? `Entry Updated!` : `Entry Added! Earned: ${formatCurrency(calc.otPay)} OT`);
      }
    } catch (err) { console.error(err); }
  };

  const [selectedIds, setSelectedIds] = useState([]);

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === processedEntries.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(processedEntries.map(e => e._id));
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this entry?")) {
      try {
        await fetch(`${API_URL}/entries/${id}`, { method: 'DELETE' });
        fetchData();
        showNotification("Entry deleted successfully");
        if (selectedIds.includes(id)) {
          setSelectedIds(prev => prev.filter(i => i !== id));
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} entries?`)) {
      try {
        // Delete efficiently - parallel requests since we don't have a bulk delete endpoint
        await Promise.all(selectedIds.map(id => fetch(`${API_URL}/entries/${id}`, { method: 'DELETE' })));
        fetchData();
        setSelectedIds([]);
        showNotification(`${selectedIds.length} entries deleted successfully`);
      } catch (err) { console.error(err); }
    }
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
          <img src={logo} alt="TNL Garments" className="w-10 h-10 object-contain" />
          <span className="font-extrabold text-lg tracking-tight hidden lg:block text-slate-900 leading-tight">TNL Garments</span>
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



          {/* CALENDAR & ENTRY ROW */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="xl:col-span-1">
              <CalendarWidget
                entries={entries}
                selectedDate={selectedDate}
                onDateSelect={(date) => {
                  // Adjust for timezone offset for display
                  const offset = date.getTimezoneOffset();
                  const localDate = new Date(date.getTime() - (offset * 60 * 1000));
                  setSelectedDate(localDate);
                  setShowEntryForm(true);
                }}
              />
            </div>

            {/* Time Entry Form */}
            <div className="xl:col-span-2">
              <div className="animate-fade-in h-full">
                <TimeCard
                  onSave={handleAddEntry}
                  initialDate={selectedDate.toISOString().split('T')[0]}
                  existingEntry={entries.find(e => new Date(e.date).toDateString() === selectedDate.toDateString())}
                />
              </div>
            </div>
          </div>

          {/* METRICS ROW */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <MetricCard
              title="Monthly Payroll"
              value={formatCurrency(totalPay)}
              trend="Range: 20th - 19th"
              isPositive={true}
              icon={<div className="bg-blue-50 text-blue-600 p-2 rounded-lg">$</div>}
              filter={
                <input
                  type="month"
                  value={billingDate.toISOString().slice(0, 7)}
                  onChange={(e) => setBillingDate(new Date(e.target.value + '-15'))} // Set to 15th to avoid timezone shift issues on month boundaries
                  className="bg-slate-50 border-none text-xs font-bold text-slate-500 rounded-lg p-1 outline-none focus:ring-2 focus:ring-blue-100"
                />
              }
            />
            <MetricCard
              title="Overtime"
              value={formatCurrency(totalOT)}
              trend={`${filteredEntries.length} Entries`}
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



          {/* DATA TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-bold text-slate-800">Payroll Entries</h3>
                {selectedIds.length > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    className="flex items-center gap-2 bg-rose-50 text-rose-600 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-rose-100 transition-colors animate-fade-in"
                  >
                    <Trash2 size={14} />
                    <span>Delete {selectedIds.length} Selected</span>
                  </button>
                )}
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
                    <th className="px-6 py-4 rounded-tl-xl text-center">
                      <input
                        type="checkbox"
                        checked={processedEntries.length > 0 && selectedIds.length === processedEntries.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
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
                    <tr key={entry._id} className={`hover:bg-slate-50/50 transition-colors group ${selectedIds.includes(entry._id) ? 'bg-blue-50/30' : ''}`}>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(entry._id)}
                          onChange={() => toggleSelect(entry._id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
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

const MetricCard = ({ title, value, trend, isPositive, icon, filter }) => (
  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-all group">
    <div className="flex justify-between items-start mb-4">
      {icon}
      <div className="flex gap-2">
        {filter}
        {trend && (
          <span className={`px-2 py-1 rounded-lg text-xs font-bold ${isPositive ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
            {trend}
          </span>
        )}
      </div>
    </div>
    <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{title}</h3>
    <p className="text-3xl font-bold text-slate-800 group-hover:text-blue-600 transition-colors">{value}</p>
  </div>
);

export default App;
