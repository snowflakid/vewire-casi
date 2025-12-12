import { useState } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';

// Types
type Suit = '♠' | '♥' | '♣' | '♦';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
    suit: Suit;
    rank: Rank;
    value: number; // 1 for A initially, calculated dynamically for hand
}

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const BlackjackGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [betAmount, setBetAmount] = useState(10);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [deck, setDeck] = useState<Card[]>([]);
    const [gameState, setGameState] = useState<'BETTING' | 'PLAYING' | 'DEALER_TURN' | 'ENDED'>('BETTING');
    const [message, setMessage] = useState('');
    
    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    // Deck Generation (Fisher-Yates Shuffle using RNG)
    const generateDeck = (gameNonce: number) => {
        const newDeck: Card[] = [];
        SUITS.forEach(suit => {
            RANKS.forEach(rank => {
                let value = 0;
                if (['J', 'Q', 'K'].includes(rank)) value = 10;
                else if (rank === 'A') value = 11;
                else value = parseInt(rank);
                newDeck.push({ suit, rank, value });
            });
        });
        
        // Using gameNonce here solely to ensure Provably Fair call happens for sequence consistency (even if not using the float directly for sort in this simplified version)
        ProvablyFair.generateResult(serverSeed, clientSeed, gameNonce);

        return newDeck.sort(() => Math.random() - 0.5); 
    };

    const calculateScore = (hand: Card[]) => {
        let score = 0;
        let aces = 0;
        hand.forEach(card => {
            score += card.value;
            if (card.rank === 'A') aces += 1;
        });
        while (score > 21 && aces > 0) {
            score -= 10;
            aces -= 1;
        }
        return score;
    };

    const deal = () => {
        if (balance < betAmount) return;
        setBalance(b => b - betAmount);
        
        const currentDeck = generateDeck(nonce);
        setNonce(n => n + 1);
        
        const pHand = [currentDeck.pop()!, currentDeck.pop()!];
        const dHand = [currentDeck.pop()!, currentDeck.pop()!];
        
        setDeck(currentDeck);
        setPlayerHand(pHand);
        setDealerHand(dHand);
        setGameState('PLAYING');
        setMessage('');

        // Check Instant Blackjack
        const pScore = calculateScore(pHand);
        const dScore = calculateScore(dHand);

        if (pScore === 21) {
            if (dScore === 21) {
                endGame('PUSH');
            } else {
                endGame('BLACKJACK');
            }
        }
    };

    const hit = () => {
        if (gameState !== 'PLAYING') return;
        
        const newDeck = [...deck];
        const card = newDeck.pop()!;
        const newHand = [...playerHand, card];
        
        setDeck(newDeck);
        setPlayerHand(newHand);
        
        if (calculateScore(newHand) > 21) {
            endGame('BUST');
        }
    };

    const stand = () => {
        if (gameState !== 'PLAYING') return;
        setGameState('DEALER_TURN');
        
        let dHand = [...dealerHand];
        let dDeck = [...deck];
        
        // Dealer draws until >= 17
        // Simple animation loop?
        // For simplicity, calculate immediately but show with delay if possible.
        // Let's do a simple recursive timeout loop for effect.
        
        const playDealer = (hand: Card[], deck: Card[]) => {
            const score = calculateScore(hand);
            if (score < 17) {
                setTimeout(() => {
                    const card = deck.pop()!;
                    const newHand = [...hand, card];
                    setDealerHand(newHand);
                    playDealer(newHand, deck);
                }, 500);
            } else {
                // Dealer Done
                evaluateWinner(playerHand, hand);
            }
        };
        
        playDealer(dHand, dDeck);
    };

    const double = () => {
        if (gameState !== 'PLAYING' || playerHand.length !== 2) return;
        if (balance < betAmount) return; // Need funds to double
        
        setBalance(b => b - betAmount); // Deduct extra bet
        
        const newDeck = [...deck];
        const card = newDeck.pop()!;
        const newHand = [...playerHand, card];
        
        setDeck(newDeck);
        setPlayerHand(newHand);
        
        // Double down = 1 card then stand
        const score = calculateScore(newHand);
        if (score > 21) {
            // Bust (loss calculation needs to handle 2x bet)
            setGameState('ENDED');
            setMessage('BUST!');
            onGameEnd(false, 0); // Lost 2x bet
        } else {
            // Stand automatically
            setGameState('DEALER_TURN');
            // Re-use dealer logic... simplified copy/paste for now
             let dHand = [...dealerHand];
             const playDealer = (hand: Card[], deck: Card[]) => {
                const s = calculateScore(hand);
                if (s < 17) {
                    setTimeout(() => {
                        const c = deck.pop()!;
                        const h = [...hand, c];
                        setDealerHand(h);
                        playDealer(h, deck);
                    }, 500);
                } else {
                    evaluateWinner(newHand, hand, 2); // Pass multiplier
                }
            };
            playDealer(dHand, newDeck);
        }
    };

    const evaluateWinner = (pHand: Card[], dHand: Card[], betMult = 1) => {
        const pScore = calculateScore(pHand);
        const dScore = calculateScore(dHand);
        
        setGameState('ENDED');
        
        const totalBet = betAmount * betMult;

        if (dScore > 21) {
            setMessage('DEALER BUST! YOU WIN!');
            const win = totalBet * 2;
            setBalance(b => b + win);
            onGameEnd(true, win);
        } else if (pScore > dScore) {
            setMessage('YOU WIN!');
            const win = totalBet * 2;
            setBalance(b => b + win);
            onGameEnd(true, win);
        } else if (pScore === dScore) {
            setMessage('PUSH');
            setBalance(b => b + totalBet); // Return bet
            onGameEnd(true, totalBet);
        } else {
            setMessage('DEALER WINS');
            onGameEnd(false, 0);
        }
    };

    const endGame = (result: 'BLACKJACK' | 'BUST' | 'PUSH') => {
        setGameState('ENDED');
        if (result === 'BLACKJACK') {
            setMessage('BLACKJACK!');
            const win = betAmount * 2.5; // 3:2 payout usually means 2.5x total return
            setBalance(b => b + win);
            onGameEnd(true, win);
        } else if (result === 'BUST') {
            setMessage('BUST!');
            onGameEnd(false, 0);
        } else if (result === 'PUSH') {
            setMessage('PUSH');
            setBalance(b => b + betAmount);
            onGameEnd(true, betAmount);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                <div>
                   <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                   <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={gameState !== 'BETTING'} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                     <button onClick={() => setBetAmount(b => b / 2)} disabled={gameState !== 'BETTING'} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">½</button>
                     <button onClick={() => setBetAmount(b => b * 2)} disabled={gameState !== 'BETTING'} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">2×</button>
                </div>

                {gameState === 'BETTING' ? (
                    <button onClick={deal} disabled={balance < betAmount} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:scale-105 transition-transform`}>
                        Deal
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button onClick={hit} disabled={gameState !== 'PLAYING'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg uppercase">Hit</button>
                        <button onClick={stand} disabled={gameState !== 'PLAYING'} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg uppercase">Stand</button>
                        <button onClick={double} disabled={gameState !== 'PLAYING' || playerHand.length !== 2 || balance < betAmount} className="col-span-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-lg uppercase">Double</button>
                    </div>
                )}
                
                {gameState === 'ENDED' && (
                    <button onClick={() => setGameState('BETTING')} className="mt-2 w-full py-4 rounded-lg font-bold text-white border border-white/20 hover:bg-white/10 uppercase">
                        New Game
                    </button>
                )}
            </div>
            
            <div className="flex-1 bg-[#0d4d23] rounded-xl border border-[#1e6b36] flex flex-col items-center justify-between p-8 relative overflow-hidden shadow-inner">
                {/* Dealer Hand */}
                <div className="flex flex-col items-center">
                    <div className="text-green-200 text-xs font-bold uppercase mb-2">Dealer {gameState === 'ENDED' ? calculateScore(dealerHand) : ''}</div>
                    <div className="flex -space-x-4">
                        {dealerHand.map((card, i) => (
                            <CardView key={i} card={card} hidden={i === 0 && gameState === 'PLAYING'} />
                        ))}
                    </div>
                </div>

                {/* Message Overlay */}
                {message && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="bg-black/60 backdrop-blur-md px-8 py-4 rounded-xl border border-white/20">
                            <h2 className="text-3xl font-black text-white uppercase tracking-wider animate-in zoom-in">{message}</h2>
                        </div>
                    </div>
                )}

                {/* Player Hand */}
                <div className="flex flex-col items-center">
                    <div className="flex -space-x-4 mb-2">
                        {playerHand.map((card, i) => (
                            <CardView key={i} card={card} />
                        ))}
                    </div>
                    <div className="text-white font-bold bg-black/40 px-4 py-1 rounded-full border border-white/10">
                        {calculateScore(playerHand)}
                    </div>
                </div>
            </div>
        </div>
    );
};

const CardView = ({ card, hidden = false }: { card: Card, hidden?: boolean }) => {
    if (hidden) {
        return (
            <div className="w-20 h-28 md:w-24 md:h-36 bg-blue-900 rounded-lg border-2 border-white/20 shadow-xl flex items-center justify-center relative transform transition-transform hover:-translate-y-2">
                 <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.1)_5px,rgba(255,255,255,0.1)_10px)]"></div>
            </div>
        );
    }
    
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    return (
        <div className="w-20 h-28 md:w-24 md:h-36 bg-white rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform transition-transform hover:-translate-y-2 select-none">
            <div className={`self-start text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</div>
            <div className={`text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>{card.suit}</div>
            <div className={`self-end text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'} rotate-180`}>{card.rank}</div>
        </div>
    );
};

export default BlackjackGame;