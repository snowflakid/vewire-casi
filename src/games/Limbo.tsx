import { useState, useRef, useEffect } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import AutobetControls from '../components/AutobetControls';

const LimboGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [target, setTarget] = useState(2.0);
    const [betAmount, setBetAmount] = useState(10);
    // const [result, setResult] = useState<number | null>(null);
    const [displayResult, setDisplayResult] = useState<number>(1.00);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Autobet State
    const [mode, setMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
    const [isAutoRunning, setIsAutoRunning] = useState(false);
    const [autoSettings, setAutoSettings] = useState({
        betAmount: 10,
        betsCount: 0,
        onWin: 0,
        onLoss: 0,
        stopProfit: 0,
        stopLoss: 0
    });
    
    // Refs for Auto Logic
    const autoRef = useRef({
        running: false,
        remaining: 0,
        currentBet: 10,
        profit: 0
    });
    
    // Keep autoRef synced
    useEffect(() => {
        if (!isAutoRunning) {
            autoRef.current.currentBet = betAmount;
        }
    }, [betAmount, isAutoRunning]);

    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const winChance = (99 / target).toFixed(2);

    const stopAuto = () => {
        setIsAutoRunning(false);
        autoRef.current.running = false;
    };

    const runGame = async () => {
        // Logic for a single game round
        // Returns the net result (profit/loss)
        
        const currentBet = mode === 'AUTO' ? autoRef.current.currentBet : betAmount;

        if (balance < currentBet) {
            stopAuto();
            return;
        }
        
        // Deduct Bet
        setBalance(b => b - currentBet);
        setIsPlaying(true);
        
        // Generate Result
        // Limbo formula: 0.99 * (MAX / (Random)) ?? 
        // Standard: 100 / (random * 100) * 0.99 = 0.99 / random
        // Provably Fair float is 0..1
        const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
        setNonce(n => n + 1);
        
        // Limbo Result Calculation
        // Max payout usually 1,000,000x or something
        // Formula: 0.99 / (float) 
        // If float is 0 -> Infinite (cap at 1M)
        let generated = 0.99 / float;
        if (generated > 1000000) generated = 1000000;
        if (generated < 1) generated = 1; // Minimum 1.00x? Usually yes.
        
        // setResult(generated);

        // Animation
        // Count up from 1.00 to generated
        // If generated is huge (e.g. 1000x), we don't want to wait 10 seconds.
        // We want a fast exponential counter.
        
        return new Promise<number>((resolve) => {
            const startTime = performance.now();
            const duration = 500; // ms
            
            const animate = (time: number) => {
                const elapsed = time - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Ease out expo
                // Show numbers racing up
                // If we won (generated >= target), we show generated.
                // If we lost, we show generated.
                // Limbo usually snaps or counts fast.
                
                // Let's do a random scramble or fast count
                const currentDisplay = 1 + (generated - 1) * progress;
                
                setDisplayResult(currentDisplay);
                
                if (progress < 1) {
                    requestAnimationFrame(animate);
                } else {
                    setDisplayResult(generated);
                    setIsPlaying(false);
                    
                    const won = generated >= target;
                    let profit = -currentBet;
                    
                    if (won) {
                        const winAmount = currentBet * target;
                        setBalance(b => b + winAmount);
                        onGameEnd(true, winAmount);
                        profit = winAmount - currentBet;
                    } else {
                        onGameEnd(false, 0);
                    }
                    
                    resolve(profit);
                }
            };
            requestAnimationFrame(animate);
        });
    };

    const handleAutoLoop = async () => {
        if (!autoRef.current.running) return;

        const profit = await runGame() || 0;
        
        // Update Auto State
        autoRef.current.profit += profit;
        
        if (autoRef.current.remaining > 0) {
            autoRef.current.remaining--;
            if (autoRef.current.remaining === 0) {
                stopAuto();
                return;
            }
        }
        
        // Handle On Win / On Loss
        if (profit > 0) {
            // Win
            if (autoSettings.onWin !== 0) {
                autoRef.current.currentBet *= (1 + autoSettings.onWin / 100);
            }
        } else {
            // Loss
            if (autoSettings.onLoss !== 0) {
                autoRef.current.currentBet *= (1 + autoSettings.onLoss / 100);
            }
        }

        // Safety Caps
        if (autoSettings.stopProfit > 0 && autoRef.current.profit >= autoSettings.stopProfit) {
            stopAuto();
            return;
        }
        
        // Loop
        if (autoRef.current.running) {
             setTimeout(() => handleAutoLoop(), 100); // Small delay between bets
        }
    };

    const startAuto = () => {
        setIsAutoRunning(true);
        autoRef.current = {
            running: true,
            remaining: autoSettings.betsCount,
            currentBet: betAmount,
            profit: 0
        };
        handleAutoLoop();
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                
                {/* Mode Switcher */}
                <div className="bg-[#0f141d] p-1 rounded-lg flex gap-1">
                    <button 
                        onClick={() => { setMode('MANUAL'); stopAuto(); }}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${mode === 'MANUAL' ? 'bg-[#2f3847] text-white shadow' : 'text-gray-500 hover:text-white'}`}
                    >
                        Manual
                    </button>
                    <button 
                        onClick={() => setMode('AUTO')}
                        className={`flex-1 py-2 rounded text-xs font-bold transition-all ${mode === 'AUTO' ? 'bg-[#2f3847] text-white shadow' : 'text-gray-500 hover:text-white'}`}
                    >
                        Auto
                    </button>
                </div>

                {mode === 'MANUAL' ? (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Target Multiplier</label>
                           <input type="number" step="0.1" min="1.01" value={target} onChange={(e) => setTarget(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div className="text-xs text-gray-500">Win Chance: {winChance}%</div>
                        <button onClick={() => runGame()} disabled={isPlaying} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:opacity-90 active:scale-95 transition-all`}>
                            {isPlaying ? "Running..." : "Bet"}
                        </button>
                    </>
                ) : (
                    <>
                         <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Target Multiplier</label>
                           <input type="number" step="0.1" min="1.01" value={target} onChange={(e) => setTarget(Number(e.target.value))} disabled={isAutoRunning} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Base Bet Amount</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isAutoRunning} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        
                        <AutobetControls 
                            settings={autoSettings} 
                            onChange={setAutoSettings} 
                            onStart={startAuto} 
                            onStop={stopAuto} 
                            isRunning={isAutoRunning}
                            balance={balance}
                        />
                    </>
                )}
            </div>
            
            <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-8">
                 <div className="text-center">
                     <div className={`text-8xl font-black tabular-nums transition-colors duration-100
                         ${displayResult >= target ? 'text-green-500' : isPlaying ? 'text-white' : 'text-red-500'}
                     `}>
                         {displayResult.toFixed(2)}x
                     </div>
                     <div className="text-gray-500 mt-4 text-xl">Target: {target.toFixed(2)}x</div>
                 </div>
            </div>
        </div>
    );
};

export default LimboGame;