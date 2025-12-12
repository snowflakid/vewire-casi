import { useState, useEffect } from 'react';
import { THEME, GAMES_CONFIG } from './config';
import { ProvablyFair } from './utils/provably-fair';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WalletModal from './components/WalletModal';
import ProvablyFairModal from './components/ProvablyFairModal'; // New

// Games
import MinesGame from './games/Mines';
import CrashGame from './games/Crash';
import DiceGame from './games/Dice';
import PlinkoGame from './games/Plinko';
import LimboGame from './games/Limbo';
import KenoGame from './games/Keno';
import RouletteGame from './games/Roulette';
import BlackjackGame from './games/Blackjack';
import HiLoGame from './games/HiLo';
import WheelGame from './games/Wheel';

// Views
import Profile from './views/Profile';

export default function CasinoApp() {
  const [activeGame, setActiveGame] = useState('CRASH');
  // Load balance from localStorage or default to 1250.00
  const [balance, setBalance] = useState(() => {
      const saved = localStorage.getItem('vewire_balance');
      return saved ? parseFloat(saved) : 1250.00;
  });
  
  // Persist balance
  useEffect(() => {
      localStorage.setItem('vewire_balance', balance.toString());
  }, [balance]);

  const [walletOpen, setWalletOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [pfModalOpen, setPfModalOpen] = useState(false); // Provably Fair Modal State
  
  // Global Provably Fair State
  const [serverSeed] = useState(ProvablyFair.generateServerSeed());
  const [clientSeed, setClientSeed] = useState(ProvablyFair.generateClientSeed());
  const [nonce, setNonce] = useState(0);

  // Stats for Profile
  const [userStats, setUserStats] = useState({
      totalBets: 142,
      totalWagered: 12500.50,
      totalWins: 68,
      joinDate: 'Dec 2023'
  });

  const [recentWins, setRecentWins] = useState<{ game: string; amount: number; id: number }[]>([]);

  const handleGameEnd = (win: boolean, amount: number) => {
    setUserStats(prev => ({
        ...prev,
        totalBets: prev.totalBets + 1,
        totalWagered: prev.totalWagered + (amount > 0 ? 0 : 10),
        totalWins: win ? prev.totalWins + 1 : prev.totalWins
    }));

    if (win) {
      setRecentWins(prev => [{ game: activeGame, amount, id: Date.now() }, ...prev].slice(0, 5));
    }
  };

  const ActiveGameIcon = GAMES_CONFIG.find(g => g.id === activeGame)?.icon;
  const ActiveGameColor = GAMES_CONFIG.find(g => g.id === activeGame)?.color;

  return (
    <div className={`min-h-screen ${THEME.bg} font-sans text-gray-300 flex`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        activeGame={activeGame} 
        setGame={(game) => { setActiveGame(game); setSidebarOpen(false); }} 
        onOpenProfile={() => setProfileOpen(true)}
      />
      
      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <Header 
            balance={balance} 
            setWalletOpen={() => setWalletOpen(true)} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />
        
        <main className="p-4 md:p-8 max-w-[1600px] mx-auto w-full">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-white font-bold flex items-center gap-2">
                {ActiveGameIcon && <ActiveGameIcon className={ActiveGameColor} />}
                {GAMES_CONFIG.find(g => g.id === activeGame)?.name}
              </h2>
              {/* Live Feed Ticker */}
              <div className="hidden lg:flex gap-3">
                 {recentWins.map(w => (
                    <div key={w.id} className="bg-[#1a202c] px-3 py-1 rounded-full border border-gray-700 text-xs flex items-center gap-2 animate-in slide-in-from-right">
                       <span className="text-gray-400">{w.game}</span>
                       <span className="text-green-500 font-bold">+${w.amount.toFixed(2)}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* Game Area Render */}
           <div className="h-[600px] w-full relative">
               {/* Provably Fair Trigger (Floating or top right of game area) */}
               <button 
                  onClick={() => setPfModalOpen(true)}
                  className="absolute top-0 right-0 z-20 text-xs font-bold text-gray-500 hover:text-green-500 flex items-center gap-1 bg-[#0b0e11]/80 px-2 py-1 rounded-bl-lg backdrop-blur-sm"
               >
                   <ShieldCheck size={14} /> Fair
               </button>

              {activeGame === 'MINES' && <MinesGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'CRASH' && <CrashGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'DICE' && <DiceGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'PLINKO' && <PlinkoGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'LIMBO' && <LimboGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'KENO' && <KenoGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'ROULETTE' && <RouletteGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'BLACKJACK' && <BlackjackGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'HILO' && <HiLoGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'WHEEL' && <WheelGame balance={balance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
           </div>
           
           {/* Footer Info */}
           <div className="mt-12 border-t border-gray-800 pt-8 text-center md:text-left grid md:grid-cols-4 gap-8">
              <div>
                 <div className="text-white font-bold text-lg mb-4">VEWIRE.COM</div>
                 <p className="text-sm text-gray-500">The premier crypto gambling experience. Fair, fast, and secure.</p>
              </div>
              <div>
                 <div className="text-white font-bold mb-4">Platform</div>
                 <ul className="space-y-2 text-sm text-gray-500">
                    <li>Fairness</li>
                    <li>Affiliates</li>
                    <li>VIP Club</li>
                 </ul>
              </div>
           </div>
        </main>
      </div>
      
      <WalletModal isOpen={walletOpen} onClose={() => setWalletOpen(false)} addFunds={(amt) => setBalance(prev => prev + amt)} />
      <Profile isOpen={profileOpen} onClose={() => setProfileOpen(false)} balance={balance} stats={userStats} />
      
      <ProvablyFairModal 
         isOpen={pfModalOpen} 
         onClose={() => setPfModalOpen(false)} 
         serverSeed={serverSeed}
         clientSeed={clientSeed}
         nonce={nonce}
         onChangeClientSeed={(s) => { setClientSeed(s); setNonce(0); }}
      />
    </div>
  );
}
// Import ShieldCheck for the button
import { ShieldCheck } from 'lucide-react';