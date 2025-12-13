import { Menu, Wallet } from 'lucide-react';
import { THEME } from '../config';
import type { User } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface HeaderProps {
    user: User | null;
    balance: number;
    setWalletOpen: (open: boolean) => void;
    toggleSidebar: () => void;
    onLogin: () => void;
}

const Header = ({ user, balance, setWalletOpen, toggleSidebar, onLogin }: HeaderProps) => {
  const { t, playSound, streamerMode } = useSettings();

  const handleWalletClick = () => {
      playSound('click');
      setWalletOpen(true);
  };

  const handleLoginClick = () => {
      playSound('click');
      onLogin();
  };

  return (
    <div className="h-20 sticky top-0 z-40 bg-[#0b0e11]/80 backdrop-blur-md border-b border-vewire-border flex items-center justify-between px-6 gap-4">
        <div className="flex items-center gap-4 md:hidden">
        <button onClick={toggleSidebar} className="text-white">
            <Menu size={24} />
        </button>
        </div>
        
        <div className="flex items-center justify-end gap-4 w-full">
            {user ? (
                <>
                    <div className="bg-[#1a202c] rounded-full px-5 py-2 flex items-center gap-3 border border-vewire-border shadow-inner">
                        <span className="text-green-500 font-bold">$</span>
                        <span className={`text-white font-mono text-lg font-bold ${streamerMode ? 'blur-sm' : ''}`}>
                            {(user.inWeeklyChallenge ? user.weeklyBalance : balance).toFixed(2)}
                        </span>
                        {user.inWeeklyChallenge && <span className="text-xs text-yellow-500 bg-yellow-500/10 px-2 py-0.5 rounded">Tournament</span>}
                    </div>
                    <button onClick={handleWalletClick} className={`${THEME.accent} ${THEME.accentHover} text-black font-bold px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(0,231,1,0.3)] transition-all transform hover:scale-105 flex items-center gap-2`}>
                        <Wallet size={18} /> <span className="hidden sm:inline">{t('wallet.deposit')}</span>
                    </button>
                </>
            ) : (
                <div className="flex gap-3">
                    <button onClick={handleLoginClick} className="text-white font-bold px-4 py-2 hover:text-[#00E701] transition-colors">
                        {t('auth.login')}
                    </button>
                    <button onClick={handleLoginClick} className={`${THEME.accent} text-black font-bold px-6 py-2 rounded-lg hover:opacity-90 transition-opacity`}>
                        {t('auth.register')}
                    </button>
                </div>
            )}
        </div>
    </div>
  );
};

export default Header;

