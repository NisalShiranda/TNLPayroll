import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Settings, Bell, Search, Plus, Trash2, Calendar, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CurrencyInput from './components/CurrencyInput';
import TimeCard from './components/TimeCard';
import CalendarWidget from './components/CalendarWidget';
import EmployeeModal from './components/EmployeeModal';
import { calculateDailyPay, formatCurrency } from './utils/calculations';
import logo from './assets/logo.png';

const App = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);

  // const [baseSalary, setBaseSalary] = useState(30000); // Now derived from selectedEmployee
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedIds, setSelectedIds] = useState([]);
  // const [viewMode, setViewMode] = useState('list'); // REMOVED
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'verified', 'regular'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, [selectedEmployee?._id]); // Re-fetch when employee changes

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      // 1. Fetch Employees
      const empRes = await fetch(`${API_URL}/employees`, { signal: controller.signal });
      const empData = await empRes.json();
      setEmployees(empData);

      // 2. Determine Selected Employee (Keep current or Default to first)
      let currentEmp = selectedEmployee;
      if (!currentEmp && empData.length > 0) {
        currentEmp = empData[0];
        setSelectedEmployee(empData[0]);
      } else if (currentEmp) {
        // Refresh current employee data (in case salary changed)
        currentEmp = empData.find(e => e._id === currentEmp._id) || empData[0];
        setSelectedEmployee(currentEmp);
      }

      if (currentEmp) {
        // 3. Fetch Entries for Selected Employee
        const entriesRes = await fetch(`${API_URL}/entries?employeeId=${currentEmp._id}`, { signal: controller.signal });
        const entriesData = await entriesRes.json();
        setEntries(entriesData);
      }

      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Connection error", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryChange = async (val) => {
    if (!selectedEmployee) return;

    // Optimistic Update
    const updatedEmp = { ...selectedEmployee, baseSalary: val };
    setSelectedEmployee(updatedEmp);
    setEmployees(prev => prev.map(e => e._id === updatedEmp._id ? updatedEmp : e));

    try {
      await fetch(`${API_URL}/employees/${selectedEmployee._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseSalary: val })
      });
    } catch (err) { console.error(err); }
  };

  const handleCreateEmployee = async (empData) => {
    try {
      const res = await fetch(`${API_URL}/employees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });
      if (res.ok) {
        const newEmp = await res.json();
        setEmployees(prev => [...prev, newEmp]);
        setSelectedEmployee(newEmp); // Switch to new employee
        setEntries([]); // Clear entries for new employee
        showNotification(`Employee ${newEmp.name} created!`);
        fetchData(); // Refresh to be sure
      }
    } catch (err) { console.error(err); }
  };

  const [notification, setNotification] = useState(null);
  const [billingDate, setBillingDate] = useState(new Date());

  const processedEntries = entries.map(e => ({
    ...e,
    ...calculateDailyPay(e, selectedEmployee?.baseSalary || 30000)
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

    // DATE FILTER LOGIC:
    // If Custom Date Range is set, use it.
    // Otherwise, default to the Billing Range (20th - 19th)
    let inRange = false;
    if (filterStartDate && filterEndDate) {
      const start = new Date(filterStartDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(filterEndDate);
      end.setHours(23, 59, 59, 999);
      inRange = d >= start && d <= end;
    } else {
      inRange = d >= billingStart && d <= billingEnd;
    }

    // Status Filter
    if (filterStatus === 'all') return inRange;
    if (filterStatus === 'verified') return inRange && e.otHours > 0;
    if (filterStatus === 'regular') return inRange && e.otHours === 0;

    return inRange;
  });

  const totalOT = filteredEntries.reduce((acc, curr) => acc + curr.otPay, 0);

  const totalPay = Number(selectedEmployee?.baseSalary || 0) + totalOT;

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
        body: JSON.stringify({ ...entry, employeeId: selectedEmployee._id })
      });
      if (res.ok) {
        fetchData();
        setShowEntryForm(false);
        // Calculate estimated pay for feedback
        const calc = calculateDailyPay(entry, selectedEmployee?.baseSalary);
        showNotification(entry._id ? `Entry Updated!` : `Entry Added! Earned: ${formatCurrency(calc.otPay)} OT`);
      }
    } catch (err) { console.error(err); }
  };

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Title
    doc.setFontSize(18);
    doc.text('TNL Garments - Payroll Report', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 28);

    // Period Info
    let periodText = `Billing Period: ${billingStart.toLocaleDateString()} - ${billingEnd.toLocaleDateString()}`;
    if (filterStartDate && filterEndDate) {
      periodText = `Custom Period: ${filterStartDate} - ${filterEndDate}`;
    }
    doc.text(periodText, 14, 34);

    // Table
    const tableColumn = ["Date", "Status", "Hours Worked", "OT Hours", "OT Pay (LKR)"];

    // Use selected rows if any, otherwise all filtered rows
    const dataToExport = selectedIds.length > 0
      ? filteredEntries.filter(e => selectedIds.includes(e._id))
      : filteredEntries;

    const exportRows = dataToExport.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.isSpecialDay ? "Special Day" : "Normal Day",
      entry.hours,
      entry.otHours,
      formatCurrency(entry.otPay).replace('LKR', '').trim()
    ]);

    autoTable(doc, {
      startY: 40,
      head: [tableColumn],
      body: exportRows,
      theme: 'grid',
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] } // Emerald Green
    });

    // Summary
    const finalY = doc.lastAutoTable.finalY + 10;
    const totalOTSum = dataToExport.reduce((acc, curr) => acc + curr.otPay, 0);
    doc.setFontSize(12);
    doc.text(`Total OT Pay: ${formatCurrency(totalOTSum)}`, 14, finalY);

    doc.save('tnl-payroll-report.pdf');
  };

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

            {/* EMPLOYEE SELECTOR */}
            <div className="flex items-center gap-2 ml-4 bg-slate-50 p-1 rounded-xl border border-slate-200">
              <select
                value={selectedEmployee?._id || ''}
                onChange={(e) => {
                  const emp = employees.find(emp => emp._id === e.target.value);
                  setSelectedEmployee(emp);
                  // Trigger fetch immediately for new user
                  // (useEffect dep or manual fetch call needed - simplified by useEffect on selectedEmployee change if we added it, but let's just reload or let the next render cycle handle it if we add selectedEmployee to useEffect dep. 
                  // Better: Just set state and let useEffect handle it if added, OR call fetchData manually.
                  // Let's add useEffect for selectedEmployee or modify fetchData flow. 
                  // Actually, fetchData relies on state. Best to just reload entries:
                  // fetchEntriesFor(emp._id)
                }}
                // Actually better to have useEffect depend on selectedEmployee? 
                // Let's stick to the fetchData flow.
                className="bg-transparent text-sm font-bold text-slate-700 outline-none px-2 py-1 cursor-pointer min-w-[150px]"
              >
                {employees.map(emp => (
                  <option key={emp._id} value={emp._id}>{emp.name}</option>
                ))}
              </select>
              <button
                onClick={() => setShowEmployeeModal(true)}
                className="p-1.5 bg-white rounded-lg shadow-sm text-blue-600 hover:bg-blue-50 transition-colors"
                title="Add New Employee"
              >
                <Plus size={16} />
              </button>
            </div>
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
                <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Base Salary Config</p>
                <div className="relative z-10">
                  <CurrencyInput value={selectedEmployee?.baseSalary || 0} onChange={handleSalaryChange} label="" />
                </div>
              </div>
            </div>
          </div>



          {/* DATA TABLE */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex flex-col gap-4">
              <div className="flex justify-between items-center">
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
                  <button
                    onClick={handleExportPDF}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
                  >
                    <Download size={14} />
                    Export PDF
                  </button>
                  <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`px-3 py-1.5 text-xs font-bold border rounded-lg hover:bg-slate-50 transition-colors ${showFilters ? 'bg-blue-50 border-blue-200 text-blue-600' : 'border-slate-200 text-slate-600'}`}
                  >
                    Filter
                  </button>
                </div>
              </div>

              {/* Filter Bar */}
              {showFilters && (
                <div className="animate-fade-in flex flex-wrap items-center gap-4 p-4 bg-slate-50/50 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status</span>
                    <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
                      <button onClick={() => setFilterStatus('all')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterStatus === 'all' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>All</button>
                      <button onClick={() => setFilterStatus('verified')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterStatus === 'verified' ? 'bg-emerald-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Verified</button>
                      <button onClick={() => setFilterStatus('regular')} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${filterStatus === 'regular' ? 'bg-slate-500 text-white shadow' : 'text-slate-500 hover:bg-slate-50'}`}>Regular</button>
                    </div>
                  </div>

                  <div className="w-px h-8 bg-slate-200 hidden md:block"></div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date Range</span>
                    <div className="flex items-center gap-2">
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                      />
                      <span className="text-slate-300 font-bold">-</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold text-slate-600 outline-none focus:ring-2 focus:ring-blue-100 shadow-sm"
                      />
                      {(filterStartDate || filterEndDate) && (
                        <button
                          onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                          className="text-[10px] items-center text-rose-500 font-bold hover:underline flex gap-1"
                        >
                          <Trash2 size={10} /> Clear
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
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
                  {filteredEntries.map((entry) => (
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

      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        onSave={handleCreateEmployee}
      />
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
