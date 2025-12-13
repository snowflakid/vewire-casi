import { X, User as UserIcon, Trophy, Wallet, Activity, LogOut, Palette } from 'lucide-react';
import type { User } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';

interface ProfileProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number; // Balance might be hidden or just purely visual in read-only
    user: User;
    onLogout?: () => void;
    isReadOnly?: boolean;
}

const TIERS = [
    { name: 'Bronze', min: 0, color: 'text-orange-400' },
    { name: 'Silver', min: 1000, color: 'text-gray-400' },
    { name: 'Gold', min: 5000, color: 'text-yellow-400' },
    { name: 'Platinum', min: 25000, color: 'text-[#00E701]' },
    { name: 'Diamond', min: 100000, color: 'text-cyan-400' }
];

const THEMES = [
    'default', 'midnight', 'cyberpunk', 'luxury', 'forest', 'sunset', 'ocean'
];

const getTierInfo = (wagered: number) => {
    let current = TIERS[0];
    let next = TIERS[1];
    
    for (let i = 0; i < TIERS.length; i++) {
        if (wagered >= TIERS[i].min) {
            current = TIERS[i];
            next = TIERS[i + 1] || null;
        }
    }
    
    const progress = next 
        ? ((wagered - current.min) / (next.min - current.min)) * 100 
        : 100;
        
    return { current, next, progress };
};

const Profile = ({ isOpen, onClose, balance, user, onLogout, isReadOnly = false }: ProfileProps) => {
    const { theme, setTheme } = useTheme();
    const { t, playSound } = useSettings();

    if (!isOpen) return null;

    const { current: tier, next, progress } = getTierInfo(user.stats.totalWagered);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-vewire-sidebar w-full max-w-2xl rounded-2xl border border-vewire-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header with Banner */}
                <div className="h-32 bg-gradient-to-r from-green-900 to-vewire-bg relative">
                     <button onClick={() => { playSound('click'); onClose(); }} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white/20 transition-colors z-10">
                         <X size={20} />
                     </button>
                     <div className="absolute -bottom-10 left-8">
                         <div className="w-24 h-24 rounded-full bg-vewire-card border-4 border-vewire-sidebar flex items-center justify-center overflow-hidden">
                             <UserIcon size={48} className="text-gray-500" />
                         </div>
                     </div>
                </div>

                <div className="pt-12 px-8 pb-8 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">{user.username}</h2>
                            <div className="text-gray-500 text-sm">{t('profile.joined')} {user.stats.joinDate}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-gray-500 uppercase font-bold">{t('profile.vip_level')}</div>
                             <div className={`text-xl font-bold ${tier.color}`}>{tier.name}</div>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-bold text-gray-500 mb-2">
                            <span>{Math.floor(progress)}% to {next ? next.name : t('profile.max_level')}</span>
                            <span>${user.stats.totalWagered.toFixed(0)} / {next ? `$${next.min}` : '∞'}</span>
                        </div>
                        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                            <div 
                                className={`h-full ${tier.name === 'Platinum' ? 'bg-vewire-accent' : 'bg-white'} transition-all duration-1000`} 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-vewire-input p-4 rounded-xl border border-vewire-border">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Activity size={12}/> {t('profile.total_wagered')}</div>
                             <div className="text-white font-mono font-bold">${user.stats.totalWagered.toFixed(2)}</div>
                        </div>
                        <div className="bg-vewire-input p-4 rounded-xl border border-vewire-border">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Trophy size={12}/> {t('profile.total_bets')}</div>
                             <div className="text-white font-mono font-bold">{user.stats.totalBets}</div>
                        </div>
                        <div className="bg-vewire-input p-4 rounded-xl border border-vewire-border">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Wallet size={12}/> {t('profile.balance')}</div>
                             <div className="text-white font-mono font-bold">${balance.toFixed(2)}</div>
                        </div>
                        <div className="bg-vewire-input p-4 rounded-xl border border-vewire-border">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Trophy size={12}/> {t('profile.wins')}</div>
                             <div className="text-white font-mono font-bold">{user.stats.totalWins}</div>
                        </div>
                    </div>

                    {/* Theme Picker - Only for logged in user */}
                    {!isReadOnly && (
                        <div className="mb-8">
                            <div className="flex items-center gap-2 text-white font-bold mb-4">
                                <Palette size={20} className="text-vewire-accent" />
                                <h3>{t('profile.appearance')}</h3>
                            </div>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                                {THEMES.map((t) => (
                                    <button 
                                        key={t}
                                        onClick={() => { playSound('click'); setTheme(t as any); }}
                                        className={`py-2 px-1 rounded-lg font-bold capitalize border text-xs sm:text-sm transition-all ${
                                            theme === t 
                                            ? 'bg-vewire-accent text-black border-vewire-accent' 
                                            : 'bg-vewire-input text-gray-400 border-vewire-border hover:border-gray-500'
                                        }`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {!isReadOnly && onLogout && (
                        <button 
                            onClick={() => { playSound('click'); onLogout(); }}
                            className="w-full bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-lg font-bold uppercase mt-6 hover:bg-red-500/20 flex items-center justify-center gap-2"
                        >
                            <LogOut size={18} /> {t('profile.logout')}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Profile;