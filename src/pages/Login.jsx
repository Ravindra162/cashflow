import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { login } from '../services/api';
import { useApp } from '../context/AppContext';
import { Wallet, Eye, EyeOff, ArrowRight } from 'lucide-react';

export default function Login() {
    const { isAuthenticated } = useApp();

    // Redirect if already logged in
    if (isAuthenticated) {
        return <Navigate to="/" replace />;
    }
    const { handleLogin } = useApp();
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);
        try {
            const res = await login(password);
            handleLogin(res.data.token);
        } catch (err) {
            setError(err.response?.data?.error || 'Login failed');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-bg-orb login-bg-orb-1" />
            <div className="login-bg-orb login-bg-orb-2" />
            <div className="login-bg-orb login-bg-orb-3" />

            <div className="login-card">
                <div className="login-icon">
                    <Wallet size={32} />
                </div>
                <h1 className="login-title">Expense Tracker</h1>
                <p className="login-subtitle">Enter your password to continue</p>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="input-group">
                        <input
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Password"
                            className="login-input"
                            autoFocus
                        />
                        <button
                            type="button"
                            className="password-toggle"
                            onClick={() => setShowPassword(!showPassword)}
                        >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                    </div>

                    {error && <p className="login-error">{error}</p>}

                    <button
                        type="submit"
                        className="login-btn"
                        disabled={isLoading || !password}
                    >
                        {isLoading ? (
                            <span className="btn-loader" />
                        ) : (
                            <>
                                Sign In
                                <ArrowRight size={18} />
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
