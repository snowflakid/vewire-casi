import { useState } from 'react';
import { ShieldCheck, RefreshCw, Copy, Check } from 'lucide-react';
import { ProvablyFair } from '../utils/provably-fair';

interface ProvablyFairModalProps {
    isOpen: boolean;
    onClose: () => void;
    serverSeed: string;
    clientSeed: string;
    nonce: number;
    onChangeClientSeed: (seed: string) => void;
}

const ProvablyFairModal = ({ isOpen, onClose, serverSeed, clientSeed, nonce, onChangeClientSeed }: ProvablyFairModalProps) => {
    if (!isOpen) return null;
    
    const [newSeed, setNewSeed] = useState(clientSeed);
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(clientSeed);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a202c] w-full max-w-lg rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <ShieldCheck className="text-green-500" /> Provably Fair
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
                </div>
                
                <div className="p-6 space-y-6">
                    <p className="text-sm text-gray-400">
                        Our system uses a transparent verification method. You can verify every roll using the Server Seed Hash, Client Seed, and Nonce.
                    </p>

                    <div>
                        <div className="text-xs font-bold text-gray-500 uppercase mb-2">Server Seed Hash (Public)</div>
                        <div className="bg-[#0f141d] p-3 rounded-lg border border-gray-800 font-mono text-xs text-green-500 break-all">
                            {ProvablyFair.hashSeed(serverSeed)}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                             <div className="text-xs font-bold text-gray-500 uppercase mb-2">Nonce</div>
                             <div className="bg-[#0f141d] p-3 rounded-lg border border-gray-800 font-mono text-white">
                                 {nonce}
                             </div>
                        </div>
                        <div>
                             <div className="text-xs font-bold text-gray-500 uppercase mb-2">Client Seed</div>
                             <div className="flex gap-2">
                                 <input 
                                    value={newSeed} 
                                    onChange={(e) => setNewSeed(e.target.value)}
                                    className="bg-[#0f141d] p-3 rounded-lg border border-gray-800 font-mono text-white text-xs w-full outline-none focus:border-green-500 transition-colors"
                                 />
                                 <button onClick={handleCopy} className="p-3 bg-[#2f3847] rounded-lg hover:bg-gray-600 transition-colors">
                                     {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                                 </button>
                             </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-800">
                        <button 
                            onClick={() => onChangeClientSeed(newSeed)} 
                            className="w-full py-3 bg-green-500 hover:bg-green-400 text-black font-bold rounded-lg flex items-center justify-center gap-2 transition-all"
                        >
                            <RefreshCw size={18} /> Update Client Seed
                        </button>
                        <p className="text-center text-xs text-gray-500 mt-2">
                            Updating the seed will reset the Nonce to 0.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProvablyFairModal;
