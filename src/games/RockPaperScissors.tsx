import { useState, useCallback, useEffect } from 'react';
import { THEME, type GameProps } from '../config';
import { ProvablyFair } from '../utils/provably-fair';
import { useAutoBet } from '../hooks/useAutoBet';
import AutobetControls from '../components/AutobetControls';
import { Hand, Scissors, FileText } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

const MOVES = [
    { id: 0, name: 'Rock', icon: Hand, color: 'text-gray-400', bg: 'bg-gray-800' },
    { id: 1, name: 'Paper', icon: FileText, color: 'text-blue-400', bg: 'bg-blue-900/30' },
    { id: 2, name: 'Scissors', icon: Scissors, color: 'text-red-400', bg: 'bg-red-900/30' },
];

const RockPaperScissors = ({ balance, setBalance, onGameEnd }: GameProps) => {
    const { t, playSound } = useSettings();
    const [betAmount, setBetAmount] = useState(10);
    const [selectedMove, setSelectedMove] = useState<number>(0);
    const [computerMove, setComputerMove] = useState<number | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [result, setResult] = useState<'WIN' | 'LOSE' | 'TIE' | null>(null);

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

    const [serverSeed] = useState(ProvablyFair.generateServerSeed());
    const [clientSeed] = useState(ProvablyFair.generateClientSeed());
    const [nonce, setNonce] = useState(0);

    const play = useCallback(() => {
        if (balance < betAmount) {
            stopAutoBet();
            playSound('error');
            return;
        }
        playSound('click');

        setBalance(b => b - betAmount);
        setIsPlaying(true);
        setComputerMove(null);
        setResult(null);

        // Provably Fair Result
        const float = ProvablyFair.generateResult(serverSeed, clientSeed, nonce);
        setNonce(n => n + 1);
        
        // 0, 1, 2
        const outcome = Math.floor(float * 3);

        // Animation delay
        setTimeout(() => {
            setComputerMove(outcome);
            setIsPlaying(false);

            // Logic: (Player - Computer + 3) % 3
            // 0 = Tie, 1 = Win, 2 = Lose
            
            const diff = (selectedMove - outcome + 3) % 3;
            let winAmount = 0;
            let res: 'WIN' | 'LOSE' | 'TIE' = 'LOSE';

            if (diff === 0) {
                // Tie - Push
                res = 'TIE';
                winAmount = betAmount; // Return bet
                playSound('cashout'); // Neutral
            } else if (diff === 1) {
                // Win
                res = 'WIN';
                winAmount = betAmount * 2;
                playSound('win');
            } else {
                // Lose
                res = 'LOSE';
                winAmount = 0;
                playSound('lose');
            }

            setResult(res);
            if (winAmount > 0) {
                setBalance(b => b + winAmount);
            }
            
            onGameEnd(winAmount >= betAmount, winAmount, betAmount);

            if (isAutoBetting) {
                const continueAuto = processResult(winAmount >= betAmount, winAmount);
                if (continueAuto) {
                    setTimeout(() => setAutoTrigger(t => t + 1), 1000);
                }
            }
        }, 600);
    }, [balance, betAmount, selectedMove, serverSeed, clientSeed, nonce, isAutoBetting, processResult, stopAutoBet, setBalance, onGameEnd, playSound]);

    useEffect(() => {
        if (isAutoBetting && autoTrigger > 0) {
            play();
        }
    }, [autoTrigger, isAutoBetting, play]);

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-full">
            <div className={`${THEME.card} p-5 rounded-xl w-full lg:w-80 flex flex-col gap-4 border ${THEME.border}`}>
                {/* Mode Tabs */}
                <div className="bg-vewire-input p-1 rounded-lg flex text-sm font-bold mb-2">
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'MANUAL' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => { playSound('click'); setMode('MANUAL'); }}
                        disabled={isPlaying || isAutoBetting}
                    >
                        {t('game.manual')}
                    </button>
                    <button 
                        className={`flex-1 py-2 rounded ${mode === 'AUTO' ? 'bg-vewire-card text-white shadow' : 'text-gray-500 hover:text-gray-300'}`}
                        onClick={() => { playSound('click'); setMode('AUTO'); }}
                        disabled={isPlaying || isAutoBetting}
                    >
                        {t('game.auto')}
                    </button>
                </div>

                {mode === 'MANUAL' ? (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mt-2">
                             <button onClick={() => setBetAmount(b => parseFloat((b / 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">½</button>
                             <button onClick={() => setBetAmount(b => parseFloat((b * 2).toFixed(2)))} className="bg-vewire-input hover:bg-vewire-card text-xs font-bold py-2 rounded border border-vewire-border">2×</button>
                        </div>

                        <div className="text-xs text-gray-500 mt-2">Win 2x • Tie Push</div>
                        
                        <button 
                            onClick={play} 
                            disabled={isPlaying || balance < betAmount} 
                            className={`${THEME.accent} w-full py-4 rounded-lg font-bold text-black uppercase mt-auto disabled:opacity-50 hover:scale-105 transition-transform`}
                        >
                            {isPlaying ? t('game.spinning') : t('game.bet')}
                        </button>
                    </>
                ) : (
                    <>
                        <div>
                           <label className="text-gray-400 text-xs font-bold uppercase">{t('game.bet_amount')}</label>
                           <input type="number" value={betAmount} onChange={(e) => setBetAmount(Number(e.target.value))} disabled={isAutoBetting} className={`w-full ${THEME.input} text-white p-3 rounded-lg border ${THEME.border} mt-2`} />
                        </div>
                        
                        <AutobetControls 
                            settings={settings}
                            onChange={setSettings}
                            onStart={() => { startAutoBet(); setTimeout(() => setAutoTrigger(t => t + 1), 0); }}
                            onStop={stopAutoBet}
                            isRunning={isAutoBetting}
                            balance={balance}
                        />
                    </>
                )}
            </div>
            
            <div className="flex-1 bg-vewire-bg rounded-xl border border-vewire-border flex flex-col items-center justify-center p-8 relative">
                
                {/* Result Message */}
                {result && !isPlaying && (
                    <div className={`absolute top-10 text-4xl font-black animate-in zoom-in
                        ${result === 'WIN' ? 'text-green-500' : result === 'LOSE' ? 'text-red-500' : 'text-gray-400'}
                    `}>
                        {result === 'WIN' ? t('game.you_win') : result === 'LOSE' ? 'YOU LOST' : t('game.push')}
                    </div>
                )}

                <div className="flex gap-8 items-center justify-center w-full max-w-2xl">
                    {/* Player Side */}
                    <div className="flex flex-col gap-4 w-full">
                        <div className="text-center text-gray-500 font-bold uppercase text-xs mb-2">You Pick</div>
                        <div className="flex justify-center gap-2">
                            {MOVES.map(m => {
                                const Icon = m.icon;
                                const selected = selectedMove === m.id;
                                return (
                                    <button 
                                        key={m.id}
                                        onClick={() => { playSound('click'); setSelectedMove(m.id); }}
                                        disabled={isPlaying || isAutoBetting}
                                        className={`
                                            p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center gap-2
                                            ${selected ? `${m.color} border-current bg-white/5 scale-110 shadow-[0_0_15px_currentColor]` : 'border-gray-800 text-gray-600 hover:border-gray-600'}
                                        `}
                                    >
                                        <Icon size={32} />
                                        <span className="text-xs font-bold">{m.name}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* VS */}
                    <div className="text-2xl font-black text-gray-700 italic">VS</div>

                    {/* Computer Side */}
                    <div className="flex flex-col gap-4 w-full items-center">
                        <div className="text-center text-gray-500 font-bold uppercase text-xs mb-2">Computer</div>
                        <div className={`
                            w-32 h-32 rounded-full border-4 flex items-center justify-center transition-all duration-500
                            ${isPlaying ? 'animate-pulse border-gray-700' : computerMove !== null ? 
                                `${MOVES[computerMove].color} border-current shadow-[0_0_20px_currentColor] bg-white/5` : 'border-gray-800 text-gray-700'}
                        `}>
                            {computerMove !== null ? (
                                (() => {
                                    const Icon = MOVES[computerMove].icon;
                                    return <Icon size={48} />; 
                                })()
                            ) : (
                                <span className="text-4xl">?</span>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Overlay for Auto Bet Status */}
                 {isAutoBetting && (
                    <div className="absolute top-4 right-4 bg-green-500/10 text-green-500 border border-green-500/20 px-3 py-1 rounded-full text-xs font-bold animate-pulse">
                        {t('game.autobet_active')}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RockPaperScissors;
