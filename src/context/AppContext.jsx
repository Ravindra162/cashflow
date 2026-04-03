import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { verifyToken, getCategories, seedCategories, getAccounts, seedAccounts, getFriends } from '../services/api';

const AppContext = createContext(null);

export function AppProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [friends, setFriends] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const defaultPrefs = { theme: 'default', font: 'inter' };
    const savedPrefs = localStorage.getItem('preferences');
    const [preferences, setPreferences] = useState(savedPrefs ? JSON.parse(savedPrefs) : defaultPrefs);

    // Apply global CSS attributes based on preferences
    useEffect(() => {
        localStorage.setItem('preferences', JSON.stringify(preferences));
        document.documentElement.setAttribute('data-theme', preferences.theme);
        document.documentElement.setAttribute('data-font', preferences.font);
    }, [preferences]);

    const updatePreferences = (updates) => {
        setPreferences(prev => ({ ...prev, ...updates }));
    };

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

    // Fetch friends once authenticated
    const fetchFriends = useCallback(async () => {
        try {
            const res = await getFriends();
            setFriends(res.data);
        } catch (err) {
            console.error('Failed to load friends:', err);
        }
    }, []);

    useEffect(() => {
        if (isAuthenticated) {
            fetchCategories();
            fetchAccounts();
            fetchFriends();
        }
    }, [isAuthenticated, fetchCategories, fetchAccounts, fetchFriends]);

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
            friends,
            sidebarOpen,
            setSidebarOpen,
            preferences,
            updatePreferences,
            handleLogin,
            handleLogout,
            fetchCategories,
            fetchAccounts,
            fetchFriends,
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
