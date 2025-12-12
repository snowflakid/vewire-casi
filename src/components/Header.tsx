import { Menu, Wallet } from 'lucide-react';
import { THEME } from '../config';

interface HeaderProps {
    balance: number;
    setWalletOpen: (open: boolean) => void;
    toggleSidebar: () => void;
}

const Header = ({ balance, setWalletOpen, toggleSidebar }: HeaderProps) => (
  <div className="h-20 sticky top-0 z-40 bg-[#0b0e11]/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-6 gap-4">
    <div className="flex items-center gap-4 md:hidden">
       <button onClick={toggleSidebar} className="text-white">
          <Menu size={24} />
       </button>
    </div>
    
    <div className="flex items-center justify-end gap-4 w-full">
        <div className="bg-[#1a202c] rounded-full px-5 py-2 flex items-center gap-3 border border-gray-700 shadow-inner">
        <span className="text-green-500 font-bold">$</span>
        <span className="text-white font-mono text-lg font-bold">{balance.toFixed(2)}</span>
        </div>
        <button onClick={() => setWalletOpen(true)} className={`${THEME.accent} ${THEME.accentHover} text-black font-bold px-6 py-2 rounded-lg shadow-[0_0_15px_rgba(0,231,1,0.3)] transition-all transform hover:scale-105 flex items-center gap-2`}>
        <Wallet size={18} /> <span className="hidden sm:inline">Deposit</span>
        </button>
    </div>
  </div>
);

export default Header;
