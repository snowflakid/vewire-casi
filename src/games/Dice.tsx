import { useState, useEffect, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';
import { ProvablyFair } from '../utils/provably-fair';
import { useSettings } from '../context/SettingsContext';

const DiceGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const { t, playSound } = useSettings();
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isRolling, setIsRolling] = useState(false);
  
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

  // 1% House Edge included in the 99 numerator
  const multiplier = Number((99 / (100 - target)).toFixed(4));
  const winChance = (100 - target).toFixed(2);

  const rollDice = useCallback(() => {
    if (balance < betAmount) {
        stopAutoBet();
        playSound('error');
        return;
    }
    playSound('click');
    setBalance(b => b - betAmount);
    setIsRolling(true);
    
    // PF Result
    const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
    setNonce(n => n + 1);
    
    setTimeout(() => {
      const result = float * 100;
      setRoll(result);
      setIsRolling(false);
      
      const win = result > target;
      const winAmount = win ? betAmount * multiplier : 0;

      if (win) {
        setBalance(b => b + winAmount);
        playSound('win');
      } else {
        playSound('lose');
      }
      onGameEnd(win, winAmount, betAmount);

      if (isAutoBetting) {
          const continueAuto = processResult(win, winAmount);
          if (continueAuto) {
              setTimeout(() => setAutoTrigger(t => t + 1), 200);
          }
      }
    }, 500);
  }, [balance, betAmount, target, multiplier, onGameEnd, isAutoBetting, processResult, stopAutoBet, setBalance, serverSeed, clientSeed, nonce, playSound]);

  // Trigger auto bet next round
  useEffect(() => {
      if (isAutoBetting && autoTrigger > 0) {
          rollDice();
      }
  }, [autoTrigger, isAutoBetting, rollDice]);


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
            {/* Mode Switcher */}
            <div className="bg-vewire-input p-1 rounded-lg flex text-sm font-bold mb-2">
                <button 
                    className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => { playSound('click'); setMode('MANUAL'); }}
                    disabled={isAutoBetting}
                >
                    {t('game.manual')}
                </button>
                <button 
                    className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => { playSound('click'); setMode('AUTO'); }}
                    disabled={isAutoBetting}
                >
                    {t('game.auto')}
                </button>
            </div>

            {mode === 'MANUAL' ? (
                <>
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
                                className={`w-full ${THEME.input} text-white p-3 pl-8 rounded-lg border ${THEME.border} mt-2 font-mono`} 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                             <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                        </div>
                    </div>
                    <button 
                        onClick={rollDice} 
                        disabled={isRolling} 
                        className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:brightness-110 transition-all`}
                    >
                        {isRolling ? t('game.spinning') : t('game.spin')}
                    </button>
                </>
            ) : (
                <AutobetControls 
                    settings={settings}
                    onChange={setSettings}
                    onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t + 1), 0); }}
                    onStop={stopAutoBet}
                    isRunning={isAutoBetting}
                    balance={balance}
                />
            )}
        </div>

        <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-center p-8 relative">
            <div className="flex justify-between items-center w-full max-w-2xl bg-vewire-sidebar p-4 rounded-lg mb-8">
                <div className="text-center">
                    <div className="text-gray-400 text-xs font-bold uppercase">{t('game.multiplier')}</div>
                    <div className="text-2xl font-bold text-white">{multiplier}x</div>
                </div>
                <div className="text-center">
                    <div className="text-gray-400 text-xs font-bold uppercase">{t('game.win_chance')}</div>
                    <div className="text-2xl font-bold text-white">{winChance}%</div>
                </div>
            </div>

            <div className="relative h-24 bg-vewire-input rounded-xl flex items-center px-4 overflow-hidden border border-vewire-border w-full max-w-3xl">
                <div className="absolute top-1/2 left-4 right-4 h-2 bg-gray-700 rounded-full">
                    <div className="absolute h-full bg-red-500 rounded-l-full" style={{ width: `${target}%` }}></div>
                    <div className="absolute h-full bg-green-500 rounded-r-full right-0" style={{ width: `${100-target}%` }}></div>
                </div>
                
                <input 
                    type="range" min="2" max="98" value={target} 
                    onChange={(e) => setTarget(Number(e.target.value))}
                    className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
                />
                
                {roll !== null && (
                    <div 
                        className={`absolute top-1/2 w-12 h-12 -mt-6 -ml-6 rounded-xl border-4 flex items-center justify-center font-bold text-white text-lg shadow-xl transition-all duration-300 z-10 ${roll > target ? 'bg-green-500 border-green-300' : 'bg-red-500 border-red-300'}`}
                        style={{ left: `${roll}%` }}
                    >
                        {Math.floor(roll)}
                    </div>
                )}
            </div>
            
            {/* Overlay for Auto Bet Status */}
            {isAutoBetting && (
                <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                    {t('game.autobet_active')}
                </div>
            )}
        </div>
    </div>
  );
};

export default DiceGame;
