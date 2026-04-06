import { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [token, setToken] = useState(() => localStorage.getItem('token'));
    const [user, setUser] = useState(() => {
        const saved = localStorage.getItem('user');
        return saved ? JSON.parse(saved) : null;
    });
    const [tipCont, setTipCont] = useState(() => localStorage.getItem('tip_cont'));

    const login = (tokenNou, userData, tip) => {
        localStorage.setItem('token', tokenNou);
        localStorage.setItem('user', JSON.stringify(userData));
        localStorage.setItem('tip_cont', tip);
        setToken(tokenNou);
        setUser(userData);
        setTipCont(tip);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('tip_cont');
        setToken(null);
        setUser(null);
        setTipCont(null);
    };

    return (
        <AuthContext.Provider value={{ token, user, tipCont, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
