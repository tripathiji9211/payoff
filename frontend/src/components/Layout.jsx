import React, { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useWallet } from '../context/WalletContext';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InstallPrompt from './InstallPrompt';

import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Send, QrCode, Shield, History, Settings, HelpCircle, Info, X } from 'lucide-react';

const Layout = ({ children }) => {
    const isOnline = useOnlineStatus();
    const { addNotification, offlineLimit, trustScore } = useWallet();
    const location = useLocation();
    const [showOnlineBanner, setShowOnlineBanner] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const hasMounted = useRef(false);
    const prevLimitRef = useRef(offlineLimit);

    const helpContentMap = {
        '/': {
            title: 'Dashboard Control Center',
            content: 'Your main command center. View your secure vault balance, trust score progress, and AI-driven smart insights. Use the bottom navigation to access core payment protocols.'
        },
        '/send': {
            title: 'Secure Send Protocol',
            content: 'Initiate offline payments. Enter recipient details and amount to generate an encrypted token. You can transmit this via QR scan, Local P2P Radar (Nearby), or standard SMS.'
        },
        '/receive': {
            title: 'Secure Receive Protocol',
            content: 'Accept payments without internet. Scan a sender\'s QR code, pair via Local P2P, or paste a received SMS token to instantly verify and credit your local ledger.'
        },
        '/pending': {
            title: 'Transaction Ledger',
            content: 'View your local transaction history. "Pending" items are secured in your offline vault and will be settled globally once you initiate a synchronization.'
        },
        '/security': {
            title: 'Vault Security & KYC',
            content: 'Manage biometric authorization, update your security PIN, and monitor trust factors. Higher trust scores unlock larger offline spending limits.'
        },
        '/sync': {
            title: 'Protocol Synchronization',
            content: 'The bridge between your offline vault and the main network. Syncing settles all pending local transactions and updates your global cloud balance.'
        }
    };

    const currentPageHelp = helpContentMap[location.pathname] || {
        title: 'General Protocol',
        content: 'PayOff allows you to conduct secure transactions even in zero-connectivity environments using advanced encryption and local ledger technology.'
    };

    useEffect(() => {
        if (prevLimitRef.current && offlineLimit > prevLimitRef.current) {
             addNotification('Trust Score Increased', `Your trust score increased to ${Math.round(trustScore)} — new limit ₹${offlineLimit.toLocaleString()}!`, 'trust_score', '/');
        }
        prevLimitRef.current = offlineLimit;
    }, [offlineLimit, trustScore]);

    useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
            return;
        }

        if (isOnline) {
            setShowOnlineBanner(true);
            addNotification('Back Online', 'Connected! Tap Sync to settle pending payments', 'online', '/sync');
            const t = setTimeout(() => setShowOnlineBanner(false), 3000);
            return () => clearTimeout(t);
        } else {
            addNotification('Went Offline', 'Offline mode activated — payments secured locally', 'offline', null);
        }
    }, [isOnline]);

    useEffect(() => {
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            navigator.serviceWorker.ready.then(registration => {
                registration.sync.register('sync-payments').catch(err => {
                    console.error('Background Sync registration failed', err);
                });
            });
        }
    }, []);

    const navItems = [
        { path: '/', icon: <LayoutDashboard size={20} />, label: 'Home' },
        { path: '/send', icon: <Send size={20} />, label: 'Send' },
        { path: '/receive', icon: <QrCode size={20} />, label: 'Receive' },
        { path: '/pending', icon: <History size={20} />, label: 'Logs' },
        { path: '/security', icon: <Shield size={20} />, label: 'Vault' }
    ];

    return (
        <div className="min-h-screen bg-[#050b18] flex justify-center overflow-x-hidden">
            <div className="w-full max-w-[430px] min-h-screen flex flex-col relative bg-[#050b18] shadow-2xl shadow-cyan-500/10">
                {/* Network Banner */}
                <AnimatePresence>
                    {!isOnline && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-red-500 text-white text-[10px] font-black uppercase tracking-widest py-2 px-4 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(239,68,68,0.3)] z-50 overflow-hidden"
                        >
                            <WifiOff size={12} /> Offline Mode — Local Ledger Active
                        </motion.div>
                    )}
                    {isOnline && showOnlineBanner && (
                        <motion.div 
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-accent-green text-[#050b18] text-[10px] font-black uppercase tracking-widest py-2 px-4 flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(0,255,136,0.3)] z-50 overflow-hidden"
                        >
                            <Wifi size={12} /> Protocol Online — Synchronizing
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="flex-1 flex flex-col relative pb-safe">
                    {/* Floating Help Icon */}
                    <button 
                        onClick={() => setShowHelp(true)}
                        className={`absolute z-40 w-10 h-10 rounded-full glass border border-white/10 flex items-center justify-center text-secondary hover:text-accent-cyan hover:border-accent-cyan/30 transition-all shadow-lg active:scale-90 ${
                            location.pathname === '/pending' ? 'top-[30px] right-6' : 'top-[26px] right-6'
                        }`}
                    >
                        <HelpCircle size={location.pathname === '/pending' ? 22 : 20} />
                    </button>

                    {children}
                </div>

                {/* Global Help Slide-up Panel */}
                <AnimatePresence>
                    {showHelp && (
                        <>
                            <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150]"
                                onClick={() => setShowHelp(false)}
                            />
                            <motion.div 
                                initial={{ y: '100%' }}
                                animate={{ y: 0 }}
                                exit={{ y: '100%' }}
                                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                                className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a0f1e] border-t border-white/10 rounded-t-[2.5rem] p-8 z-[200] shadow-[0_-20px_50px_rgba(0,0,0,0.5)]"
                            >
                                <div className="flex justify-between items-center mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-xl bg-accent-cyan/10 text-accent-cyan">
                                            <HelpCircle size={24} />
                                        </div>
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-white">Help System</h2>
                                    </div>
                                    <button 
                                        onClick={() => setShowHelp(false)}
                                        className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-secondary hover:text-white transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-8">
                                    {/* Section A: About App */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Shield size={14} className="text-accent-cyan" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">About Protocol</h3>
                                        </div>
                                        <div className="glass-card p-5 border-white/5">
                                            <p className="text-xs text-white/80 font-bold leading-relaxed">
                                                PayOff is a military-grade offline payment protocol. It uses AES-256 encryption and Local Ledger Technology to secure transactions without internet.
                                            </p>
                                        </div>
                                    </section>

                                    {/* Section B: About Page */}
                                    <section>
                                        <div className="flex items-center gap-2 mb-4">
                                            <Info size={14} className="text-accent-cyan" />
                                            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary">Contextual Insight: {currentPageHelp.title}</h3>
                                        </div>
                                        <div className="glass-card p-5 border-accent-cyan/20 bg-accent-cyan/5">
                                            <p className="text-xs text-white/90 font-medium leading-relaxed">
                                                {currentPageHelp.content}
                                            </p>
                                        </div>
                                    </section>
                                </div>

                                <div className="mt-10 flex justify-center">
                                    <p className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary/30">Protocol v1.0.4 — Secure Ledger</p>
                                </div>
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>

                {/* Bottom Navigation */}
                <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-[#0a1628]/80 backdrop-blur-xl border-t border-white/5 pb-safe z-[100]">
                    <div className="flex justify-around items-center h-16 px-4">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            return (
                                <Link 
                                    key={item.path} 
                                    to={item.path}
                                    className="flex flex-col items-center gap-1 transition-all duration-300 relative group"
                                >
                                    <motion.div 
                                        animate={{ 
                                            scale: isActive ? 1.2 : 1,
                                            color: isActive ? 'var(--accent-cyan)' : 'var(--text-secondary)'
                                        }}
                                        className={`p-2 rounded-xl transition-colors ${isActive ? 'bg-accent-cyan/10' : 'hover:text-white'}`}
                                    >
                                        {item.icon}
                                    </motion.div>
                                    <AnimatePresence>
                                        {isActive && (
                                            <motion.span 
                                                initial={{ opacity: 0, y: 5 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: 5 }}
                                                className="text-[8px] font-black uppercase tracking-widest text-accent-cyan"
                                            >
                                                {item.label}
                                            </motion.span>
                                        )}
                                    </AnimatePresence>
                                    {isActive && (
                                        <motion.div 
                                            layoutId="nav-indicator"
                                            className="absolute -top-1 w-1 h-1 rounded-full bg-accent-cyan shadow-[0_0_10px_var(--accent-cyan)]"
                                        />
                                    )}
                                </Link>
                            );
                        })}
                    </div>
                </nav>

                <InstallPrompt />
            </div>
        </div>
    );
};

export default Layout;
