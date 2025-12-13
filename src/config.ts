import { Zap, Bomb, Dice5, Trophy, Percent, Spade, Scissors, Gem, Disc, ArrowUpDown, LayoutGrid, PieChart } from 'lucide-react';

export const THEME = {
  bg: "bg-vewire-bg",
  sidebar: "bg-vewire-sidebar",
  card: "bg-vewire-card",
  input: "bg-vewire-input",
  accent: "bg-vewire-accent",
  accentHover: "hover:bg-vewire-accent-hover",
  textAccent: "text-vewire-accent",
  danger: "bg-[#ff4d4d]",
  border: "border-vewire-border",
};

export interface GameProps {
  balance: number;
  setBalance: React.Dispatch<React.SetStateAction<number>>;
  onGameEnd: (win: boolean, payout: number, betAmount: number) => void;
}

export const GAMES_CONFIG = [
  { id: 'CRASH', name: 'Crash', icon: Zap, color: 'text-yellow-500' },
  { id: 'MINES', name: 'Mines', icon: Bomb, color: 'text-red-500' },
  { id: 'DICE', name: 'Dice', icon: Dice5, color: 'text-blue-500' },
  { id: 'SLOTS', name: 'Slots', icon: Gem, color: 'text-cyan-400' },
  { id: 'PLINKO', name: 'Plinko', icon: Trophy, color: 'text-purple-500' },
  { id: 'LIMBO', name: 'Limbo', icon: Percent, color: 'text-orange-500' },
  { id: 'ROULETTE', name: 'Roulette', icon: Disc, color: 'text-green-500' },
  { id: 'BLACKJACK', name: 'Blackjack', icon: Spade, color: 'text-gray-300' },
  { id: 'RPS', name: 'RPS', icon: Scissors, color: 'text-pink-500' },
  { id: 'HILO', name: 'HiLo', icon: ArrowUpDown, color: 'text-yellow-500' }, 
  { id: 'WHEEL', name: 'Wheel', icon: PieChart, color: 'text-pink-500' },
  { id: 'KENO', name: 'Keno', icon: LayoutGrid, color: 'text-emerald-500' },
];

