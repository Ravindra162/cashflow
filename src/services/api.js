import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');

const api = axios.create({
    baseURL: API_BASE,
    headers: { 'Content-Type': 'application/json' }
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Auto-logout on 401
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401 && !error.config.url.includes('/auth/')) {
            localStorage.removeItem('token');
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

// Auth
export const login = (password) => api.post('/auth/login', { password });
export const verifyToken = () => api.get('/auth/verify');

// Transactions
export const getTransactions = (params) => api.get('/transactions', { params });
export const getAllTransactions = () => api.get('/transactions/all');
export const addTransaction = (data) => api.post('/transactions', data);
export const bulkAddTransactions = (transactions) => api.post('/transactions/bulk', { transactions });
export const updateTransaction = (id, data) => api.put(`/transactions/${id}`, data);
export const deleteTransaction = (id) => api.delete(`/transactions/${id}`);
export const resetAllTransactions = () => api.delete('/transactions/all');

// Categories
export const getCategories = (type) => api.get('/categories', { params: type ? { type } : {} });
export const addCategory = (data) => api.post('/categories', data);
export const updateCategory = (id, data) => api.put(`/categories/${id}`, data);
export const deleteCategory = (id) => api.delete(`/categories/${id}`);
export const seedCategories = () => api.post('/categories/seed');

// Stats
export const getSummary = (params) => api.get('/stats/summary', { params });
export const getByCategory = (params) => api.get('/stats/by-category', { params });
export const getMonthlyTrend = (params) => api.get('/stats/monthly', { params });
export const getByAccount = () => api.get('/stats/by-account');

// Spend History
export const getSpendHistories = () => api.get('/spend-history');
export const getSpendHistory = (id) => api.get(`/spend-history/${id}`);
export const addSpendHistory = (data) => api.post('/spend-history', data);
export const updateSpendHistory = (id, data) => api.put(`/spend-history/${id}`, data);
export const deleteSpendHistory = (id) => api.delete(`/spend-history/${id}`);

// Accounts
export const getAccounts = () => api.get('/accounts');
export const addAccount = (data) => api.post('/accounts', data);
export const updateAccount = (id, data) => api.put(`/accounts/${id}`, data);
export const deleteAccount = (id) => api.delete(`/accounts/${id}`);
export const seedAccounts = () => api.post('/accounts/seed');
export const ensureAccount = (name) => api.post('/accounts/ensure', { name });

export default api;
