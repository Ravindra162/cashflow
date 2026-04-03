import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyToken, getCategories, seedCategories, getAccounts, seedAccounts } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // Check auth on mount
    useEffect(() => {
        const checkAuth = async () => {
            if (token) {
                try {
                    await verifyToken();
                    setIsAuthenticated(true);
                } catch {
                    localStorage.removeItem('token');
                    setToken(null);
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };
        checkAuth();
    }, [token]);

    // Fetch categories once authenticated
    const fetchCategories = useCallback(async () => {
        try {
            await seedCategories();
            const res = await getCategories();
            setCategories(res.data);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    }, []);

    // Fetch accounts once authenticated
    const fetchAccounts = useCallback(async () => {
        try {
            await seedAccounts();
            const res = await getAccounts();
            setAccounts(res.data);
        } catch (err) {
            console.error('Failed to load accounts:', err);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCategories();
            fetchAccounts();
        }
    }, [isAuthenticated, fetchCategories, fetchAccounts]);

    const handleLogin = (newToken) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setIsAuthenticated(true);
    };

    const handleLogout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setIsAuthenticated(false);
    };

    const getCategoryColor = (name) => {
        const cat = categories.find(c => c.name === name);
        return cat?.color || '#78909C';
    };

    const getCategoryIcon = (name) => {
        const cat = categories.find(c => c.name === name);
        return cat?.icon || '📦';
    };

    const getAccountColor = (name) => {
        const acc = accounts.find(a => a.name === name);
        return acc?.color || '#78909C';
    };

    const getAccountIcon = (name) => {
        const acc = accounts.find(a => a.name === name);
        return acc?.icon || '💳';
    };

    return (
        <AppContext.Provider value={{
            isAuthenticated,
            loading,
            token,
            categories,
            accounts,
            sidebarOpen,
            setSidebarOpen,
            handleLogin,
            handleLogout,
            fetchCategories,
            fetchAccounts,
            getCategoryColor,
            getCategoryIcon,
            getAccountColor,
            getAccountIcon
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error('useApp must be used within AppProvider');
    return context;
}
