import React, { useState, useEffect, useRef } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useWallet } from '../context/WalletContext';
import { Wifi, WifiOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import InstallPrompt from './InstallPrompt';

import { useLocation, Link } from 'react-router-dom';
import { LayoutDashboard, Send, QrCode, Shield, History, Settings } from 'lucide-react';

const Layout = ({ children }) => {
    const isOnline = useOnlineStatus();
    const { addNotification, offlineLimit, trustScore } = useWallet();
    const location = useLocation();
    const [showOnlineBanner, setShowOnlineBanner] = useState(false);
    const hasMounted = useRef(false);
    const prevLimitRef = useRef(offlineLimit);

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
                    {children}
                </div>

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
