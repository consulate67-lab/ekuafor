import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    initialized: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    setUser: (user: User | null) => void;
    setInitialized: (val: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    user: null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    initialized: false,

    login: (user, token) => {
        localStorage.setItem('token', token);
        set({ user, token, isAuthenticated: true, initialized: true });
    },

    logout: () => {
        localStorage.removeItem('token');
        set({ user: null, token: null, isAuthenticated: false, initialized: true });
    },

    setUser: (user) => {
        set({ user, isAuthenticated: !!user, initialized: true });
    },

    setInitialized: (val) => {
        set({ initialized: val });
    }
}));
