import React, { useState, useEffect } from 'react';
import CurrencyInput from './components/CurrencyInput';
import TimeCard from './components/TimeCard';
import { calculateDailyPay, formatCurrency } from './utils/calculations';

const App = () => {
  const [baseSalary, setBaseSalary] = useState(30000);
  const [entries, setEntries] = useState([]);
  const [settingsId, setSettingsId] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_URL = 'http://localhost:5000/api';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

      const settingsRes = await fetch(`${API_URL}/settings`, { signal: controller.signal });
      const settingsData = await settingsRes.json();
      setBaseSalary(settingsData.baseSalary || 30000);
      setSettingsId(settingsData._id);

      const entriesRes = await fetch(`${API_URL}/entries`, { signal: controller.signal });
      const entriesData = await entriesRes.json();
      setEntries(entriesData);

      clearTimeout(timeoutId);
    } catch (error) {
      console.error("Error connecting to server", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSalaryChange = async (val) => {
    setBaseSalary(val);
    // Debounce update in real app, here direct for simplicity
    try {
      await fetch(`${API_URL}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseSalary: val })
      });
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddEntry = async (entry) => {
    try {
      const res = await fetch(`${API_URL}/entries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entry)
      });
      if (res.ok) {
        fetchData(); // Reload to get fresh list
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await fetch(`${API_URL}/entries/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) { console.error(err); }
  };

  // Calculate totals
  const processedEntries = entries.map(e => ({
    ...e,
    ...calculateDailyPay(e, baseSalary)
  }));

  const totalOT = processedEntries.reduce((acc, curr) => acc + curr.otPay, 0);

  if (loading) return <div className="flex h-screen items-center justify-center text-accent">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-primary text-white p-6 shadow-lg">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">TNL Payroll</h1>
          <p className="text-gray-400 text-sm">Employee Dashboard</p>
        </div>
      </header>

      <main className="max-w-md mx-auto p-4 space-y-6 -mt-4 relative z-10">

        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          <div className="mb-4">
            <CurrencyInput
              label="Base Monthly Salary"
              value={baseSalary}
              onChange={handleSalaryChange}
            />
          </div>

          <div className="pt-4 border-t border-gray-100">
            <div className="flex justify-between items-end">
              <span className="text-gray-500 font-medium">Total OT Pay</span>
              <span className="text-3xl font-bold text-green-600">{formatCurrency(totalOT)}</span>
            </div>
            <p className="text-xs text-right text-gray-400 mt-1">
              Rate: {formatCurrency((baseSalary / 30) / 8)} / hr
            </p>
          </div>
        </div>

        {/* Entry Form */}
        <TimeCard onSave={handleAddEntry} />

        {/* History List */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-700 ml-1">Recent Entries</h3>
          {processedEntries.map((entry) => (
            <div key={entry._id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex justify-between items-center">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-gray-800">
                    {new Date(entry.date).toLocaleDateString()}
                  </span>
                  {entry.isSpecialDay && (
                    <span className="bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">SPL</span>
                  )}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  {entry.hours.toFixed(1)} hrs worked • {entry.otHours.toFixed(1)} hrs OT
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-green-600">{formatCurrency(entry.otPay)}</div>
                <button
                  onClick={() => handleDelete(entry._id)}
                  className="text-xs text-red-400 hover:text-red-600 mt-1"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          {processedEntries.length === 0 && (
            <div className="text-center text-gray-400 py-8">No entries yet.</div>
          )}
        </div>

      </main>
    </div>
  );
};

export default App;
