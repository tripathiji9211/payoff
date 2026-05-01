import React, { useState, useEffect } from 'react';
import { useSecurity } from '../context/SecurityContext';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Fingerprint, Delete, AlertCircle, Loader2 } from 'lucide-react';

const LockScreen = ({ children }) => {
    const { user } = useAuth();
    const { isLocked, unlockWithPin, verifyBiometric, biometricEnabled, lockoutUntil } = useSecurity();
    const [pin, setPin] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [shake, setShake] = useState(false);

    useEffect(() => {
        if (isLocked && biometricEnabled && !lockoutUntil) {
            handleBiometric();
        }
    }, [isLocked, biometricEnabled]);

    const handlePinClick = (num) => {
        if (pin.length < 6) setPin(prev => prev + num);
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    useEffect(() => {
        if (pin.length === 6) {
            submitPin();
        }
    }, [pin]);

    const submitPin = async () => {
        setIsVerifying(true);
        const success = await unlockWithPin(pin);
        if (!success) {
            setShake(true);
            setPin('');
            setTimeout(() => setShake(false), 500);
        }
        setIsVerifying(false);
    };

    const handleBiometric = async () => {
        setIsVerifying(true);
        await verifyBiometric();
        setIsVerifying(false);
    };

    if (!isLocked) return children;

    return (
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-[#0a0f1e] flex flex-col items-center justify-center p-6"
        >
            <div className="absolute inset-0 bg-gradient-to-b from-accent-cyan/5 to-transparent pointer-events-none"></div>

            <div className="mb-12 text-center">
                <motion.div 
                    animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
                    className="w-20 h-20 rounded-3xl bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,245,255,0.1)]"
                >
                    <Lock size={32} className="text-accent-cyan" />
                </motion.div>
                <h1 className="text-xl font-black uppercase italic tracking-widest text-white mb-2 font-heading">Vault Locked</h1>
                <p className="text-[10px] text-secondary uppercase font-bold tracking-[0.2em]">Hello, {user?.name}</p>
            </div>

            <div className="flex justify-center gap-4 mb-12">
                {[...Array(6)].map((_, i) => (
                    <motion.div 
                        key={i}
                        animate={{ 
                            scale: pin.length > i ? [1, 1.4, 1] : 1,
                            backgroundColor: pin.length > i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)',
                            boxShadow: pin.length > i ? '0 0 20px var(--accent-cyan)' : 'none'
                        }}
                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                        className="w-4 h-4 rounded-full border border-white/10"
                    ></motion.div>
                ))}
            </div>

            {lockoutUntil && (
                <div className="mb-8 p-4 glass-card bg-red-500/10 border-red-500/20 flex items-center gap-3 text-red-400">
                    <AlertCircle size={18} />
                    <p className="text-[10px] font-black uppercase tracking-widest">
                        Security Lockout Active
                    </p>
                </div>
            )}

            <div className="grid grid-cols-3 gap-4 w-full max-w-xs">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                    <button 
                        key={num} 
                        onClick={() => handlePinClick(num.toString())} 
                        disabled={!!lockoutUntil || isVerifying}
                        className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-black hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 font-mono"
                    >
                        {num}
                    </button>
                ))}
                
                <button 
                    onClick={handleBiometric} 
                    disabled={!biometricEnabled || !!lockoutUntil || isVerifying}
                    className="h-16 rounded-2xl flex items-center justify-center text-accent-cyan hover:bg-accent-cyan/10 active:scale-90 transition-all disabled:opacity-0"
                >
                    <Fingerprint size={28} />
                </button>
                
                <button 
                    onClick={() => handlePinClick('0')} 
                    disabled={!!lockoutUntil || isVerifying}
                    className="h-16 rounded-2xl bg-white/5 border border-white/5 text-xl font-black hover:bg-white/10 active:scale-90 transition-all disabled:opacity-20 font-mono"
                >
                    0
                </button>

                <button 
                    onClick={handleDelete} 
                    disabled={pin.length === 0 || !!lockoutUntil || isVerifying}
                    className="h-16 rounded-2xl flex items-center justify-center text-red-400 hover:bg-red-400/10 active:scale-90 transition-all disabled:opacity-20"
                >
                    <Delete size={24} />
                </button>
            </div>

            <button 
                onClick={() => window.location.reload()}
                className="mt-12 text-[10px] font-black uppercase tracking-widest text-secondary hover:text-white transition-colors"
            >
                Reset Session
            </button>
            
            {isVerifying && (
                <div className="mt-8 flex items-center gap-2 text-accent-cyan">
                    <Loader2 size={14} className="animate-spin" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">Securing...</span>
                </div>
            )}
        </motion.div>
    );
};

export default LockScreen;
