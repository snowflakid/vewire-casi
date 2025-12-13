import { useState, useRef, useEffect, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';
import { useSettings } from '../context/SettingsContext';

const LimboGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const { t, playSound } = useSettings();
    const [target, setTarget] = useState(2.0);
    const [betAmount, setBetAmount] = useState(10);
    const [displayResult, setDisplayResult] = useState<number>(1.00);
    const [isPlaying, setIsPlaying] = useState(false);
    
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

    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const winChance = (99 / target).toFixed(2);
    
    // Animation Ref
    const reqRef = useRef<number>(0);

    const runGame = useCallback(() => {
        if (balance < betAmount) {
            stopAutoBet();
            playSound('error');
            return;
        }
        playSound('click');
        
        // Deduct Bet
        setBalance(b => b - betAmount);
        setIsPlaying(true);
        
        // Generate Result
        const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
        setNonce(n => n + 1);
        
        let generated = 0.99 / float;
        if (generated > 1000000) generated = 1000000;
        if (generated < 1) generated = 1; 
        
        const startTime = performance.now();
        const duration = 500; // ms
        
        const animate = (time: number) => {
            const elapsed = time - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Visual random scramble effect
            const currentDisplay = 1 + (generated - 1) * progress;
            setDisplayResult(currentDisplay);
            
            if (progress < 1) {
                reqRef.current = requestAnimationFrame(animate);
            } else {
                setDisplayResult(generated);
                setIsPlaying(false);
                
                const won = generated >= target;
                const winAmount = won ? betAmount * target : 0;
                
                if (won) {
                    setBalance(b => b + winAmount);
                    playSound('win');
                } else {
                    playSound('lose');
                }
                
                onGameEnd(won, winAmount, betAmount);
                
                if (isAutoBetting) {
                     const shouldContinue = processResult(won, winAmount);
                     if (shouldContinue) {
                         setTimeout(() => setAutoTrigger(t => t + 1), 200);
                     }
                }
            }
        };
        reqRef.current = requestAnimationFrame(animate);

    }, [balance, betAmount, target, serverSeed, clientSeed, nonce, isAutoBetting, processResult, stopAutoBet, setBalance, onGameEnd, playSound]);

    useEffect(() => {
        if (isAutoBetting && autoTrigger > 0) {
            runGame();
        }
    }, [autoTrigger, isAutoBetting, runGame]);

    useEffect(() => {
        return () => cancelAnimationFrame(reqRef.current);
    }, []);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                
                {/* Mode Switcher */}
                <div className="bg-vewire-input p-1 rounded-lg flex gap-1">
                    <button 
                        onClick={() => { playSound('click'); setMode('MANUAL'); stopAutoBet(); }}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${mode === 'MANUAL' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-white'}`}
                        disabled={isPlaying || isAutoBetting}
                    >
                        {t('game.manual')}
                    </button>
                    <button 
                        onClick={() => { playSound('click'); setMode('AUTO'); }}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${mode === 'AUTO' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-white'}`}
                        disabled={isPlaying || isAutoBetting}
                    >
                        {t('game.auto')}
                    </button>
                </div>

                {mode === 'MANUAL' ? (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.target')}</label>
                           <input type="number" step="0.1" min="1.01" value={target} onChange={(e) => setTarget(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                             <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">{t('game.win_chance')}: {winChance}%</div>
                        
                        <button onClick={runGame} disabled={isPlaying} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:opacity-90 active:scale-95 transition-all`}>
                            {isPlaying ? t('game.spinning') : t('game.bet')}
                        </button>
                    </>
                ) : (
                    <>
                         <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.target')}</label>
                           <input type="number" step="0.1" min="1.01" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={isAutoBetting} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isAutoBetting} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        
                        <AutobetControls 
                            settings={settings} 
                            onChange={setSettings} 
                            onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t+1), 0); }}
                            onStop={stopAutoBet} 
                            isRunning={isAutoBetting}
                            balance={balance}
                        />
                    </>
                )}
            </div>
            
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-center p-8">
                 <div className="text-center">
                     <div className={`text-8xl font-black tabular-nums transition-colors duration-100
                         ${displayResult >= target ? 'text-green-500' : isPlaying ? 'text-white' : 'text-red-500'}
                     `}>
                         {displayResult.toFixed(2)}x
                     </div>
                     <div className="text-gray-500 mt-4 text-xl">Target: {target.toFixed(2)}x</div>
                     {isAutoBetting && <div className="text-green-500 font-bold mt-2 animate-pulse">{t('game.autobet_active')}</div>}
                 </div>
            </div>
        </div>
    );
};

export default LimboGame;