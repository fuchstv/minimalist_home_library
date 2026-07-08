import React, { createContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface AuthContextType {
    user: User | null;
    setUser: (user: User | null) => void;
    csrfToken: string | null;
    setCsrfToken: (token: string | null) => void;
    logout: () => void;
}

import { API_BASE_URL } from "../config";

export const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => {},
    csrfToken: null,
    setCsrfToken: () => {},
    logout: () => {}
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [csrfToken, setCsrfTokenState] = useState<string | null>(null);

    const setCsrfToken = (token: string | null) => {
        setCsrfTokenState(token);
        (window as any).csrfToken = token;
    };

    const checkAuth = useCallback(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/auth/me`, { credentials: 'include' });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
                setCsrfToken(data.csrfToken);
                localStorage.setItem('user', JSON.stringify(data.user));
            } else {
                setUser(null);
                setCsrfToken(null);
                localStorage.removeItem('user');
            }
        } catch (error) {
            console.error("Auth check failed", error);
        }
    }, []);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        checkAuth();
    }, [checkAuth]);

    const logout = () => {
        const token = csrfToken;
        setUser(null);
        setCsrfToken(null);
        localStorage.removeItem('user');
        fetch(`${API_BASE_URL}/api/auth/logout`, {
            method: 'POST',
            credentials: 'include',
            headers: token ? { 'X-CSRF-Token': token } : {}
        });
    };

    return (
        <AuthContext.Provider value={{ user, setUser, csrfToken, setCsrfToken, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
