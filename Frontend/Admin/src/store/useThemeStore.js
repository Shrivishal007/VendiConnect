import { create } from 'zustand';
const STORAGE_KEY = 'vendiconnect_admin_theme';
function readTheme() {
    try {
        return localStorage.getItem(STORAGE_KEY) === 'dark' ? 'dark' : 'light';
    }
    catch (error) {
        console.warn('Unable to read the saved admin theme preference.', error);
        return 'light';
    }
}
function applyTheme(theme) {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    }
    catch (error) {
        console.warn('Unable to save the admin theme preference.', error);
    }
}
const initialTheme = readTheme();
document.documentElement.classList.toggle('dark', initialTheme === 'dark');
document.documentElement.style.colorScheme = initialTheme;
export const useThemeStore = create((set, get) => ({
    theme: initialTheme,
    initializeTheme: () => applyTheme(get().theme),
    toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark';
        applyTheme(theme);
        set({ theme });
    },
}));
