import { useState, useEffect, useRef } from 'react';
import type { GameProps } from '../config';
import { Cherry, Gem, Bell, Star, DollarSign, Ban } from 'lucide-react';
import { ProvablyFair } from '../utils/provably-fair';
import { useSettings } from '../context/SettingsContext';

const SYMBOLS = [
    { id: 'CHERRY', icon: Cherry, color: 'text-red-500', weight: 40, payout: 5 },
    { id: 'LEMON', icon: Ban, color: 'text-yellow-400', weight: 30, payout: 10 },
    { id: 'BELL', icon: Bell, color: 'text-yellow-600', weight: 20, payout: 20 },
    { id: 'STAR', icon: Star, color: 'text-purple-500', weight: 15, payout: 50 },
    { id: 'DIAMOND', icon: Gem, color: 'text-cyan-400', weight: 10, payout: 100 },
    { id: 'SEVEN', icon: DollarSign, color: 'text-green-500', weight: 5, payout: 500 },
];

const REEL_COUNT = 3;
const SPIN_DURATION = 1000;

export default function SlotsGame({ balance, setBalance, onGameEnd }: GameProps) {
    const { t, playSound } = useSettings();
    const [reels, setReels] = useState<number[]>([0, 0, 0]); 
    const [isSpinning, setIsSpinning] = useState(false);
    const [betAmount, setBetAmount] = useState(10);
    const [winAmount, setWinAmount] = useState(0);

    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    // Track stopping status for each reel to remove blur
    const [stoppedReels, setStoppedReels] = useState<boolean[]>([true, true, true]);

    const spinIntervals = useRef<number[]>([]);

    const getSymbolFromFloat = (float: number) => {
        const totalWeight = SYMBOLS.reduce((sum, s) => sum + s.weight, 0);
        let random = float * totalWeight;
        for (let i = 0; i < SYMBOLS.length; i++) {
            if (random < SYMBOLS[i].weight) return i;
            random -= SYMBOLS[i].weight;
        }
        return 0;
    };

    const spin = () => {
        if (balance < betAmount || isSpinning) {
            playSound('error');
            return;
        }
        
        playSound('click');
        setIsSpinning(true);
        setWinAmount(0);
        setStoppedReels([false, false, false]);
        setBalance(prev => prev - betAmount);

        // Predetermine result using PF
        const floats = ProvablyFair.generateFloats(serverSeed, clientSeed, nonce, 3);
        setNonce(n => n + 1);

        const finalReels = [
            getSymbolFromFloat(floats[0]),
            getSymbolFromFloat(floats[1]),
            getSymbolFromFloat(floats[2])
        ];
        
        // Start animation
        const newIntervals: number[] = [];
        for (let i = 0; i < REEL_COUNT; i++) {
            const interval = setInterval(() => {
                setReels(prev => {
                    const next = [...prev];
                    next[i] = Math.floor(Math.random() * SYMBOLS.length); // Visual shuffle
                    return next;
                });
            }, 80); // Fast cycle
            newIntervals.push(Number(interval));
        }
        spinIntervals.current = newIntervals;

        // Sequence stopping
        finalReels.forEach((finalIndex, i) => {
            setTimeout(() => {
                clearInterval(spinIntervals.current[i]);
                playSound('tick'); // Reel stop sound
                setReels(prev => {
                    const next = [...prev];
                    next[i] = finalIndex;
                    return next;
                });
                setStoppedReels(prev => {
                    const next = [...prev];
                    next[i] = true;
                    return next;
                });

                if (i === REEL_COUNT - 1) {
                    checkWin(finalReels);
                }
            }, SPIN_DURATION + (i * 500));
        });
    };

    const checkWin = (finalReels: number[]) => {
        setIsSpinning(false);
        const s1 = SYMBOLS[finalReels[0]];
        const s2 = SYMBOLS[finalReels[1]];
        const s3 = SYMBOLS[finalReels[2]];

        let winMult = 0;

        // 3 matching
        if (s1.id === s2.id && s2.id === s3.id) {
            winMult = s1.payout;
        } 
        // 2 matching (simple logic: any pair pays 2x?)
        // Let's say 2 Cherries pay 2x
        else if ((s1.id === 'CHERRY' && s2.id === 'CHERRY') || (s1.id === 'CHERRY' && s3.id === 'CHERRY') || (s2.id === 'CHERRY' && s3.id === 'CHERRY')) {
            winMult = 2;
        }

        const win = betAmount * winMult;
        setWinAmount(win);
        if (win > 0) {
            setBalance(prev => prev + win);
            onGameEnd(true, win, betAmount);
            playSound('win');
        } else {
            onGameEnd(false, 0, betAmount);
            playSound('lose');
        }
    };

    // Cleanup
    useEffect(() => {
        return () => spinIntervals.current.forEach(clearInterval);
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-full gap-8 animate-in fade-in duration-500">
             <div className="bg-vewire-card p-8 rounded-2xl border-4 border-vewire-accent shadow-[0_0_50px_rgba(0,231,1,0.1)] flex gap-4 relative">
                 {/* Decorative Top */}
                 <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-vewire-accent text-black px-4 py-1 rounded-full font-bold text-xs uppercase tracking-widest shadow-lg">
                     {t('game.lucky_spinner')}
                 </div>

                 {reels.map((symbolIndex, i) => {
                     const Symbol = SYMBOLS[symbolIndex];
                     return (
                         <div key={i} className="w-24 h-32 bg-vewire-input border-2 border-vewire-border rounded-lg flex items-center justify-center overflow-hidden relative shadow-inner">
                             <div className={`transition-all duration-200 transform ${!stoppedReels[i] ? 'blur-sm scale-110 motion-safe:animate-pulse' : 'scale-100'}`}>
                                <Symbol.icon size={48} className={Symbol.color} />
                             </div>
                             <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/20 pointer-events-none"></div>
                         </div>
                     );
                 })}
             </div>

             <div className="text-center h-16 flex items-center justify-center">
                 {winAmount > 0 ? (
                     <div className="text-4xl font-black text-yellow-500 animate-bounce drop-shadow-[0_0_10px_rgba(234,179,8,0.5)]">
                         {t('game.you_win')} ${winAmount.toFixed(2)}
                     </div>
                 ) : (
                     <div className="text-gray-500 font-mono text-sm">
                         {isSpinning ? t('game.good_luck') : "Match 3 Symbols to Win Big!"}
                     </div>
                 )}
             </div>

             <div className="flex flex-col gap-4 w-full max-w-md">
                 <div className="flex items-center gap-4 bg-vewire-card p-4 rounded-xl border border-vewire-border">
                     <span className="text-gray-400 font-bold uppercase text-xs">{t('game.bet_amount')}</span>
                     <div className="relative w-full">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-vewire-accent">$</span>
                        <input 
                            type="number" 
                            value={betAmount} 
                            onChange={(e) => setBetAmount(Number(e.target.value))}
                            className="bg-vewire-input text-white p-2 pl-6 rounded w-full font-mono text-right border border-vewire-border focus:border-vewire-accent outline-none"
                            disabled={isSpinning}
                        />
                     </div>
                 </div>
                 
                 <div className="grid grid-cols-4 gap-2">
                     {[10, 50, 100, 500].map(amt => (
                         <button 
                            key={amt}
                            onClick={() => { playSound('click'); setBetAmount(amt); }}
                            disabled={isSpinning}
                            className="bg-vewire-input hover:bg-vewire-card text-gray-400 text-xs font-bold py-2 rounded border border-vewire-border"
                         >
                             ${amt}
                         </button>
                     ))}
                 </div>

                 <button 
                    onClick={spin} 
                    disabled={isSpinning || balance < betAmount}
                    className={`w-full py-4 rounded-xl font-bold text-2xl uppercase tracking-widest shadow-lg transform transition-all active:scale-95 flex items-center justify-center gap-2 ${
                        isSpinning || balance < betAmount
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                        : 'bg-vewire-accent text-black hover:brightness-110 hover:shadow-[0_0_20px_rgba(0,231,1,0.5)]'
                    }`}
                 >
                     {isSpinning ? '...' : t('game.spin')}
                 </button>
             </div>
        </div>
    );
}
