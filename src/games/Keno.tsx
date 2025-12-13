import { useState, useCallback, useEffect, Fragment } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { getKenoPayout } from './plinko-data'; 
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';

const KenoGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [selected, setSelected] = useState<number[]>([]);
    const [drawn, setDrawn] = useState<number[]>([]);
    const [betAmount, setBetAmount] = useState(10);
    const [risk, setRisk] = useState<'CLASSIC' | 'LOW' | 'HIGH'>('CLASSIC');
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

    const toggleNumber = (n: number) => {
        if (isPlaying || isAutoBetting) return;
        if (selected.includes(n)) {
            setSelected(selected.filter(s => s !== n));
        } else {
            if (selected.length < 10) setSelected([...selected, n]);
        }
    };

    const play = useCallback(() => {
        if (balance < betAmount || selected.length === 0) {
            stopAutoBet();
            return;
        }

        setBalance(b => b - betAmount);
        setIsPlaying(true);
        setDrawn([]);

        const result: number[] = [];
        let currentNonceOffset = 0;
        
        while(result.length < 10) {
             const floats = ProvablyFair.generateFloats(serverSeed, clientSeed, nonce + currentNonceOffset, 5);
             currentNonceOffset++;
             
             for(const f of floats) {
                 const n = Math.floor(f * 40) + 1;
                 if(!result.includes(n)) {
                     result.push(n);
                     if(result.length === 10) break;
                 }
             }
        }
        setNonce(n => n + currentNonceOffset); 

        let i = 0;
        const interval = setInterval(() => {
            setDrawn(prev => [...prev, result[i]]);
            i++;
            if (i >= 10) {
                clearInterval(interval);
                setIsPlaying(false);
                
                const hits = selected.filter(s => result.includes(s)).length;
                const payouts = getKenoPayout(selected.length, risk);
                const multiplier = payouts[hits as keyof typeof payouts] || 0;
                
                let win = 0;
                if (multiplier > 0) {
                    win = betAmount * multiplier;
                    setBalance(b => b + win);
                    onGameEnd(true, win, betAmount);
                } else {
                    onGameEnd(false, 0, betAmount);
                }

                if (isAutoBetting) {
                    const continueAuto = processResult(win > 0, win);
                    if (continueAuto) {
                        setTimeout(() => setAutoTrigger(t => t + 1), 500);
                    }
                }
            }
        }, 100);
    }, [balance, betAmount, selected, risk, serverSeed, clientSeed, nonce, isAutoBetting, processResult, stopAutoBet, setBalance, onGameEnd]);

    useEffect(() => {
        if (isAutoBetting && autoTrigger > 0) {
            play();
        }
    }, [autoTrigger, isAutoBetting, play]);

    const payouts = getKenoPayout(selected.length, risk);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                {/* Mode Tabs */}
                <div className="bg-vewire-input p-1 rounded-lg flex text-sm font-bold mb-2">
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setMode('MANUAL')}
                        disabled={isPlaying || isAutoBetting}
                    >
                        Manual
                    </button>
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setMode('AUTO')}
                        disabled={isPlaying || isAutoBetting}
                    >
                        Auto
                    </button>
                </div>

                {mode === 'MANUAL' ? (
                    <Fragment>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                           <div className="relative">
                               <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                           </div>
                           
                           <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                                <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                           </div>
                        </div>
                           
                           <div>
                               <label className="text-gray-400 text-xs font-bold uppercase">Risk</label>
                               <select 
                                   value={risk} 
                                   onChange={(e) => setRisk(e.target.value as any)}
                                   className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                               >
                                   <option value="CLASSIC">Classic</option>
                                   <option value="LOW">Low</option>
                                   <option value="HIGH">High</option>
                               </select>
                           </div>

                           <div className="text-xs text-gray-500">Pick up to 10 numbers</div>
                           
                           <button 
                               onClick={play} 
                               disabled={isPlaying || selected.length === 0 || balance < betAmount} 
                               className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto disabled:opacity-50 hover:scale-105 transition-transform`}
                           >
                               Bet
                           </button>
                    </Fragment>
                ) : (
                    <Fragment>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isAutoBetting} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        
                        <div>
                            <label className="text-gray-400 text-xs font-bold uppercase">Risk</label>
                            <select 
                                value={risk} 
                                onChange={(e) => setRisk(e.target.value as any)}
                                disabled={isAutoBetting}
                                className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                            >
                                <option value="CLASSIC">Classic</option>
                                <option value="LOW">Low</option>
                                <option value="HIGH">High</option>
                            </select>
                        </div>

                        <AutobetControls 
                            settings={settings}
                            onChange={setSettings}
                            onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t + 1), 0); }}
                            onStop={stopAutoBet}
                            isRunning={isAutoBetting}
                            balance={balance}
                        />
                    </Fragment>
                )}

                {/* Payout Table visualization - Show in both modes */}
                <div className="bg-vewire-input p-3 rounded-lg border border-vewire-border text-xs mt-4">
                    <div className="flex justify-between text-gray-500 mb-1">
                        <span>Hits</span>
                        <span>Payout</span>
                    </div>
                    <div className="grid grid-cols-2 gap-y-1">
                        {Object.entries(payouts).map(([hits, mult]) => (
                            mult > 0 && (
                                <div key={hits} className="flex justify-between text-white font-mono">
                                    <span>{hits}x</span>
                                    <span className="text-green-500">{mult}x</span>
                                </div>
                            )
                        ))}
                    </div>
                </div>
            </div>
            
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex items-center justify-center p-6 relative">
                <div className="grid grid-cols-8 gap-2 w-full max-w-2xl">
                    {Array.from({length: 40}, (_, i) => i + 1).map(n => {
                        const isSelected = selected.includes(n);
                        const isDrawn = drawn.includes(n);
                        const isHit = isSelected && isDrawn;
                        
                        let bg = 'bg-vewire-card text-gray-400';
                        if (isHit) bg = 'bg-vewire-accent text-black shadow-[0_0_10px_currentColor] scale-110 z-10';
                        else if (isDrawn) bg = 'bg-red-500/50 text-white';
                        else if (isSelected) bg = 'bg-vewire-input border-2 border-vewire-accent text-white';
                        
                        return (
                            <button
                                key={n}
                                onClick={() => toggleNumber(n)}
                                disabled={isPlaying || isAutoBetting}
                                className={`
                                    aspect-square rounded-lg font-bold text-sm sm:text-lg transition-all duration-300
                                    ${bg} hover:scale-105
                                `}
                            >
                                {n}
                            </button>
                        );
                    })}
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

export default KenoGame;