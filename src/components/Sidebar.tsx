import { THEME, GAMES_CONFIG } from '../config';
import { User, ShieldCheck } from 'lucide-react';

interface SidebarProps {
  isOpen?: boolean;
  activeGame: string;
  setGame: React.Dispatch<React.SetStateAction<string>>;
  onOpenProfile: () => void;
}

const Sidebar = ({ isOpen = false, activeGame, setGame, onOpenProfile }: SidebarProps) => {
  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-20 md:w-64 ${THEME.sidebar} border-r ${THEME.border} flex flex-col transition-all ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
      <div className="h-20 flex items-center justify-center md:justify-start md:px-6 border-b border-gray-800">
        <h1 className="text-2xl font-black text-white tracking-tighter hidden md:block">VEWIRE<span className={THEME.textAccent}>.COM</span></h1>
        <h1 className="text-2xl font-black text-white md:hidden">V</h1>
      </div>
      
      <div className="p-4 flex flex-col gap-2 overflow-y-auto">
        <div className="text-xs font-bold text-gray-500 uppercase px-4 mb-2 hidden md:block">Originals</div>
        {GAMES_CONFIG.map(g => (
          <button
            key={g.id}
            onClick={() => setGame(g.id)}
            className={`flex items-center gap-4 p-3 rounded-lg transition-all ${activeGame === g.id ? 'bg-[#2f3847] text-white' : 'text-gray-400 hover:text-white hover:bg-[#212735]'}`}
          >
            <g.icon size={20} className={activeGame === g.id ? g.color : ''} />
            <span className="font-bold hidden md:block">{g.name}</span>
            {activeGame === g.id && <div className="ml-auto w-2 h-2 rounded-full bg-green-500 hidden md:block" />}
          </button>
        ))}
      </div>
      
      <div className="mt-auto p-4 border-t border-gray-800">
        <button onClick={onOpenProfile} className="flex items-center gap-4 p-3 text-gray-400 hover:text-white w-full">
            <User size={20} />
            <span className="hidden md:block font-medium">Profile</span>
        </button>
        <button className="flex items-center gap-4 p-3 text-gray-400 hover:text-white w-full">
            <ShieldCheck size={20} />
            <span className="hidden md:block font-medium">Provably Fair</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
