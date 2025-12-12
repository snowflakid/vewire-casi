import { X, User, Trophy, Wallet, Activity } from 'lucide-react';
import { THEME } from '../config';

interface ProfileProps {
    isOpen: boolean;
    onClose: () => void;
    balance: number;
    stats: {
        totalBets: number;
        totalWagered: number;
        totalWins: number;
        joinDate: string;
    };
}

const Profile = ({ isOpen, onClose, balance, stats }: ProfileProps) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#1a202c] w-full max-w-2xl rounded-2xl border border-gray-700 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                
                {/* Header with Banner */}
                <div className="h-32 bg-gradient-to-r from-green-900 to-[#0b0e11] relative">
                     <button onClick={onClose} className="absolute top-4 right-4 bg-black/50 p-2 rounded-full text-white hover:bg-white/20 transition-colors">
                         <X size={20} />
                     </button>
                     <div className="absolute -bottom-10 left-8">
                         <div className="w-24 h-24 rounded-full bg-[#212735] border-4 border-[#1a202c] flex items-center justify-center overflow-hidden">
                             <User size={48} className="text-gray-500" />
                         </div>
                     </div>
                </div>

                <div className="pt-12 px-8 pb-8 overflow-y-auto">
                    <div className="flex justify-between items-end mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-white">VewireUser</h2>
                            <div className="text-gray-500 text-sm">Joined {stats.joinDate}</div>
                        </div>
                        <div className="text-right">
                             <div className="text-xs text-gray-500 uppercase font-bold">VIP Level</div>
                             <div className="text-xl font-bold text-[#00E701]">Platinum I</div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="bg-[#0f141d] p-4 rounded-xl border border-gray-800">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Activity size={12}/> Total Wagered</div>
                             <div className="text-white font-mono font-bold">${stats.totalWagered.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#0f141d] p-4 rounded-xl border border-gray-800">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Trophy size={12}/> Total Bets</div>
                             <div className="text-white font-mono font-bold">{stats.totalBets}</div>
                        </div>
                        <div className="bg-[#0f141d] p-4 rounded-xl border border-gray-800">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Wallet size={12}/> Balance</div>
                             <div className="text-white font-mono font-bold">${balance.toFixed(2)}</div>
                        </div>
                        <div className="bg-[#0f141d] p-4 rounded-xl border border-gray-800">
                             <div className="text-gray-500 text-xs uppercase font-bold mb-1 flex items-center gap-2"><Trophy size={12}/> Wins</div>
                             <div className="text-white font-mono font-bold">{stats.totalWins}</div>
                        </div>
                    </div>

                    <h3 className="text-white font-bold mb-4">Recent Activity</h3>
                    <div className="bg-[#0f141d] rounded-xl border border-gray-800 overflow-hidden">
                        <div className="p-8 text-center text-gray-500 text-sm">
                            No recent transactions found.
                        </div>
                    </div>
                    
                    <button className={`${THEME.accent} w-full py-3 rounded-lg font-bold text-black uppercase mt-6 hover:opacity-90`}>
                        Edit Profile
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Profile;
