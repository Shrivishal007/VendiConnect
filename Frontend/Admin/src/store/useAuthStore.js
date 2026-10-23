import { create } from 'zustand';
import { adminService } from '../services/adminService';
export const useAuthStore = create((set, get) => ({
    token: localStorage.getItem('vendiconnect_admin_token'),
    admin: (() => {
        try {
            const stored = localStorage.getItem('vendiconnect_admin_user');
            return stored ? JSON.parse(stored) : null;
        }
        catch {
            return null;
        }
    })(),
    isAuthenticated: Boolean(localStorage.getItem('vendiconnect_admin_token')),
    isLoading: false,
    error: null,
    login: async (email, password) => {
        set({ isLoading: true, error: null });
        try {
            const res = await adminService.login(email, password);
            if (res.success && res.data) {
                const { token, admin } = res.data;
                localStorage.setItem('vendiconnect_admin_token', token);
                localStorage.setItem('vendiconnect_admin_user', JSON.stringify(admin));
                set({
                    token,
                    admin,
                    isAuthenticated: true,
                    isLoading: false,
                    error: null,
                });
            }
            else {
                throw new Error(res.message || 'Login failed');
            }
        }
        catch (err) {
            set({
                isLoading: false,
                error: err.message || 'Authentication failed. Please verify credentials.',
            });
            throw err;
        }
    },
    logout: () => {
        localStorage.removeItem('vendiconnect_admin_token');
        localStorage.removeItem('vendiconnect_admin_user');
        set({
            token: null,
            admin: null,
            isAuthenticated: false,
            error: null,
        });
    },
    checkAuth: async () => {
        const token = localStorage.getItem('vendiconnect_admin_token');
        if (!token) {
            get().logout();
            return;
        }
        try {
            const res = await adminService.getMe();
            if (res.success && res.data) {
                localStorage.setItem('vendiconnect_admin_user', JSON.stringify(res.data));
                set({
                    admin: res.data,
                    isAuthenticated: true,
                });
            }
        }
        catch {
            get().logout();
        }
    },
}));
// Listen for global auth:expired event
if (typeof window !== 'undefined') {
    window.addEventListener('auth:expired', () => {
        useAuthStore.getState().logout();
    });
}
