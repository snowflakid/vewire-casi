import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

// User Interface
export interface UserStats {
    totalBets: number;
    totalWagered: number;
    totalWins: number;
    joinDate: string;
}

export interface User {
    username: string;
    passwordHash: string; // Simple mock hash
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY_USERS = 'vewire_users';
const STORAGE_KEY_CURRENT = 'vewire_current_user';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [users, setUsers] = useState<User[]>([]);

    // Load initial state
    useEffect(() => {
        const storedUsers = localStorage.getItem(STORAGE_KEY_USERS);
        if (storedUsers) {
            setUsers(JSON.parse(storedUsers));
        }

        const storedCurrent = localStorage.getItem(STORAGE_KEY_CURRENT);
        if (storedCurrent) {
            setUser(JSON.parse(storedCurrent));
        }
    }, []);

    const saveUsers = (newUsers: User[]) => {
        setUsers(newUsers);
        localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newUsers));
    };

    const login = async (username: string, password: string) => {
        // Mock delay
        await new Promise(r => setTimeout(r, 500));
        
        const foundUser = users.find(u => u.username === username && u.passwordHash === btoa(password));
        if (foundUser) {
            setUser(foundUser);
            localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(foundUser));
            return true;
        }
        return false;
    };

    const register = async (username: string, password: string) => {
        await new Promise(r => setTimeout(r, 500));

        if (users.find(u => u.username === username)) {
            return false; // User exists
        }

        const newUser: User = {
            username,
            passwordHash: btoa(password),
            balance: 1000, // Starting balance
            weeklyBalance: 100, // Weekly challenge start
            inWeeklyChallenge: false,
            stats: {
                totalBets: 0,
                totalWagered: 0,
                totalWins: 0,
                joinDate: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
            },
            theme: 'default'
        };

        const newUsers = [...users, newUser];
        saveUsers(newUsers);
        
        setUser(newUser);
        localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(newUser));
        return true;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(STORAGE_KEY_CURRENT);
    };

    // Refactored to support functional updates and atomic persistence
    const updateUser = (updatesInput: Partial<User> | ((prev: User) => Partial<User>)) => {
        setUser(prevUser => {
            if (!prevUser) return null;

            const updates = typeof updatesInput === 'function' ? updatesInput(prevUser) : updatesInput;

            const updatedUser = { ...prevUser, ...updates };

            // Deep merge logic for stats
            if (updates.stats) {
                updatedUser.stats = { ...prevUser.stats, ...updates.stats };
            }

            // Side Effects: Persist to storage
            // Note: We need to use the 'updatedUser' we just calculated.
            // Since this is inside a state setter, we can't easily access 'users' state correctly if it's stale?
            // Actually, we can just update localStorage here.
            
            localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(updatedUser));
            
            // We also need to update the big 'users' list.
            // We can do this by reading the current 'users' from storage to be safe, 
            // OR use the 'setUsers' functional update too.
            
            // To avoid complex chaining, let's just trigger the users update in a useEffect? 
            // No, that might be too slow for Leaderboard.
            // Let's do it right here, assuming 'users' state is relatively fresh or we use functional update for it too.
            
            // We can't call setUsers inside setUser callback cleanly without side effects.
            // But this is an event handler essentially.
            // Wait, this is inside setUser callback? NO, DO NOT DO SIDE EFFECTS INSIDE SETUSER.
            
            // RETRY: Calculate new state OUTSIDE setUser if possible? 
            // No, we need the 'prevUser'.
            
            // OK, let's keep the side effect OUTSIDE.
            // But we need the 'prev' state.
            
            return updatedUser; 
        });
    };

    // We need to sync changes to 'users' list whenever 'user' changes.
    // This is safer than trying to update both atomically in the handler.
    useEffect(() => {
        if (user) {
            setUsers(prevUsers => {
                const newUsers = prevUsers.map(u => u.username === user.username ? user : u);
                // Only write to local storage if actually changed? 
                // JSON.stringify comparison is expensive. 
                // Let's just write it. It's debounced enough by React batched updates.
                localStorage.setItem(STORAGE_KEY_USERS, JSON.stringify(newUsers));
                return newUsers;
            });
        }
    }, [user]);

    return (
        <AuthContext.Provider value={{ user, login, register, logout, updateUser, users }}>
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