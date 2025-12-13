import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';

// User Interface
export interface UserStats {
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    joinDate: string;
}

export interface User {
    id?: string;
    username: string;
    passwordHash?: string; 
    balance: number;
    weeklyBalance: number;
    inWeeklyChallenge: boolean;
    stats: UserStats;
    theme: string;
}

interface AuthContextType {
    user: User | null;
    login: (username: string, password: string) => Promise<boolean>;
    register: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateUser: (updates: Partial<User> | ((prev: User) => Partial<User>)) => void;
    users: User[]; // Exposed for Leaderboard
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);

    // Initial Load
    useEffect(() => {
        const init = async () => {
            // Check local storage for persistent login session
            const savedUsername = localStorage.getItem('vewire_username');
            if (savedUsername) {
                await fetchUser(savedUsername);
            }
            // Fetch leaderboard
            await fetchUsers();
            setLoading(false);
        };
        init();
    }, []);

    // Polling for leaderboard updates (simple real-time)
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUsers();
        }, 10000); // Every 10 seconds
        return () => clearInterval(interval);
    }, []);

    const fetchUsers = async () => {
        if (!import.meta.env.VITE_SUPABASE_URL) return; // Skip if not configured

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .order('weekly_balance', { ascending: false });

        if (!error && data) {
            const mappedUsers: User[] = data.map(u => ({
                id: u.id,
                username: u.username,
                balance: parseFloat(u.balance),
                weeklyBalance: parseFloat(u.weekly_balance),
                inWeeklyChallenge: u.in_weekly_challenge,
                theme: u.theme || 'default',
                stats: {
                    totalBets: parseInt(u.total_bets),
                    totalWagered: parseFloat(u.total_wagered),
                    totalWins: parseInt(u.total_wins),
                    joinDate: new Date(u.created_at).toLocaleDateString()
                }
            }));
            setUsers(mappedUsers);
        }
    };

    const fetchUser = async (username: string) => {
        if (!import.meta.env.VITE_SUPABASE_URL) return null;

        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('username', username)
            .single();

        if (!error && data) {
            const u: User = {
                id: data.id,
                username: data.username,
                passwordHash: data.password_hash,
                balance: parseFloat(data.balance),
                weeklyBalance: parseFloat(data.weekly_balance),
                inWeeklyChallenge: data.in_weekly_challenge,
                theme: data.theme || 'default',
                stats: {
                    totalBets: parseInt(data.total_bets),
                    totalWagered: parseFloat(data.total_wagered),
                    totalWins: parseInt(data.total_wins),
                    joinDate: new Date(data.created_at).toLocaleDateString()
                }
            };
            setUser(u);
            return u;
        }
        return null;
    };

    const login = async (username: string, password: string) => {
        const foundUser = await fetchUser(username);
        
        if (foundUser && foundUser.passwordHash === btoa(password)) {
            setUser(foundUser);
            localStorage.setItem('vewire_username', username);
            return true;
        }
        return false;
    };

    const register = async (username: string, password: string) => {
        if (!import.meta.env.VITE_SUPABASE_URL) return false;

        const { error } = await supabase
            .from('users')
            .insert([
                {
                    username,
                    password_hash: btoa(password),
                    balance: 1000,
                    weekly_balance: 100,
                    in_weekly_challenge: false,
                    total_bets: 0,
                    total_wagered: 0,
                    total_wins: 0
                }
            ]);

        if (!error) {
            await login(username, password);
            await fetchUsers(); // Update leaderboard
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('vewire_username');
    };

    const updateUser = (updatesInput: Partial<User> | ((prev: User) => Partial<User>)) => {
        setUser(prevUser => {
            if (!prevUser) return null;

            const updates = typeof updatesInput === 'function' ? updatesInput(prevUser) : updatesInput;
            const updatedUser = { ...prevUser, ...updates };

            // Apply stats merge locally
            if (updates.stats) {
                updatedUser.stats = { ...prevUser.stats, ...updates.stats };
            }

            // Sync to Cloud
            if (import.meta.env.VITE_SUPABASE_URL) {
                // Map frontend fields back to DB columns
                const dbUpdates: any = {};
                if (updates.balance !== undefined) dbUpdates.balance = updates.balance;
                if (updates.weeklyBalance !== undefined) dbUpdates.weekly_balance = updates.weeklyBalance;
                if (updates.inWeeklyChallenge !== undefined) dbUpdates.in_weekly_challenge = updates.inWeeklyChallenge;
                if (updates.theme !== undefined) dbUpdates.theme = updates.theme;
                
                if (updates.stats) {
                    if (updates.stats.totalBets !== undefined) dbUpdates.total_bets = updates.stats.totalBets;
                    if (updates.stats.totalWagered !== undefined) dbUpdates.total_wagered = updates.stats.totalWagered;
                    if (updates.stats.totalWins !== undefined) dbUpdates.total_wins = updates.stats.totalWins;
                }

                supabase.from('users').update(dbUpdates).eq('username', prevUser.username).then(() => {
                    // Silent sync
                });
            }

            return updatedUser;
        });
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, users, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
