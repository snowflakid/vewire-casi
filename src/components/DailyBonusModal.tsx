import { useState, useEffect, useRef } from 'react';
import { X, Gift } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

interface DailyBonusModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const SEGMENTS = [
    { value: 50, color: '#ef4444', label: '$50' },
    { value: 100, color: '#3b82f6', label: '$100' },
    { value: 250, color: '#22c55e', label: '$250' },
    { value: 500, color: '#eab308', label: '$500' },
    { value: 1000, color: '#a855f7', label: '$1K' },
    { value: 5000, color: '#ec4899', label: '$5K' },
];

export default function DailyBonusModal({ isOpen, onClose }: DailyBonusModalProps) {
    const { user, updateUser } = useAuth();
    const { playSound } = useSettings();
    
    const [canSpin, setCanSpin] = useState(false);
    const [timeLeft, setTimeLeft] = useState('');
    const [isSpinning, setIsSpinning] = useState(false);
    const [rotation, setRotation] = useState(0);
    const [result, setResult] = useState<number | null>(null);

    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!isOpen) return;
        checkAvailability();
        const timer = setInterval(checkAvailability, 1000);
        return () => clearInterval(timer);
    }, [isOpen, user?.lastDailySpin]);

    useEffect(() => {
        if (isOpen && canvasRef.current) {
            drawWheel();
        }
    }, [isOpen, rotation]);

    const checkAvailability = () => {
        if (!user) return;
        
        if (!user.lastDailySpin) {
            setCanSpin(true);
            setTimeLeft('Ready to Spin!');
            return;
        }

        const lastSpinDate = new Date(user.lastDailySpin);
        const now = new Date();
        
        // Reset at midnight UTC or simply 24h cooldown? 
        // Let's go with 24h cooldown for simplicity in this prototype
        const nextSpin = new Date(lastSpinDate.getTime() + 24 * 60 * 60 * 1000);
        
        if (now >= nextSpin) {
            setCanSpin(true);
            setTimeLeft('Ready to Spin!');
        } else {
            setCanSpin(false);
            const diff = nextSpin.getTime() - now.getTime();
            const h = Math.floor(diff / (1000 * 60 * 60));
            const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((diff % (1000 * 60)) / 1000);
            setTimeLeft(`${h}h ${m}m ${s}s`);
        }
    };

    const drawWheel = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const radius = canvas.width / 2 - 10;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        const segmentAngle = (2 * Math.PI) / SEGMENTS.length;
        const startRotation = rotation * (Math.PI / 180);

        SEGMENTS.forEach((segment, i) => {
            ctx.beginPath();
            ctx.moveTo(centerX, centerY);
            ctx.arc(centerX, centerY, radius, startRotation + i * segmentAngle, startRotation + (i + 1) * segmentAngle);
            ctx.fillStyle = segment.color;
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(startRotation + i * segmentAngle + segmentAngle / 2);
            ctx.textAlign = 'right';
            ctx.fillStyle = 'white';
            ctx.font = 'bold 16px sans-serif';
            ctx.fillText(segment.label, radius - 20, 5);
            ctx.restore();
        });

        // Pointer
        ctx.beginPath();
        ctx.moveTo(centerX + 15, centerY - radius - 5);
        ctx.lineTo(centerX - 15, centerY - radius - 5);
        ctx.lineTo(centerX, centerY - radius + 15);
        ctx.fillStyle = 'white';
        ctx.fill();
    };

    const spin = () => {
        if (!canSpin || isSpinning || !user) return;
        
        setIsSpinning(true);
        setResult(null);
        playSound('click');

        // Determine outcome immediately (server-side usually, but here client-side)
        // Weighted random
        const rand = Math.random();
        let selectedIndex = 0;
        if (rand < 0.40) selectedIndex = 0; // $50
        else if (rand < 0.70) selectedIndex = 1; // $100
        else if (rand < 0.85) selectedIndex = 2; // $250
        else if (rand < 0.95) selectedIndex = 3; // $500
        else if (rand < 0.99) selectedIndex = 4; // $1000
        else selectedIndex = 5; // $5000

        // IMMEDIATE UPDATE: Commit result to DB to prevent refresh abuse
        const prize = SEGMENTS[selectedIndex];
        updateUser((prev) => ({
            balance: prev.balance + prize.value,
            weeklyBalance: prev.weeklyBalance + prize.value,
            lastDailySpin: new Date().toISOString()
        }));

        // Calculate target rotation
        // We want the selected segment to point UP (or where our pointer is).
        // Our pointer is at -90 degrees (top).
        // Segment 0 starts at 0 degrees (right) by default arc drawing? 
        // Actually, let's just rotate physically.
        
        const segmentAngleDeg = 360 / SEGMENTS.length;
        // The center of the selected segment needs to align with the pointer.
        // Let's just add huge rotation + specific offset.
        
        const spins = 5 * 360; 
        
        // Calculate the angle where the segment is
        // We want the final rotation `R` such that:
        // (R + segmentIndex * segmentAngle + segmentAngle/2) % 360  is roughly 270 (top)
        
        // It's easier to think: Target Angle = 270 - (Index * SegAngle + SegAngle/2)
        const targetAngle = 270 - (selectedIndex * segmentAngleDeg + segmentAngleDeg / 2);
        const finalRotation = spins + targetAngle + (Math.random() * 10 - 5); // Add jitter

        let currentRot = rotation % 360;
        const startTime = performance.now();
        const duration = 4000;

        const animate = (time: number) => {
            const elapsed = time - startTime;
            if (elapsed < duration) {
                // Ease out cubic
                const t = elapsed / duration;
                const ease = 1 - Math.pow(1 - t, 3);
                
                const newRot = currentRot + (finalRotation - currentRot) * ease;
                setRotation(newRot);
                requestAnimationFrame(animate);
            } else {
                setRotation(finalRotation);
                setIsSpinning(false);
                handleWin(selectedIndex);
            }
        };

        requestAnimationFrame(animate);
    };

    const handleWin = (index: number) => {
        const prize = SEGMENTS[index];
        setResult(prize.value);
        playSound('win');
        // DB update is now done at start of spin to prevent abuse
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-vewire-sidebar w-full max-w-md rounded-2xl border border-vewire-border overflow-hidden shadow-2xl flex flex-col relative">
                
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors z-10">
                    <X size={24} />
                </button>

                <div className="p-8 flex flex-col items-center gap-6">
                    <div className="text-center">
                        <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2 mb-2">
                            <Gift className="text-vewire-accent" /> DAILY WHEEL
                        </h2>
                        <p className="text-gray-400 text-sm">Spin once every 24 hours for free crypto!</p>
                    </div>

                    <div className="relative">
                        {/* Pointer override visualization */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 w-4 h-6 bg-white shadow-lg" style={{clipPath: 'polygon(50% 100%, 0 0, 100% 0)'}}></div>
                        
                        <canvas 
                            ref={canvasRef} 
                            width={300} 
                            height={300} 
                            className="rounded-full border-4 border-vewire-card shadow-[0_0_50px_rgba(34,197,94,0.2)]"
                        />
                    </div>

                    <div className="text-center h-16">
                        {isSpinning ? (
                            <div className="text-xl font-bold text-white animate-pulse">Spinning...</div>
                        ) : result !== null ? (
                            <div className="animate-in zoom-in duration-300">
                                <div className="text-gray-400 text-sm font-bold uppercase">You Won</div>
                                <div className="text-4xl font-black text-vewire-accent drop-shadow-lg">${result.toFixed(2)}</div>
                            </div>
                        ) : (
                            !canSpin && (
                                <div className="flex flex-col items-center">
                                    <div className="text-gray-400 text-sm font-bold uppercase">Next Spin In</div>
                                    <div className="text-2xl font-mono text-white">{timeLeft}</div>
                                </div>
                            )
                        )}
                    </div>

                    <button 
                        onClick={spin}
                        disabled={!canSpin || isSpinning}
                        className={`w-full py-4 rounded-xl font-black text-lg uppercase tracking-wider transition-all transform hover:scale-[1.02] active:scale-[0.98]
                            ${canSpin && !isSpinning 
                                ? 'bg-vewire-accent text-black shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)]' 
                                : 'bg-vewire-input text-gray-500 cursor-not-allowed border border-vewire-border'
                            }`}
                    >
                        {isSpinning ? 'Good Luck!' : canSpin ? 'Spin Now' : 'Come Back Later'}
                    </button>
                </div>
             </div>
        </div>
    );
}
