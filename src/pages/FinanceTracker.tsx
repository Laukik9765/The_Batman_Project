// Finance Tracker Module
// Path: src/pages/FinanceTracker.tsx

import React, { useState, useEffect } from 'react';
import { useAppStore, FinanceCategory, FinanceTransaction } from '../store/appStore';
import { supabase } from '../lib/supabase';
import { 
  PlusIcon, 
  TrashIcon, 
  XIcon,
  AIMentorIcon,
  FinanceIcon,
  WarningIcon
} from '../components/ui/Icons';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

const BAT_COLORS = ['#F5C518', '#C49A10', '#E8E8F0', '#8888A0', '#4080E8', '#40C870', '#E84040'];

export const FinanceTracker: React.FC<{ onNavigate: (path: string) => void }> = ({ onNavigate }) => {
  const {
    profile,
    financeCategories,
    financeTransactions,
    addFinanceCategory,
    addFinanceTransaction,
    deleteFinanceTransaction,
    addToast
  } = useAppStore();

  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [note, setNote] = useState('');
  const [transactionType, setTransactionType] = useState<'income' | 'expense'>('expense');
  const [submitting, setSubmitting] = useState(false);

  // Category Form State
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [catName, setCatName] = useState('');
  const [catType, setCatType] = useState<'income' | 'expense'>('expense');
  const [catColor, setCatColor] = useState(BAT_COLORS[0]);
  const [catIcon, setCatIcon] = useState('dollar');

  // AI Analysis state
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  // Zero Income Warning Alert State
  const [showZeroIncomeWarning, setShowZeroIncomeWarning] = useState(false);

  // 1. Auto-generate default categories if none exist
  useEffect(() => {
    const generateDefaults = async () => {
      if (!profile || financeCategories.length > 0) return;

      const defaults = [
        { name: 'Salary', type: 'income', color: '#40C870', icon_key: 'briefcase' },
        { name: 'Freelance', type: 'income', color: '#4080E8', icon_key: 'terminal' },
        { name: 'Food & Rations', type: 'expense', color: '#F5C518', icon_key: 'shopping-cart' },
        { name: 'Batcave Gear & Assets', type: 'expense', color: '#E84040', icon_key: 'tool' },
        { name: 'Operational Logistics', type: 'expense', color: '#8888A0', icon_key: 'truck' },
        { name: 'Recreation', type: 'expense', color: '#C49A10', icon_key: 'coffee' }
      ];

      try {
        for (const item of defaults) {
          await addFinanceCategory(item.name, item.type as any, item.color, item.icon_key);
        }
      } catch (e) {
        console.error('Failed to write default categories:', e);
      }
    };

    generateDefaults();
  }, [profile, financeCategories]);

  // 2. Check for Zero Income in last 7 consecutive days
  useEffect(() => {
    if (financeTransactions.length === 0) return;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    const recentIncome = financeTransactions.filter(t => 
      t.transaction_date >= sevenDaysAgoStr && 
      t.finance_categories?.type === 'income'
    );

    if (recentIncome.length === 0) {
      setShowZeroIncomeWarning(true);
    } else {
      setShowZeroIncomeWarning(false);
    }
  }, [financeTransactions]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    await addFinanceCategory(catName, catType, catColor, catIcon);
    setCatName('');
    setShowAddCategory(false);
  };

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (categoryId === 'new-category') {
      setCatType(transactionType);
      setShowAddCategory(true);
      setCategoryId('');
      return;
    }

    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0 || !categoryId) {
      addToast('Please enter a valid amount and category.', 'danger');
      return;
    }

    setSubmitting(true);
    await addFinanceTransaction(amt, categoryId, date, note, false, null);
    setAmount('');
    setNote('');
    setSubmitting(false);
  };

  const handleTriggerFinanceAI = async () => {
    setLoadingReport(true);
    setAiReport(null);

    try {
      const logsContext = financeTransactions.slice(0, 15).map(t => 
        `- Date: ${t.transaction_date}, Category: ${t.finance_categories?.name} (${t.finance_categories?.type}), Amount: ₹${t.amount}, Note: "${t.note || ''}"`
      ).join('\n');

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`,
        },
        body: JSON.stringify({
          message: "Perform a detailed financial health assessment based on my transactions ledger. Detail net cashflow, identify top expense categories, detect unusual spending spikes, and suggest concrete savings avenues.",
          customContext: `Active transactions telemetry (last 15 logs):\n${logsContext || 'None logged.'}`
        }),
      });

      const result = await response.json();
      if (response.ok && result.reply) {
        setAiReport(result.reply);
        addToast('Alfred financial audit decrypted.', 'success');
      } else {
        setAiReport("Sir, I could not finalize the ledger parsing. Verify connection integrity.");
      }
    } catch (e) {
      console.error(e);
      setAiReport("Network error. Financial analysis failed.");
    } finally {
      setLoadingReport(false);
    }
  };

  // --- Calculations for Analytics ---
  const todayStr = new Date().toISOString().split('T')[0];
  const thisMonthStr = todayStr.substring(0, 7); // YYYY-MM

  // Net cashflow display totals
  const totalIncome = financeTransactions
    .filter(t => t.finance_categories?.type === 'income')
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

  const totalExpense = financeTransactions
    .filter(t => t.finance_categories?.type === 'expense')
    .reduce((sum, t) => sum + parseFloat(t.amount as any), 0);

  const netBalance = totalIncome - totalExpense;

  // 1. Current Month Category Expense Breakdown (Pie Chart)
  const categoryExpenses: Record<string, { value: number; color: string }> = {};
  
  financeTransactions
    .filter(t => t.transaction_date.startsWith(thisMonthStr) && t.finance_categories?.type === 'expense')
    .forEach(t => {
      const name = t.finance_categories?.name || 'Unclassified';
      const color = t.finance_categories?.color || '#8888A0';
      const val = parseFloat(t.amount as any);
      
      if (!categoryExpenses[name]) {
        categoryExpenses[name] = { value: 0, color };
      }
      categoryExpenses[name].value += val;
    });

  const pieData = Object.entries(categoryExpenses).map(([name, data]) => ({
    name,
    value: parseFloat(data.value.toFixed(2)),
    color: data.color
  }));

  // Identify name of the largest expense category to add the custom gold outline
  let largestCategoryName = '';
  let maxExpenseValue = 0;
  pieData.forEach(p => {
    if (p.value > maxExpenseValue) {
      maxExpenseValue = p.value;
      largestCategoryName = p.name;
    }
  });

  // 2. Monthly cashflow (last 6 months) (Bar Chart)
  // Group transactions by month
  const monthlyDataMap: Record<string, { income: number; expense: number }> = {};
  financeTransactions.forEach(t => {
    const month = t.transaction_date.substring(0, 7); // YYYY-MM
    const amt = parseFloat(t.amount as any);
    const type = t.finance_categories?.type;

    if (!monthlyDataMap[month]) {
      monthlyDataMap[month] = { income: 0, expense: 0 };
    }

    if (type === 'income') {
      monthlyDataMap[month].income += amt;
    } else if (type === 'expense') {
      monthlyDataMap[month].expense += amt;
    }
  });

  const barData = Object.entries(monthlyDataMap)
    .map(([month, data]) => ({
      month,
      income: parseFloat(data.income.toFixed(2)),
      expense: parseFloat(data.expense.toFixed(2))
    }))
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6); // Top 6 months

  const filteredCategories = financeCategories.filter(c => c.type === transactionType);

  return (
    <div className="space-y-6">
      
      {/* Zero Income Warning Banner */}
      <AnimatePresence>
        {showZeroIncomeWarning && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-4 bg-bat-danger bg-opacity-15 border border-bat-danger text-bat-white rounded flex flex-col md:flex-row justify-between items-start md:items-center gap-4 relative z-10"
          >
            <div className="flex items-center gap-3">
              <span className="text-bat-danger"><WarningIcon size={24} /></span>
              <div>
                <span className="font-bebas text-lg tracking-wider text-bat-danger block">NO INCOME LOGGED FOR 7 DAYS</span>
                <span className="text-xs text-bat-gray font-mono">
                  Sir, cashflow is the lifeblood of our operation. Let's inspect funding strategies with Alfred.
                </span>
              </div>
            </div>
            <button
              onClick={() => onNavigate('/ai-mentor')}
              className="bg-bat-danger text-white text-xs font-mono px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
            >
              DISPATCH MISSION TO ALFRED
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header commands */}
      <div className="flex justify-between items-center bg-bat-dark border border-bat-border p-4 rounded">
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddCategory(true)}
            className="flex items-center gap-2 bg-bat-dark border border-bat-border hover:border-bat-gold text-bat-gold px-4 py-2 rounded font-bebas text-md tracking-wider transition-colors"
          >
            <PlusIcon size={16} />
            DEFINE CATEGORY
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <span className="text-[10px] text-bat-gray font-mono uppercase block">NET LIFETIME CASHFLOW</span>
            <span className={`text-xl font-bebas tracking-wide ${netBalance >= 0 ? 'text-bat-success' : 'text-bat-danger'}`}>
              {netBalance >= 0 ? '+' : ''}₹{netBalance.toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Category Creation Modal popup */}
      <AnimatePresence>
        {showAddCategory && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-bat-dark border border-bat-border p-6 rounded shadow-[0_4px_30px_rgba(0,0,0,0.8)] w-full max-w-md bat-glow-gold"
            >
              <div className="flex justify-between items-center pb-4 border-b border-bat-border mb-4">
                <span className="font-bebas text-xl text-bat-gold tracking-wider">DEFINE LEDGER CATEGORY</span>
                <button onClick={() => setShowAddCategory(false)} className="text-bat-gray hover:text-bat-white">
                  <XIcon size={18} />
                </button>
              </div>

              <form onSubmit={handleCreateCategory} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={catName}
                    onChange={(e) => setCatName(e.target.value)}
                    className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm transition-colors"
                    placeholder="e.g. Batmobile Fuel or Bounty"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Type
                    </label>
                    <select
                      value={catType}
                      onChange={(e: any) => setCatType(e.target.value)}
                      className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm"
                    >
                      <option value="expense">Expense</option>
                      <option value="income">Income</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                      Visual Identifier Color
                    </label>
                    <select
                      value={catColor}
                      onChange={(e) => setCatColor(e.target.value)}
                      className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-sm font-mono"
                    >
                      {BAT_COLORS.map(c => (
                        <option key={c} value={c} style={{ color: c }}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-bat-gold hover:bg-bat-gold-dim text-bat-black font-bebas text-lg tracking-widest transition-colors rounded"
                >
                  SAVE CATEGORY
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Transaction Logger Form (Left) */}
        <div className="lg:col-span-1">
          <div className="bat-glass p-6 rounded">
            <div className="flex items-center gap-2 text-bat-gold mb-6 border-b border-bat-border pb-3">
              <FinanceIcon size={24} />
              <h3 className="font-bebas text-2xl tracking-wider">WRITE TRANSACTION</h3>
            </div>

            <div className="flex gap-2 mb-6">
              <button
                type="button"
                onClick={() => {
                  setTransactionType('income');
                  setCategoryId('');
                }}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded transition-all border ${
                  transactionType === 'income'
                    ? 'bg-bat-success border-bat-success text-bat-black font-extrabold shadow-[0_0_10px_rgba(64,200,112,0.2)]'
                    : 'bg-bat-dark border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray'
                }`}
              >
                ADD MONEY
              </button>
              <button
                type="button"
                onClick={() => {
                  setTransactionType('expense');
                  setCategoryId('');
                }}
                className={`flex-1 py-2 text-xs font-mono font-bold rounded transition-all border ${
                  transactionType === 'expense'
                    ? 'bg-bat-danger border-bat-danger text-bat-white font-extrabold shadow-[0_0_10px_rgba(232,64,64,0.2)]'
                    : 'bg-bat-dark border-bat-border text-bat-gray hover:text-bat-white hover:border-bat-gray'
                }`}
              >
                LOG SPENT
              </button>
            </div>

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Transaction Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                    Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                    placeholder="0.00"
                    step="0.01"
                    min="0.01"
                    required
                  />
                </div>
                
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-bat-gray uppercase tracking-widest">
                      Category Link
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setCatType(transactionType);
                        setShowAddCategory(true);
                      }}
                      className="text-[9px] text-bat-gold hover:underline font-mono uppercase font-bold"
                    >
                      + DEFINE
                    </button>
                  </div>
                  <select
                    value={categoryId}
                    onChange={(e) => {
                      if (e.target.value === 'new-category') {
                        setCatType(transactionType);
                        setShowAddCategory(true);
                        setCategoryId('');
                      } else {
                        setCategoryId(e.target.value);
                      }
                    }}
                    className="w-full px-3 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs"
                    required
                  >
                    <option value="">Select Category</option>
                    {filteredCategories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name.toUpperCase()}
                      </option>
                    ))}
                    <option value="new-category" className="text-bat-gold font-bold bg-bat-dark">
                      + ADD NEW CATEGORY...
                    </option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-bat-gray uppercase tracking-widest mb-1">
                  Log Note / Reference
                </label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full px-4 py-2 bg-bat-black border border-bat-border text-bat-white focus:outline-none focus:border-bat-gold rounded text-xs font-mono"
                  placeholder="Reference memo..."
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-2.5 font-bebas text-lg tracking-widest transition-colors rounded uppercase ${
                  transactionType === 'income'
                    ? 'bg-bat-success text-bat-black hover:bg-opacity-95'
                    : 'bg-bat-danger text-bat-white hover:bg-opacity-95'
                }`}
              >
                {submitting
                  ? 'RECORDING LEDGER...'
                  : transactionType === 'income'
                    ? 'ADD MONEY (₹)'
                    : 'LOG SPENT MONEY (₹)'}
              </button>
            </form>
          </div>
        </div>

        {/* Visualizations & History (Right) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Charts Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Pie Chart: monthly expense breakdown */}
            <div className="bat-glass p-6 rounded flex flex-col items-center">
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">
                EXPENSE STRUCTURE ({thisMonthStr})
              </h3>
              {pieData.length === 0 ? (
                <div className="py-12 text-xs text-bat-gray font-mono uppercase text-center">
                  NO EXPENSES LOGGED THIS MONTH
                </div>
              ) : (
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={45}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {pieData.map((entry, index) => {
                          const isLargest = entry.name === largestCategoryName;
                          return (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color}
                              stroke={isLargest ? '#F5C518' : 'transparent'}
                              strokeWidth={isLargest ? 2 : 0}
                            />
                          );
                        })}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                        itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-3 text-[9px] font-mono text-bat-gray mt-1">
                    {pieData.map(p => (
                      <div key={p.name} className="flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
                        <span className={p.name === largestCategoryName ? 'text-bat-gold font-bold' : ''}>
                          {p.name.toUpperCase()} (₹{p.value})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bar Chart: Income vs Expense per month */}
            <div className="bat-glass p-6 rounded">
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-4">OPERATIONAL RETENTION (LAST 6M)</h3>
              {barData.length === 0 ? (
                <div className="py-12 text-xs text-bat-gray font-mono uppercase text-center">NO CASHFLOW RECORDED</div>
              ) : (
                <div className="w-full h-48 font-mono text-[9px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={barData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <XAxis dataKey="month" stroke="#8888A0" />
                      <YAxis stroke="#8888A0" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#12121A', borderColor: '#2A2A3A', borderRadius: '4px' }}
                        itemStyle={{ color: '#E8E8F0', fontFamily: 'monospace' }}
                      />
                      <Legend verticalAlign="top" height={32} iconSize={8} />
                      <Bar dataKey="income" name="INCOME" fill="#40C870" radius={[2, 2, 0, 0]} />
                      <Bar dataKey="expense" name="EXPENSE" fill="#E84040" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

          </div>

          {/* AI Audit & Report */}
          <div className="bat-glass p-6 rounded flex flex-col justify-between md:flex-row md:items-center gap-4 relative overflow-hidden">
            <div className="absolute right-4 top-4 text-bat-gold opacity-10 pointer-events-none">
              <AIMentorIcon size={64} />
            </div>
            <div>
              <h3 className="font-bebas text-lg text-bat-gold tracking-wide mb-2">FINANCIAL WEALTH AUDIT</h3>
              <p className="text-xs text-bat-gray font-mono max-w-md leading-normal">
                Authorize Alfred to parse the ledger and discover cost reductions to fund strategic equipment assets.
              </p>
            </div>
            <button
              onClick={handleTriggerFinanceAI}
              disabled={loadingReport}
              className="bg-bat-dark border border-bat-border hover:border-bat-gold text-bat-gold font-mono text-xs px-4 py-2.5 rounded transition-all flex items-center gap-2 self-start md:self-auto"
            >
              <AIMentorIcon size={14} />
              {loadingReport ? 'AUDITING CASHFLOW...' : 'AUDIT WITH ALFRED'}
            </button>
          </div>

          {/* AI Output (if compiled) */}
          <AnimatePresence>
            {aiReport && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="bat-glass p-6 rounded border-l-4 border-bat-gold relative"
              >
                <div className="flex items-center gap-2 text-bat-gold mb-3">
                  <AIMentorIcon size={18} />
                  <span className="font-bebas text-lg tracking-wider">ALFRED'S FINANCIAL BRIEFING</span>
                </div>
                <p className="text-xs font-mono text-bat-white leading-relaxed whitespace-pre-wrap bg-bat-black p-4 border border-bat-border rounded">
                  {aiReport}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transaction History Logs */}
          <div className="bat-glass p-6 rounded">
            <h3 className="font-bebas text-xl text-bat-gold tracking-wider mb-4">LOG TRANSACTION HISTORY</h3>
            {financeTransactions.length === 0 ? (
              <div className="p-8 text-center text-xs text-bat-gray font-mono uppercase border border-dashed border-bat-border rounded bg-bat-black bg-opacity-30">
                NO TRANSACTIONS LOGGED.
              </div>
            ) : (
              <div className="max-h-60 overflow-y-auto divide-y divide-bat-border no-scrollbar">
                {financeTransactions.map((t) => (
                  <div key={t.id} className="py-3 flex justify-between items-center group">
                    <div className="flex items-center gap-3">
                      {/* Color Dot indicator */}
                      <span 
                        className="w-2.5 h-2.5 rounded-full" 
                        style={{ backgroundColor: t.finance_categories?.color || '#8888A0' }}
                      />
                      
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-bat-white">
                          {t.note || t.finance_categories?.name || 'Unclassified'}
                        </span>
                        <span className="text-[9px] text-bat-gray font-mono uppercase mt-0.5">
                          {t.transaction_date} • {t.finance_categories?.type?.toUpperCase()} {t.is_recurring ? '• RECURRING' : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-mono font-bold ${
                        t.finance_categories?.type === 'income' ? 'text-bat-success' : 'text-bat-danger'
                      }`}>
                        {t.finance_categories?.type === 'income' ? '+' : '-'}₹{parseFloat(t.amount as any).toFixed(2)}
                      </span>

                      <button
                        onClick={() => deleteFinanceTransaction(t.id)}
                        className="text-bat-gray hover:text-bat-danger opacity-0 group-hover:opacity-100 transition-colors"
                        title="Delete log"
                      >
                        <TrashIcon size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
