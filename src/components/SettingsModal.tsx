import { X, Globe, Volume2, VolumeX, EyeOff, Monitor } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { 
        language, setLanguage, 
        soundEnabled, setSoundEnabled, 
        streamerMode, setStreamerMode,
        t 
    } = useSettings();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-vewire-sidebar w-full max-w-md rounded-2xl border border-vewire-border overflow-hidden shadow-2xl flex flex-col">
                
                <div className="p-6 border-b border-vewire-border flex justify-between items-center bg-vewire-card">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        {t('settings.title')}
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* Language */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-3 block flex items-center gap-2">
                            <Globe size={14} /> {t('settings.language')}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                            <button 
                                onClick={() => setLanguage('en')}
                                className={`py-3 rounded-lg font-bold border transition-all ${language === 'en' ? 'bg-vewire-accent text-black border-vewire-accent' : 'bg-vewire-input text-gray-400 border-vewire-border'}`}
                            >
                                English
                            </button>
                            <button 
                                onClick={() => setLanguage('fr')}
                                className={`py-3 rounded-lg font-bold border transition-all ${language === 'fr' ? 'bg-vewire-accent text-black border-vewire-accent' : 'bg-vewire-input text-gray-400 border-vewire-border'}`}
                            >
                                Français
                            </button>
                        </div>
                    </div>

                    {/* Sound */}
                    <div className="flex items-center justify-between p-4 bg-vewire-input rounded-xl border border-vewire-border">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${soundEnabled ? 'bg-green-500/20 text-green-500' : 'bg-gray-700/50 text-gray-500'}`}>
                                {soundEnabled ? <Volume2 size={20} /> : <VolumeX size={20} />}
                            </div>
                            <span className="font-bold text-white">{t('settings.sound')}</span>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={soundEnabled} onChange={(e) => setSoundEnabled(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vewire-accent"></div>
                        </label>
                    </div>

                    {/* Streamer Mode */}
                    <div className="flex items-center justify-between p-4 bg-vewire-input rounded-xl border border-vewire-border">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${streamerMode ? 'bg-purple-500/20 text-purple-500' : 'bg-gray-700/50 text-gray-500'}`}>
                                {streamerMode ? <EyeOff size={20} /> : <Monitor size={20} />}
                            </div>
                            <div>
                                <div className="font-bold text-white">{t('settings.streamer')}</div>
                                <div className="text-[10px] text-gray-500">{t('settings.streamer_desc')}</div>
                            </div>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input type="checkbox" checked={streamerMode} onChange={(e) => setStreamerMode(e.target.checked)} className="sr-only peer" />
                            <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-vewire-accent"></div>
                        </label>
                    </div>

                </div>
             </div>
        </div>
    );
}
