import { useState, useEffect, useRef, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { PLINKO_CONFIG } from './plinko-data';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';
import { useSettings } from '../context/SettingsContext';

interface ActiveBall {
    id: number;
    path: number[]; // -1 for left, 1 for right
    startTime: number;
    // Current rendered position
    x: number;
    y: number;
    betAmount: number; // Snapshot of bet amount
}

const PlinkoGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const { t, playSound } = useSettings();
    const [betAmount, setBetAmount] = useState(10);
    const [rows, setRows] = useState<number>(16);
    const [risk, setRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [history, setHistory] = useState<{ val: number; id: number }[]>([]);
    const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);

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

    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const multipliers = PLINKO_CONFIG[rows as keyof typeof PLINKO_CONFIG][risk];
    
    // Animation Loop
    const requestRef = useRef<number>(0);
    const processedBalls = useRef(new Set<number>());

    // We need refs to access latest state inside animation loop without re-binding
    const stateRef = useRef({
        multipliers,
        isAutoBetting,
        rows
    });
    
    useEffect(() => {
        stateRef.current = { multipliers, isAutoBetting, rows };
    }, [multipliers, isAutoBetting, rows]);

    // Use a ref for processResult to avoid dependency cycle in animate
    const processResultRef = useRef(processResult);
    useEffect(() => { processResultRef.current = processResult; }, [processResult]);

    // Animate Function
    const animate = useCallback(() => {
        setActiveBalls(prevBalls => {
            const nextBalls: ActiveBall[] = [];
            const now = performance.now();
            const { multipliers: currentMultipliers, isAutoBetting: currentIsAuto, rows: currentRows } = stateRef.current;

            prevBalls.forEach(ball => {
                const elapsed = now - ball.startTime;
                
                const factor = 400; 
                const visualRow = Math.pow(elapsed / factor, 1.8); 
                const stepWidthPercent = 100 / (currentRows + 4); 

                if (visualRow < currentRows) {
                    const currentRowIndex = Math.floor(visualRow);
                    let xAccumulator = 0;
                    for(let i=0; i<currentRowIndex; i++) {
                        xAccumulator += (ball.path[i] || 0) * 0.5;
                    }
                    const progress = visualRow - currentRowIndex;
                    const nextDir = (ball.path[currentRowIndex] || 0) * 0.5;
                    const currentX = xAccumulator + (nextDir * progress);
                    const xPercent = currentX * stepWidthPercent;
                    
                    nextBalls.push({
                        ...ball,
                        x: xPercent,
                        y: (visualRow / currentRows) * 90
                    });
                } else {
                    // Finished
                    if (!processedBalls.current.has(ball.id)) {
                        processedBalls.current.add(ball.id);
                        
                        const rights = ball.path.filter(p => p === 1).length;
                        // Clamp rights to max rows just in case (though path length matches rows)
                        const clampedRights = Math.min(rights, currentMultipliers.length - 1);
                        const resultMult = currentMultipliers[clampedRights];
                        const win = ball.betAmount * resultMult; 

                        setBalance(b => b + win);
                        setHistory(prev => [{ val: resultMult, id: ball.id }, ...prev].slice(0, 50));
                        onGameEnd(win >= ball.betAmount, win, ball.betAmount);

                        if (win >= ball.betAmount) playSound('win');
                        else playSound('lose');

                        // Auto Bet Trigger (Sequential)
                        if (currentIsAuto) {
                             const shouldContinue = processResultRef.current(win >= ball.betAmount, win);
                             if (shouldContinue) {
                                 // Add small delay
                                 setTimeout(() => setAutoTrigger(t => t + 1), 200);
                             }
                        }

                        setTimeout(() => {
                             processedBalls.current.delete(ball.id);
                        }, 2000);
                    }
                }
            });
            return nextBalls;
        });
        
        requestRef.current = requestAnimationFrame(animate);
    }, [setBalance, onGameEnd, playSound]);

    useEffect(() => {
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [animate]);

    const dropBall = useCallback(() => {
        if (balance < betAmount) {
            stopAutoBet();
            playSound('error');
            return;
        }
        playSound('click');
        setBalance(b => b - betAmount);
        
        const currentNonce = nonce;
        setNonce(n => n + 1);

        const pathFloats = ProvablyFair.generateFloats(serverSeed, clientSeed, currentNonce, rows);
        const path = pathFloats.map(f => f > 0.5 ? 1 : -1); 
        
        const ballId = Date.now() + Math.random(); 
        setActiveBalls(prev => [...prev, { 
            id: ballId, 
            path: path,
            startTime: performance.now(),
            x: 0,
            y: 0,
            betAmount: betAmount
        }]);
    }, [balance, betAmount, rows, nonce, serverSeed, clientSeed, stopAutoBet, setBalance, playSound]);

    useEffect(() => {
        if (isAutoBetting && autoTrigger > 0) {
            dropBall();
        }
    }, [autoTrigger, isAutoBetting, dropBall]);


    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[calc(100vh-100px)]">
            {/* Controls (Left) */}
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border} h-full overflow-y-auto`}>
                {/* Mode Tabs */}
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
                        
                        <div className="grid grid-cols-2 gap-2">
                            <div>
                                <label className="text-gray-400 text-xs font-bold uppercase">{t('game.rows')}</label>
                                <select 
                                    value={rows} 
                                    onChange={(e) => setRows(Number(e.target.value))}
                                    className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                                >
                                    {Object.keys(PLINKO_CONFIG).map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-gray-400 text-xs font-bold uppercase">{t('game.risk')}</label>
                                <select 
                                    value={risk} 
                                    onChange={(e) => setRisk(e.target.value as any)}
                                    className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                                >
                                    <option value="LOW">{t('game.low')}</option>
                                    <option value="MEDIUM">{t('game.medium')}</option>
                                    <option value="HIGH">{t('game.high')}</option>
                                </select>
                            </div>
                        </div>

                        <div className="bg-vewire-input p-2 rounded text-[10px] text-gray-500 font-mono break-all">
                            Seed Hash: {ProvablyFair.hashSeed(serverSeed).substring(0, 15)}...
                        </div>

                        <button onClick={dropBall} disabled={balance < betAmount} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:opacity-90 active:scale-95 transition-all disabled:opacity-50`}>
                            {t('game.bet')}
                        </button>
                    </>
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
            
            {/* Game Board (Center) */}
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-center p-4 relative overflow-hidden">
                <div className="relative w-full max-w-[600px] aspect-square flex flex-col items-center justify-between py-8">
                    {/* Pins */}
                    <div className="flex-1 w-full relative">
                        {Array.from({length: rows}).map((_, rowIndex) => {
                            const cols = rowIndex + 3;
                            return (
                                <div 
                                    key={rowIndex} 
                                    className="absolute w-full flex justify-center gap-[calc(100%/22)]" 
                                    style={{ top: `${(rowIndex / rows) * 90}%` }}
                                >
                                    {Array.from({length: cols}).map((_, colIndex) => (
                                        <div key={colIndex} className="w-1.5 h-1.5 rounded-full bg-white/20 shadow-[0_0_2px_white]"></div>
                                    ))}
                                </div>
                            );
                        })}

                         {/* Active Balls */}
                         {activeBalls.map(ball => (
                            <div 
                                key={ball.id}
                                className="absolute w-3 h-3 bg-red-500 rounded-full shadow-[0_0_10px_red] z-10"
                                style={{
                                    top: `${ball.y}%`, 
                                    left: `calc(50% + ${ball.x}%)`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            ></div>
                        ))}
                    </div>

                    {/* Multipliers */}
                    <div className="flex justify-center gap-1 w-full px-4">
                        {multipliers.map((m, i) => {
                            let color = 'bg-yellow-500';
                            if (m >= 10) color = 'bg-red-500';
                            else if (m >= 2) color = 'bg-orange-500';
                            else if (m < 1) color = 'bg-yellow-900 text-yellow-500';
                            
                            return (
                                <div 
                                    key={i} 
                                    className={`${color} text-[8px] sm:text-[10px] font-bold rounded shadow-lg flex items-center justify-center
                                        transition-all hover:scale-110 h-6 sm:h-8 flex-1 max-w-[40px] text-black
                                    `}
                                >
                                    {m}x
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Overlay for Auto Bet Status */}
                 {isAutoBetting && (
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        {t('game.autobet_active')}
                    </div>
                )}
            </div>

            {/* History Strip (Right) */}
            <div className="w-24 bg-vewire-sidebar rounded-xl border border-vewire-border flex flex-col overflow-hidden hidden lg:flex">
                <div className="p-3 text-xs font-bold text-gray-400 text-center border-b border-vewire-border uppercase">History</div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {history.map((h) => (
                        <div 
                            key={h.id} 
                            className={`
                                animate-in slide-in-from-top-2 duration-300
                                w-full py-2 rounded flex items-center justify-center text-xs font-bold border 
                                ${h.val >= 1 ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-vewire-input text-gray-500 border-vewire-border'}
                            `}
                        >
                            {h.val}x
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default PlinkoGame;