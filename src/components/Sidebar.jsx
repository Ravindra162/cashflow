import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import {
    LayoutDashboard,
    ArrowLeftRight,
    Tags,
    CreditCard,
    History,
    Settings,
    LogOut,
    Wallet,
    Menu,
    X
} from 'lucide-react';

const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    { to: '/accounts', label: 'Accounts', icon: CreditCard },
    { to: '/categories', label: 'Categories', icon: Tags },
    { to: '/spend-history', label: 'History', icon: History },
    { to: '/settings', label: 'Settings', icon: Settings },
];

// Bottom nav only shows these 5 (most used)
const bottomNavItems = [
    { to: '/', label: 'Home', icon: LayoutDashboard },
    { to: '/transactions', label: 'Txns', icon: ArrowLeftRight },
    { to: '/accounts', label: 'Accounts', icon: CreditCard },
    { to: '/spend-history', label: 'History', icon: History },
    { to: '/settings', label: 'More', icon: Menu },
];

export default function Sidebar() {
    const { handleLogout, sidebarOpen, setSidebarOpen } = useApp();
    const navigate = useNavigate();

    const onLogout = () => {
        handleLogout();
        navigate('/login');
    };

    return (
        <>
            <button
                className="sidebar-toggle"
                onClick={() => setSidebarOpen(!sidebarOpen)}
            >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {/* Desktop sidebar */}
            <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <Wallet size={24} />
                        <span>CashFlow</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    {navItems.map(({ to, label, icon: Icon }) => (
                        <NavLink
                            key={to}
                            to={to}
                            end={to === '/'}
                            className={({ isActive }) =>
                                `sidebar-link ${isActive ? 'active' : ''}`
                            }
                            onClick={() => {
                                if (window.innerWidth < 768) setSidebarOpen(false);
                            }}
                        >
                            <Icon size={20} />
                            <span>{label}</span>
                        </NavLink>
                    ))}
                </nav>

                <div className="sidebar-footer">
                    <button className="sidebar-link logout-btn" onClick={onLogout}>
                        <LogOut size={20} />
                        <span>Logout</span>
                    </button>
                </div>
            </aside>

            {sidebarOpen && (
                <div
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Mobile bottom nav */}
            <nav className="bottom-nav">
                {bottomNavItems.map(({ to, label, icon: Icon }) => (
                    <NavLink
                        key={to}
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                            `bottom-nav-item ${isActive ? 'active' : ''}`
                        }
                    >
                        <Icon size={20} />
                        <span>{label}</span>
                    </NavLink>
                ))}
            </nav>
        </>
    );
}
