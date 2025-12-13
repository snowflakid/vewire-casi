import { useState } from 'react';
import { X, Trophy, Coins, Eye } from 'lucide-react';
import { useAuth, type User } from '../context/AuthContext';
import Profile from '../views/Profile';

interface LeaderboardModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function LeaderboardModal({ isOpen, onClose }: LeaderboardModalProps) {
    const { users, user: currentUser, updateUser } = useAuth();
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    if (!isOpen) return null;

    // Sort users by weekly balance descending
    const sortedUsers = [...users].sort((a, b) => b.weeklyBalance - a.weeklyBalance);

    const toggleTournamentMode = () => {
        if (!currentUser) return;
        updateUser({ inWeeklyChallenge: !currentUser.inWeeklyChallenge });
    };

    return (
        <>
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                 <div className="bg-vewire-sidebar w-full max-w-2xl rounded-2xl border border-vewire-border overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
                    
                    <div className="p-6 border-b border-vewire-border flex justify-between items-center bg-vewire-card">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Trophy className="text-yellow-500" /> Weekly Challenge
                        </h2>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                            <X size={24} />
                        </button>
                    </div>

                    <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
                        
                        <div className="bg-gradient-to-r from-yellow-500/20 to-transparent p-6 rounded-xl border border-yellow-500/30 mb-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-2">Weekly Tournament</h3>
                                    <p className="text-gray-400 text-sm max-w-md">
                                        Every week, players start with $100 tournament chips. The player with the highest balance at the end of the week wins real prizes!
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-yellow-500 font-bold text-2xl">Prize Pool</div>
                                    <div className="text-white font-mono text-3xl font-bold">$5,000</div>
                                </div>
                            </div>

                            {currentUser && (
                                <div className="mt-6 flex items-center gap-4">
                                    <div className="text-sm">
                                        <span className="text-gray-400">Your Status: </span>
                                        <span className={currentUser.inWeeklyChallenge ? "text-green-500 font-bold" : "text-gray-400 font-bold"}>
                                            {currentUser.inWeeklyChallenge ? "Active Participant" : "Spectating"}
                                        </span>
                                    </div>
                                    <button 
                                        onClick={toggleTournamentMode}
                                        className={`px-6 py-2 rounded-lg font-bold transition-all ${
                                            currentUser.inWeeklyChallenge 
                                            ? 'bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500/20' 
                                            : 'bg-yellow-500 text-black hover:bg-yellow-400 shadow-[0_0_15px_rgba(234,179,8,0.3)]'
                                        }`}
                                    >
                                        {currentUser.inWeeklyChallenge ? "Exit Tournament" : "Enter Tournament"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <h3 className="text-white font-bold mb-4 flex items-center gap-2">
                            <Coins size={18} className="text-vewire-accent" /> Leaderboard
                        </h3>

                        <div className="space-y-2">
                            {sortedUsers.map((u, index) => (
                                <button 
                                    key={u.username} 
                                    onClick={() => setSelectedUser(u)}
                                    className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:brightness-110 group ${
                                        currentUser && currentUser.username === u.username 
                                        ? 'bg-vewire-accent/10 border-vewire-accent' 
                                        : 'bg-vewire-input border-vewire-border hover:border-gray-500'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                            index === 0 ? 'bg-yellow-500 text-black' :
                                            index === 1 ? 'bg-gray-400 text-black' :
                                            index === 2 ? 'bg-orange-700 text-white' :
                                            'bg-vewire-card text-gray-500'
                                        }`}>
                                            {index + 1}
                                        </div>
                                        <div>
                                            <div className={`font-bold flex items-center gap-2 ${currentUser && currentUser.username === u.username ? 'text-white' : 'text-gray-400 group-hover:text-white'}`}>
                                                {u.username}
                                                <Eye size={14} className="opacity-0 group-hover:opacity-100 transition-opacity text-vewire-accent" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="font-mono font-bold text-yellow-500">
                                        ${u.weeklyBalance.toFixed(2)}
                                    </div>
                                </button>
                            ))}
                        </div>

                    </div>
                 </div>
            </div>

            {/* Profile Inspection Modal */}
            {selectedUser && (
                <Profile 
                    isOpen={!!selectedUser} 
                    onClose={() => setSelectedUser(null)}
                    balance={selectedUser.weeklyBalance} // Show their tournament balance
                    user={selectedUser}
                    isReadOnly={true}
                />
            )}
        </>
    );
}