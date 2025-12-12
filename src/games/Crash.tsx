import { useState, useRef, useEffect } from 'react';
import { THEME, type GameProps } from '../config';

const CrashGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
  const [multiplier, setMultiplier] = useState(1.00);
  const [isPlaying, setIsPlaying] = useState(false);
  const [crashed, setCrashed] = useState(false);
  const [betAmount, setBetAmount] = useState(10);
  
  const reqRef = useRef<number>(0);

  const startGame = () => {
    if (balance < betAmount) return;
    setBalance(b => b - betAmount);
    setIsPlaying(true);
    setCrashed(false);
    setMultiplier(1.00);
    
    // House Edge Logic: 3% chance to crash instantly at 1.00x
    // Otherwise, generate a crash point using standard provably fair-like logic
    // Formula: E = 100 / (1 - h) where h is house edge? No.
    // Standard Crash Formula: E = 0.99 * (1 / (1 - random))
    // We will use a simplified version that ensures house edge.
    
    const r = Math.random();
    let crashPoint = 0.99 / (1 - r);
    
    // Cap minimum at 1.00
    if (crashPoint < 1.00) crashPoint = 1.00;
    
    // Instant crash check (extra house edge layer or anti-cheat)
    if (Math.random() < 0.03) crashPoint = 1.00;

    // Limit maximum for safety in this demo
    if (crashPoint > 100) crashPoint = 100;

    const start = Date.now();
    
    const tick = () => {
      const elapsed = (Date.now() - start) / 1000;
      // Growth function: 1.00 -> ... exponential
      // m(t) = e^(0.06 * t) approx
      const nextMult = Math.pow(Math.E, 0.06 * elapsed * 2.5); 
      
      if (nextMult >= crashPoint) {
        setMultiplier(crashPoint);
        setCrashed(true);
        setIsPlaying(false);
        onGameEnd(false, 0);
      } else {
        setMultiplier(nextMult);
        reqRef.current = requestAnimationFrame(tick);
      }
    };
    reqRef.current = requestAnimationFrame(tick);
  };

  const cashOut = () => {
    if (!isPlaying || crashed) return;
    cancelAnimationFrame(reqRef.current);
    const win = betAmount * multiplier;
    setBalance(b => b + win);
    setIsPlaying(false);
    onGameEnd(true, win);
  };

  useEffect(() => () => cancelAnimationFrame(reqRef.current), []);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full">
      <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
        <div>
          <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
          <input 
            type="number" 
            value={betAmount} 
            onChange={(e) => setBetAmount(Number(e.target.value))} 
            disabled={isPlaying}
            className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} 
          />
        </div>
        <button 
          onClick={isPlaying ? cashOut : startGame}
          // Fix: Only disable if playing and NOT crashed (shouldn't happen) or if waiting.
          // Actually, we disable "Bet" if playing. We disable "Cashout" if not playing.
          // The single button logic:
          disabled={isPlaying && crashed} 
          className={`w-full py-4 rounded-lg font-bold text-black uppercase mt-auto ${isPlaying ? 'bg-orange-500' : THEME.accent}`}
        >
          {isPlaying ? "Cashout" : "Bet"}
        </button>
      </div>
      <div className="flex-1 relative bg-[#0b0e11] rounded-xl border border-gray-800 overflow-hidden flex items-center justify-center">
        {/* Graph Line Animation (CSS SVG) */}
        <svg className="absolute bottom-0 left-0 w-full h-full pointer-events-none opacity-20">
           <path d={`M0,500 Q${multiplier * 50},500 ${multiplier * 100},${500 - (multiplier * 50)}`} stroke="#00E701" strokeWidth="4" fill="none" />
        </svg>
        <div className="text-center z-10">
          <div className={`text-7xl font-black tabular-nums ${crashed ? "text-red-500" : "text-white"}`}>
            {multiplier.toFixed(2)}x
          </div>
          <div className="text-gray-500 mt-2 font-mono uppercase">{crashed ? "Crashed" : isPlaying ? "Flying..." : "Place Bet"}</div>
        </div>
      </div>
    </div>
  );
};

export default CrashGame;
