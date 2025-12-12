import { useState, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';

// --- Types & Constants ---
type Suit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A';

interface Card {
  suit: Suit;
  rank: Rank;
  value: number; // 2-10, 10 for JQK, 11 for A (handled dynamically for A)
  index: number; // 0-51 for Deck mapping
}

type GameState = 'BETTING' | 'PLAYING' | 'DEALER_TURN' | 'FINISHED';
type GameResult = 'NONE' | 'WIN' | 'LOSS' | 'PUSH' | 'BLACKJACK' | 'BUST';

const SUITS: Suit[] = ['hearts', 'diamonds', 'clubs', 'spades'];
const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

// --- Helper Functions ---

const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let index = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      let value = parseInt(rank);
      if (['J', 'Q', 'K'].includes(rank)) value = 10;
      if (rank === 'A') value = 11;
      deck.push({ suit, rank, value, index: index++ });
    }
  }
  return deck;
};

const calculateHandValue = (hand: Card[]): number => {
  let value = hand.reduce((acc, card) => acc + card.value, 0);
  let aces = hand.filter(c => c.rank === 'A').length;

  while (value > 21 && aces > 0) {
    value -= 10;
    aces--;
  }
  return value;
};

const getCardSymbol = (suit: Suit) => {
  switch (suit) {
    case 'hearts': return '♥';
    case 'diamonds': return '♦';
    case 'clubs': return '♣';
    case 'spades': return '♠';
  }
};

const getCardColor = (suit: Suit) => {
  return suit === 'hearts' || suit === 'diamonds' ? 'text-red-500' : 'text-gray-900';
};

// --- Component ---

const BlackjackGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  // State
  const [betAmount, setBetAmount] = useState(10);
  const [gameState, setGameState] = useState<GameState>('BETTING');
  const [deck, setDeck] = useState<Card[]>([]);
  const [playerHand, setPlayerHand] = useState<Card[]>([]);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [gameResult, setGameResult] = useState<GameResult>('NONE');
  const [resultMessage, setResultMessage] = useState('');
  
  // Provably Fair Seeds (Local state for simplified demo, normally from parent/context)
  // In a real app, these would come from the server or a global ProvablyFair context
  const [clientSeed] = useState(ProvablyFair.generateClientSeed());
  const [serverSeed] = useState(ProvablyFair.generateServerSeed()); // Should be hidden/hashed
  const [nonce, setNonce] = useState(0);

  // --- Game Actions ---

  const startGame = useCallback(() => {
    if (balance < betAmount) return;

    setBalance(prev => prev - betAmount);
    setGameState('PLAYING');
    setGameResult('NONE');
    setResultMessage('');
    setPlayerHand([]);
    setDealerHand([]);

    // Shuffle Deck using Provably Fair logic
    const newDeck = createDeck();
    // We need 52 floats to shuffle effectively or just enough for max potential cards? 
    // Fisher-Yates shuffle with random floats is standard.
    // We'll generate a list of floats and sort indices based on them for simplicity
    const floats = ProvablyFair.generateFloats(serverSeed, clientSeed, nonce, 52);
    
    // Sort deck based on the float values (deterministic shuffle)
    const shuffledDeck = [...newDeck].sort((a, b) => floats[a.index] - floats[b.index]);
    
    // Deal initial cards
    const pHand = [shuffledDeck[0], shuffledDeck[2]];
    const dHand = [shuffledDeck[1], shuffledDeck[3]];
    
    // Remove dealt cards from deck (effectively moving pointer)
    const remainingDeck = shuffledDeck.slice(4);

    setDeck(remainingDeck);
    setPlayerHand(pHand);
    setDealerHand(dHand);
    setNonce(n => n + 1);

    // Check for Instant Blackjack
    const pVal = calculateHandValue(pHand);
    const dVal = calculateHandValue(dHand); // Note: Only visible card matters for player decision usually, but for instant win check we look at both if dealer has BJ
    
    if (pVal === 21) {
       // Player has Blackjack
       if (dVal === 21) {
           endGame('PUSH', pHand, dHand, betAmount); // Both have BJ
       } else {
           endGame('BLACKJACK', pHand, dHand, betAmount);
       }
    } else if (dVal === 21) {
       // Dealer has Blackjack (and player doesn't)
       // Usually revealed immediately if dealer face up is A/10, but for simplicity:
       // If we follow standard flow, player plays, then dealer reveals. 
       // But efficient games usually check dealer BJ immediately if possible (US style) or after (EU style).
       // We'll do a simple check: If dealer has 21, game over immediately for this lightweight version.
       endGame('LOSS', pHand, dHand, betAmount); 
    }

  }, [balance, betAmount, clientSeed, serverSeed, nonce, setBalance]);


  const hit = () => {
    if (gameState !== 'PLAYING') return;
    
    const newCard = deck[0];
    const newDeck = deck.slice(1);
    const newHand = [...playerHand, newCard];
    
    setPlayerHand(newHand);
    setDeck(newDeck);

    const val = calculateHandValue(newHand);
    if (val > 21) {
        endGame('BUST', newHand, dealerHand, betAmount);
    }
  };

  const stand = () => {
    if (gameState !== 'PLAYING') return;
    setGameState('DEALER_TURN');
    // Trigger dealer play logic (use effect or direct call? direct is safer for logic flow)
    playDealer(dealerHand, deck); 
  };
  
  const double = () => {
      if (gameState !== 'PLAYING' || playerHand.length !== 2) return;
      if (balance < betAmount) return; // Need extra funds
      
      setBalance(prev => prev - betAmount); // Deduct extra bet
      const doubledBet = betAmount * 2;
      
      // Deal one card
      const newCard = deck[0];
      const newDeck = deck.slice(1);
      const newHand = [...playerHand, newCard];
      
      setPlayerHand(newHand);
      setDeck(newDeck);
      
      const val = calculateHandValue(newHand);
      if (val > 21) {
          endGame('BUST', newHand, dealerHand, doubledBet);
      } else {
          // Auto stand after double
          playDealer(dealerHand, newDeck, newHand, doubledBet);
      }
  };

  const playDealer = (currentDealerHand: Card[], currentDeck: Card[], currentPlayerHand: Card[] = playerHand, currentBet: number = betAmount) => {
      let dHand = [...currentDealerHand];
      let dDeck = [...currentDeck];
      let dVal = calculateHandValue(dHand);

      // Dealer hits on soft 17? Let's say Stand on all 17s for simplicity.
      while (dVal < 17) {
          const newCard = dDeck[0];
          dDeck = dDeck.slice(1);
          dHand.push(newCard);
          dVal = calculateHandValue(dHand);
      }

      setDealerHand(dHand); // Update state for visual
      
      // Evaluate Winner
      const pVal = calculateHandValue(currentPlayerHand);
      
      if (dVal > 21) {
          endGame('WIN', currentPlayerHand, dHand, currentBet);
      } else if (dVal > pVal) {
          endGame('LOSS', currentPlayerHand, dHand, currentBet);
      } else if (dVal < pVal) {
          endGame('WIN', currentPlayerHand, dHand, currentBet);
      } else {
          endGame('PUSH', currentPlayerHand, dHand, currentBet);
      }
  };

  const endGame = (result: GameResult, _pHand: Card[], _dHand: Card[], finalBet: number) => {
      setGameState('FINISHED');
      setGameResult(result);
      
      let winAmount = 0;
      let win = false;

      switch (result) {
          case 'BLACKJACK':
              winAmount = finalBet * 2.5; // 3:2 payout + original bet returned
              setResultMessage(`Blackjack! You won $${winAmount.toFixed(2)}`);
              win = true;
              break;
          case 'WIN':
              winAmount = finalBet * 2; // 1:1 payout
              setResultMessage(`You Won $${winAmount.toFixed(2)}`);
              win = true;
              break;
          case 'PUSH':
              winAmount = finalBet; // Return bet
              setResultMessage('Push - Bet Returned');
              win = false; // Technically not a "win" for stats, just a return
              break;
          case 'LOSS':
          case 'BUST':
              winAmount = 0;
              setResultMessage(result === 'BUST' ? 'Busted!' : 'Dealer Wins');
              win = false;
              break;
      }

      if (winAmount > 0) {
          setBalance(prev => prev + winAmount);
      }
      onGameEnd(win, winAmount);
  };

  // --- UI Components ---
  
  const CardView = ({ card, hidden = false }: { card?: Card, hidden?: boolean }) => {
      if (!card && !hidden) return null;
      
      if (hidden) {
          return (
             <div className="w-20 h-28 lg:w-24 lg:h-36 bg-blue-900 rounded-lg border-2 border-blue-400 shadow-xl flex items-center justify-center relative overflow-hidden transform transition-transform hover:-translate-y-2">
                 <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
                 <div className="text-blue-200 text-2xl font-bold">?</div>
             </div>
          );
      }

      return (
          <div className={`w-20 h-28 lg:w-24 lg:h-36 bg-white rounded-lg shadow-xl flex flex-col items-center justify-between p-2 transform transition-transform hover:-translate-y-2 select-none ${getCardColor(card!.suit)}`}>
              <div className="self-start text-lg lg:text-xl font-bold leading-none">{card!.rank}</div>
              <div className="text-3xl lg:text-5xl">{getCardSymbol(card!.suit)}</div>
              <div className="self-end text-lg lg:text-xl font-bold leading-none rotate-180">{card!.rank}</div>
          </div>
      );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-6xl mx-auto">
        {/* Controls Sidebar */}
        <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border} h-fit`}>
            <div>
                <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                    <input 
                        type="number" 
                        min="1" 
                        value={betAmount}
                        disabled={gameState !== 'BETTING' && gameState !== 'FINISHED'}
                        onChange={(e) => setBetAmount(Number(e.target.value))} 
                        className={`w-full ${THEME.input} text-white p-3 pl-8 rounded-lg border ${THEME.border} mt-2 font-mono`} 
                    />
                </div>
                <div className="grid grid-cols-2 gap-2 mt-2">
                        <button 
                            disabled={gameState !== 'BETTING' && gameState !== 'FINISHED'}
                            onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} 
                            className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700 disabled:opacity-50"
                        >½</button>
                        <button 
                            disabled={gameState !== 'BETTING' && gameState !== 'FINISHED'}
                            onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} 
                            className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700 disabled:opacity-50"
                        >2×</button>
                </div>
            </div>

            {gameState === 'BETTING' || gameState === 'FINISHED' ? (
                <button 
                    onClick={startGame}
                    className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-4 hover:brightness-110 transition-all shadow-lg shadow-green-500/20`}
                >
                    {gameState === 'FINISHED' ? 'Play Again' : 'Deal Cards'}
                </button>
            ) : (
               <div className="grid grid-cols-2 gap-3 mt-4">
                   <button onClick={hit} disabled={gameState !== 'PLAYING'} className="bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">HIT</button>
                   <button onClick={stand} disabled={gameState !== 'PLAYING'} className="bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">STAND</button>
                   <button onClick={double} disabled={gameState !== 'PLAYING' || playerHand.length > 2} className="col-span-2 bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-3 rounded-lg shadow-lg disabled:opacity-50">DOUBLE DOWN</button>
               </div>
            )}
        </div>

        {/* Game Table */}
        <div className="flex-1 bg-[#0f1923] rounded-3xl border-8 border-[#2c1a1a] shadow-2xl relative overflow-hidden flex flex-col items-center justify-between py-10 min-h-[500px]">
            {/* Table Felt Texture/Color */}
            <div className="absolute inset-0 bg-green-900 opacity-20 pointer-events-none" style={{backgroundImage: 'radial-gradient(circle, #1a472a 0%, #0f2b19 100%)'}}></div>
            
            {/* Dealer Area */}
            <div className="z-10 flex flex-col items-center gap-4">
                <div className="text-gray-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    Dealer
                    {(gameState === 'FINISHED' || gameState === 'DEALER_TURN') && (
                         <span className="bg-black/50 px-2 py-0.5 rounded text-white">{calculateHandValue(dealerHand)}</span>
                    )}
                </div>
                <div className="flex gap-[-4rem] justify-center">
                    {gameState === 'BETTING' && dealerHand.length === 0 ? (
                        <div className="w-20 h-28 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20">Empty</div>
                    ) : (
                        dealerHand.map((card, i) => (
                            <div key={i} className={i > 0 ? '-ml-12' : ''}>
                                <CardView 
                                    card={card} 
                                    hidden={i === 1 && gameState === 'PLAYING'} 
                                />
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Center Info / Result */}
            <div className="z-20 h-16 flex items-center justify-center">
                {gameState === 'FINISHED' && (
                    <div className={`px-8 py-3 rounded-full text-xl font-black uppercase tracking-widest shadow-2xl animate-bounce ${
                        gameResult === 'WIN' || gameResult === 'BLACKJACK' ? 'bg-green-500 text-black' :
                        gameResult === 'PUSH' ? 'bg-yellow-500 text-black' :
                        'bg-red-500 text-white'
                    }`}>
                        {resultMessage}
                    </div>
                )}
            </div>

            {/* Player Area */}
            <div className="z-10 flex flex-col items-center gap-4">
                 <div className="flex gap-[-4rem] justify-center">
                    {playerHand.length === 0 ? (
                         <div className="w-20 h-28 border-2 border-dashed border-white/20 rounded-lg flex items-center justify-center text-white/20">Empty</div>
                    ) : (
                        playerHand.map((card, i) => (
                             <div key={i} className={i > 0 ? '-ml-12' : ''}>
                                <CardView card={card} />
                            </div>
                        ))
                    )}
                </div>
                <div className="text-gray-400 font-bold uppercase tracking-wider text-sm flex items-center gap-2">
                    Player
                    {playerHand.length > 0 && (
                        <span className="bg-black/50 px-2 py-0.5 rounded text-white">{calculateHandValue(playerHand)}</span>
                    )}
                </div>
            </div>

        </div>
    </div>
  );
};

export default BlackjackGame;
