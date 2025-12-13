import { useState, useRef, useEffect, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';
import { ProvablyFair } from '../utils/provably-fair';
import { useSettings } from '../context/SettingsContext';

const CrashGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const { t, playSound } = useSettings();
  const [multiplier, setMultiplier] = useState(1.00);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  const [autoCashout, setAutoCashout] = useState<string>('2.00'); // String to handle empty input
  
  const [mode, setMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [autoTrigger, setAutoTrigger] = useState(0);

  // Provably Fair
  const [serverSeed] = useState(ProvablyFair.generateServerSeed());
  const [clientSeed] = useState(ProvablyFair.generateClientSeed());
  const [nonce, setNonce] = useState(0);

  const { 
      isAutoBetting, 
      startAutoBet, 
      stopAutoBet, 
      processResult, 
      settings, 
      setSettings 
  } = useAutoBet(balance, setBalance, betAmount, setBetAmount);
  
  const reqRef = useRef<number>(0);
  const stateRef = useRef({
      isPlaying,
      crashed,
      autoCashout: parseFloat(autoCashout) || 0,
      betAmount
  });

  // Keep ref in sync
  useEffect(() => {
      stateRef.current = { 
          isPlaying, 
          crashed, 
          autoCashout: parseFloat(autoCashout) || 0,
          betAmount
      };
  }, [isPlaying, crashed, autoCashout, betAmount]);

  const endGame = useCallback((win: boolean, payoutMultiplier: number) => {
      setIsPlaying(false);
      const winAmount = win ? stateRef.current.betAmount * payoutMultiplier : 0;
      
      onGameEnd(win, winAmount, stateRef.current.betAmount);

      if (win) playSound('win');
      else playSound('lose');

      // Auto Bet Logic
      if (stateRef.current.isPlaying) return; // Safety? No, we just set isPlaying false.
      
      // Delay slightly to show crash/win state before restarting
      setTimeout(() => {
          const continueAuto = processResult(win, winAmount);
          if (continueAuto) {
              setAutoTrigger(t => t + 1);
          }
      }, 1000);

  }, [onGameEnd, processResult, playSound]);

  const startGame = useCallback(() => {
    if (balance < betAmount) {
        stopAutoBet();
        playSound('error');
        return;
    }
    
    playSound('click');
    setBalance(b => b - betAmount);
    setIsPlaying(true);
    setCrashed(false);
    setMultiplier(1.00);
    
    // Provably Fair Result
    const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
    setNonce(n => n + 1);

    // Standard Crash Formula: E = 0.99 / (1 - float)
    let crashPoint = 0.99 / (1 - float);
    
    if (crashPoint < 1.00) crashPoint = 1.00;
    
    // If we want 3% instant crash:
    const isInstantCrash = (float < 0.03); 
    if (isInstantCrash) crashPoint = 1.00;
    
    if (crashPoint > 1000) crashPoint = 1000; // Cap at 1000x for safety/demo

    const start = Date.now();
    
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      const nextMult = Math.pow(Math.E, 0.06 * elapsed * 2.5); 
      
      // Auto Cashout Check
      const ac = stateRef.current.autoCashout;
      if (ac > 1 && nextMult >= ac && !stateRef.current.crashed) {
          // Cashout at exact target
          setMultiplier(ac);
          setBalance(b => b + (stateRef.current.betAmount * ac));
          setIsPlaying(false);
          endGame(true, ac);
          return;
      }

      if (nextMult >= crashPoint) {
        setMultiplier(crashPoint);
        setCrashed(true);
        setIsPlaying(false);
        endGame(false, 0);
      } else {
        setMultiplier(nextMult);
        reqRef.current = requestAnimationFrame(tick);
      }
    };
    reqRef.current = requestAnimationFrame(tick);
  }, [balance, betAmount, endGame, stopAutoBet, setBalance, serverSeed, clientSeed, nonce, playSound]);

  const cashOut = () => {
    if (!isPlaying || crashed) return;
    playSound('cashout');
    cancelAnimationFrame(reqRef.current);
    const win = betAmount * multiplier;
    setBalance(b => b + win);
    setIsPlaying(false);
    endGame(true, multiplier);
  };

  useEffect(() => () => cancelAnimationFrame(reqRef.current), []);

  useEffect(() => {
      if (isAutoBetting && autoTrigger > 0) {
          startGame();
      }
  }, [autoTrigger, isAutoBetting, startGame]);


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
          {/* Mode Tabs */}
          <div className="bg-vewire-input p-1 rounded-lg flex text-sm font-bold mb-2">
            <button 
                className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                onClick={() => { playSound('click'); setMode('MANUAL'); }}
                disabled={isPlaying || isAutoBetting}
            >
                {t('game.manual')}
            </button>
            <button 
                className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                onClick={() => { playSound('click'); setMode('AUTO'); }}
                disabled={isPlaying || isAutoBetting}
            >
                {t('game.auto')}
            </button>
          </div>

          <div>
             <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
             <div className="relative">
                 <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                 <input 
                    type="number" 
                    min="0.01" 
                    step="0.01"
                    value={betAmount} 
                    onChange={(e) => setBetAmount(Number(e.target.value))} 
                    disabled={isPlaying || isAutoBetting}
                    className={`w-full ${THEME.input} text-white p-3 pl-8 rounded-lg border ${THEME.border} mt-2 font-mono`} 
                 />
             </div>
             <div className="grid grid-cols-2 gap-2 mt-2">
                 <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} disabled={isPlaying || isAutoBetting} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                 <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} disabled={isPlaying || isAutoBetting} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
             </div>
          </div>
          
          <div>
              <label className="text-gray-400 text-xs font-bold uppercase">{t('game.auto_cashout')}</label>
              <div className="relative">
                  <input 
                      type="number" 
                      step="0.01"
                      value={autoCashout} 
                      onChange={(e) => setAutoCashout(e.target.value)} 
                      placeholder="Infinity"
                      disabled={isPlaying || isAutoBetting}
                      className={`w-full ${THEME.input} text-white p-3 pr-8 rounded-lg border ${THEME.border} mt-2 font-mono`}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">x</span>
              </div>
          </div>

        {mode === 'MANUAL' ? (
             <button 
               onClick={isPlaying ? cashOut : startGame}
               disabled={isPlaying && crashed} 
               className={`w-full py-4 rounded-lg font-bold text-black uppercase mt-auto ${isPlaying ? 'bg-orange-500 hover:bg-orange-400' : THEME.accent + ' hover:brightness-110'} transition-all`}
             >
               {isPlaying ? t('game.cashout') : t('game.bet')}
             </button>
        ) : (
            <AutobetControls 
                settings={settings}
                onChange={setSettings}
                onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t+1), 0); }}
                onStop={stopAutoBet}
                isRunning={isAutoBetting}
                balance={balance}
            />
        )}
      </div>
      
      <div className="flex-1 relative bg-vewire-bg rounded-xl border border-vewire-border overflow-hidden flex items-center justify-center">
        {/* Graph Line Animation (CSS SVG) */}
        <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none opacity-20">
           <path d={`M0,500 Q${multiplier * 50},500 ${multiplier * 100},${500 - (multiplier * 50)}`} stroke="#00E701" strokeWidth="4" fill="none" />
        </svg>
        <div className="text-center z-10">
          <div className={`text-7xl md:text-9xl font-black tabular-nums ${crashed ? "text-red-500" : isPlaying ? "text-white" : "text-gray-500"}`}>
            {multiplier.toFixed(2)}x
          </div>
          <div className="text-gray-500 mt-2 font-mono uppercase">
              {crashed ? "Crashed" : isPlaying ? t('game.current_win') : t('game.good_luck')}
          </div>
        </div>
        
        {/* Status Overlay */}
         {isAutoBetting && (
            <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                {t('game.autobet_active')}
            </div>
        )}
      </div>
    </div>
  );
};

export default CrashGame;
