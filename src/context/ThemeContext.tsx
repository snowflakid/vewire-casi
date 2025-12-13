import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useAuth } from './AuthContext';

type Theme = 'default' | 'midnight' | 'cyberpunk';

interface ThemeContextType {
    theme: Theme;
    setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const { user, updateUser } = useAuth();
    const [theme, setThemeState] = useState<Theme>(() => {
        return (localStorage.getItem('vewire_theme') as Theme) || 'default';
    });

    // Sync with user preference when logged in
    useEffect(() => {
        if (user && user.theme && user.theme !== theme) {
            setThemeState(user.theme as Theme);
        }
    }, [user]);

    // Apply theme to body
    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('vewire_theme', theme);
        
        if (user && user.theme !== theme) {
            updateUser({ theme });
        }
    }, [theme]);

    const setTheme = (newTheme: Theme) => {
        setThemeState(newTheme);
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
