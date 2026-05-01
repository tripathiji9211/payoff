import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone, Apple, Share } from 'lucide-react';

const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isVisible, setIsVisible] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);

    useEffect(() => {
        // Detect if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
            setIsStandalone(true);
            return;
        }

        // Detect iOS
        const userAgent = window.navigator.userAgent.toLowerCase();
        const ios = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(ios);

        const handleBeforeInstall = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
            
            // Show prompt after 30 seconds of engagement
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 30000);

            return () => clearTimeout(timer);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstall);

        // For iOS, we can show it after 30s regardless as there's no event
        if (ios) {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 30000);
            return () => clearTimeout(timer);
        }

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;
        
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
            setDeferredPrompt(null);
            setIsVisible(false);
        }
    };

    if (isStandalone || !isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                className="fixed bottom-6 left-6 right-6 z-[100] glass-card p-5 border-accent-cyan shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
            >
                <button 
                    onClick={() => setIsVisible(false)}
                    className="absolute top-3 right-3 text-secondary hover:text-white"
                >
                    <X size={16} />
                </button>

                <div className="flex gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shrink-0">
                        <Download size={24} />
                    </div>
                    
                    <div className="flex-1">
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Install OfflinePay</h3>
                        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1 mb-4">
                            Get the full native experience with offline capabilities and instant launch.
                        </p>
                        
                        {isIOS ? (
                            <div className="space-y-3">
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                    <Share size={14} className="text-accent-cyan" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white">
                                        1. Tap Share in Safari
                                    </p>
                                </div>
                                <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex items-center gap-3">
                                    <Smartphone size={14} className="text-accent-cyan" />
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white">
                                        2. Select "Add to Home Screen"
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={handleInstallClick}
                                className="w-full btn-gradient py-3 text-[10px] uppercase tracking-widest font-black"
                            >
                                Install Protocol
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default InstallPrompt;
