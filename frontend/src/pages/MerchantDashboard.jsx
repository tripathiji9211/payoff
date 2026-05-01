import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { 
    LayoutDashboard, QrCode, Receipt, BarChart3, 
    History, Settings, Bell, TrendingUp, 
    ArrowUpRight, ArrowDownLeft, Plus, Zap,
    Store, CreditCard, Wallet, User, Users
} from 'lucide-react';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

import { DashboardSkeleton } from '../components/Skeletons';

const MerchantDashboard = () => {
    const { user, toggleMerchantMode } = useAuth();
    const { balance, transactions, pendingCount, notifications, isLoading } = useWallet();
    const navigate = useNavigate();
    const [isBalanceHidden, setIsBalanceHidden] = useState(false);
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

    const handleMouseMove = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        setMousePos({ x, y });
    };

    const handleMouseLeave = () => {
        setMousePos({ x: 0, y: 0 });
    };

    const todayReceived = (transactions || [])
        .filter(t => t.type === 'RECEIVE' && t.status === 'COMPLETED' && new Date(t.timestamp).toDateString() === new Date().toDateString())
        .reduce((s, t) => s + t.amount, 0);

    const pendingSettlement = (transactions || [])
        .filter(t => t.status === 'PENDING')
        .reduce((s, t) => s + t.amount, 0);

    const amountPresets = [10, 20, 50, 100, 500];

    if (isLoading) return (
        <div className="flex-1 p-6 pb-32 overflow-y-auto bg-[#0a0f1e]">
            <DashboardSkeleton />
        </div>
    );

    return (
        <div className="flex-1 flex flex-col p-6 pb-32 bg-[#050b18] text-white overflow-y-auto">
            {/* Merchant Header */}
            <header className="flex justify-between items-center mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 border border-purple-500/20 flex items-center justify-center text-accent-purple shadow-[0_0_20px_rgba(168,85,247,0.2)]">
                        <Store size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-black uppercase italic tracking-tighter leading-tight">Merchant HQ</h1>
                        <p className="text-[10px] text-accent-purple font-black uppercase tracking-[0.2em]">{user.name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => {
                            toggleMerchantMode();
                            toast.success('Switched to Customer Mode');
                        }}
                        className="w-10 h-10 rounded-full glass border-purple-500/10 flex items-center justify-center text-accent-purple hover:bg-purple-500/10 transition-colors"
                        title="Switch to Customer Mode"
                    >
                        <User size={18} />
                    </button>
                    <button className="w-10 h-10 rounded-full glass border-purple-500/10 flex items-center justify-center relative">
                        <Bell size={18} />
                        {notifications.length > 0 && <div className="absolute top-2 right-2 w-2 h-2 bg-accent-purple rounded-full shadow-[0_0_10px_rgba(168,85,247,0.5)]"></div>}
                    </button>
                    <Link to="/security" className="w-10 h-10 rounded-full glass border-purple-500/10 flex items-center justify-center">
                        <Settings size={18} />
                    </Link>
                </div>
            </header>

            {/* Business Stats Grid */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <motion.div 
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    style={{ 
                        perspective: 1000,
                        rotateX: mousePos.y * 10,
                        rotateY: -mousePos.x * 10,
                    }}
                    onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                    className="glass-card-purple p-5 cursor-pointer relative overflow-hidden group"
                >
                    <div className="absolute inset-0 bg-gradient-to-br from-accent-purple/5 to-transparent pointer-events-none"></div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                        <TrendingUp size={12} className="text-accent-purple" /> Today's Yield
                    </p>
                    <AnimatePresence mode="wait">
                        {isBalanceHidden ? (
                            <p key="h" className="text-2xl font-black tracking-widest text-accent-purple/30">●●●●</p>
                        ) : (
                            <p key="v" className="text-3xl font-black italic font-heading">₹{todayReceived.toLocaleString()}</p>
                        )}
                    </AnimatePresence>
                </motion.div>
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="glass-card-purple p-5 border-purple-500/10"
                >
                    <p className="text-[9px] font-black uppercase tracking-widest text-secondary mb-3 flex items-center gap-2">
                        <History size={12} className="text-accent-purple" /> Pending Sync
                    </p>
                    <p className="text-3xl font-black italic text-accent-purple font-heading">₹{pendingSettlement.toLocaleString()}</p>
                </motion.div>
            </div>

            {/* Primary Business Action */}
            <Link 
                to="/receive"
                className="btn-gradient w-full py-6 rounded-3xl flex flex-col items-center gap-1 bg-gradient-to-r from-purple-500 to-indigo-600 shadow-[0_15px_40px_rgba(168,85,247,0.3)] mb-8"
            >
                <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-80">Initialize Protocol</span>
                <span className="text-2xl font-black uppercase italic tracking-tighter">Receive Payment</span>
            </Link>

            {/* Merchant Quick Tools */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <Link to="/bill-gen" className="glass-card p-6 flex flex-col items-center gap-3 border-purple-500/10 hover:border-accent-purple transition-all group">
                    <Receipt size={24} className="group-hover:text-accent-purple transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Generate Bill</span>
                </Link>
                <Link to="/merchant-qr" className="glass-card p-6 flex flex-col items-center gap-3 border-purple-500/10 hover:border-accent-purple transition-all group">
                    <QrCode size={24} className="group-hover:text-accent-purple transition-colors" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Static QR</span>
                </Link>
            </div>

            {/* Quick Amount Presets */}
            <div className="mb-10">
                <p className="text-[10px] font-black uppercase tracking-widest text-secondary mb-4 flex items-center gap-2">
                    <Zap size={14} className="text-accent-purple" /> Quick Charge Presets
                </p>
                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                    {amountPresets.map(amt => (
                        <button 
                            key={amt}
                            onClick={() => navigate(`/receive?amount=${amt}`)}
                            className="flex-shrink-0 px-6 py-3 glass-card border-purple-500/10 hover:bg-accent-purple hover:text-white transition-all text-sm font-black italic"
                        >
                            ₹{amt}
                        </button>
                    ))}
                </div>
            </div>

            {/* Merchant Ledger Shortcuts */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary">Operational Ledger</h3>
                    <Link to="/analytics" className="text-[9px] font-black uppercase tracking-widest text-accent-purple">Analytics Dashboard</Link>
                </div>
                
                <Link to="/settlement-history" className="glass-card p-5 border-purple-500/10 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                            <CreditCard size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black">Settlement History</p>
                            <p className="text-[8px] text-secondary font-black uppercase tracking-widest">View daily batch reconciliations</p>
                        </div>
                    </div>
                    <ArrowUpRight size={18} className="text-secondary group-hover:text-accent-purple transition-all" />
                </Link>

                <div className="glass-card p-5 border-purple-500/10 flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                            <Users size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black">Customer Insights</p>
                            <p className="text-[8px] text-secondary font-black uppercase tracking-widest">Manage trust & loyalty scores</p>
                        </div>
                    </div>
                    <ArrowUpRight size={18} className="text-secondary group-hover:text-accent-purple transition-all" />
                </div>
            </div>
        </div>
    );
};

export default MerchantDashboard;
