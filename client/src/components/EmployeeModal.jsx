import React, { useState } from 'react';

const EmployeeModal = ({ isOpen, onClose, onSave, initialData }) => {
    const [name, setName] = useState('');
    const [baseSalary, setBaseSalary] = useState(30000);
    const [loading, setLoading] = useState(false);

    // Reset or Populate form on open
    React.useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setName(initialData.name);
                setBaseSalary(initialData.baseSalary);
            } else {
                setName('');
                setBaseSalary(30000);
            }
        }
    }, [isOpen, initialData]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        setLoading(true);
        // Pass back data (include ID if editing)
        const payload = {
            name,
            baseSalary: Number(baseSalary)
        };

        if (initialData && initialData._id) {
            payload._id = initialData._id;
        }

        await onSave(payload);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6">{initialData ? 'Edit Employee' : 'Add New Employee'}</h2>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Full Name</label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                            placeholder="e.g. John Doe"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-500 mb-1">Base Salary (LKR)</label>
                        <input
                            type="number"
                            value={baseSalary}
                            onChange={(e) => setBaseSalary(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-3 px-6 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : (initialData ? 'Update Employee' : 'Create Employee')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeModal;
