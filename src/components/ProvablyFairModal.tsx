import { useState } from 'react';
import { ShieldCheck, RefreshCw, Copy, Check, Key } from 'lucide-react';
import { ProvablyFair } from '../utils/provably-fair';

interface ProvablyFairModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    onChangeClientSeed: (seed: string) => void;
    onRotateSeed: (newClientSeed?: string) => void;
    history: { serverSeed: string; clientSeed: string; nonce: number; activeAt: string }[];
}

const ProvablyFairModal = ({ isOpen, onClose, serverSeed, clientSeed, nonce, onChangeClientSeed, onRotateSeed, history }: ProvablyFairModalProps) => {
    if (!isOpen) return null;
    
    const [newSeed, setNewSeed] = useState(clientSeed);
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'CURRENT' | 'HISTORY'>('CURRENT');

    const handleCopy = () => {
        navigator.clipboard.writeText(clientSeed);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-vewire-sidebar w-full max-w-2xl rounded-2xl border border-vewire-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-vewire-border flex justify-between items-center bg-vewire-card">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-green-500" /> Provably Fair
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <div className="flex border-b border-vewire-border">
                    <button 
                        onClick={() => setActiveTab('CURRENT')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'CURRENT' ? 'border-vewire-accent text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        Current Pair
                    </button>
                    <button 
                        onClick={() => setActiveTab('HISTORY')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-vewire-accent text-white' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                    >
                        History (Verify)
                    </button>
                </div>
                
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    {activeTab === 'CURRENT' ? (
                        <div className="space-y-6">
                            <p className="text-sm text-gray-400">
                                This pair is currently active. The server seed is hidden to prevent prediction, but you can see its hash.
                            </p>

                            <div>
                                <div className="text-xs font-bold text-gray-500 uppercase mb-2">Active Server Seed Hash</div>
                                <div className="bg-vewire-input p-3 rounded-lg border border-vewire-border font-mono text-xs text-green-500 break-all select-all">
                                    {ProvablyFair.hashSeed(serverSeed)}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                     <div className="text-xs font-bold text-gray-500 uppercase mb-2">Nonce</div>
                                     <div className="bg-vewire-input p-3 rounded-lg border border-vewire-border font-mono text-white">
                                         {nonce}
                                     </div>
                                </div>
                                <div>
                                     <div className="text-xs font-bold text-gray-500 uppercase mb-2">Client Seed</div>
                                     <div className="flex gap-2">
                                         <input 
                                            value={newSeed} 
                                            onChange={(e) => setNewSeed(e.target.value)}
                                            className="bg-vewire-input p-3 rounded-lg border border-vewire-border font-mono text-white text-xs w-full outline-none focus:border-vewire-accent transition-colors"
                                         />
                                         <button onClick={handleCopy} className="p-3 bg-vewire-card rounded-lg hover:bg-vewire-border transition-colors border border-vewire-border">
                                             {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                         </button>
                                     </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-vewire-border space-y-3">
                                <button 
                                    onClick={() => onChangeClientSeed(newSeed)} 
                                    className="w-full py-3 bg-vewire-card hover:bg-vewire-border border border-vewire-border text-white font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                                >
                                    <RefreshCw size={18} /> Update Client Seed (Reset Nonce)
                                </button>
                                <button 
                                    onClick={() => onRotateSeed(newSeed)} 
                                    className="w-full py-3 bg-vewire-accent hover:opacity-90 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,231,1,0.2)]"
                                >
                                    <Key size={18} /> Rotate & Reveal Server Seed
                                </button>
                                <p className="text-center text-xs text-gray-500">
                                    "Rotate" generates a new server secret and reveals the old one for verification.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-400 mb-4">
                                Previous seeds are revealed here. You can hash the "Revealed Server Seed" with SHA256 to verify it matches the Hash you were shown during the game.
                            </p>
                            
                            {history.length === 0 ? (
                                <div className="text-center text-gray-500 py-8">No history available yet. Rotate your seed to generate history.</div>
                            ) : (
                                history.map((entry, i) => (
                                    <div key={i} className="bg-vewire-input p-4 rounded-xl border border-vewire-border space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-xs text-gray-500 font-bold">{entry.activeAt}</span>
                                            <span className="text-xs text-gray-500">Nonce Reached: {entry.nonce}</span>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500">Revealed Server Seed</div>
                                            <div className="text-xs text-red-400 font-mono break-all select-all">{entry.serverSeed}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500">Your Client Seed</div>
                                            <div className="text-xs text-blue-400 font-mono break-all">{entry.clientSeed}</div>
                                        </div>
                                        <div>
                                            <div className="text-[10px] uppercase font-bold text-gray-500">Hash (Verify Match)</div>
                                            <div className="text-xs text-green-500 font-mono break-all opacity-70">{ProvablyFair.hashSeed(entry.serverSeed)}</div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProvablyFairModal;