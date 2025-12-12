import { useState } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';

const RouletteGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [betAmount, setBetAmount] = useState(10);
    const [selectedBets, setSelectedBets] = useState<string[]>([]);
    const [isSpinning, setIsSpinning] = useState(false);
    const [lastNumber, setLastNumber] = useState<number | null>(null);

    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const RED_NUMBERS = [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36];
    
    const getColor = (n: number) => {
        if (n === 0) return 'green';
        return RED_NUMBERS.includes(n) ? 'red' : 'black';
    };

    const toggleBet = (bet: string) => {
        if (isSpinning) return;
        if (selectedBets.includes(bet)) {
            setSelectedBets(prev => prev.filter(b => b !== bet));
        } else {
            setSelectedBets(prev => [...prev, bet]);
        }
    };

    const spin = () => {
        const totalWager = betAmount * selectedBets.length;
        if (balance < totalWager || selectedBets.length === 0) return;
        
        setBalance(b => b - totalWager);
        setIsSpinning(true);
        setLastNumber(null);

        const resultFloat = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
        setNonce(n => n + 1);
        const result = Math.floor(resultFloat * 37); 

        setTimeout(() => {
            setLastNumber(result);
            setIsSpinning(false);
            
            let totalWin = 0;
            const winningColor = getColor(result);
            // 1st 12: 1-12, 2nd: 13-24, 3rd: 25-36
            
            selectedBets.forEach(bet => {
                let multiplier = 0;
                
                // Logic Table
                if (bet === 'red' && winningColor === 'red') multiplier = 2;
                else if (bet === 'black' && winningColor === 'black') multiplier = 2;
                else if (bet === 'even' && result !== 0 && result % 2 === 0) multiplier = 2;
                else if (bet === 'odd' && result !== 0 && result % 2 !== 0) multiplier = 2;
                else if (bet === '1-18' && result >= 1 && result <= 18) multiplier = 2;
                else if (bet === '19-36' && result >= 19 && result <= 36) multiplier = 2;
                else if (bet === '1st 12' && result >= 1 && result <= 12) multiplier = 3;
                else if (bet === '2nd 12' && result >= 13 && result <= 24) multiplier = 3;
                else if (bet === '3rd 12' && result >= 25 && result <= 36) multiplier = 3;
                else if (!isNaN(parseInt(bet)) && parseInt(bet) === result) multiplier = 36;
                
                totalWin += betAmount * multiplier;
            });

            if (totalWin > 0) {
                setBalance(b => b + totalWin);
                onGameEnd(true, totalWin);
            } else {
                onGameEnd(false, 0);
            }

        }, 1000); // 1s visual
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                <div>
                   <label className="text-gray-400 text-xs font-bold uppercase">Chip Value</label>
                   <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                </div>
                <div className="text-xs text-gray-500">Total Bet: ${(betAmount * selectedBets.length).toFixed(2)}</div>
                
                <div className="bg-[#0f141d] p-2 rounded text-[10px] text-gray-500 font-mono break-all">
                    Next Nonce: {nonce}
                </div>

                <button onClick={spin} disabled={isSpinning || selectedBets.length === 0} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto disabled:opacity-50 hover:scale-105 transition-transform`}>
                    {isSpinning ? "Spinning..." : "Spin"}
                </button>
            </div>
            
            <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-6 overflow-auto">
                
                {/* Wheel / Result */}
                <div className="mb-8 relative w-24 h-24 flex items-center justify-center">
                    <div className={`absolute inset-0 rounded-full border-4 ${isSpinning ? 'animate-spin border-dashed border-gray-500' : 'border-transparent'}`}></div>
                    {lastNumber !== null && !isSpinning ? (
                        <div className={`w-24 h-24 rounded-full flex items-center justify-center text-4xl font-bold border-4 shadow-[0_0_20px_currentColor] animate-in zoom-in
                            ${getColor(lastNumber) === 'red' ? 'bg-red-600 border-red-400 text-white' : 
                              getColor(lastNumber) === 'black' ? 'bg-gray-900 border-gray-600 text-white' : 
                              'bg-green-600 border-green-400 text-white'
                            }
                        `}>
                            {lastNumber}
                        </div>
                    ) : (
                        <div className="text-gray-700 text-6xl font-black opacity-20">
                            {isSpinning ? '...' : '0'}
                        </div>
                    )}
                </div>

                {/* Betting Board */}
                <div className="flex flex-col gap-1 w-full max-w-[700px] mx-auto overflow-x-auto">
                    
                    <div className="flex gap-1">
                        {/* 0 (Spans rows) */}
                        <button 
                            onClick={() => toggleBet('0')}
                            className={`w-12 rounded-l font-bold border flex items-center justify-center transition-all
                                ${selectedBets.includes('0') ? 'ring-2 ring-yellow-400 z-10' : 'opacity-90 hover:opacity-100'}
                                bg-green-600 border-green-700 text-white
                            `}
                        >
                            0
                        </button>

                        {/* Numbers Grid */}
                        <div className="flex-1 grid grid-cols-12 gap-1">
                            {/* We need to arrange mostly like a real board: 3 rows. 
                                Standard board is 3,6,9... top row.
                                Let's stick to numerical order for simplicity in this flex grid, 
                                but grouped by dozens usually.
                            */}
                            {Array.from({length: 36}, (_, i) => i + 1).map(n => {
                                const color = getColor(n);
                                return (
                                    <button
                                        key={n}
                                        onClick={() => toggleBet(n.toString())}
                                        className={`
                                            aspect-square flex items-center justify-center font-bold text-sm md:text-lg rounded transition-all border
                                            ${selectedBets.includes(n.toString()) ? 'ring-2 ring-yellow-400 z-10' : 'opacity-90 hover:opacity-100'}
                                            ${color === 'red' ? 'bg-red-600 border-red-800 text-white' : 'bg-gray-800 border-gray-900 text-white'}
                                        `}
                                    >
                                        {n}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dozens */}
                    <div className="flex gap-1 ml-13 pl-12">
                        {['1st 12', '2nd 12', '3rd 12'].map(bet => (
                            <button
                                key={bet}
                                onClick={() => toggleBet(bet)}
                                className={`flex-1 py-3 bg-[#1a202c] border border-gray-700 rounded hover:bg-gray-700 font-bold text-xs uppercase
                                    ${selectedBets.includes(bet) ? 'ring-2 ring-yellow-400 z-10 bg-gray-700' : ''}
                                `}
                            >
                                {bet}
                            </button>
                        ))}
                    </div>

                    {/* 1:1 Bets */}
                    <div className="flex gap-1 ml-13 pl-12">
                         {['1-18', 'even', 'red', 'black', 'odd', '19-36'].map(bet => (
                             <button
                                key={bet}
                                onClick={() => toggleBet(bet)}
                                className={`flex-1 py-3 border border-gray-700 rounded font-bold text-xs uppercase hover:opacity-80
                                    ${bet === 'red' ? 'bg-red-600 border-red-800' : 
                                      bet === 'black' ? 'bg-gray-800 border-gray-900' : 
                                      'bg-[#1a202c]'}
                                    ${selectedBets.includes(bet) ? 'ring-2 ring-yellow-400 z-10' : ''}
                                `}
                             >
                                 {bet}
                             </button>
                         ))}
                    </div>

                </div>
            </div>
        </div>
    );
};

export default RouletteGame;