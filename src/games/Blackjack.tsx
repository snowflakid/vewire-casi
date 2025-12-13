import { useState, useEffect, useCallback, useRef } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { useSettings } from '../context/SettingsContext';

// Types
type Suit = '♠' | '♥' | '♣' | '♦';
type Rank = 'A' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K';

interface Card {
    suit: Suit;
    rank: Rank;
    value: number; 
}

const SUITS: Suit[] = ['♠', '♥', '♣', '♦'];
const RANKS: Rank[] = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const BlackjackGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const { t, playSound } = useSettings();
    const [betAmount, setBetAmount] = useState(10);
    const [playerHand, setPlayerHand] = useState<Card[]>([]);
    const [dealerHand, setDealerHand] = useState<Card[]>([]);
    const [deck, setDeck] = useState<Card[]>([]);
    const [gameState, setGameState] = useState<'BETTING' | 'PLAYING' | 'DEALER_TURN' | 'ENDED'>('BETTING');
    const [message, setMessage] = useState('');
    
    const timeoutRef = useRef<number | null>(null);

    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    const generateDeck = useCallback((gameNonce: number) => {
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

        // Fisher-Yates Shuffle using Provably Fair RNG
        // We need 51 random numbers to shuffle 52 cards (last one falls in place)
        const floats = ProvablyFair.generateFloats(serverSeed, clientSeed, gameNonce, newDeck.length);
        
        for (let i = newDeck.length - 1; i > 0; i--) {
            // floats[i] is 0..1. Scale to 0..i+1
            const j = Math.floor(floats[i] * (i + 1));
            [newDeck[i], newDeck[j]] = [newDeck[j], newDeck[i]];
        }
        
        return newDeck; 
    }, [serverSeed, clientSeed]);

    const calculateScore = useCallback((hand: Card[]) => {
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
    }, []);

    const endGame = useCallback((result: 'BLACKJACK' | 'BUST' | 'PUSH' | 'WIN' | 'LOSE' | 'DEALER_BUST', payout: number = 0) => {
        setGameState('ENDED');
        
        let msg = '';
        let winAmount = 0;

        switch (result) {
            case 'BLACKJACK':
                msg = t('game.blackjack');
                winAmount = payout;
                playSound('win');
                break;
            case 'BUST':
                msg = t('game.bust');
                winAmount = 0;
                playSound('lose');
                break;
            case 'PUSH':
                msg = t('game.push');
                winAmount = payout; // Return bet
                playSound('cashout'); // Neutral sound
                break;
            case 'WIN':
                msg = t('game.you_win');
                winAmount = payout;
                playSound('win');
                break;
            case 'LOSE':
                msg = t('game.dealer_wins');
                winAmount = 0;
                playSound('lose');
                break;
            case 'DEALER_BUST':
                msg = t('game.bust'); // Technically Dealer bust but 'Bust!' works or can use dealer bust key if added
                winAmount = payout;
                playSound('win');
                break;
        }

        setMessage(msg);
        if (winAmount > 0) {
            setBalance(b => b + winAmount);
        }
        onGameEnd(winAmount > 0, winAmount, betAmount);
    }, [setBalance, onGameEnd, betAmount, t, playSound]);

    const deal = () => {
        if (balance < betAmount) {
            playSound('error');
            return;
        }
        playSound('click');
        setBalance(b => b - betAmount);
        
        const currentDeck = generateDeck(nonce);
        setNonce(n => n + 1);
        
        // Safety check
        if (currentDeck.length < 4) return;

        const pHand = [currentDeck.pop()!, currentDeck.pop()!];
        const dHand = [currentDeck.pop()!, currentDeck.pop()!];
        
        setDeck(currentDeck);
        setPlayerHand(pHand);
        setDealerHand(dHand);
        setGameState('PLAYING');
        setMessage('');

        const pScore = calculateScore(pHand);
        const dScore = calculateScore(dHand);

        if (pScore === 21) {
            if (dScore === 21) {
                endGame('PUSH', betAmount);
            } else {
                endGame('BLACKJACK', betAmount * 2.5);
            }
        }
    };

    const hit = () => {
        if (gameState !== 'PLAYING') return;
        playSound('click');
        
        const newDeck = [...deck];
        const card = newDeck.pop();
        
        if (!card) return; // Should not happen

        const newHand = [...playerHand, card];
        
        setDeck(newDeck);
        setPlayerHand(newHand);
        
        if (calculateScore(newHand) > 21) {
            endGame('BUST');
        }
    };

    const evaluateWinner = (pHand: Card[], dHand: Card[], betMult = 1) => {
        const pScore = calculateScore(pHand);
        const dScore = calculateScore(dHand);
        const totalBet = betAmount * betMult;

        if (dScore > 21) {
            endGame('DEALER_BUST', totalBet * 2);
        } else if (pScore > dScore) {
            endGame('WIN', totalBet * 2);
        } else if (pScore === dScore) {
            endGame('PUSH', totalBet);
        } else {
            endGame('LOSE');
        }
    };

    const playDealerTurn = (hand: Card[], currentDeck: Card[], pHand: Card[], betMult: number) => {
        const score = calculateScore(hand);
        
        if (score < 17) {
            timeoutRef.current = setTimeout(() => {
                const newDeck = [...currentDeck];
                const card = newDeck.pop();
                if (card) {
                    playSound('tick'); // Card flip sound
                    const newHand = [...hand, card];
                    setDealerHand(newHand);
                    setDeck(newDeck); // Sync state
                    playDealerTurn(newHand, newDeck, pHand, betMult);
                }
            }, 600) as unknown as number;
        } else {
            evaluateWinner(pHand, hand, betMult);
        }
    };

    const stand = () => {
        if (gameState !== 'PLAYING') return;
        playSound('click');
        setGameState('DEALER_TURN');
        playDealerTurn(dealerHand, deck, playerHand, 1);
    };

    const double = () => {
        if (gameState !== 'PLAYING' || playerHand.length !== 2) return;
        if (balance < betAmount) {
            playSound('error');
            return;
        }
        
        playSound('click');
        setBalance(b => b - betAmount);
        
        const newDeck = [...deck];
        const card = newDeck.pop();
        if (!card) return;

        const newHand = [...playerHand, card];
        
        setDeck(newDeck);
        setPlayerHand(newHand);
        
        const score = calculateScore(newHand);
        if (score > 21) {
            endGame('BUST'); // Lost 2x bet (betAmount already deducted twice)
        } else {
            setGameState('DEALER_TURN');
            playDealerTurn(dealerHand, newDeck, newHand, 2);
        }
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                <div>
                   <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                   <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={gameState !== 'BETTING'} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                </div>
                
                <div className="grid grid-cols-2 gap-2 mt-2">
                     <button onClick={() => setBetAmount(b => b / 2)} disabled={gameState !== 'BETTING'} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                     <button onClick={() => setBetAmount(b => b * 2)} disabled={gameState !== 'BETTING'} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                </div>

                {gameState === 'BETTING' ? (
                    <button onClick={deal} disabled={balance < betAmount} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto hover:scale-105 transition-transform`}>
                        {t('game.deal')}
                    </button>
                ) : (
                    <div className="grid grid-cols-2 gap-2 mt-auto">
                        <button onClick={hit} disabled={gameState !== 'PLAYING'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-lg uppercase">{t('game.hit')}</button>
                        <button onClick={stand} disabled={gameState !== 'PLAYING'} className="bg-red-600 hover:bg-red-500 text-white font-bold py-4 rounded-lg uppercase">{t('game.stand')}</button>
                        <button onClick={double} disabled={gameState !== 'PLAYING' || playerHand.length !== 2 || balance < betAmount} className="col-span-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 rounded-lg uppercase">{t('game.double')}</button>
                    </div>
                )}
                
                {gameState === 'ENDED' && (
                    <button onClick={() => setGameState('BETTING')} className="mt-2 w-full py-4 rounded-lg font-bold text-white border border-white/20 hover:bg-white/10 uppercase">
                        New Game
                    </button>
                )}
            </div>
            
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-between p-8 relative overflow-hidden shadow-inner min-h-[500px]">
                {/* Dealer Hand */}
                <div className="flex flex-col items-center">
                    <div className="text-gray-400 text-xs font-bold uppercase mb-2">{t('game.dealer')} {gameState === 'ENDED' ? calculateScore(dealerHand) : ''}</div>
                    <div className="flex -space-x-4">
                        {dealerHand.map((card, i) => (
                            <CardView key={i} card={card} hidden={i === 0 && gameState === 'PLAYING'} />
                        ))}
                    </div>
                </div>

                {/* Message Overlay */}
                {message && (
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                        <div className="bg-black/80 backdrop-blur-md px-10 py-6 rounded-xl border border-white/20 shadow-2xl animate-in zoom-in duration-300">
                            <h2 className={`text-4xl font-black uppercase tracking-wider ${message.includes('WIN') || message.includes('BLACKJACK') ? 'text-green-500' : message.includes('LOSE') || message.includes('BUST') ? 'text-red-500' : 'text-white'}`}>
                                {message}
                            </h2>
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
                    <div className="text-white font-bold bg-vewire-card px-4 py-1 rounded-full border border-vewire-border shadow-lg">
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
                 <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(255,255,255,0.1)_5px,rgba(255,255,255,0.1)_10px)] opacity-50"></div>
                 <div className="absolute inset-0 flex items-center justify-center text-white/20 font-bold text-2xl">?</div>
            </div>
        );
    }
    
    const isRed = card.suit === '♥' || card.suit === '♦';
    
    return (
        <div className="w-20 h-28 md:w-24 md:h-36 bg-white rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform transition-transform hover:-translate-y-2 select-none border border-gray-200">
            <div className={`self-start text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'}`}>{card.rank}</div>
            <div className={`text-4xl ${isRed ? 'text-red-600' : 'text-black'}`}>{card.suit}</div>
            <div className={`self-end text-lg font-bold ${isRed ? 'text-red-600' : 'text-black'} rotate-180`}>{card.rank}</div>
        </div>
    );
};

export default BlackjackGame;
