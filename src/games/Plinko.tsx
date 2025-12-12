import { useState, useEffect, useRef } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { PLINKO_CONFIG } from './plinko-data';

interface ActiveBall {
    id: number;
    path: number[]; // -1 for left, 1 for right
    startTime: number;
    // Current rendered position
    x: number;
    y: number;
}

const PlinkoGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [betAmount, setBetAmount] = useState(10);
    const [rows, setRows] = useState<number>(16);
    const [risk, setRisk] = useState<'LOW' | 'MEDIUM' | 'HIGH'>('MEDIUM');
    const [history, setHistory] = useState<{ val: number; id: number }[]>([]);
    const [activeBalls, setActiveBalls] = useState<ActiveBall[]>([]);

    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const multipliers = PLINKO_CONFIG[rows as keyof typeof PLINKO_CONFIG][risk];
    
    // Animation Loop
    const requestRef = useRef<number>(0);
    
    // Track processed balls to avoid double-processing in Strict Mode
    const processedBalls = useRef(new Set<number>());

    const animate = () => {
        // Update balls
        setActiveBalls(prevBalls => {
            const nextBalls: ActiveBall[] = [];
            const now = performance.now();

            prevBalls.forEach(ball => {
                const elapsed = now - ball.startTime;
                
                // Physics: Gravity Model y = t^1.8
                const factor = 400; // time factor
                const visualRow = Math.pow(elapsed / factor, 1.8); 
                
                // Calculate max width for the current visualRow
                const stepWidthPercent = 100 / (rows + 4); 

                if (visualRow < rows) {
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
                        y: (visualRow / rows) * 90
                    });
                } else {
                    // Finished
                    
                    // Prevent double processing in Strict Mode
                    if (!processedBalls.current.has(ball.id)) {
                        processedBalls.current.add(ball.id);
                        
                        const rights = ball.path.filter(p => p === 1).length;
                        const resultMult = multipliers[rights];
                        const win = betAmount * resultMult; 

                        // Trigger side effects
                        setBalance(b => b + win);
                        // Add to history (keep last 50)
                        setHistory(prev => [{ val: resultMult, id: ball.id }, ...prev].slice(0, 50));
                        onGameEnd(win >= betAmount, win);

                        // Cleanup processed ID after delay
                        setTimeout(() => {
                             processedBalls.current.delete(ball.id);
                        }, 2000);
                    }
                }
            });
            
            return nextBalls;
        });
        
        requestRef.current = requestAnimationFrame(animate);
    };

    useEffect(() => {
        setActiveBalls([]); 
        requestRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(requestRef.current);
    }, [rows, multipliers, betAmount]); 

    const dropBall = () => {
        if (balance < betAmount) return;
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
            y: 0
        }]);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full max-h-[calc(100vh-100px)]">
            {/* Controls (Left) */}
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border} h-full overflow-y-auto`}>
                <div>
                   <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                   <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <label className="text-gray-400 text-xs font-bold uppercase">Rows</label>
                        <select 
                            value={rows} 
                            onChange={(e) => setRows(Number(e.target.value))}
                            className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                        >
                            {Object.keys(PLINKO_CONFIG).map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-gray-400 text-xs font-bold uppercase">Risk</label>
                        <select 
                            value={risk} 
                            onChange={(e) => setRisk(e.target.value as any)}
                            className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
                        >
                            <option value="LOW">Low</option>
                            <option value="MEDIUM">Medium</option>
                            <option value="HIGH">High</option>
                        </select>
                    </div>
                </div>

                <div className="bg-[#0f141d] p-2 rounded text-[10px] text-gray-500 font-mono break-all">
                    Seed Hash: {ProvablyFair.hashSeed(serverSeed).substring(0, 15)}...
                </div>

                <button onClick={dropBall} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:opacity-90 active:scale-95 transition-all`}>
                    Drop Ball
                </button>
            </div>
            
            {/* Game Board (Center) */}
            <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-4 relative overflow-hidden">
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
            </div>

            {/* History Strip (Right) */}
            <div className="w-24 bg-[#1a202c] rounded-xl border border-gray-800 flex flex-col overflow-hidden hidden lg:flex">
                <div className="p-3 text-xs font-bold text-gray-400 text-center border-b border-gray-800 uppercase">History</div>
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-2">
                    {history.map((h) => (
                        <div 
                            key={h.id} 
                            className={`
                                animate-in slide-in-from-top-2 duration-300
                                w-full py-2 rounded flex items-center justify-center text-xs font-bold border 
                                ${h.val >= 1 ? 'bg-green-500/20 text-green-500 border-green-500/50' : 'bg-gray-700/50 text-gray-500 border-gray-700'}
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