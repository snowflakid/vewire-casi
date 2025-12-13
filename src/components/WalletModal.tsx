import { Wallet, X, Lock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface WalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    addFunds: (amount: number) => void;
}

const WalletModal = ({ isOpen, onClose, addFunds }: WalletModalProps) => {
  const { user } = useAuth();
  
  if (!isOpen) return null;
  const cryptoOptions = [
    { name: "Bitcoin", network: "BTC", balance: "0.000000" },
    { name: "Ethereum", network: "ERC20", balance: "0.0000" },
    { name: "Litecoin", network: "LTC", balance: "0.00" },
    { name: "Tether", network: "TRC20", balance: "0.00" },
  ];

  const isContestMode = user?.inWeeklyChallenge;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[#1a202c] w-full max-w-lg rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-white flex items-center gap-2"><Wallet className="text-green-500" /> Wallet</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white"><X /></button>
        </div>
        
        {isContestMode ? (
            <div className="p-12 text-center flex flex-col items-center gap-4">
                <div className="w-20 h-20 bg-yellow-500/10 rounded-full flex items-center justify-center mb-2">
                    <Lock className="text-yellow-500" size={40} />
                </div>
                <h3 className="text-2xl font-bold text-white">Wallet Locked</h3>
                <p className="text-gray-400">
                    You are currently in <strong className="text-yellow-500">Tournament Mode</strong>. 
                    Deposits and withdrawals are disabled to ensure fair play.
                </p>
                <button 
                    onClick={onClose}
                    className="mt-4 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold"
                >
                    Close
                </button>
            </div>
        ) : (
            <div className="p-6">
            <div className="flex gap-4 mb-6">
                <button className="flex-1 bg-[#2f3847] text-white py-2 rounded-lg font-bold border border-gray-600">Deposit</button>
                <button className="flex-1 bg-transparent text-gray-400 hover:text-white py-2 font-bold">Withdraw</button>
                <button className="flex-1 bg-transparent text-gray-400 hover:text-white py-2 font-bold">Buy Crypto</button>
            </div>

            <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                {cryptoOptions.map(c => (
                <div key={c.name} className="flex items-center justify-between p-4 bg-[#0f141d] rounded-xl border border-gray-800 hover:border-green-500 cursor-pointer transition-colors group">
                    <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-white font-bold group-hover:bg-green-500 group-hover:text-black transition-colors">{c.network[0]}</div>
                    <div>
                        <div className="text-white font-bold">{c.name}</div>
                        <div className="text-xs text-gray-500">{c.network}</div>
                    </div>
                    </div>
                    <div className="text-right">
                    <div className="text-white font-mono">{c.balance}</div>
                    <div className="text-xs text-green-500">$0.00</div>
                    </div>
                </div>
                ))}
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700">
                <button onClick={() => { addFunds(1000); alert('Deposit Confirmed: +$1000'); }} className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg mb-2">
                    Use Test Faucet (+$1,000)
                </button>
                <button onClick={() => { addFunds(-100); alert('Withdrawal Initiated: -$100'); }} className="w-full py-3 bg-transparent border border-gray-600 hover:border-white text-white font-bold rounded-lg mb-2">
                    Simulate Withdrawal (-$100)
                </button>
                <p className="text-center text-gray-500 text-xs">Simulates a blockchain transaction.</p>
            </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default WalletModal;
