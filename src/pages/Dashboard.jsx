import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getSummary, getByCategory, getMonthlyTrend, getTransactions, getByAccount, getBudgetStatus, getInsights } from '../services/api';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    X,
    Filter,
    Target,
    Sparkles,
    AlertTriangle,
    CheckCircle2,
    Lightbulb,
    Info,
    Loader2
} from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, PieChart, Pie, Cell } from 'recharts';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { PageTransition, AnimatedCard, AnimatedList, AnimatedListItem, TactileButton } from '../components/ui/MotionComponents';

export default function Dashboard() {
    const { getCategoryColor, getCategoryIcon, accounts, getAccountIcon, getAccountColor } = useApp();
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
    const [categoryData, setCategoryData] = useState([]);
    const [monthlyData, setMonthlyData] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);
    const [accountBalances, setAccountBalances] = useState([]);
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState('all');
    const [selectedAccount, setSelectedAccount] = useState('');
    const [budgetStatus, setBudgetStatus] = useState([]);
    const [insights, setInsights] = useState(null);
    const [insightsLoading, setInsightsLoading] = useState(false);
    const [insightsError, setInsightsError] = useState(null);

    const hasFilters = period !== 'all' || selectedAccount !== '';

    useEffect(() => {
        fetchData();
    }, [period, selectedAccount]);

    // Fetch account balances independently (always all-time)
    useEffect(() => {
        fetchAccountBalances();
        // Fetch budgets + insights once on mount
        fetchBudgetAndInsights();
    }, []);

    const fetchBudgetAndInsights = async () => {
        try {
            const [budgetRes] = await Promise.all([getBudgetStatus()]);
            setBudgetStatus(budgetRes.data);
        } catch (err) {
            console.error('Budget fetch error:', err);
        }
    };

    const fetchInsights = async () => {
        setInsightsLoading(true);
        setInsightsError(null);
        try {
            const insightRes = await getInsights();
            setInsights(insightRes.data);
        } catch (err) {
            console.error('Insights fetch error:', err);
            setInsights(null);
            setInsightsError(err.response?.data?.error || 'Failed to generate insights. Tap to retry.');
        } finally {
            setInsightsLoading(false);
        }
    };

    const getDateRange = () => {
        const now = new Date();
        let startDate;
        if (period === 'week') {
            startDate = new Date(now);
            startDate.setDate(now.getDate() - 7);
        } else if (period === 'month') {
            startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        } else if (period === 'year') {
            startDate = new Date(now.getFullYear(), 0, 1);
        } else {
            return {}; // all time — no date filter
        }
        return {
            startDate: startDate.toISOString().split('T')[0],
            endDate: now.toISOString().split('T')[0]
        };
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const range = getDateRange();
            const accountParam = selectedAccount ? { account: selectedAccount } : {};
            const [sumRes, catRes, monthRes, txRes] = await Promise.all([
                getSummary({ ...range, ...accountParam }),
                getByCategory({ ...range, ...accountParam }),
                getMonthlyTrend({ year: new Date().getFullYear(), ...accountParam }),
                getTransactions({ limit: 5, page: 1, ...accountParam })
            ]);
            setSummary(sumRes.data);
            setCategoryData(catRes.data);
            setMonthlyData(monthRes.data);
            setRecentTransactions(txRes.data.transactions);
        } catch (err) {
            console.error('Dashboard fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchAccountBalances = async () => {
        try {
            const res = await getByAccount();
            setAccountBalances(res.data);
        } catch (err) {
            console.error('Account balances error:', err);
        }
    };

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(val);
    };

    const clearFilters = () => {
        setPeriod('all');
        setSelectedAccount('');
    };

    const CHART_COLORS = ['#6C5CE7', '#A855F7', '#FF6B6B', '#4ECDC4', '#FFA726', '#00D68F', '#F093FB', '#29B6F6', '#66BB6A', '#EC407A'];

    if (loading) {
        return (
            <div className="page-loading">
                <div className="spinner" />
                <p>Loading dashboard...</p>
            </div>
        );
    }

    const CustomAreaTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip glass-tooltip">
                    <p className="tooltip-label">{label}</p>
                    {payload.map((entry, index) => (
                        <div key={index} className="tooltip-row">
                            <span className="tooltip-dot" style={{ background: entry.color }}></span>
                            <span className="tooltip-name">{entry.name}</span>
                            <span className="tooltip-value">{formatCurrency(entry.value)}</span>
                        </div>
                    ))}
                </div>
            );
        }
        return null;
    };

    const CustomPieTooltip = ({ active, payload }) => {
        if (active && payload && payload.length) {
            return (
                <div className="custom-tooltip glass-tooltip">
                    <div className="tooltip-row">
                        <span className="tooltip-dot" style={{ background: payload[0].payload.fill }}></span>
                        <span className="tooltip-name">{payload[0].name}</span>
                        <span className="tooltip-value">{formatCurrency(payload[0].value)}</span>
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <PageTransition className="dashboard">
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p className="subtitle">
                        {hasFilters ? 'Filtered view' : 'All-time overview'}
                    </p>
                </div>
                <div className="header-filters">
                    {accounts.length > 0 && (
                        <select
                            className={`account-select ${selectedAccount ? 'has-filter' : ''}`}
                            value={selectedAccount}
                            onChange={(e) => setSelectedAccount(e.target.value)}
                        >
                            <option value="">All Accounts</option>
                            {accounts.map(acc => (
                                <option key={acc._id} value={acc.name}>
                                    {acc.icon} {acc.name}
                                </option>
                            ))}
                        </select>
                    )}
                    <div className="period-selector">
                        {['week', 'month', 'year', 'all'].map(p => (
                            <button
                                key={p}
                                className={`period-btn ${period === p ? 'active' : ''}`}
                                onClick={() => setPeriod(p)}
                                style={{ position: 'relative', background: 'transparent', zIndex: 1, border: 'none', cursor: 'pointer', padding: '6px 10px', boxShadow: 'none' }}
                            >
                                {period === p && (
                                    <motion.div
                                        layoutId="activePeriod"
                                        style={{ position: 'absolute', inset: 0, background: 'var(--primary)', borderRadius: 'var(--radius-sm)', zIndex: -1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                                    />
                                )}
                                <span style={{ position: 'relative', zIndex: 1, color: period === p ? 'white' : 'inherit' }}>
                                    {p === 'all' ? 'All Time' : p.charAt(0).toUpperCase() + p.slice(1)}
                                </span>
                            </button>
                        ))}
                    </div>
                    {hasFilters && (
                        <button className="btn btn-filter-clear" onClick={clearFilters} title="Clear all filters">
                            <X size={14} />
                            Clear
                        </button>
                    )}
                </div>
            </div>

            {/* Active Filters Banner */}
            {hasFilters && (
                <div className="active-filters-banner">
                    <Filter size={14} />
                    <span>Showing:</span>
                    {selectedAccount && (
                        <span className="filter-chip">
                            {getAccountIcon(selectedAccount)} {selectedAccount}
                            <button onClick={() => setSelectedAccount('')}><X size={12} /></button>
                        </span>
                    )}
                    {period !== 'all' && (
                        <span className="filter-chip">
                            <Calendar size={12} /> {period === 'week' ? 'This Week' : period === 'month' ? 'This Month' : 'This Year'}
                            <button onClick={() => setPeriod('all')}><X size={12} /></button>
                        </span>
                    )}
                </div>
            )}

            {/* Summary Cards */}
            <div className="summary-cards">
                <AnimatedCard delay={0.05} className="summary-card balance-card">
                    <div className="card-icon">
                        <Wallet size={24} />
                    </div>
                    <div className="card-info">
                        <span className="card-label">Balance</span>
                        <span className="card-value">{formatCurrency(summary.balance)}</span>
                    </div>
                </AnimatedCard>
                <AnimatedCard delay={0.1} className="summary-card income-card">
                    <div className="card-icon income">
                        <TrendingUp size={24} />
                    </div>
                    <div className="card-info">
                        <span className="card-label">Income</span>
                        <span className="card-value income">{formatCurrency(summary.income)}</span>
                    </div>
                </AnimatedCard>
                <AnimatedCard delay={0.15} className="summary-card expense-card">
                    <div className="card-icon expense">
                        <TrendingDown size={24} />
                    </div>
                    <div className="card-info">
                        <span className="card-label">Expenses</span>
                        <span className="card-value expense">{formatCurrency(summary.expense)}</span>
                    </div>
                </AnimatedCard>
            </div>

            {/* Account-wise Balances */}
            {accountBalances.length > 0 && !selectedAccount && (
                <div className="account-balances-section">
                    <h3 className="section-title">Account Balances</h3>
                    <div className="account-balance-cards">
                        {accountBalances.map(acc => (
                            <div
                                key={acc.account}
                                className={`account-balance-card ${selectedAccount === acc.account ? 'selected' : ''}`}
                                onClick={() => setSelectedAccount(acc.account)}
                                style={{ borderLeftColor: getAccountColor(acc.account) }}
                            >
                                <div className="acc-bal-header">
                                    <span className="acc-bal-icon" style={{ background: getAccountColor(acc.account) + '22', color: getAccountColor(acc.account) }}>
                                        {getAccountIcon(acc.account)}
                                    </span>
                                    <span className="acc-bal-name">{acc.account}</span>
                                </div>
                                <div className={`acc-bal-amount ${acc.balance >= 0 ? 'positive' : 'negative'}`}>
                                    {formatCurrency(acc.balance)}
                                </div>
                                <div className="acc-bal-details">
                                    <span className="acc-detail income">+{formatCurrency(acc.income)}</span>
                                    <span className="acc-detail expense">-{formatCurrency(acc.expense)}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Charts Row */}
            <div className="charts-row">
                {/* Monthly Trend */}
                <AnimatedCard delay={0.2} className="chart-card trend-chart">
                    <h3>Income & Expenses</h3>
                    {monthlyData.length > 0 ? (
                        <div style={{ height: '300px', width: '100%', marginTop: '16px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={monthlyData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#00D68F" stopOpacity={0.6}/>
                                            <stop offset="95%" stopColor="#00D68F" stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#FF6B6B" stopOpacity={0.6}/>
                                            <stop offset="95%" stopColor="#FF6B6B" stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <XAxis dataKey="monthName" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-muted)', fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}`} />
                                    <CartesianGrid vertical={false} strokeDasharray="4 4" stroke="var(--border-color)" />
                                    <RechartsTooltip content={<CustomAreaTooltip />} cursor={{ stroke: 'var(--border-color-hover)', strokeWidth: 2, strokeDasharray: '4 4' }} />
                                    <Area type="monotone" dataKey="income" name="Income" stroke="#00D68F" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
                                    <Area type="monotone" dataKey="expense" name="Expenses" stroke="#FF6B6B" strokeWidth={3} fillOpacity={1} fill="url(#colorExpense)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <div className="empty-chart">No data available</div>
                    )}
                </AnimatedCard>

                {/* Category Breakdown */}
                <AnimatedCard delay={0.3} className="chart-card category-chart">
                    <h3>Expenses by Category</h3>
                    {categoryData.length > 0 ? (
                        <div className="pie-chart-container">
                            <div className="pie-wrapper" style={{ height: '220px', width: '100%' }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={categoryData}
                                            dataKey="total"
                                            nameKey="_id"
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={65}
                                            outerRadius={85}
                                            paddingAngle={5}
                                            stroke="none"
                                        >
                                            {categoryData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={getCategoryColor(entry._id) || CHART_COLORS[index % CHART_COLORS.length]} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip content={<CustomPieTooltip />} />
                                    </PieChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="category-legend">
                                {categoryData.slice(0, 5).map((cat, i) => (
                                    <div key={i} className="legend-item">
                                        <span
                                            className="legend-dot"
                                            style={{ background: getCategoryColor(cat._id) || CHART_COLORS[i % CHART_COLORS.length] }}
                                        />
                                        <span className="legend-label">{getCategoryIcon(cat._id)} {cat._id}</span>
                                        <span className="legend-value">{formatCurrency(cat.total)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-state-small">
                            <p>No expenses yet</p>
                        </div>
                    )}
                </AnimatedCard>
            </div>

            {/* Recent Transactions */}
            <AnimatedCard delay={0.4} className="chart-card recent-transactions">
                <div className="section-header">
                    <h3>Recent Transactions</h3>
                </div>
                {recentTransactions.length > 0 ? (
                    <AnimatedList className="transaction-list compact">
                        {recentTransactions.map(tx => (
                            <AnimatedListItem key={tx._id} className="transaction-item">
                                <div className="tx-icon" style={{ background: getCategoryColor(tx.category) + '22', color: getCategoryColor(tx.category) }}>
                                    {getCategoryIcon(tx.category)}
                                </div>
                                <div className="tx-info">
                                    <span className="tx-title">{tx.title}</span>
                                    <span className="tx-meta">
                                        <Calendar size={12} /> {format(new Date(tx.date), 'dd MMM yyyy')}
                                        <span className="tx-category-badge">{tx.category}</span>
                                        {tx.account && <span className="tx-account-badge">{getAccountIcon(tx.account)} {tx.account}</span>}
                                    </span>
                                </div>
                                <div className={`tx-amount ${tx.type}`}>
                                    {tx.type === 'income' ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
                                    {formatCurrency(tx.amount)}
                                </div>
                            </AnimatedListItem>
                        ))}
                    </AnimatedList>
                ) : (
                    <div className="empty-state-small">
                        <p>No transactions yet. Add your first one!</p>
                    </div>
                )}
            </AnimatedCard>

            {/* Budget Overview */}
            {budgetStatus.length > 0 && (
                <AnimatedCard delay={0.45} className="chart-card budget-overview-card">
                    <div className="section-header">
                        <h3><Target size={18} /> Budget Overview</h3>
                    </div>
                    <div className="budget-overview-list">
                        {budgetStatus.slice(0, 4).map((b, i) => {
                            const color = b.percentage >= 100 ? '#ef4444' : b.percentage >= 80 ? '#f97316' : b.percentage >= 60 ? '#eab308' : '#10b981';
                            return (
                                <motion.div
                                    key={b._id}
                                    className={`budget-overview-item budget-${b.status}`}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.5 + i * 0.08 }}
                                >
                                    <div className="budget-ov-header">
                                        <span className="budget-ov-category">{b.category === '__ALL__' ? '📊 Total' : b.category}</span>
                                        <span className="budget-ov-amounts" style={{ color }}>
                                            {formatCurrency(b.spent)} / {formatCurrency(b.limit)}
                                        </span>
                                    </div>
                                    <div className="budget-progress-track mini">
                                        <motion.div
                                            className="budget-progress-fill"
                                            initial={{ width: 0 }}
                                            animate={{ width: `${Math.min(b.percentage, 100)}%` }}
                                            transition={{ duration: 0.8, delay: 0.6 + i * 0.1 }}
                                            style={{ background: `linear-gradient(90deg, ${color}88, ${color})`, boxShadow: `0 0 8px ${color}33` }}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </AnimatedCard>
            )}

            {/* AI Insights */}
            <AnimatedCard delay={0.5} className="chart-card insights-card">
                <div className="section-header">
                    <h3><Sparkles size={18} /> AI Insights</h3>
                </div>
                {insightsLoading ? (
                    <div className="insights-loading">
                        <div className="insights-shimmer" />
                        <div className="insights-shimmer short" />
                        <div className="insights-shimmer" />
                        <p className="insights-loading-text"><Loader2 size={16} className="spin" /> Analyzing your spending patterns...</p>
                    </div>
                ) : insights && insights.insights ? (
                    <div className="insights-list">
                        {insights.insights.map((insight, i) => (
                            <motion.div
                                key={i}
                                className={`insight-item insight-${insight.type}`}
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 * i, type: 'spring', stiffness: 300, damping: 25 }}
                            >
                                <div className="insight-icon">
                                    {insight.type === 'warning' && <AlertTriangle size={18} />}
                                    {insight.type === 'tip' && <Lightbulb size={18} />}
                                    {insight.type === 'positive' && <CheckCircle2 size={18} />}
                                    {insight.type === 'info' && <Info size={18} />}
                                </div>
                                <div className="insight-content">
                                    <strong>{insight.title}</strong>
                                    <p>{insight.body}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                ) : insightsError ? (
                    <div className="insights-error">
                        <AlertTriangle size={24} />
                        <p>AI quota limit reached. Please wait a minute and try again.</p>
                        <TactileButton className="btn btn-primary" onClick={fetchInsights}>
                            <Sparkles size={16} /> Retry
                        </TactileButton>
                    </div>
                ) : (
                    <div className="empty-state-small" style={{ gap: '12px' }}>
                        <div className="insight-icon" style={{ background: 'var(--primary-light)', color: '#fff', width: 48, height: 48, marginBottom: 8 }}>
                            <Sparkles size={24} />
                        </div>
                        <p>Get personalized financial advice based on your spending patterns this month.</p>
                        <TactileButton className="btn btn-primary" onClick={fetchInsights}>
                            <Sparkles size={16} /> Generate AI Insights
                        </TactileButton>
                    </div>
                )}
            </AnimatedCard>
        </PageTransition>
    );
}
