import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Users, FileText, Bell, Calendar, Clock, DollarSign, Download, Filter, Menu, Plus, RefreshCw, Search, Settings, Trash2, X, ChevronRight, Edit2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import CurrencyInput from './components/CurrencyInput';
import TimeCard from './components/TimeCard';
import CalendarWidget from './components/CalendarWidget';
import EmployeeModal from './components/EmployeeModal';
import ConfirmModal from './components/ConfirmModal';
import { calculateDailyPay, formatCurrency } from './utils/calculations';
import logo from './assets/logo.png';
// Main App Component with Multi-Employee Support (v2)
const App = () => {
  const [employees, setEmployees] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [deleteData, setDeleteData] = useState(null); // { id, name }

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
  const [bonus, setBonus] = useState(0);
  const [advance, setAdvance] = useState(0);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, [selectedEmployee?._id]); // Re-fetch when employee changes

  const fetchData = async () => {
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
      // 1. Fetch Employees
      const empRes = await fetch(`${API_URL}/employees`, { signal: controller.signal });
      const empData = await empRes.json();

      if (empRes.ok && Array.isArray(empData)) {
        setEmployees(empData);
      } else {
        setEmployees([]);
      }

      // 2. Settings (Independent of Employee)
      let currentSettings = {};
      try {
        const settingsRes = await fetch(`${API_URL}/settings`, { signal: controller.signal });
        if (settingsRes.ok) {
          currentSettings = await settingsRes.json();
          setSettings(currentSettings);
        }
      } catch (e) { console.warn("Settings fetch error", e); }

      // 3. Employee & Entries
      let currentEmp = selectedEmployee;
      if (!currentEmp && empData.length > 0) {
        currentEmp = empData[0];
        setSelectedEmployee(empData[0]);
      } else if (currentEmp) {
        currentEmp = empData.find(e => e._id === currentEmp._id) || empData[0];
        setSelectedEmployee(currentEmp);
      }

      if (currentEmp) {
        const entriesRes = await fetch(`${API_URL}/entries?employeeId=${currentEmp._id}`, { signal: controller.signal });
        const entriesData = await entriesRes.json();
        setEntries(entriesData);
      }

      clearTimeout(timeoutId);
    } catch (error) {
      if (error.name === 'AbortError') return;
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

  const handleSaveEmployee = async (empData) => {
    try {
      const isEdit = !!empData._id;
      const url = isEdit ? `${API_URL}/employees/${empData._id}` : `${API_URL}/employees`;
      const method = isEdit ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(empData)
      });

      if (res.ok) {
        const savedEmp = await res.json();

        if (isEdit) {
          // Update in list
          setEmployees(prev => prev.map(e => e._id === savedEmp._id ? savedEmp : e));
          // Update selected if needed
          if (selectedEmployee?._id === savedEmp._id) {
            setSelectedEmployee(savedEmp);
          }
          showNotification(`Employee updated successfully!`);
        } else {
          // Add new
          setEmployees(prev => [...prev, savedEmp]);

          // Only switch if no employee is currently selected (e.g. first employee)
          if (!selectedEmployee) {
            setSelectedEmployee(savedEmp);
            setEntries([]);
          }

          showNotification(`Employee ${savedEmp.name} created!`);
        }

        // Refresh to be sure
        fetchData();
      }
    } catch (err) { console.error(err); }
  };

  const [notification, setNotification] = useState(null);
  const [billingDate, setBillingDate] = useState(new Date());
  const [settings, setSettings] = useState({});

  const processedEntries = entries.map(e => ({
    ...e,
    ...calculateDailyPay(e, selectedEmployee?.baseSalary || 30000, settings?.otDivisor || 240)
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

  const handleUpdateSettings = async (newSettings) => {
    try {
      // Optimistic update
      setSettings(prev => ({ ...prev, ...newSettings }));

      const res = await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSettings)
      });

      if (res.ok) {
        showNotification("Settings saved!");
      }
    } catch (err) { console.error(err); }
  };

  const handleBackupData = () => {
    const data = {
      employees,
      entries,
      settings
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tnl_payroll_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification("Backup downloaded!");
  };

  const handleExportPDF = (customStart = null, customEnd = null) => {
    const doc = new jsPDF();

    // Use custom range if provided, otherwise fallback to billing cycle
    const start = customStart || billingStart;
    const end = customEnd || billingEnd;

    // -- COLORS --
    const primaryColor = [15, 23, 42]; // Slate-900
    const accentColor = [37, 99, 235]; // Blue-600
    const lightGray = [248, 250, 252]; // Slate-50

    // -- 1. HEADER --
    // Add Logo
    try {
      doc.addImage(logo, 'PNG', 15, 12, 24, 24);
    } catch (e) {
      console.warn("Logo add failed", e);
    }

    // Company Name & Title
    doc.setFont("helvetica", "bold");
    doc.setFontSize(24);
    doc.setTextColor(...primaryColor);
    doc.text(settings?.companyName || 'TNL Garments', 45, 20);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.setFont("helvetica", "normal");
    doc.text(settings?.companyAddress || '123 Garment Factory Rd, Colombo', 45, 25);
    const contactInfo = `Email: ${settings?.companyEmail || 'info@tnlgarments.com'} | Tel: ${settings?.companyPhone || '+94 11 234 5678'}`;
    doc.text(contactInfo, 45, 30);

    doc.setFontSize(16);
    doc.setTextColor(...accentColor);
    doc.setFont("helvetica", "bold");
    doc.text('Salary Sheet', 196, 20, { align: 'right' });

    // Divider
    doc.setLineWidth(0.5);
    doc.setDrawColor(200);
    doc.line(14, 38, 196, 38);

    // -- 2. EMPLOYEE & PERIOD INFO BOX --
    doc.setFillColor(...lightGray);
    doc.roundedRect(14, 45, 182, 24, 2, 2, 'F');

    doc.setFontSize(11);
    doc.setTextColor(...primaryColor);
    doc.text(`Employee:`, 20, 54);
    doc.setFont("helvetica", "normal");
    doc.text(selectedEmployee?.name || 'N/A', 50, 54);

    doc.setFont("helvetica", "bold");
    doc.text(`Pay Period:`, 20, 62);
    doc.setFont("helvetica", "normal");
    const periodText = `${start.toLocaleDateString()} to ${end.toLocaleDateString()}`;
    doc.text(periodText, 50, 62);

    doc.setFont("helvetica", "bold");
    doc.text(`Generated:`, 120, 54);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleDateString(), 145, 54);

    // -- 3. CALCULATIONS (WITH NaN FIX) --
    let dataToExport;
    if (customStart && customEnd) {
      dataToExport = entries.filter(e => {
        const d = new Date(e.date);
        return d >= start && d <= end;
      });
    } else {
      dataToExport = selectedIds.length > 0
        ? filteredEntries.filter(e => selectedIds.includes(e._id))
        : filteredEntries;
    }

    // FIX: Add Safe Number Conversion for Reduce
    const normalOT = dataToExport.filter(e => !e.isSpecialDay).reduce((acc, curr) => acc + (Number(curr.otPay) || 0), 0);
    const specialOT = dataToExport.filter(e => e.isSpecialDay).reduce((acc, curr) => acc + (Number(curr.otPay) || 0), 0);
    const totalOTSum = normalOT + specialOT;

    const baseSal = Number(selectedEmployee?.baseSalary || 0);
    const bonusVal = customStart ? 0 : Number(bonus);
    const advanceVal = customStart ? 0 : Number(advance);
    const netSalary = baseSal + totalOTSum + bonusVal - advanceVal;

    // -- 4. SALARY SUMMARY TABLE --
    autoTable(doc, {
      startY: 80,
      head: [['Earnings / Deductions', 'Amount (LKR)']],
      body: [
        ['Base Salary', formatCurrency(baseSal).replace('LKR', '').trim()],
        ['OT Pay (Normal Days)', formatCurrency(normalOT).replace('LKR', '').trim()],
        ['OT Pay (Special Days)', formatCurrency(specialOT).replace('LKR', '').trim()],
        ['Bonus', formatCurrency(bonusVal).replace('LKR', '').trim()],
        ['Advance (Deduction)', `(${formatCurrency(advanceVal).replace('LKR', '').trim()})`],
        [{ content: 'NET SALARY PAYABLE', styles: { fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255], fillColor: primaryColor } },
        { content: formatCurrency(netSalary).replace('LKR', '').trim(), styles: { fontStyle: 'bold', fontSize: 12, textColor: [255, 255, 255], fillColor: primaryColor, halign: 'right' } }]
      ],
      theme: 'grid',
      headStyles: { fillColor: accentColor, halign: 'left', fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 120 },
        1: { halign: 'right', fontStyle: 'bold' }
      },
      styles: { fontSize: 10, cellPadding: 6 }
    });

    // -- 5. ATTENDANCE DETAILS TABLE --
    doc.setFontSize(12);
    doc.setTextColor(...primaryColor);
    doc.text('Attendance & Overtime Details', 14, doc.lastAutoTable.finalY + 14);

    const tableColumn = ["Date", "Status", "Work Hours", "OT Hours", "OT Earnings"];
    const exportRows = dataToExport.map(entry => [
      new Date(entry.date).toLocaleDateString(),
      entry.isSpecialDay ? "Special Day" : "Normal",
      entry.hours || '-',
      entry.otHours || '0',
      formatCurrency(Number(entry.otPay) || 0).replace('LKR', '').trim()
    ]);

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 18,
      head: [tableColumn],
      body: exportRows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [100, 116, 139] },
      columnStyles: {
        4: { halign: 'right' }
      }
    });

    // -- 6. FOOTER --
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(150);
    doc.line(14, pageHeight - 30, 60, pageHeight - 30);
    doc.setFontSize(8);
    doc.text("Authorized Signature", 14, pageHeight - 25);

    doc.text("Generated by TNL Payroll System", 196, pageHeight - 10, { align: 'right' });


    // Use 'start' date to determine the month name for the file
    const monthName = start.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }).replace(/ /g, '_');
    const safeEmpName = (selectedEmployee?.name || 'Employee').replace(/ /g, '_');
    doc.save(`Salary_Sheet_${monthName}_${safeEmpName}.pdf`);
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

  const handleDeleteEmployee = (emp) => {
    setDeleteData({ id: emp._id, name: emp.name });
  };

  const confirmDeleteEmployee = async () => {
    if (!deleteData) return;

    try {
      await fetch(`${API_URL}/employees/${deleteData.id}`, { method: 'DELETE' });
      setEmployees(prev => prev.filter(e => e._id !== deleteData.id));

      // If selected employee was deleted, switch to another or null
      if (selectedEmployee?._id === deleteData.id) {
        const remaining = employees.filter(e => e._id !== deleteData.id);
        setSelectedEmployee(remaining.length > 0 ? remaining[0] : null);
        setEntries([]);
      }
      showNotification("Employee deleted successfully");
      setDeleteData(null);
    } catch (err) { console.error(err); }
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
          <NavItem icon={<Calendar size={20} />} label="Payroll" active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<Users size={20} />} label="Employee" active={activeTab === 'employees'} onClick={() => setActiveTab('employees')} />
          <NavItem icon={<FileText size={20} />} label="Report" active={activeTab === 'report'} onClick={() => setActiveTab('report')} />
          <NavItem icon={<Settings size={20} />} label="Settings" active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
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


            </div>
          </div>
          <div className="flex items-center gap-6">
            {/* Search and Bell removed as per request */}
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

          {/* --- EMPLOYEE MANAGEMENT TAB --- */}
          {activeTab === 'employees' ? (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
              <div className="p-6 border-b border-slate-50 flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Employee Management</h3>
                <button
                  onClick={() => { setEditingEmployee(null); setShowEmployeeModal(true); }}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
                >
                  <Plus size={16} />
                  Add New Employee
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-[#F9FAFB] text-slate-500 font-semibold border-b border-slate-100">
                    <tr>
                      <th className="px-6 py-4">Name</th>
                      <th className="px-6 py-4">Base Salary</th>
                      <th className="px-6 py-4">Joined Date</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {employees.map(emp => (
                      <tr key={emp._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                              {emp.name.charAt(0)}
                            </div>
                            <span className="font-bold text-slate-700">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-600">{formatCurrency(emp.baseSalary)}</td>
                        <td className="px-6 py-4 text-slate-500">{new Date(emp.joinedDate || Date.now()).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => { setEditingEmployee(emp); setShowEmployeeModal(true); }}
                              className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Edit"
                            >
                              <Edit2 size={16} />
                            </button>
                            <button
                              onClick={() => handleDeleteEmployee(emp)}
                              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                              title="Delete"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <>
              {/* ACTION BAR */}



              {/* CALENDAR & ENTRY ROW */}
              {activeTab === 'dashboard' && (
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
              )}

              {/* METRICS ROW */}

              {/* METRICS ROW (Hide on Settings Tab) */}
              {activeTab !== 'settings' && (
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
                      <CurrencyInput value={selectedEmployee?.baseSalary || 0} onChange={handleSalaryChange} label="" />
                    </div>
                  </div>
                </div>
              )}





              {/* ADVANCED SALARY CALCULATOR */}
              {activeTab === 'history' && (
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm mb-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      <div className="bg-emerald-50 text-emerald-600 p-2 rounded-lg">
                        <DollarSign size={20} />
                      </div>
                      Full Salary Calculation
                    </h3>
                    <button
                      onClick={handleExportPDF}
                      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors shadow-lg shadow-slate-200"
                    >
                      <Download size={16} />
                      Export Salary Sheet
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 1. Base Salary */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Base Salary</p>
                      <p className="text-xl font-bold text-slate-700">{formatCurrency(selectedEmployee?.baseSalary || 0)}</p>
                    </div>

                    {/* 2. Total OT */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Total OT ({filteredEntries.length} Days)</p>
                      <p className="text-xl font-bold text-blue-600">{formatCurrency(totalOT)}</p>
                    </div>

                    {/* 3. Bonus & Advance Inputs */}
                    <div className="space-y-3">
                      <CurrencyInput
                        value={bonus}
                        onChange={setBonus}
                        label="Bonus (+)"
                      />
                      <CurrencyInput
                        value={advance}
                        onChange={setAdvance}
                        label="Advance (-)"
                      />
                    </div>

                    {/* 4. Final Net Salary */}
                    <div className="bg-slate-800 p-4 rounded-2xl text-white shadow-lg shadow-slate-200">
                      <p className="text-xs font-bold text-slate-400 uppercase mb-1">Net Salary</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(Number(selectedEmployee?.baseSalary || 0) + totalOT + Number(bonus) - Number(advance))}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        (Base + OT + Bonus) - Advance
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* DATA TABLE */}
              {activeTab === 'dashboard' && (
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
              )}


              {/* REPORT TAB */}
              {activeTab === 'report' && (
                <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in">
                  <div className="p-6 border-b border-slate-50">
                    <h3 className="text-lg font-bold text-slate-800">Monthly Salary History</h3>
                    <p className="text-slate-400 text-xs mt-1">Download past salary sheets for {selectedEmployee?.name}</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-[#F9FAFB] text-slate-500 font-semibold border-b border-slate-100">
                        <tr>
                          <th className="px-6 py-4">Month</th>
                          <th className="px-6 py-4">Total Days</th>
                          <th className="px-6 py-4">Total OT</th>
                          <th className="px-6 py-4">Base Salary</th>
                          <th className="px-6 py-4">Est. Net Pay (Base + OT)</th>
                          <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {Array.from({ length: 12 }).map((_, i) => {
                          const d = new Date();
                          d.setMonth(d.getMonth() - i);
                          // Calculate start/end for this month (20th prev - 19th current logic or just calendar month?)
                          // Using Calendar Month for simplicity in reports unless specified otherwise
                          // Actually, app uses 20th-19th. Let's try to approximate that or just use calendar month for the "History" list to be clean.
                          // User said "each months salary sheets".
                          // Let's stick to the App's billing cycle logic: 20th of Prev Month to 19th of Current Month.

                          const year = d.getFullYear();
                          const month = d.getMonth(); // 0-11

                          // Billing Cycle: 20th of (Month-1) to 19th of (Month)
                          // Example: Report for "February" covers Jan 20 - Feb 19.
                          const start = new Date(year, month - 1, 20);
                          const end = new Date(year, month, 19);

                          const monthLabel = d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

                          // Filter entries for this period
                          const monthEntries = entries.filter(e => {
                            const eDate = new Date(e.date);
                            return eDate >= start && eDate <= end;
                          });

                          const otPay = monthEntries.reduce((acc, curr) => acc + (Number(curr.otPay) || 0), 0);
                          const otHours = monthEntries.reduce((acc, curr) => acc + (Number(curr.otHours) || 0), 0);
                          const base = Number(selectedEmployee?.baseSalary || 0);
                          const estTotal = base + otPay; // Bonus/Advance unknown for history

                          return (
                            <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-bold text-slate-700">{monthLabel}</td>
                              <td className="px-6 py-4 text-slate-600">{monthEntries.length} Days</td>
                              <td className="px-6 py-4 font-blue-600 font-bold">{formatCurrency(otPay)} <span className="text-slate-400 text-xs font-normal">({otHours} hrs)</span></td>
                              <td className="px-6 py-4 text-slate-600">{formatCurrency(base)}</td>
                              <td className="px-6 py-4 font-bold text-emerald-600">{formatCurrency(estTotal)}*</td>
                              <td className="px-6 py-4 text-right">
                                <button
                                  onClick={() => handleExportPDF(start, end)}
                                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-lg hover:bg-slate-700 transition-colors"
                                >
                                  <Download size={14} /> Download
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="p-4 bg-slate-50 text-xs text-slate-400 text-center">
                    * Estimated Net Pay does not include historic Bonus/Advance data.
                  </div>
                </div>
              )}


              {/* SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">

                  {/* 1. COMPANY PROFILE */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                        <Settings size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-800">Company Profile</h3>
                        <p className="text-xs text-slate-400">Details for your PDF Salary Sheets</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Company Name</label>
                        <input
                          type="text"
                          value={settings.companyName || ''}
                          onChange={e => setSettings({ ...settings, companyName: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Address</label>
                        <input
                          type="text"
                          value={settings.companyAddress || ''}
                          onChange={e => setSettings({ ...settings, companyAddress: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Phone</label>
                          <input
                            type="text"
                            value={settings.companyPhone || ''}
                            onChange={e => setSettings({ ...settings, companyPhone: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email</label>
                          <input
                            type="text"
                            value={settings.companyEmail || ''}
                            onChange={e => setSettings({ ...settings, companyEmail: e.target.value })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleUpdateSettings(settings)}
                        className="w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors mt-2"
                      >
                        Save Company Details
                      </button>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {/* 2. PAYROLL CONFIG */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                      <h3 className="text-lg font-bold text-slate-800 mb-4">Payroll Configuration</h3>
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">OT Divisor</label>
                            <input
                              type="number"
                              value={settings.otDivisor || 240}
                              onChange={e => setSettings({ ...settings, otDivisor: Number(e.target.value) })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <p className="text-[10px] text-slate-400 mt-1">Standard is 240 (Hourly = Base/240)</p>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Currency</label>
                            <input
                              type="text"
                              value={settings.currency || 'LKR'}
                              onChange={e => setSettings({ ...settings, currency: e.target.value })}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Billing Cycle Start Day</label>
                          <input
                            type="number"
                            value={settings.billingStartDay || 20}
                            onChange={e => setSettings({ ...settings, billingStartDay: Number(e.target.value) })}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <p className="text-[10px] text-slate-400 mt-1">Day of previous month when cycle starts (Default: 20)</p>
                        </div>
                        <button
                          onClick={() => handleUpdateSettings(settings)}
                          className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl hover:bg-blue-500 transition-colors"
                        >
                          Update Configuration
                        </button>
                      </div>
                    </div>

                    {/* 3. DATE TOOLS */}
                    <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm border-l-4 border-l-purple-500">
                      <h3 className="text-lg font-bold text-slate-800 mb-2">Data Management</h3>
                      <p className="text-sm text-slate-500 mb-4">Download a full backup of all employees, entries, and settings.</p>
                      <button
                        onClick={handleBackupData}
                        className="flex items-center justify-center gap-2 w-full bg-purple-50 text-purple-600 font-bold py-3 rounded-xl hover:bg-purple-100 transition-colors"
                      >
                        <Download size={18} /> Download JSON Backup
                      </button>
                    </div>
                  </div>

                </div>
              )}
            </>
          )}

        </div>
      </main >

      <EmployeeModal
        isOpen={showEmployeeModal}
        onClose={() => setShowEmployeeModal(false)}
        onSave={handleSaveEmployee}
        initialData={editingEmployee}
      />

      <ConfirmModal
        isOpen={!!deleteData}
        onClose={() => setDeleteData(null)}
        onConfirm={confirmDeleteEmployee}
        title="Delete Employee?"
        message={`Are you sure you want to delete ${deleteData?.name}? This will permanently delete their profile and ALL associated time entries.`}
        isDangerous={true}
      />
    </div >
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
