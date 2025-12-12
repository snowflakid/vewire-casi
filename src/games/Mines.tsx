import { useState } from 'react';
import { Bomb } from 'lucide-react';
import { THEME, type GameProps } from '../config';

const MinesGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const [minesCount, setMinesCount] = useState(3);
  const [betAmount, setBetAmount] = useState(10);
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<(number | null)[]>(Array(25).fill(null)); 
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [gameOver, setGameOver] = useState(false);

  // Mathématiques des Mines (Multiplicateur réel)
  const getMultiplier = (gemsFound: number) => {
    // Standard nCr formula based calculation for fair probability
    // House edge is usually applied by slightly reducing the payout or via the "0" tile generation logic (which is fair here, just payout is math).
    // Let's stick to the raw probability and assume the house edge comes from the fact that people cash out early or hit mines.
    // Actually, real casinos apply a 1-5% house edge on the multiplier.
    
    // Total spots: 25. Mines: M. Gems: 25-M.
    // Pick 1: Chance of Gem = (25-M)/25. Fair Payout = 25/(25-M).
    // Pick 2: Chance = (24-M)/24. Total prob = P1 * P2.
    // Multiplier = 0.97 / Total Prob (3% edge).
    
    let prob = 1;
    for (let i = 0; i < gemsFound; i++) {
      prob *= (25 - minesCount - i) / (25 - i);
    }
    
    const houseEdge = 0.97; // 3% House Edge
    return prob === 0 ? 0 : houseEdge / prob;
  };

  const startGame = () => {
    if (balance < betAmount) return;
    setBalance(b => b - betAmount);
    setIsPlaying(true);
    setGameOver(false);
    setRevealed(Array(25).fill(false));
    
    const newGrid = Array(25).fill(1); // 1 = Gem
    for (let i = 0; i < minesCount; i++) newGrid[i] = 0; // 0 = Mine
    setGrid(newGrid.sort(() => Math.random() - 0.5));
  };

  const handleTileClick = (index: number) => {
    if (!isPlaying || revealed[index] || gameOver) return;

    const newRevealed = [...revealed];
    newRevealed[index] = true;
    setRevealed(newRevealed);

    if (grid[index] === 0) { // BOOM
      setGameOver(true);
      setIsPlaying(false);
      onGameEnd(false, 0);
      setRevealed(grid.map((val, i) => (val === 0 ? true : newRevealed[i])));
    }
  };

  const cashout = () => {
    const gemsFound = revealed.filter((r, i) => r && grid[i] === 1).length;
    const win = betAmount * getMultiplier(gemsFound);
    setBalance(b => b + win);
    setIsPlaying(false);
    setGameOver(true);
    onGameEnd(true, win);
    setRevealed(Array(25).fill(true));
  };

  const gemsFound = revealed.filter((r, i) => r && grid[i] === 1).length;
  const currentMult = getMultiplier(gemsFound);
  const potentialWin = (betAmount * currentMult).toFixed(2);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase">Mines Amount</label>
          <select 
            value={minesCount} 
            onChange={(e) => setMinesCount(Number(e.target.value))}
            disabled={isPlaying}
            className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
          >
            {[1, 3, 5, 10, 24].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
          <input 
            type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))}
            disabled={isPlaying}
            className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`}
          />
          <div className="grid grid-cols-2 gap-2 mt-2">
              <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} disabled={isPlaying} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">½</button>
              <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} disabled={isPlaying} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">2×</button>
          </div>
        </div>
        {isPlaying ? (
          <button onClick={cashout} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase hover:opacity-90`}>
            Cashout (${potentialWin})
          </button>
        ) : (
          <button onClick={startGame} className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase hover:opacity-90`}>
            Bet
          </button>
        )}
      </div>

      <div className="flex-1 flex items-center justify-center bg-[#0b0e11] rounded-xl border border-gray-800 p-6">
        <div className="grid grid-cols-5 gap-3 w-full max-w-[500px]">
          {grid.map((val, i) => (
            <button
              key={i}
              onClick={() => handleTileClick(i)}
              disabled={!isPlaying || revealed[i]}
              className={`
                aspect-square rounded-lg font-bold text-2xl transition-all transform hover:scale-105
                ${!revealed[i] ? 'bg-[#2f3847] hover:bg-[#3a4556]' : val === 0 ? 'bg-red-500' : 'bg-[#0f141d] border border-green-500'}
                shadow-lg
              `}
            >
              {revealed[i] && (val === 0 ? <Bomb className="mx-auto text-black animate-pulse" /> : <div className="text-green-500 animate-bounce">💎</div>)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MinesGame;
