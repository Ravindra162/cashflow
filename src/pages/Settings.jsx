import { useState, useRef } from 'react';
import { getAllTransactions, bulkAddTransactions, ensureAccount, resetAllTransactions } from '../services/api';
import { useApp } from '../context/AppContext';
import * as XLSX from 'xlsx';
import {
    Upload,
    Download,
    FileSpreadsheet,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Coins,
    Trash2,
    AlertTriangle
} from 'lucide-react';

export default function Settings() {
    const { categories } = useApp();
    const fileInputRef = useRef(null);
    const cashewInputRef = useRef(null);
    const [importResult, setImportResult] = useState(null);
    const [exportLoading, setExportLoading] = useState(false);
    const [importLoading, setImportLoading] = useState(false);
    const [cashewLoading, setCashewLoading] = useState(false);
    const [resetStep, setResetStep] = useState(0); // 0=idle, 1=confirm, 2=typing
    const [resetConfirmText, setResetConfirmText] = useState('');
    const [resetLoading, setResetLoading] = useState(false);

    // ========== EXPORT ==========
    const handleExport = async () => {
        setExportLoading(true);
        try {
            const res = await getAllTransactions();
            const data = res.data.map(tx => ({
                Date: new Date(tx.date).toLocaleDateString('en-IN'),
                Title: tx.title,
                Amount: tx.amount,
                Type: tx.type,
                Category: tx.category,
                Notes: tx.notes || ''
            }));

            const ws = XLSX.utils.json_to_sheet(data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Transactions');

            // Auto-size columns
            const colWidths = Object.keys(data[0] || {}).map(key => ({
                wch: Math.max(key.length, ...data.map(row => String(row[key]).length)) + 2
            }));
            ws['!cols'] = colWidths;

            XLSX.writeFile(wb, `expenses_${new Date().toISOString().split('T')[0]}.xlsx`);
            setImportResult({ type: 'success', message: `Exported ${data.length} transactions` });
        } catch (err) {
            setImportResult({ type: 'error', message: 'Export failed: ' + err.message });
        } finally {
            setExportLoading(false);
        }
    };

    // ========== GENERIC IMPORT ==========
    const handleImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setImportLoading(true);
        setImportResult(null);

        try {
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);

            if (rows.length === 0) {
                setImportResult({ type: 'error', message: 'File is empty' });
                return;
            }

            const transactions = rows.map(row => {
                const dateVal = row.Date || row.date || row.DATE || row['Transaction Date'] || new Date();
                const title = row.Title || row.title || row.TITLE || row.Description || row.description || 'Untitled';
                const amount = parseFloat(row.Amount || row.amount || row.AMOUNT || 0);
                const type = (row.Type || row.type || row.TYPE || 'expense').toLowerCase();
                const category = row.Category || row.category || row.CATEGORY || 'Others';
                const notes = row.Notes || row.notes || row.NOTES || '';

                let parsedDate;
                if (typeof dateVal === 'number') {
                    parsedDate = new Date((dateVal - 25569) * 86400 * 1000);
                } else {
                    parsedDate = new Date(dateVal);
                }
                if (isNaN(parsedDate.getTime())) parsedDate = new Date();

                return {
                    title,
                    amount: Math.abs(amount),
                    type: type === 'income' ? 'income' : 'expense',
                    category,
                    date: parsedDate.toISOString(),
                    notes
                };
            });

            const res = await bulkAddTransactions(transactions);
            setImportResult({
                type: 'success',
                message: `Successfully imported ${res.data.inserted} transactions`
            });
        } catch (err) {
            setImportResult({
                type: 'error',
                message: 'Import failed: ' + (err.response?.data?.error || err.message)
            });
        } finally {
            setImportLoading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    // ========== CASHEW CSV IMPORT ==========
    const handleCashewImport = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setCashewLoading(true);
        setImportResult(null);

        try {
            const text = await file.text();
            const data = await file.arrayBuffer();
            const wb = XLSX.read(data);
            const ws = wb.Sheets[wb.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(ws);

            if (rows.length === 0) {
                setImportResult({ type: 'error', message: 'File is empty' });
                return;
            }

            // Cashew CSV columns:
            // account, amount, currency, title, note, date, type, category, category name,
            // subcategory, subcategory name, emoji, budget, objective
            //
            // Key rules:
            // - amount is negative for expenses, positive for income
            // - "category name" is the human-readable category
            // - date format: "YYYY-MM-DD HH:mm:ss.SSS"
            // - Some rows are "Updated Total Balance" entries (skip these)

            // Map Cashew category names to our categories
            const cashewCategoryMap = {
                // Expense mappings
                'Dining': 'Food & Dining',
                'Out Food': 'Food & Dining',
                'Food': 'Food & Dining',
                'Housing': 'Rent',
                'Shopping': 'Shopping',
                'Entertainment': 'Entertainment',
                'Bills & Fees': 'Bills & Utilities',
                'Bills & Fee': 'Bills & Utilities',
                'Transport': 'Transportation',
                'Transportation': 'Transportation',
                'Travel': 'Transportation',
                'Healthcare': 'Healthcare',
                'Health': 'Healthcare',
                'Education': 'Education',
                'Groceries': 'Groceries',
                'Personal Care': 'Personal Care',
                'Snacks': 'Food & Dining',
                'Stationary': 'Education',
                'Stationery': 'Education',
                'Skincare': 'Personal Care',
                'Selfcare': 'Personal Care',
                'DailyNeeds': 'Groceries',
                // Income mappings
                'Salary': 'Salary',
                'Freelance': 'Freelance',
                'Income': 'Other Income',
            };

            let skipped = 0;
            let imported = 0;

            const transactions = rows
                .filter(row => {
                    // Skip "Updated Total Balance" rows and rows without amount
                    const title = row.title || '';
                    const amount = parseFloat(row.amount);
                    if (title === 'Updated Total Balance' || isNaN(amount) || amount === 0) {
                        skipped++;
                        return false;
                    }
                    return true;
                })
                .map(row => {
                    const amount = parseFloat(row.amount);
                    const isIncome = amount > 0;

                    // Get category - try "category name" first, then subcategory name, then category
                    const cashewCategory = row['category name'] || row['subcategory name'] || '';
                    const cashewSubcategory = row['subcategory name'] || '';

                    // Try to map to our categories, checking subcategory first for more specificity
                    let mappedCategory =
                        cashewCategoryMap[cashewSubcategory] ||
                        cashewCategoryMap[cashewCategory] ||
                        null;

                    // If no mapping found, try to find a matching category in our system
                    if (!mappedCategory) {
                        const match = categories.find(c =>
                            c.name.toLowerCase().includes(cashewCategory.toLowerCase()) ||
                            cashewCategory.toLowerCase().includes(c.name.toLowerCase())
                        );
                        mappedCategory = match ? match.name : (isIncome ? 'Other Income' : 'Others');
                    }

                    // Parse date - Cashew uses "YYYY-MM-DD HH:mm:ss.SSS" or Excel serial number
                    let parsedDate;
                    const dateVal = row.date;
                    if (typeof dateVal === 'number') {
                        // Excel serial date number
                        parsedDate = new Date((dateVal - 25569) * 86400 * 1000);
                    } else if (typeof dateVal === 'string' && dateVal) {
                        parsedDate = new Date(dateVal.replace(' ', 'T'));
                    } else {
                        parsedDate = new Date();
                    }
                    if (!parsedDate || isNaN(parsedDate.getTime())) {
                        parsedDate = new Date();
                    }

                    return {
                        title: row.title || 'Untitled',
                        amount: Math.abs(amount),
                        type: isIncome ? 'income' : 'expense',
                        category: mappedCategory,
                        date: parsedDate.toISOString(),
                        notes: row.note || '',
                        account: row.account || 'Cash'
                    };
                });

            if (transactions.length === 0) {
                setImportResult({ type: 'error', message: 'No valid transactions found in the Cashew file' });
                return;
            }

            // Auto-create accounts from Cashew data
            const uniqueAccounts = [...new Set(transactions.map(t => t.account))];
            for (const accName of uniqueAccounts) {
                try { await ensureAccount(accName); } catch { }
            }

            const res = await bulkAddTransactions(transactions);
            imported = res.data.inserted;

            setImportResult({
                type: 'success',
                message: `Cashew import complete! ${imported} transactions imported, ${uniqueAccounts.length} accounts created${skipped > 0 ? `, ${skipped} balance entries skipped` : ''}`
            });
        } catch (err) {
            setImportResult({
                type: 'error',
                message: 'Cashew import failed: ' + (err.response?.data?.error || err.message)
            });
        } finally {
            setCashewLoading(false);
            if (cashewInputRef.current) cashewInputRef.current.value = '';
        }
    };

    // ========== RESET ALL DATA ==========
    const handleReset = async () => {
        if (resetConfirmText !== 'RESET') return;
        setResetLoading(true);
        try {
            const res = await resetAllTransactions();
            setImportResult({
                type: 'success',
                message: `All data reset! ${res.data.deleted} transactions deleted.`
            });
            setResetStep(0);
            setResetConfirmText('');
        } catch (err) {
            setImportResult({
                type: 'error',
                message: 'Reset failed: ' + (err.response?.data?.error || err.message)
            });
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="settings-page">
            <div className="page-header">
                <div>
                    <h1>Settings</h1>
                    <p className="subtitle">Import & export your data</p>
                </div>
            </div>

            <div className="settings-grid three-col">
                {/* Export Card */}
                <div className="settings-card">
                    <div className="settings-card-icon export">
                        <Download size={28} />
                    </div>
                    <h3>Export to Excel</h3>
                    <p>Download all your transactions as an Excel (.xlsx) file</p>
                    <button
                        className="btn btn-primary full-width"
                        onClick={handleExport}
                        disabled={exportLoading}
                    >
                        {exportLoading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Exporting...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={18} />
                                Export Transactions
                            </>
                        )}
                    </button>
                </div>

                {/* Generic Import Card */}
                <div className="settings-card">
                    <div className="settings-card-icon import">
                        <Upload size={28} />
                    </div>
                    <h3>Import from Excel</h3>
                    <p>Upload an Excel file with columns: Date, Title, Amount, Type, Category, Notes</p>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        onChange={handleImport}
                        className="hidden-input"
                        id="import-input"
                    />
                    <label
                        htmlFor="import-input"
                        className={`btn btn-primary full-width ${importLoading ? 'disabled' : ''}`}
                    >
                        {importLoading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <FileSpreadsheet size={18} />
                                Choose File & Import
                            </>
                        )}
                    </label>
                </div>

                {/* Cashew Import Card */}
                <div className="settings-card cashew-card">
                    <div className="settings-card-icon cashew">
                        <Coins size={28} />
                    </div>
                    <h3>Import from Cashew</h3>
                    <p>Upload your Cashew app CSV export. Categories will be auto-mapped.</p>
                    <input
                        ref={cashewInputRef}
                        type="file"
                        accept=".csv"
                        onChange={handleCashewImport}
                        className="hidden-input"
                        id="cashew-input"
                    />
                    <label
                        htmlFor="cashew-input"
                        className={`btn btn-cashew full-width ${cashewLoading ? 'disabled' : ''}`}
                    >
                        {cashewLoading ? (
                            <>
                                <Loader2 size={18} className="spin" />
                                Importing...
                            </>
                        ) : (
                            <>
                                <Coins size={18} />
                                Import Cashew CSV
                            </>
                        )}
                    </label>
                </div>
            </div>

            {/* Result Message */}
            {importResult && (
                <div className={`result-message ${importResult.type}`}>
                    {importResult.type === 'success' ? (
                        <CheckCircle2 size={20} />
                    ) : (
                        <AlertCircle size={20} />
                    )}
                    <span>{importResult.message}</span>
                </div>
            )}

            {/* Cashew Format Info */}
            <div className="settings-card format-info">
                <h3>🥜 Cashew CSV Format</h3>
                <div className="table-wrapper">
                    <table className="format-table">
                        <thead>
                            <tr>
                                <th>Cashew Column</th>
                                <th>Maps To</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td><code>amount</code></td>
                                <td>Amount + Type</td>
                                <td>Negative = expense, Positive = income</td>
                            </tr>
                            <tr>
                                <td><code>title</code></td>
                                <td>Title</td>
                                <td>Transaction name</td>
                            </tr>
                            <tr>
                                <td><code>note</code></td>
                                <td>Notes</td>
                                <td>Optional description</td>
                            </tr>
                            <tr>
                                <td><code>date</code></td>
                                <td>Date</td>
                                <td>YYYY-MM-DD HH:mm:ss format</td>
                            </tr>
                            <tr>
                                <td><code>category name</code></td>
                                <td>Category</td>
                                <td>Auto-mapped (e.g., Dining → Food & Dining)</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="format-note">
                    "Updated Total Balance" entries are automatically skipped. Cashew categories are auto-mapped to your categories.
                    Unmapped categories default to "Others" (expense) or "Other Income" (income).
                </p>
            </div>

            {/* Generic Format Info */}
            <div className="settings-card format-info">
                <h3>📋 Generic Excel Format</h3>
                <div className="table-wrapper">
                    <table className="format-table">
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Title</th>
                                <th>Amount</th>
                                <th>Type</th>
                                <th>Category</th>
                                <th>Notes</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>01/04/2026</td>
                                <td>Grocery Shopping</td>
                                <td>1500</td>
                                <td>expense</td>
                                <td>Groceries</td>
                                <td>Weekly groceries</td>
                            </tr>
                            <tr>
                                <td>01/04/2026</td>
                                <td>Salary</td>
                                <td>50000</td>
                                <td>income</td>
                                <td>Salary</td>
                                <td>April salary</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <p className="format-note">
                    Column names are case-insensitive. Available categories: {categories.map(c => c.icon + ' ' + c.name).join(', ')}
                </p>
            </div>

            {/* Danger Zone */}
            <div className="settings-card danger-zone">
                <h3><AlertTriangle size={18} /> Danger Zone</h3>
                <p>Permanently delete all transactions. This cannot be undone.</p>
                {resetStep === 0 && (
                    <button
                        className="btn btn-danger full-width"
                        onClick={() => setResetStep(1)}
                    >
                        <Trash2 size={18} />
                        Reset All Data
                    </button>
                )}
                {resetStep === 1 && (
                    <div className="reset-confirm">
                        <p className="reset-warning">⚠️ This will delete ALL transactions permanently. Type <strong>RESET</strong> to confirm:</p>
                        <div className="reset-input-row">
                            <input
                                type="text"
                                value={resetConfirmText}
                                onChange={(e) => setResetConfirmText(e.target.value.toUpperCase())}
                                placeholder="Type RESET"
                                autoFocus
                            />
                            <button
                                className="btn btn-danger"
                                onClick={handleReset}
                                disabled={resetConfirmText !== 'RESET' || resetLoading}
                            >
                                {resetLoading ? <Loader2 size={16} className="spin" /> : <Trash2 size={16} />}
                                {resetLoading ? 'Deleting...' : 'Confirm Delete'}
                            </button>
                            <button className="btn btn-ghost" onClick={() => { setResetStep(0); setResetConfirmText(''); }}>
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
