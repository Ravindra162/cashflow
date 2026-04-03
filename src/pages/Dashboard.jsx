import { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getSummary, getByCategory, getMonthlyTrend, getTransactions, getByAccount } from '../services/api';
import {
    TrendingUp,
    TrendingDown,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Calendar,
    X,
    Filter
} from 'lucide-react';
import ReactApexChart from 'react-apexcharts';
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

    const hasFilters = period !== 'all' || selectedAccount !== '';

    useEffect(() => {
        fetchData();
    }, [period, selectedAccount]);

    // Fetch account balances independently (always all-time)
    useEffect(() => {
        fetchAccountBalances();
    }, []);

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

    const trendSeries = [
        { name: 'Income', data: monthlyData.map(d => d.income) },
        { name: 'Expenses', data: monthlyData.map(d => d.expense) }
    ];
    const trendOptions = {
        chart: { type: 'area', fontFamily: 'inherit', toolbar: { show: false }, background: 'transparent', dropShadow: { enabled: true, top: 4, left: 0, blur: 4, opacity: 0.15 } },
        colors: ['#00D68F', '#FF6B6B'],
        dataLabels: { enabled: false },
        stroke: { curve: 'smooth', width: 3 },
        fill: { type: 'gradient', gradient: { shadeIntensity: 1, opacityFrom: 0.45, opacityTo: 0.05, stops: [0, 90, 100] } },
        xaxis: { categories: monthlyData.map(d => d.monthName), labels: { style: { colors: '#94a3b8' } }, axisBorder: { show: false }, axisTicks: { show: false } },
        yaxis: { labels: { style: { colors: '#94a3b8' }, formatter: (v) => `₹${v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v}` } },
        grid: { borderColor: 'rgba(255,255,255,0.06)', strokeDashArray: 4 },
        tooltip: { theme: 'dark' },
        legend: { show: false }
    };

    const pieSeries = categoryData.map(d => d.total);
    const pieOptions = {
        chart: { type: 'donut', fontFamily: 'inherit', background: 'transparent' },
        labels: categoryData.map(d => d._id),
        colors: categoryData.map((d, i) => getCategoryColor(d._id) || CHART_COLORS[i % CHART_COLORS.length]),
        stroke: { width: 0 },
        dataLabels: { enabled: false },
        tooltip: { theme: 'dark' },
        legend: { show: false },
        plotOptions: { pie: { donut: { size: '75%' } } }
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
                    <h3>Monthly Trend</h3>
                    <div style={{ height: 280, width: '100%' }}>
                        <ReactApexChart options={trendOptions} series={trendSeries} type="area" height="100%" />
                    </div>
                </AnimatedCard>

                {/* Category Breakdown */}
                <AnimatedCard delay={0.3} className="chart-card category-chart">
                    <h3>Spending by Category</h3>
                    {categoryData.length > 0 ? (
                        <>
                            <div style={{ height: 220, width: '100%', display: 'flex', justifyContent: 'center' }}>
                                <ReactApexChart options={pieOptions} series={pieSeries} type="donut" height="100%" />
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
                        </>
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
        </PageTransition>
    );
}
