import { Zap, Bomb, Dice5, Trophy, Percent, Grid3X3, Spade } from 'lucide-react';

export const THEME = {
  bg: "bg-[#0b0e11]",        // Ultra dark (Stake style)
  sidebar: "bg-[#1a202c]",
  card: "bg-[#212735]",
  input: "bg-[#0f141d]",
  accent: "bg-[#00E701]",    // Neon Green
  accentHover: "hover:bg-[#00c201]",
  textAccent: "text-[#00E701]",
  danger: "bg-[#ff4d4d]",
  border: "border-gray-800",
};

export interface GameProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onGameEnd: (win: boolean, amount: number) => void;
}

export const GAMES_CONFIG = [
  { id: 'CRASH', name: 'Crash', icon: Zap, color: 'text-yellow-500' },
  { id: 'MINES', name: 'Mines', icon: Bomb, color: 'text-red-500' },
  { id: 'DICE', name: 'Dice', icon: Dice5, color: 'text-blue-500' },
  { id: 'PLINKO', name: 'Plinko', icon: Trophy, color: 'text-purple-500' },
  { id: 'LIMBO', name: 'Limbo', icon: Percent, color: 'text-orange-500' },
  { id: 'ROULETTE', name: 'Roulette', icon: Grid3X3, color: 'text-green-500' },
  { id: 'BLACKJACK', name: 'Blackjack', icon: Spade, color: 'text-gray-300' },
  { id: 'HILO', name: 'HiLo', icon: Grid3X3, color: 'text-yellow-500' }, // Reusing icon for now
  { id: 'WHEEL', name: 'Wheel', icon: Grid3X3, color: 'text-pink-500' },
  { id: 'KENO', name: 'Keno', icon: Grid3X3, color: 'text-emerald-500' },
];
