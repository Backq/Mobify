import { useState } from 'react';
import { X, User, Lock, Loader } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import './AuthModal.css';

const AuthModal = () => {
    const { showAuthModal, closeAuthModal, login, register } = useAuth();
    const [mode, setMode] = useState('login'); // 'login' or 'register'
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    if (!showAuthModal) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        if (mode === 'register' && password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            if (mode === 'login') {
                await login(username, password);
            } else {
                await register(username, password);
            }
            // Reset form
            setUsername('');
            setPassword('');
            setConfirmPassword('');
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred');
        } finally {
            setIsLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'register' : 'login');
        setError('');
    };

    return (
        <div className="auth-overlay" onClick={closeAuthModal}>
            <div className="auth-modal glass-panel" onClick={e => e.stopPropagation()}>
                <button className="auth-close" onClick={closeAuthModal}>
                    <X size={24} />
                </button>

                <div className="auth-header">
                    <h2 className="auth-title">
                        {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                    </h2>
                    <p className="auth-subtitle">
                        {mode === 'login'
                            ? 'Sign in to access your library'
                            : 'Join Mobify to save your favorites'}
                    </p>
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-field">
                        <User className="auth-icon" size={20} />
                        <input
                            type="text"
                            placeholder="Username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="auth-input"
                            autoComplete="username"
                        />
                    </div>

                    <div className="auth-field">
                        <Lock className="auth-icon" size={20} />
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="auth-input"
                            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                        />
                    </div>

                    {mode === 'register' && (
                        <div className="auth-field">
                            <Lock className="auth-icon" size={20} />
                            <input
                                type="password"
                                placeholder="Confirm Password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="auth-input"
                                autoComplete="new-password"
                            />
                        </div>
                    )}

                    {error && <div className="auth-error">{error}</div>}

                    <button type="submit" className="auth-submit" disabled={isLoading}>
                        {isLoading ? (
                            <Loader className="auth-loader" size={20} />
                        ) : (
                            mode === 'login' ? 'Sign In' : 'Create Account'
                        )}
                    </button>
                </form>

                <div className="auth-switch">
                    {mode === 'login' ? (
                        <>
                            Don't have an account?{' '}
                            <button onClick={switchMode}>Sign up</button>
                        </>
                    ) : (
                        <>
                            Already have an account?{' '}
                            <button onClick={switchMode}>Sign in</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuthModal;
