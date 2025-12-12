import { useState, useEffect, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';

const DiceGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isRolling, setIsRolling] = useState(false);
  
  const [mode, setMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
  const [autoTrigger, setAutoTrigger] = useState(0);

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
        return;
    }
    setBalance(b => b - betAmount);
    setIsRolling(true);
    
    setTimeout(() => {
      const result = Math.random() * 100;
      setRoll(result);
      setIsRolling(false);
      
      const win = result > target;
      const winAmount = win ? betAmount * multiplier : 0;

      if (win) {
        setBalance(b => b + winAmount);
      }
      onGameEnd(win, winAmount);

      if (isAutoBetting) {
          const continueAuto = processResult(win, winAmount);
          if (continueAuto) {
              setTimeout(() => setAutoTrigger(t => t + 1), 200);
          }
      }
    }, 500);
  }, [balance, betAmount, target, multiplier, onGameEnd, isAutoBetting, processResult, stopAutoBet, setBalance]);

  // Trigger auto bet next round
  useEffect(() => {
      if (isAutoBetting && autoTrigger > 0) {
          rollDice();
      }
  }, [autoTrigger]); // We rely on fresh closure of rollDice when this runs? 
  // No, if rollDice changes, effect doesn't rerun. But when it runs, it calls 'rollDice'. 
  // Is 'rollDice' in the scope the *latest* one?
  // 'rollDice' is a const in the function body.
  // The effect captures the 'rollDice' from the render where the effect was created?
  // No, we need 'rollDice' in dependency or use a ref. 
  // Actually, standard react: add rollDice to dependency.
  // If rollDice changes, effect runs? No we don't want that. We only want it to run on 'autoTrigger'.
  
  // Ref approach for rollDice to ensure we always call the latest without triggering effect
  // But actually, since 'autoTrigger' is set inside the callback of the previous rollDice, 
  // a re-render MUST have happened (due to setBalance/setRoll/setBetAmount).
  // So the effect will run with the new rollDice if we include it.
  // BUT we only want to run it if autoTrigger changed.
  
  // Let's use a Mutable Ref for the function to avoid dependency hell.
  // OR simpler: Just add rollDice to dependency but guard with a ref or check.
  // Actually, standard pattern:
  // useEffect(() => { if(isAuto && trigger) rollDice() }, [trigger, isAuto, rollDice]);
  // Since rollDice changes on every bet amount change (which happens in processResult), 
  // this might trigger double spins if we aren't careful.
  // But trigger only increments once per game end.
  // So it's fine.

  useEffect(() => {
      if (isAutoBetting && autoTrigger > 0) {
          rollDice();
      }
  }, [autoTrigger, isAutoBetting, rollDice]);


  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
        <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
            {/* Mode Switcher */}
            <div className="bg-[#0f141d] p-1 rounded-lg flex text-sm font-bold mb-2">
                <button 
                    className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-[#212735] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => setMode('MANUAL')}
                    disabled={isAutoBetting}
                >
                    Manual
                </button>
                <button 
                    className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-[#212735] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                    onClick={() => setMode('AUTO')}
                    disabled={isAutoBetting}
                >
                    Auto
                </button>
            </div>

            {mode === 'MANUAL' ? (
                <>
                    <div>
                        <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
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
                             <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">½</button>
                             <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">2×</button>
                        </div>
                    </div>
                    <button 
                        onClick={rollDice} 
                        disabled={isRolling} 
                        className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:brightness-110 transition-all`}
                    >
                        {isRolling ? "Rolling..." : "Roll Dice"}
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

        <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-8 relative">
            <div className="flex justify-between items-center w-full max-w-2xl bg-[#1a202c] p-4 rounded-lg mb-8">
                <div className="text-center">
                    <div className="text-gray-400 text-xs font-bold uppercase">Multiplier</div>
                    <div className="text-2xl font-bold text-white">{multiplier}x</div>
                </div>
                <div className="text-center">
                    <div className="text-gray-400 text-xs font-bold uppercase">Win Chance</div>
                    <div className="text-2xl font-bold text-white">{winChance}%</div>
                </div>
            </div>

            <div className="relative h-24 bg-[#0f141d] rounded-xl flex items-center px-4 overflow-hidden border border-gray-700 w-full max-w-3xl">
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
                    AUTOBET ACTIVE
                </div>
            )}
        </div>
    </div>
  );
};

export default DiceGame;
