import { Play, Square } from 'lucide-react';
import { THEME } from '../config';
import type { AutoBetSettings } from '../hooks/useAutoBet';

interface AutobetControlsProps {
    settings: AutoBetSettings;
    onChange: (s: AutoBetSettings) => void;
    onStart: () => void;
    onStop: () => void;
    isRunning: boolean;
    balance: number;
}

const AutobetControls = ({ settings, onChange, onStart, onStop, isRunning }: AutobetControlsProps) => {
    return (
        <div className="flex flex-col gap-3 p-4 bg-[#0f141d] rounded-xl border border-gray-800 animate-in fade-in">
            <div className="grid grid-cols-2 gap-3">
                <div>
                    <label className="text-gray-500 text-[10px] font-bold uppercase">Number of Bets (0 = ∞)</label>
                    <input 
                        type="number" 
                        value={settings.betsCount} 
                        onChange={(e) => onChange({...settings, betsCount: parseInt(e.target.value) || 0})}
                        disabled={isRunning}
                        className={`w-full ${THEME.input} text-white p-2 rounded border border-gray-700 text-sm`}
                    />
                </div>
                <div>
                    <label className="text-gray-500 text-[10px] font-bold uppercase">On Loss Increase %</label>
                    <input 
                        type="number" 
                        value={settings.onLoss} 
                        onChange={(e) => onChange({...settings, onLoss: parseFloat(e.target.value) || 0})}
                        disabled={isRunning}
                        className={`w-full ${THEME.input} text-white p-2 rounded border border-gray-700 text-sm`}
                    />
                </div>
                <div>
                    <label className="text-gray-500 text-[10px] font-bold uppercase">On Win Increase %</label>
                    <input 
                        type="number" 
                        value={settings.onWin} 
                        onChange={(e) => onChange({...settings, onWin: parseFloat(e.target.value) || 0})}
                        disabled={isRunning}
                        className={`w-full ${THEME.input} text-white p-2 rounded border border-gray-700 text-sm`}
                    />
                </div>
                 <div>
                    <label className="text-gray-500 text-[10px] font-bold uppercase">Stop on Profit</label>
                    <input 
                        type="number" 
                        value={settings.stopProfit} 
                        onChange={(e) => onChange({...settings, stopProfit: parseFloat(e.target.value) || 0})}
                        disabled={isRunning}
                        className={`w-full ${THEME.input} text-white p-2 rounded border border-gray-700 text-sm`}
                    />
                </div>
            </div>

            {isRunning ? (
                <button 
                    onClick={onStop} 
                    className="w-full py-3 bg-red-500 hover:bg-red-400 text-white font-bold rounded-lg flex items-center justify-center gap-2"
                >
                    <Square size={16} fill="currentColor" /> Stop Autobet
                </button>
            ) : (
                <button 
                    onClick={onStart} 
                    className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg flex items-center justify-center gap-2"
                >
                    <Play size={16} fill="currentColor" /> Start Autobet
                </button>
            )}
        </div>
    );
};

export default AutobetControls;
