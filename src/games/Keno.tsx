import { useState } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { getKenoPayout } from './plinko-data'; // Reusing file for simplicity

const KenoGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [selected, setSelected] = useState<number[]>([]);
    const [drawn, setDrawn] = useState<number[]>([]);
    const [betAmount, setBetAmount] = useState(10);
    const [risk, setRisk] = useState<'CLASSIC' | 'LOW' | 'HIGH'>('CLASSIC');
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const toggleNumber = (n: number) => {
        if (isPlaying) return;
        if (selected.includes(n)) {
            setSelected(selected.filter(s => s !== n));
        } else {
            if (selected.length < 10) setSelected([...selected, n]);
        }
    };

    const play = () => {
        if (balance < betAmount || selected.length === 0) return;
        setBalance(b => b - betAmount);
        setIsPlaying(true);
        setDrawn([]);

        // Provably Fair Draw
        // We need 10 unique numbers from 1-40.
        // We generate floats and map them.
        // Rejection sampling is easiest for unique numbers.
        const result: number[] = [];
        let currentNonceOffset = 0;
        
        // Safety loop to find 10 unique numbers
        while(result.length < 10) {
             const floats = ProvablyFair.generateFloats(serverSeed, clientSeed, nonce + currentNonceOffset, 5); // batch 5
             currentNonceOffset++;
             
             for(const f of floats) {
                 const n = Math.floor(f * 40) + 1;
                 if(!result.includes(n)) {
                     result.push(n);
                     if(result.length === 10) break;
                 }
             }
        }
        setNonce(n => n + currentNonceOffset); // Advance nonce significantly

        // Animate drawing
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
                
                if (multiplier > 0) {
                    const win = betAmount * multiplier;
                    setBalance(b => b + win);
                    onGameEnd(true, win);
                } else {
                    onGameEnd(false, 0);
                }
            }
        }, 100);
    };

    const payouts = getKenoPayout(selected.length, risk);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                <div>
                   <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                   <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
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
                
                {/* Payout Table visualization */}
                <div className="bg-[#0f141d] p-3 rounded-lg border border-gray-800 text-xs">
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

                <button 
                    onClick={play} 
                    disabled={isPlaying || selected.length === 0} 
                    className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto disabled:opacity-50 hover:scale-105 transition-transform`}
                >
                    Bet
                </button>
            </div>
            
            <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex items-center justify-center p-6">
                <div className="grid grid-cols-8 gap-2 w-full max-w-2xl">
                    {Array.from({length: 40}, (_, i) => i + 1).map(n => {
                        const isSelected = selected.includes(n);
                        const isDrawn = drawn.includes(n);
                        const isHit = isSelected && isDrawn;
                        
                        let bg = 'bg-[#1a202c]';
                        if (isHit) bg = 'bg-green-500 text-black shadow-[0_0_10px_#00E701] scale-110 z-10';
                        else if (isDrawn) bg = 'bg-red-500/50 text-white';
                        else if (isSelected) bg = 'bg-white text-black';
                        
                        return (
                            <button
                                key={n}
                                onClick={() => toggleNumber(n)}
                                disabled={isPlaying}
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
            </div>
        </div>
    );
};

export default KenoGame;