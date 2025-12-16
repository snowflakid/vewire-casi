import { useState, useEffect } from 'react';
import { THEME, GAMES_CONFIG } from './config';
import { ProvablyFair } from './utils/provably-fair';
import { useAuth } from './context/AuthContext';
import { ShieldCheck } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import WalletModal from './components/WalletModal';
import ProvablyFairModal from './components/ProvablyFairModal';
import AuthModal from './components/AuthModal';
import LeaderboardModal from './components/LeaderboardModal';

import { SettingsProvider } from './context/SettingsContext';
import SettingsModal from './components/SettingsModal';
import DailyBonusModal from './components/DailyBonusModal';

// Games
import MinesGame from './games/Mines';
import CrashGame from './games/Crash';
import DiceGame from './games/Dice';
import PlinkoGame from './games/Plinko';
import LimboGame from './games/Limbo';
import KenoGame from './games/Keno';
import RouletteGame from './games/Roulette';
import HiLoGame from './games/HiLo';
import WheelGame from './games/Wheel';
import RockPaperScissors from './games/RockPaperScissors';
import BlackjackGame from './games/Blackjack';
import SlotsGame from './games/Slots';

// Views
import Profile from './views/Profile';

export default function CasinoApp() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

function AppContent() {
  const { user, updateUser, logout } = useAuth();
  const [activeGame, setActiveGame] = useState('CRASH');

  // Theme Sync
  useEffect(() => {
      if (user && user.theme) {
          document.documentElement.setAttribute('data-theme', user.theme);
      } else {
          document.documentElement.setAttribute('data-theme', 'default');
      }
  }, [user?.theme]);

  // UI States
  const [walletOpen, setWalletOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [dailyBonusOpen, setDailyBonusOpen] = useState(false);
  const [pfModalOpen, setPfModalOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  
  // Global Provably Fair State
  const [serverSeed, setServerSeed] = useState(ProvablyFair.generateServerSeed());
  const [clientSeed, setClientSeed] = useState(ProvablyFair.generateClientSeed());
  const [nonce, setNonce] = useState(0);
  const [seedHistory, setSeedHistory] = useState<{ serverSeed: string; clientSeed: string; nonce: number; activeAt: string }[]>([]);

  const rotateSeed = (newClientSeed?: string) => {
      setSeedHistory(prev => [{
          serverSeed,
          clientSeed,
          nonce,
          activeAt: new Date().toLocaleTimeString()
      }, ...prev]);
      
      setServerSeed(ProvablyFair.generateServerSeed());
      setClientSeed(newClientSeed || ProvablyFair.generateClientSeed());
      setNonce(0);
  };

  const [recentWins, setRecentWins] = useState<{ game: string; amount: number; id: number }[]>([]);

  // Wrapper for games to update balance
  const setBalance = (action: number | ((prev: number) => number)) => {
      if (!user) return;
      
      updateUser(prevUser => {
          const currentBal = prevUser.inWeeklyChallenge ? prevUser.weeklyBalance : prevUser.balance;
          const newBal = typeof action === 'function' ? action(currentBal) : action;
          
          if (prevUser.inWeeklyChallenge) {
              return { weeklyBalance: newBal };
          } else {
              return { balance: newBal };
          }
      });
  };

  const handleGameEnd = (win: boolean, payout: number, betAmount: number) => {
    if (!user) return;

    updateUser(prevUser => {
        const currentStats = prevUser.stats;
        const newStats = {
            totalBets: currentStats.totalBets + 1,
            totalWagered: currentStats.totalWagered + betAmount,
            totalWins: win ? currentStats.totalWins + 1 : currentStats.totalWins,
            joinDate: currentStats.joinDate
        };
        return { stats: newStats };
    });

    if (win) {
      setRecentWins(prev => [{ game: activeGame, amount: payout, id: Date.now() }, ...prev].slice(0, 5));
    }
  };

  const ActiveGameIcon = GAMES_CONFIG.find(g => g.id === activeGame)?.icon;
  const ActiveGameColor = GAMES_CONFIG.find(g => g.id === activeGame)?.color;

  const currentBalance = user ? (user.inWeeklyChallenge ? user.weeklyBalance : user.balance) : 0;

  return (
    <div className={`min-h-screen ${THEME.bg} font-sans text-gray-300 flex`}>
      <Sidebar 
        isOpen={sidebarOpen} 
        activeGame={activeGame} 
        setGame={(game) => { setActiveGame(game); setSidebarOpen(false); }} 
        onOpenProfile={() => setProfileOpen(true)}
        onOpenLeaderboard={() => setLeaderboardOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenDailyBonus={() => setDailyBonusOpen(true)}
      />
      
      {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)}></div>
      )}

      <div className="flex-1 flex flex-col md:ml-64 min-w-0">
        <Header 
            user={user}
            balance={currentBalance} 
            setWalletOpen={() => setWalletOpen(true)} 
            toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onLogin={() => setAuthModalOpen(true)}
        />
        
        <main className="p-4 md:p-8 max-w-[1600px] mx-auto w-full relative">
           <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl text-white font-bold flex items-center gap-2">
                {ActiveGameIcon && <ActiveGameIcon className={ActiveGameColor} />}
                {GAMES_CONFIG.find(g => g.id === activeGame)?.name}
              </h2>
              <div className="hidden lg:flex gap-3">
                 {recentWins.map(w => (
                    <div key={w.id} className="bg-vewire-sidebar px-3 py-1 rounded-full border border-vewire-border text-xs flex items-center gap-2 animate-in slide-in-from-right">
                       <span className="text-gray-400">{w.game}</span>
                       <span className="text-green-500 font-bold">+${w.amount.toFixed(2)}</span>
                    </div>
                 ))}
              </div>
           </div>

           {/* Game Area */}
           <div className="h-[600px] w-full relative">
               {!user && (
                   <div className="absolute inset-0 z-30 bg-black/60 backdrop-blur-sm flex items-center justify-center rounded-xl">
                       <div className="text-center">
                           <h3 className="text-2xl font-bold text-white mb-2">Login to Play</h3>
                           <button 
                                onClick={() => setAuthModalOpen(true)}
                                className={`${THEME.accent} text-black font-bold px-8 py-3 rounded-lg hover:opacity-90`}
                           >
                               Login / Register
                           </button>
                       </div>
                   </div>
               )}

               <button 
                  onClick={() => setPfModalOpen(true)}
                  className="absolute top-0 right-0 z-20 text-xs font-bold text-gray-500 hover:text-green-500 flex items-center gap-1 bg-[#0b0e11]/80 px-2 py-1 rounded-bl-lg backdrop-blur-sm"
               >
                   <ShieldCheck size={14} /> Fair
               </button>

              {activeGame === 'MINES' && <MinesGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'CRASH' && <CrashGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'DICE' && <DiceGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'SLOTS' && <SlotsGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'PLINKO' && <PlinkoGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'LIMBO' && <LimboGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'KENO' && <KenoGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'ROULETTE' && <RouletteGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'BLACKJACK' && <BlackjackGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'HILO' && <HiLoGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'WHEEL' && <WheelGame balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
              {activeGame === 'RPS' && <RockPaperScissors balance={currentBalance} setBalance={setBalance} onGameEnd={handleGameEnd} />}
           </div>
           
           <div className="mt-12 border-t border-vewire-border pt-8 text-center md:text-left grid md:grid-cols-4 gap-8">
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
      {user && (
          <Profile 
            isOpen={profileOpen} 
            onClose={() => setProfileOpen(false)} 
            balance={currentBalance} 
            user={user}
            onLogout={() => { logout(); setProfileOpen(false); }}
          />
      )}
      
      <ProvablyFairModal 
         isOpen={pfModalOpen} 
         onClose={() => setPfModalOpen(false)} 
         serverSeed={serverSeed}
         clientSeed={clientSeed}
         nonce={nonce}
         onChangeClientSeed={(s) => { setClientSeed(s); setNonce(0); }}
         onRotateSeed={rotateSeed}
         history={seedHistory}
      />

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />
      <LeaderboardModal isOpen={leaderboardOpen} onClose={() => setLeaderboardOpen(false)} />
      <SettingsModal isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <DailyBonusModal isOpen={dailyBonusOpen} onClose={() => setDailyBonusOpen(false)} />
    </div>
  );
}
