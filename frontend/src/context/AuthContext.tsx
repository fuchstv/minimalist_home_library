import React, { createContext, useState, useEffect } from 'react';
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
    logout: () => void;
}

import { API_BASE_URL } from "../config";

export const AuthContext = createContext<AuthContextType>({
    user: null,
    setUser: () => {},
    logout: () => {}
});

export const AuthProvider: React.FC<{children: ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    const logout = () => {
        setUser(null);
        localStorage.removeItem('user');
        fetch(`${API_BASE_URL}/api/auth/logout`, { method: 'POST', credentials: 'include' });
    };

    return (
        <AuthContext.Provider value={{ user, setUser, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
