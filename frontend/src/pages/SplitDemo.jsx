import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Smartphone, Monitor, Info, Zap } from 'lucide-react';
import { motion } from 'framer-motion';

const SplitDemo = () => {
    const navigate = useNavigate();
    const baseUrl = window.location.origin + window.location.pathname;

    return (
        <div className="flex flex-col h-screen bg-[#050810] text-white overflow-hidden">
            {/* Header */}
            <div className="h-16 px-6 border-b border-white/5 flex items-center justify-between bg-[#0a0f1e]/80 backdrop-blur-md">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate('/')} className="w-8 h-8 rounded-full glass flex items-center justify-center hover:bg-white/10 transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <div className="flex items-center gap-2">
                        <Monitor size={18} className="text-accent-cyan" />
                        <h1 className="text-sm font-black uppercase italic tracking-tighter">Command Center: Split Demo</h1>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2 px-3 py-1 bg-accent-cyan/10 border border-accent-cyan/20 rounded-full">
                        <Zap size={12} className="text-accent-cyan animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-cyan">Auto-Sync Active</span>
                    </div>
                    <div className="hidden md:flex items-center gap-2 text-secondary">
                        <Info size={14} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">BroadcastChannel P2P Enabled</span>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex p-4 gap-4 overflow-hidden">
                {/* Left Side: Sender */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-red-400">Node A: SENDER (Saurabh)</span>
                        </div>
                        <Smartphone size={14} className="text-secondary opacity-50" />
                    </div>
                    <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
                        <iframe 
                            src={`${baseUrl}?user=9876543210&mode=demo`} 
                            className="w-full h-full border-none"
                            title="Sender Instance"
                        />
                        <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-accent-cyan/20 transition-colors rounded-3xl"></div>
                    </div>
                </div>

                {/* Right Side: Receiver */}
                <div className="flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-green-400">Node B: RECEIVER (Merchant)</span>
                        </div>
                        <Smartphone size={14} className="text-secondary opacity-50" />
                    </div>
                    <div className="flex-1 rounded-3xl overflow-hidden border border-white/10 shadow-2xl relative group">
                        <iframe 
                            src={`${baseUrl}?user=merchant&mode=demo`} 
                            className="w-full h-full border-none"
                            title="Receiver Instance"
                        />
                        <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-green-500/20 transition-colors rounded-3xl"></div>
                    </div>
                </div>
            </div>

            {/* Footer Bar */}
            <div className="h-10 px-6 bg-black flex items-center justify-center gap-8 border-t border-white/5">
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary">Local Signaling Relay: Online</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary">WebRTC DataChannel: Ready</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent-cyan animate-pulse"></div>
                    <span className="text-[8px] font-black uppercase tracking-[0.3em] text-secondary">Entropy Seed: Synchronized</span>
                </div>
            </div>
        </div>
    );
};

export default SplitDemo;
