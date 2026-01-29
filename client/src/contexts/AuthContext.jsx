import { createContext, useContext, useState, useEffect } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // Check for existing session on mount
    useEffect(() => {
        const token = localStorage.getItem('mobify_token');
        if (token) {
            authAPI.getMe()
                .then(userData => setUser(userData))
                .catch(() => {
                    localStorage.removeItem('mobify_token');
                })
                .finally(() => setIsLoading(false));
        } else {
            setIsLoading(false);
        }
    }, []);

    const login = async (username, password) => {
        const { token, user: userData } = await authAPI.login(username, password);
        localStorage.setItem('mobify_token', token);
        setUser(userData);
        setShowAuthModal(false);
        return userData;
    };

    const register = async (username, password) => {
        const { token, user: userData } = await authAPI.register(username, password);
        localStorage.setItem('mobify_token', token);
        setUser(userData);
        setShowAuthModal(false);
        return userData;
    };

    const logout = () => {
        localStorage.removeItem('mobify_token');
        setUser(null);
    };

    const openAuthModal = () => setShowAuthModal(true);
    const closeAuthModal = () => setShowAuthModal(false);

    return (
        <AuthContext.Provider value={{
            user,
            isLoading,
            isAuthenticated: !!user,
            login,
            register,
            logout,
            showAuthModal,
            openAuthModal,
            closeAuthModal
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
