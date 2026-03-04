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
    user: localStorage.getItem('user_data') ? JSON.parse(localStorage.getItem('user_data')!) : null,
    token: localStorage.getItem('token'),
    isAuthenticated: !!localStorage.getItem('token'),
    initialized: false,

    login: (user, token) => {
        localStorage.setItem('token', token);
        localStorage.setItem('user_data', JSON.stringify(user));
        set({ user, token, isAuthenticated: true, initialized: true });
    },

    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user_data');
        set({ user: null, token: null, isAuthenticated: false, initialized: true });
        window.location.href = '/';
    },

    setUser: (user) => {
        if (user) {
            localStorage.setItem('user_data', JSON.stringify(user));
            set({ user, isAuthenticated: true, initialized: true });
        } else {
            localStorage.removeItem('user_data');
            set({ user: null, isAuthenticated: false, initialized: true });
        }
    },

    setInitialized: (val) => {
        set({ initialized: val });
    }
}));
