import React from 'react';
import { Moon, Sun } from 'lucide-react';
import { useThemeStore } from '../../store/useThemeStore';
export const ThemeToggle = () => {
    const { theme, toggleTheme } = useThemeStore();
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    return (<button type="button" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} aria-pressed={theme === 'dark'} title={`Switch to ${nextTheme} theme`} className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors">
      {theme === 'dark' ? <Sun className="w-4 h-4"/> : <Moon className="w-4 h-4"/>}
    </button>);
};
