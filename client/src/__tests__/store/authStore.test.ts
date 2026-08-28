import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '../../store/authStore';

/**
 * authStore.test.ts — Zustand auth state + localStorage senkronizasyonu.
 *
 * Not: Store import edildiğinde localStorage'dan init yapılır.
 * Test öncesi localStorage clear edilmeli.
 */

describe('useAuthStore', () => {
    beforeEach(() => {
        localStorage.clear();
        // Store'u reset: yeni instance yaratmak yerine state'i sıfırlıyoruz
        useAuthStore.setState({
            user: null,
            token: null,
            isAuthenticated: false,
            initialized: false,
        });
    });

    describe('login', () => {
        it('sets user, token, isAuthenticated, initialized', () => {
            const user = { id: 1, email: 'test@example.com', first_name: 'Test' } as any;
            useAuthStore.getState().login(user, 'jwt-token-123');

            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.token).toBe('jwt-token-123');
            expect(state.isAuthenticated).toBe(true);
            expect(state.initialized).toBe(true);
        });

        it('persists token and user_data to localStorage', () => {
            const user = { id: 1, email: 'test@example.com' } as any;
            useAuthStore.getState().login(user, 'jwt-abc');

            expect(localStorage.getItem('token')).toBe('jwt-abc');
            const stored = JSON.parse(localStorage.getItem('user_data')!);
            expect(stored).toEqual(user);
        });
    });

    describe('logout', () => {
        it('clears user, token, isAuthenticated', () => {
            const user = { id: 1, email: 'test@example.com' } as any;
            useAuthStore.getState().login(user, 'jwt-xyz');
            useAuthStore.getState().logout();

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.token).toBeNull();
            expect(state.isAuthenticated).toBe(false);
        });

        it('removes token and user_data from localStorage', () => {
            const user = { id: 1, email: 'test@example.com' } as any;
            useAuthStore.getState().login(user, 'jwt-logout');
            useAuthStore.getState().logout();

            expect(localStorage.getItem('token')).toBeNull();
            expect(localStorage.getItem('user_data')).toBeNull();
        });
    });

    describe('setUser', () => {
        it('sets user, isAuthenticated=true, persists', () => {
            const user = { id: 2, email: 'new@example.com' } as any;
            useAuthStore.getState().setUser(user);

            const state = useAuthStore.getState();
            expect(state.user).toEqual(user);
            expect(state.isAuthenticated).toBe(true);
            expect(localStorage.getItem('user_data')).toBe(JSON.stringify(user));
        });

        it('clears user, isAuthenticated=false when null', () => {
            const user = { id: 1, email: 'test@example.com' } as any;
            useAuthStore.getState().login(user, 'jwt');

            useAuthStore.getState().setUser(null);

            const state = useAuthStore.getState();
            expect(state.user).toBeNull();
            expect(state.isAuthenticated).toBe(false);
            expect(localStorage.getItem('user_data')).toBeNull();
        });
    });

    describe('setInitialized', () => {
        it('sets initialized flag', () => {
            useAuthStore.getState().setInitialized(true);
            expect(useAuthStore.getState().initialized).toBe(true);
        });
    });
});
