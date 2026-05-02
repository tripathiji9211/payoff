import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Lock, User, ArrowRight, Phone, AtSign, Delete, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

const AuthScreen = () => {
    const [view, setView] = useState('landing'); // landing, login, register
    const [step, setStep] = useState(1); // Used for multi-step flows
    
    // Form Data
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [upiId, setUpiId] = useState('');
    const [pin, setPin] = useState('');
    const [confirmPin, setConfirmPin] = useState('');

    // Security State
    const [attempts, setAttempts] = useState(0);
    const [lockoutTimer, setLockoutTimer] = useState(0);
    const [isShaking, setIsShaking] = useState(false);

    const { login, register } = useAuth();
    const navigate = useNavigate();

    // Lockout countdown
    useEffect(() => {
        let timer;
        if (lockoutTimer > 0) {
            timer = setInterval(() => setLockoutTimer(prev => prev - 1), 1000);
        } else if (lockoutTimer === 0 && attempts >= 3) {
            setAttempts(0); // Reset after timeout
        }
        return () => clearInterval(timer);
    }, [lockoutTimer, attempts]);

    // Handle Phone change to auto-suggest UPI
    const handlePhoneChange = (val) => {
        const cleaned = val.replace(/\D/g, '').slice(0, 10);
        setPhone(cleaned);
        if (view === 'register') {
            setUpiId(`${cleaned}@offlinepay`);
        }
    };

    const handlePinClick = (num) => {
        if (pin.length < 6) setPin(prev => prev + num);
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    const handleConfirmPinClick = (num) => {
        if (confirmPin.length < 6) setConfirmPin(prev => prev + num);
    };

    const handleConfirmDelete = () => {
        setConfirmPin(prev => prev.slice(0, -1));
    };

    const triggerShake = () => {
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 500);
    };

    // Auto-submit login pin
    useEffect(() => {
        if (view === 'login' && pin.length === 6) {
            submitLogin();
        }
    }, [pin, view]);

    const submitLogin = async () => {
        console.log('[AuthScreen] Submitting Login:', { phone, pinLength: pin.length });
        
        if (lockoutTimer > 0) {
            toast.error(`Vault locked. Try again in ${lockoutTimer}s`);
            return;
        }

        const res = await login(phone, pin);
        if (res.success) {
            toast.success('Access Granted');
            navigate('/');
        } else {
            triggerShake();
            setPin('');
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);
            
            if (newAttempts >= 3) {
                setLockoutTimer(30);
                toast.error('Security Lockout: 30 seconds');
            } else {
                toast.error(res.message || 'Invalid PIN');
            }
        }
    };

    const submitRegister = async () => {
        if (phone.length !== 10) return toast.error('Valid 10-digit phone required');
        if (pin !== confirmPin) {
            toast.error('PINs do not match');
            setConfirmPin('');
            return;
        }

        const res = await register(name, phone, upiId, pin);
        if (res.success) {
            toast.success('Vault Created Successfully');
            navigate('/');
        } else {
            toast.error(res.message || 'Registration failed');
        }
    };

    return (
        <div className="flex-1 flex flex-col p-8 justify-center min-h-screen bg-[#0a0f1e] text-white">
            <AnimatePresence mode="wait">
                {/* 1. LANDING VIEW */}
                {view === 'landing' && (
                    <motion.div 
                        key="landing"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="flex flex-col items-center text-center max-w-sm mx-auto w-full"
                    >
                        <div className="w-24 h-24 bg-accent-cyan/10 rounded-[2rem] flex items-center justify-center text-accent-cyan mb-8 shadow-[0_0_40px_rgba(0,245,255,0.15)] border border-accent-cyan/20">
                            <Shield size={48} strokeWidth={2} />
                        </div>
                        <h1 className="text-5xl font-black tracking-tighter uppercase italic mb-4">Offline<span className="text-accent-cyan neon-text">Pay</span></h1>
                        <p className="text-secondary text-sm font-bold tracking-[0.2em] uppercase leading-relaxed mb-16">
                            Payments that work everywhere.<br/>Even offline.
                        </p>

                        <div className="w-full space-y-4">
                            <button onClick={() => { setView('login'); setStep(1); }} className="btn-gradient w-full py-5 text-sm uppercase tracking-widest">
                                Login to Vault
                            </button>
                            <button onClick={() => { setView('register'); setStep(1); }} className="glass-card w-full py-5 text-sm uppercase font-black tracking-widest hover:bg-white/5 border-white/10">
                                Create New Vault
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* 2. LOGIN VIEW */}
                {view === 'login' && (
                    <motion.div 
                        key="login"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full max-w-sm mx-auto relative"
                    >
                        <button 
                            onClick={() => { setView('landing'); setStep(1); setPin(''); }}
                            className="absolute -top-12 left-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-secondary hover:text-white transition-all active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {step === 1 && (
                            <div className="space-y-6">
                                <div className="text-center mb-10">
                                    <h2 className="text-2xl font-black uppercase italic tracking-widest mb-2">Identify</h2>
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.2em]">Enter Mobile Number</p>
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" size={20} />
                                    <input 
                                        type="tel" placeholder="10-DIGIT MOBILE" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 pl-12 pr-4 text-sm font-black tracking-[0.2em] outline-none focus:border-accent-cyan transition-colors"
                                        value={phone} onChange={(e) => handlePhoneChange(e.target.value)} 
                                        autoFocus
                                    />
                                </div>
                                <button 
                                    onClick={() => setStep(2)} 
                                    disabled={phone.length !== 10}
                                    className="btn-gradient w-full py-5 flex justify-center disabled:opacity-30 disabled:grayscale"
                                >
                                    Proceed <ArrowRight size={20} className="ml-2" />
                                </button>
                                <button onClick={() => setView('landing')} className="w-full mt-4 text-[10px] uppercase font-bold text-secondary tracking-widest">Cancel</button>
                            </div>
                        )}

                        {step === 2 && (
                            <motion.div className={isShaking ? 'animate-[shake_0.5s_ease-in-out]' : ''}>
                                <div className="text-center mb-10">
                                    <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">Vault Locked</h2>
                                    <p className="text-[10px] text-red-400 font-bold uppercase tracking-[0.2em] h-4">
                                        {lockoutTimer > 0 ? `LOCKED: ${lockoutTimer}s` : 'ENTER 6-DIGIT PIN'}
                                    </p>
                                    
                                    <div className="flex justify-center gap-4 mt-8">
                                        {[...Array(6)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className={`w-4 h-4 rounded-full border border-white/10 transition-all ${pin.length > i ? 'bg-accent-cyan shadow-[0_0_15px_rgba(0,245,255,0.5)] scale-125' : 'bg-white/5'}`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>

                                <div className={`grid grid-cols-3 gap-4 ${lockoutTimer > 0 ? 'opacity-30 pointer-events-none' : ''}`}>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((num, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                if (num === 'DEL') handleDelete();
                                                else if (num !== '') handlePinClick(num.toString());
                                            }}
                                            className={`h-16 glass-card text-2xl font-black flex items-center justify-center border-white/5 ${num === 'DEL' ? 'text-red-400' : ''} ${num === '' ? 'opacity-0 pointer-events-none' : 'hover:bg-accent-cyan/10 active:scale-95 transition-all'}`}
                                        >
                                            {num === 'DEL' ? <Delete size={24} className="mx-auto" /> : num}
                                        </button>
                                    ))}
                                </div>
                                <button onClick={() => { setStep(1); setPin(''); }} className="w-full mt-8 text-[10px] uppercase font-bold text-secondary tracking-widest">← Back</button>
                            </motion.div>
                        )}
                    </motion.div>
                )}

                {/* 3. REGISTER VIEW */}
                {view === 'register' && (
                    <motion.div 
                        key="register"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="w-full max-w-sm mx-auto relative"
                    >
                        <button 
                            onClick={() => { setView('landing'); setStep(1); setPin(''); setConfirmPin(''); }}
                            className="absolute -top-12 left-0 w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-secondary hover:text-white transition-all active:scale-90"
                        >
                            <ChevronLeft size={20} />
                        </button>

                        {step === 1 && (
                            <div className="space-y-4">
                                <div className="text-center mb-8">
                                    <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">Create Identity</h2>
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-[0.2em]">Setup your offline vault</p>
                                </div>
                                <div className="relative">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" size={18} />
                                    <input 
                                        type="text" placeholder="FULL NAME" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold tracking-widest outline-none focus:border-accent-cyan transition-colors"
                                        value={name} onChange={(e) => setName(e.target.value)} 
                                    />
                                </div>
                                <div className="relative">
                                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" size={18} />
                                    <input 
                                        type="tel" placeholder="10-DIGIT MOBILE" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-black tracking-[0.2em] outline-none focus:border-accent-cyan transition-colors"
                                        value={phone} onChange={(e) => handlePhoneChange(e.target.value)} 
                                    />
                                </div>
                                <div className="relative">
                                    <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 text-accent-cyan" size={18} />
                                    <input 
                                        type="text" placeholder="UPI ID" 
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs font-bold tracking-widest outline-none focus:border-accent-cyan transition-colors"
                                        value={upiId} onChange={(e) => setUpiId(e.target.value)} 
                                    />
                                </div>
                                <button 
                                    onClick={() => setStep(2)} 
                                    disabled={!name || phone.length !== 10 || !upiId}
                                    className="btn-gradient w-full py-5 mt-4 disabled:opacity-30 disabled:grayscale font-black tracking-widest text-[10px] uppercase"
                                >
                                    Proceed to Security
                                </button>
                                <button onClick={() => setView('landing')} className="w-full mt-4 text-[10px] uppercase font-bold text-secondary tracking-widest">Cancel</button>
                            </div>
                        )}

                        {step === 2 && (
                            <div>
                                <div className="text-center mb-8">
                                    <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">Set Security PIN</h2>
                                    <p className="text-[10px] text-accent-cyan font-bold uppercase tracking-[0.2em]">6-DIGIT MASTER KEY</p>
                                    
                                    <div className="flex justify-center gap-4 mt-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className={`w-3 h-3 rounded-full border border-white/10 transition-all ${pin.length > i ? 'bg-accent-cyan shadow-[0_0_10px_rgba(0,245,255,0.5)]' : 'bg-white/5'}`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((num, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                if (num === 'DEL') handleDelete();
                                                else if (num !== '') handlePinClick(num.toString());
                                            }}
                                            className={`h-14 glass-card text-xl font-black flex items-center justify-center border-white/5 ${num === 'DEL' ? 'text-red-400' : ''} ${num === '' ? 'opacity-0 pointer-events-none' : 'hover:bg-accent-cyan/10 active:scale-95'}`}
                                        >
                                            {num === 'DEL' ? <Delete size={24} className="mx-auto" /> : num}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex gap-4 mt-8">
                                    <button onClick={() => setStep(1)} className="glass-card flex-1 py-4 text-[10px] uppercase font-black tracking-widest">Back</button>
                                    <button 
                                        onClick={() => setStep(3)} 
                                        disabled={pin.length !== 6}
                                        className="btn-primary flex-1 py-4 text-[10px] uppercase font-black tracking-widest disabled:opacity-30 disabled:grayscale border border-white/10"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div>
                                <div className="text-center mb-8">
                                    <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">Confirm PIN</h2>
                                    <p className="text-[10px] text-accent-yellow font-bold uppercase tracking-[0.2em]">VERIFY MASTER KEY</p>
                                    
                                    <div className="flex justify-center gap-4 mt-6">
                                        {[...Array(6)].map((_, i) => (
                                            <div 
                                                key={i}
                                                className={`w-3 h-3 rounded-full border border-white/10 transition-all ${confirmPin.length > i ? 'bg-accent-yellow shadow-[0_0_10px_rgba(255,215,0,0.5)]' : 'bg-white/5'}`}
                                            ></div>
                                        ))}
                                    </div>
                                </div>

                                <div className="grid grid-cols-3 gap-3">
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((num, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => {
                                                if (num === 'DEL') handleConfirmDelete();
                                                else if (num !== '') handleConfirmPinClick(num.toString());
                                            }}
                                            className={`h-14 glass-card text-xl font-black flex items-center justify-center border-white/5 ${num === 'DEL' ? 'text-red-400' : ''} ${num === '' ? 'opacity-0 pointer-events-none' : 'hover:bg-accent-yellow/10 active:scale-95'}`}
                                        >
                                            {num === 'DEL' ? <Delete size={24} className="mx-auto" /> : num}
                                        </button>
                                    ))}
                                </div>
                                
                                <div className="flex gap-4 mt-8">
                                    <button onClick={() => { setStep(2); setConfirmPin(''); }} className="glass-card flex-1 py-4 text-[10px] uppercase font-black tracking-widest">Back</button>
                                    <button 
                                        onClick={submitRegister} 
                                        disabled={confirmPin.length !== 6}
                                        className="btn-primary flex-1 py-4 text-[10px] uppercase font-black tracking-widest disabled:opacity-50 disabled:grayscale border border-white/10 shadow-[0_0_20px_rgba(0,245,255,0.2)]"
                                    >
                                        Finalize
                                    </button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
            
            <style jsx>{`
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
                    20%, 40%, 60%, 80% { transform: translateX(5px); }
                }
            `}</style>
        </div>
    );
};

export default AuthScreen;
