import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { STORES, putData, clearStore } from '../services/db';
import { useWallet } from './WalletContext';

const DemoContext = createContext();

export const DemoProvider = ({ children }) => {
    const [isDemoActive, setIsDemoActive] = useState(false);
    const [demoStep, setDemoStep] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { refreshWallet } = useWallet();

    const DEMO_STEPS = [
        { id: 1, text: "Simulating offline mode...", type: "auto" },
        { id: 2, text: "Auto-filling send details...", type: "interactive" },
        { id: 3, text: "Entering PIN & generating offline token...", type: "interactive" },
        { id: 4, text: "Receiver scanning QR code...", type: "interactive" },
        { id: 5, text: "Processing payment...", type: "interactive" },
        { id: 6, text: "Restoring internet connection...", type: "auto" },
        { id: 7, text: "Synchronizing vault with network...", type: "interactive" },
        { id: 8, text: "Demo Complete ✅", type: "auto" }
    ];

    const preloadFakeData = async () => {
        await clearStore(STORES.HISTORY);
        const fakes = [
            { id: `TXN_${Date.now()-100000}`, txnId: `TXN_${Date.now()-100000}`, type: 'SEND', amount: 1500, status: 'COMPLETED', timestamp: Date.now() - 86400000 },
            { id: `TXN_${Date.now()-200000}`, txnId: `TXN_${Date.now()-200000}`, type: 'RECEIVE', amount: 300, status: 'COMPLETED', timestamp: Date.now() - 172800000 },
            { id: `TXN_${Date.now()-300000}`, txnId: `TXN_${Date.now()-300000}`, type: 'SEND', amount: 50, status: 'FAILED', reason: 'Network Timeout', timestamp: Date.now() - 259200000 }
        ];
        for (let f of fakes) {
            await putData(STORES.HISTORY, f);
        }
        await refreshWallet();
    };

    const startDemo = async () => {
        setIsDemoActive(true);
        setDemoStep(1);
        setIsPaused(false);
        await preloadFakeData();
        navigate('/');
    };

    const resetDemo = async () => {
        setIsDemoActive(false);
        setDemoStep(0);
        window.MOCK_OFFLINE = false;
        window.dispatchEvent(new Event('mock-online-change'));
        await clearStore(STORES.HISTORY);
        await refreshWallet();
        navigate('/');
    };

    const nextStep = () => {
        if (demoStep < DEMO_STEPS.length) {
            setDemoStep(prev => prev + 1);
        } else {
            setIsDemoActive(false);
            setDemoStep(0);
        }
    };

    // Global step conductor
    useEffect(() => {
        if (!isDemoActive || isPaused || demoStep === 0) return;

        const executeStep = async () => {
            if (demoStep === 1) {
                window.MOCK_OFFLINE = true;
                window.dispatchEvent(new Event('mock-online-change'));
                setTimeout(nextStep, 2000);
            } 
            else if (demoStep === 2) {
                if (location.pathname !== '/send') navigate('/send');
            }
            else if (demoStep === 4) {
                if (location.pathname !== '/receive') navigate('/receive');
            }
            else if (demoStep === 6) {
                window.MOCK_OFFLINE = false;
                window.dispatchEvent(new Event('mock-online-change'));
                setTimeout(nextStep, 2000);
            }
            else if (demoStep === 7) {
                if (location.pathname !== '/sync') navigate('/sync');
            }
            else if (demoStep === 8) {
                navigate('/');
                setTimeout(() => {
                    setIsDemoActive(false);
                    setDemoStep(0);
                }, 4000);
            }
        };

        executeStep();
    }, [demoStep, isDemoActive, isPaused, navigate, location.pathname]);

    return (
        <DemoContext.Provider value={{ 
            isDemoActive, 
            demoStep, 
            startDemo, 
            resetDemo, 
            nextStep, 
            isPaused, 
            setIsPaused, 
            currentStepInfo: DEMO_STEPS.find(s => s.id === demoStep) 
        }}>
            {children}
            {isDemoActive && <DemoOverlay />}
        </DemoContext.Provider>
    );
};

const DemoOverlay = () => {
    const { demoStep, isPaused, setIsPaused, currentStepInfo, resetDemo } = useDemo();

    if (!currentStepInfo) return null;

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[100] bg-black/80 backdrop-blur-md border-t border-accent-cyan/30 p-4">
            <div className="max-w-md mx-auto flex items-center justify-between">
                <div>
                    <p className="text-[10px] text-accent-cyan font-black uppercase tracking-widest mb-1">
                        Live Demo • Step {demoStep} of 8
                    </p>
                    <p className="text-sm font-bold text-white">{currentStepInfo.text}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => setIsPaused(!isPaused)} 
                        className="px-3 py-1.5 glass-card text-[10px] uppercase font-black tracking-widest hover:text-accent-cyan"
                    >
                        {isPaused ? 'RESUME' : 'PAUSE'}
                    </button>
                    <button 
                        onClick={resetDemo} 
                        className="px-3 py-1.5 glass-card text-[10px] text-red-400 uppercase font-black tracking-widest hover:bg-red-500/10"
                    >
                        EXIT
                    </button>
                </div>
            </div>
        </div>
    );
};

export const useDemo = () => useContext(DemoContext);
