import { useState } from 'react';
import { THEME, type GameProps } from '../config';

const DiceGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState<number | null>(null);
  const [betAmount, setBetAmount] = useState(10);
  const [isRolling, setIsRolling] = useState(false);

  // 1% House Edge included in the 99 numerator
  const multiplier = Number((99 / (100 - target)).toFixed(4));
  const winChance = (100 - target).toFixed(2);

  const rollDice = () => {
    if (balance < betAmount) return;
    setBalance(b => b - betAmount);
    setIsRolling(true);
    
    setTimeout(() => {
      const result = Math.random() * 100;
      setRoll(result);
      setIsRolling(false);
      
      if (result > target) {
        const win = betAmount * multiplier;
        setBalance(b => b + win);
        onGameEnd(true, win);
      } else {
        onGameEnd(false, 0);
      }
    }, 500);
  };

  return (
    <div className="flex flex-col gap-6 bg-[#212735] p-8 rounded-xl border border-gray-800 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center bg-[#0f141d] p-4 rounded-lg">
         <div className="text-center">
             <div className="text-gray-400 text-xs font-bold uppercase">Multiplier</div>
             <div className="text-2xl font-bold text-white">{multiplier}x</div>
         </div>
         <div className="text-center">
             <div className="text-gray-400 text-xs font-bold uppercase">Win Chance</div>
             <div className="text-2xl font-bold text-white">{winChance}%</div>
         </div>
      </div>

      <div className="relative h-24 bg-[#0f141d] rounded-xl flex items-center px-4 overflow-hidden border border-gray-700">
        <div className="absolute top-1/2 left-4 right-4 h-2 bg-gray-700 rounded-full">
            <div className="absolute h-full bg-red-500 rounded-l-full" style={{ width: `${target}%` }}></div>
            <div className="absolute h-full bg-green-500 rounded-r-full right-0" style={{ width: `${100-target}%` }}></div>
        </div>
        
        <input 
          type="range" min="2" max="98" value={target} 
          onChange={(e) => setTarget(Number(e.target.value))}
          className="absolute inset-0 w-full opacity-0 cursor-pointer z-20"
        />
        
        {roll !== null && (
          <div 
            className={`absolute top-1/2 w-10 h-10 -mt-5 -ml-5 rounded-lg border-2 flex items-center justify-center font-bold text-white transition-all duration-300 z-10 ${roll > target ? 'bg-green-500 border-green-300' : 'bg-red-500 border-red-300'}`}
            style={{ left: `${roll}%` }}
          >
            {Math.floor(roll)}
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
            <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
            <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
        </div>
        <button onClick={rollDice} disabled={isRolling} className={`${THEME.accent} px-12 rounded-lg font-bold text-black uppercase mt-6 hover:scale-105 transition-transform`}>
           {isRolling ? "Rolling..." : "Roll Dice"}
        </button>
      </div>
    </div>
  );
};

export default DiceGame;
