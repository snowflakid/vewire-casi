import React, { useState } from 'react';
import { X, Lock, User, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { THEME } from '../config';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    
    const { login, register } = useAuth();

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        
        try {
            let success;
            if (isLogin) {
                success = await login(username, password);
                if (!success) setError('Invalid credentials');
            } else {
                success = await register(username, password);
                if (!success) setError('Username already taken');
            }
            
            if (success) {
                onClose();
            }
        } catch (err) {
            setError('Something went wrong');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
             <div className="bg-[#1a202c] w-full max-w-md rounded-2xl border border-gray-700 overflow-hidden shadow-2xl relative">
                <button 
                    onClick={onClose} 
                    className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>

                <div className="p-8">
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-bold text-white mb-2">
                            {isLogin ? 'Welcome Back' : 'Create Account'}
                        </h2>
                        <p className="text-gray-400">
                            {isLogin ? 'Login to continue your streak' : 'Join the premier crypto casino'}
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Username</label>
                            <div className="relative">
                                <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    type="text" 
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full bg-[#0f141d] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#00E701] focus:outline-none transition-colors"
                                    placeholder="Enter username"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    type="password" 
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0f141d] border border-gray-700 rounded-lg py-3 pl-10 pr-4 text-white focus:border-[#00E701] focus:outline-none transition-colors"
                                    placeholder="Enter password"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <div className="text-red-500 text-sm text-center bg-red-500/10 py-2 rounded">
                                {error}
                            </div>
                        )}

                        <button 
                            type="submit" 
                            disabled={loading}
                            className={`w-full ${THEME.accent} text-black font-bold py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}
                        >
                            {loading ? <Loader2 className="animate-spin" size={20} /> : (
                                <>
                                    {isLogin ? 'Login' : 'Create Account'}
                                    <ArrowRight size={18} />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-500 text-sm">
                            {isLogin ? "Don't have an account?" : "Already have an account?"}
                            <button 
                                onClick={() => setIsLogin(!isLogin)}
                                className="ml-2 text-[#00E701] hover:underline font-bold"
                            >
                                {isLogin ? 'Register' : 'Login'}
                            </button>
                        </p>
                    </div>
                </div>
             </div>
        </div>
    );
}
