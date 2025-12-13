import { useState } from 'react';
import { THEME, type GameProps } from '../config';
import { ArrowUp, ArrowDown } from 'lucide-react';
import { ProvablyFair } from '../utils/provably-fair';
import { useSettings } from '../context/SettingsContext';

// Card suits and values
const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
const VALUES = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14 // A is High
};

interface Card {
    rank: string;
    suit: string;
    value: number;
    color: string;
}

const HiLoGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const { t, playSound } = useSettings();
    const [betAmount, setBetAmount] = useState(10);
    // const [isPlaying, setIsPlaying] = useState(false);
    const [currentCard, setCurrentCard] = useState<Card | null>(null);
    const [history, setHistory] = useState<Card[]>([]);
    
    // Game State
    // "betting" = placing initial bet
    // "playing" = guessing higher/lower
    const [gameState, setGameState] = useState<'BETTING' | 'PLAYING'>('BETTING');
    const [roundWinnings, setRoundWinnings] = useState(0); // Accumulated multiplier/winnings? usually you cash out.
    // Let's implement simpler: Bet -> Card Shown -> Guess -> Win/Lose immediately or Stack?
    // Stake HiLo: You bet, card shown. You guess High or Low. If correct, you can cash out or continue.
    
    // We will do: Bet -> Start -> Card 1.
    // Loop: Guess -> Card N. Correct? Multiplier UP. Wrong? Lose all. Cashout anytime.
    
    const [multiplier, setMultiplier] = useState(1.0);
    
    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const generateCard = (offset: number) => {
        // Generate float
        const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce + offset);
        // Map to 52 cards
        const index = Math.floor(float * 52);
        
        const suitIdx = Math.floor(index / 13);
        const rankIdx = index % 13;
        
        const rank = RANKS[rankIdx];
        const suit = SUITS[suitIdx];
        const color = (suit === '♥' || suit === '♦') ? 'text-red-500' : 'text-black';
        
        return {
            rank,
            suit,
            value: VALUES[rank as keyof typeof VALUES],
            color
        };
    };

    const startGame = () => {
        if (balance < betAmount) {
            playSound('error');
            return;
        }
        playSound('click');
        setBalance(b => b - betAmount);
        setGameState('PLAYING');
        // setIsPlaying(true);
        setRoundWinnings(betAmount);
        setMultiplier(1.0);
        
        // Draw First Card
        const card = generateCard(0);
        setCurrentCard(card);
        setHistory([card]);
        setNonce(n => n + 1);
    };

    // Probabilities
    const getProbabilities = (currentVal: number) => {
        // 13 Ranks.
        // Higher than X: (14 - X) cards.
        // Lower than X: (X - 2) cards.
        // Same: 1 card.
        
        const pHigh = (14 - currentVal) / 13;
        const pLow = (currentVal - 2) / 13;
        const pSame = 1 / 13;
        
        // House Edge 1%
        const houseEdge = 0.99;
        
        const multHigh = pHigh > 0 ? (houseEdge / pHigh) : 0;
        const multLow = pLow > 0 ? (houseEdge / pLow) : 0;
        const multSame = houseEdge / pSame; // 12.87x
        
        return { high: multHigh, low: multLow, same: multSame };
    };

    const guess = (prediction: 'HI' | 'LO' | 'SAME') => {
        if (!currentCard || gameState !== 'PLAYING') return;
        playSound('click');

        const nextCard = generateCard(0); // New random draw
        setNonce(n => n + 1);
        
        // Calculate result
        let won = false;
        if (prediction === 'HI' && nextCard.value > currentCard.value) won = true;
        else if (prediction === 'LO' && nextCard.value < currentCard.value) won = true;
        else if (prediction === 'SAME' && nextCard.value === currentCard.value) won = true;
        // Some versions: Same pushes? Or Same loses if you didn't bet same?
        // Let's say: If you bet HI/LO and it's SAME, you lose (unless special rule).
        // Standard crypto HiLo: Same Card usually loses if betting Hi/Lo.
        
        // Update State
        setCurrentCard(nextCard);
        setHistory(prev => [nextCard, ...prev]);

        if (won) {
             playSound('tick');
             const probs = getProbabilities(currentCard.value);
             let factor = 1;
             if(prediction === 'HI') factor = probs.high;
             if(prediction === 'LO') factor = probs.low;
             if(prediction === 'SAME') factor = probs.same;
             
             const newMult = multiplier * factor;
             setMultiplier(newMult);
             setRoundWinnings(betAmount * newMult);
        } else {
            // Loss
            playSound('lose');
            setGameState('BETTING');
            // setIsPlaying(false);
            onGameEnd(false, 0, betAmount);
        }
    };

    const cashout = () => {
        playSound('cashout');
        setBalance(b => b + roundWinnings);
        setGameState('BETTING');
        // setIsPlaying(false);
        onGameEnd(true, roundWinnings, betAmount);
        playSound('win');
    };

    const probs = currentCard ? getProbabilities(currentCard.value) : { high: 0, low: 0, same: 0 };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                
                {gameState === 'BETTING' ? (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                           <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                                <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                           </div>
                        </div>
                        <button onClick={startGame} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:opacity-90 transition-all`}>
                            {t('game.bet')}
                        </button>
                    </>
                ) : (
                    <div className="flex flex-col gap-4 h-full">
                         <div className="text-center">
                             <div className="text-gray-400 text-xs font-bold uppercase">{t('game.current_win')}</div>
                             <div className="text-2xl font-bold text-green-500">${roundWinnings.toFixed(2)}</div>
                             <div className="text-xs text-gray-500">{multiplier.toFixed(2)}x</div>
                         </div>
                         
                         <div className="grid grid-cols-2 gap-2 mt-auto">
                             <button 
                                onClick={() => guess('HI')}
                                disabled={probs.high === 0}
                                className="bg-vewire-input hover:bg-vewire-card p-3 rounded-lg flex flex-col items-center gap-1 disabled:opacity-50 border border-vewire-border"
                             >
                                 <span className="text-xs font-bold text-gray-400">{t('game.higher')}</span>
                                 <span className="text-white font-bold">{probs.high.toFixed(2)}x</span>
                                 <ArrowUp size={16} />
                             </button>
                             <button 
                                onClick={() => guess('LO')}
                                disabled={probs.low === 0}
                                className="bg-vewire-input hover:bg-vewire-card p-3 rounded-lg flex flex-col items-center gap-1 disabled:opacity-50 border border-vewire-border"
                             >
                                 <span className="text-xs font-bold text-gray-400">{t('game.lower')}</span>
                                 <span className="text-white font-bold">{probs.low.toFixed(2)}x</span>
                                 <ArrowDown size={16} />
                             </button>
                         </div>
                         
                         <button 
                            onClick={() => guess('SAME')}
                            className="bg-vewire-input hover:bg-vewire-card p-3 rounded-lg flex items-center justify-between px-4 border border-vewire-border"
                         >
                             <span className="text-xs font-bold text-gray-400">{t('game.same')}</span>
                             <span className="text-white font-bold">{probs.same.toFixed(2)}x</span>
                         </button>

                         <button onClick={cashout} className="bg-green-500 hover:bg-green-400 text-black font-bold py-4 rounded-lg uppercase mt-4">
                             {t('game.cashout')}
                         </button>
                    </div>
                )}
            </div>
            
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-center p-8 relative overflow-hidden">
                {currentCard ? (
                    <div className="flex flex-col items-center">
                         {/* Card Display */}
                         <div className="relative w-48 h-72 bg-white rounded-2xl shadow-2xl flex flex-col items-center justify-between p-4 animate-in zoom-in duration-300">
                             <div className={`text-4xl font-bold self-start ${currentCard.color}`}>{currentCard.rank}</div>
                             <div className={`text-8xl ${currentCard.color}`}>{currentCard.suit}</div>
                             <div className={`text-4xl font-bold self-end ${currentCard.color} rotate-180`}>{currentCard.rank}</div>
                         </div>
                         
                         {/* Probability indicators */}
                         {gameState === 'PLAYING' && (
                             <div className="flex justify-between w-64 mt-8">
                                 <div className="text-center">
                                     <div className="text-xs uppercase font-bold text-gray-500">{t('game.lower')}</div>
                                     <div className="text-white font-bold">{((probs.low > 0 ? 0.99/probs.low : 0) * 100).toFixed(0)}%</div>
                                 </div>
                                 <div className="text-center">
                                     <div className="text-xs uppercase font-bold text-gray-500">{t('game.higher')}</div>
                                     <div className="text-white font-bold">{((probs.high > 0 ? 0.99/probs.high : 0) * 100).toFixed(0)}%</div>
                                 </div>
                             </div>
                         )}
                    </div>
                ) : (
                    <div className="w-48 h-72 border-4 border-dashed border-vewire-border rounded-2xl flex items-center justify-center">
                        <span className="text-gray-500 font-bold text-2xl">HI-LO</span>
                    </div>
                )}

                {/* History */}
                <div className="absolute top-8 right-8 flex gap-[-20px]">
                    {history.slice(1, 6).map((c, i) => (
                        <div key={i} className="w-12 h-16 bg-white rounded shadow border border-gray-300 flex items-center justify-center text-xs -ml-4 transform hover:-translate-y-2 transition-transform">
                             <span className={c.color}>{c.rank}{c.suit}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HiLoGame;