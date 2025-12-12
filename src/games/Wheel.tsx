import { useState, useMemo, useEffect, useCallback } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';

interface Segment {
    multiplier: number;
    color: string;
    textColor: string;
}

const RAW_SEGMENTS = [
    { multiplier: 0.00, count: 20, color: '#1f2937', textColor: '#374151' }, // Losing
    { multiplier: 1.20, count: 12, color: '#cbd5e1', textColor: '#0f172a' },
    { multiplier: 2.00, count: 6, color: '#22c55e', textColor: '#ffffff' },
    { multiplier: 5.00, count: 1, color: '#3b82f6', textColor: '#ffffff' },
    { multiplier: 10.00, count: 1, color: '#eab308', textColor: '#ffffff' },
];

const WheelGame = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const [betAmount, setBetAmount] = useState(10);
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [lastWin, setLastWin] = useState<number | null>(null);

    const [mode, setMode] = useState<'MANUAL' | 'AUTO'>('MANUAL');
    const [autoTrigger, setAutoTrigger] = useState(0);

    const { 
        isAutoBetting, 
        startAutoBet, 
        stopAutoBet, 
        processResult, 
        settings, 
        setSettings 
    } = useAutoBet(balance, setBalance, betAmount, setBetAmount);

    // Provably Fair
    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const segments = useMemo(() => {
        let arr: Segment[] = [];
        RAW_SEGMENTS.forEach(seg => {
            for(let i=0; i<seg.count; i++) {
                arr.push({ multiplier: seg.multiplier, color: seg.color, textColor: seg.textColor });
            }
        });
        
        const seededRandom = (seed: number) => {
            const x = Math.sin(seed++) * 10000;
            return x - Math.floor(x);
        };
        
        return arr.sort((a) => seededRandom(arr.indexOf(a) + arr.length) - 0.5)
                  .sort(() => Math.random() - 0.5); 
    }, []);

    const wheelGradient = useMemo(() => {
        const degreePerSeg = 360 / segments.length;
        return segments.map((seg, i) => {
            const start = i * degreePerSeg;
            const end = (i + 1) * degreePerSeg;
            return `${seg.color} ${start}deg ${end}deg`;
        }).join(', ');
    }, [segments]);

    const spin = useCallback(() => {
        if (balance < betAmount || isSpinning) {
            stopAutoBet();
            return;
        }
        
        setBalance(b => b - betAmount);
        setIsSpinning(true);
        setLastWin(null);

        const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
        setNonce(n => n + 1);
        
        const resultIndex = Math.floor(float * segments.length);
        const resultSegment = segments[resultIndex];

        const degPerSeg = 360 / segments.length;
        const segmentCenter = (resultIndex * degPerSeg) + (degPerSeg / 2);
        
        const jitter = (Math.random() - 0.5) * (degPerSeg * 0.8);
        const fullSpins = 360 * 5; 
        
        const currentVisual = rotation % 360;
        const targetVisual = (360 - segmentCenter + jitter);
        let diff = targetVisual - currentVisual;
        if (diff < 0) diff += 360;
        
        const finalRotation = rotation + fullSpins + diff;

        setRotation(finalRotation);

        setTimeout(() => {
            setIsSpinning(false);
            const win = betAmount * resultSegment.multiplier;
            setBalance(b => b + win);
            setLastWin(resultSegment.multiplier);
            onGameEnd(win >= betAmount, win);

            if (isAutoBetting) {
                const continueAuto = processResult(win >= betAmount, win);
                if (continueAuto) {
                    setTimeout(() => setAutoTrigger(t => t + 1), 500);
                }
            }
        }, 3000); 
    }, [balance, betAmount, isSpinning, rotation, segments, serverSeed, clientSeed, nonce, setBalance, onGameEnd, isAutoBetting, processResult, stopAutoBet]);

    useEffect(() => {
        if (isAutoBetting && autoTrigger > 0) {
            spin();
        }
    }, [autoTrigger, isAutoBetting, spin]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                {/* Mode Tabs */}
                <div className="bg-[#0f141d] p-1 rounded-lg flex text-sm font-bold mb-2">
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-[#212735] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setMode('MANUAL')}
                        disabled={isSpinning || isAutoBetting}
                    >
                        Manual
                    </button>
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-[#212735] text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => setMode('AUTO')}
                        disabled={isSpinning || isAutoBetting}
                    >
                        Auto
                    </button>
                </div>

                {mode === 'MANUAL' ? (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">Bet Amount</label>
                           <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                                <input 
                                    type="number" 
                                    min="0.01"
                                    step="0.01"
                                    value={betAmount} 
                                    onChange={(e) => setBetAmount(Number(e.target.value))} 
                                    className={`w-full ${THEME.input} text-white p-3 pl-8 rounded-lg border ${THEME.border} mt-2 font-mono`} 
                                />
                           </div>
                           <div className="grid grid-cols-2 gap-2 mt-2">
                                <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">½</button>
                                <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-[#1a202c] hover:bg-[#2d3748] text-xs font-bold py-2 rounded border border-gray-700">2×</button>
                           </div>
                        </div>

                        <button 
                            onClick={spin} 
                            disabled={isSpinning || balance < betAmount} 
                            className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all`}
                        >
                            {isSpinning ? 'Spinning...' : 'Spin'}
                        </button>
                    </>
                ) : (
                    <AutobetControls 
                        settings={settings}
                        onChange={setSettings}
                        onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t + 1), 0); }}
                        onStop={stopAutoBet}
                        isRunning={isAutoBetting}
                        balance={balance}
                    />
                )}
            </div>
            
            <div className="flex-1 bg-[#0b0e11] rounded-xl border border-gray-800 flex flex-col items-center justify-center p-8 overflow-hidden relative">
                 {/* Pointer */}
                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[158px] z-20">
                     <div className="w-0 h-0 border-l-[12px] border-l-transparent border-r-[12px] border-r-transparent border-t-[24px] border-t-white drop-shadow-xl filter"></div>
                 </div>

                 {/* Wheel Container */}
                 <div className="relative w-[300px] h-[300px] md:w-[400px] md:h-[400px]">
                    {/* The Wheel */}
                    <div 
                        className="w-full h-full rounded-full border-[10px] border-[#2f3847] relative transition-transform duration-[3000ms] cubic-bezier(0.15, 0.85, 0.35, 1.05) shadow-2xl"
                        style={{ 
                            transform: `rotate(${rotation}deg)`,
                            background: `conic-gradient(${wheelGradient})`
                        }}
                    >
                        {/* Inner Circle for style */}
                        <div className="absolute inset-0 m-auto w-10 h-10 bg-[#2f3847] rounded-full z-10 border-4 border-[#1a202c]"></div>
                        
                        {/* Segment Labels (Rotated) */}
                        {segments.map((seg, i) => {
                            const degPerSeg = 360 / segments.length;
                            const angle = (i * degPerSeg) + (degPerSeg / 2);
                            return (
                                <div 
                                    key={i}
                                    className="absolute top-0 left-1/2 -translate-x-1/2 h-1/2 origin-bottom flex items-start justify-center pt-2 md:pt-4"
                                    style={{ transform: `rotate(${angle}deg)` }}
                                >
                                    <span 
                                        className="text-[10px] md:text-xs font-bold"
                                        style={{ color: seg.textColor, transform: 'rotate(0deg)' }} 
                                    >
                                        {seg.multiplier}x
                                    </span>
                                </div>
                            );
                        })}
                    </div>
                 </div>
                 
                 {lastWin !== null && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 pointer-events-none">
                         <div className={`font-black text-6xl md:text-8xl drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)] animate-in zoom-in duration-300 ${lastWin >= 2 ? 'text-green-500' : lastWin > 0 ? 'text-white' : 'text-gray-500'}`}>
                             {lastWin}x
                         </div>
                     </div>
                 )}

                 {/* Overlay for Auto Bet Status */}
                 {isAutoBetting && (
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        AUTOBET ACTIVE
                    </div>
                )}
            </div>
        </div>
    );
};

export default WheelGame;
