import React, { useState, useEffect } from 'react';
import { useAuth, DEMO_ACCOUNTS } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { 
    Wallet, Send, QrCode, History, RefreshCcw, Bell, User, 
    ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, AlertCircle, 
    LogOut, WifiOff, Wifi, Award, Trash2, Users, Monitor,
    X, PlayCircle, Fingerprint, Lock, Zap, Shield, Store, Sparkles,
    Globe
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '../context/DemoContext';
import { useSecurity } from '../context/SecurityContext';
import MerchantDashboard from './MerchantDashboard';
import toast from 'react-hot-toast';
import { DashboardSkeleton } from '../components/Skeletons';
import { EmptyTransactions, EmptyNotifications } from '../components/EmptyStates';

const CustomerDashboard = ({ 
    user, logout, switchAccount, 
    balance, transactions, pendingCount, 
    notifications, isSyncing, markNotificationsAsRead, 
    deleteNotification, trustScore, trustFactors, 
    offlineLimit, isLoading, isDemoActive, 
    startDemo, isOnline, navigate, 
    showNotifications, setShowNotifications, 
    showTrustPopup, setShowTrustPopup, 
    showAccountSwitch, setShowAccountSwitch, 
    biometricSupported, biometricEnabled, registerBiometric, 
    showBioPrompt, setShowBioPrompt,
    isMerchant, toggleMerchantMode,
    handleEnableBio, dismissBio, trustColor, radius, circumference, 
    strokeDashoffset, unreadCount, getTimeAgo, getStatusIcon, getNotifIcon, 
    groupedNotifications, handleNotifClick 
}) => {
    const [lang, setLang] = useState('EN');
    const [showLangSelector, setShowLangSelector] = useState(false);
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

    if (isLoading) return (
        <div className="flex-1 p-6 pb-32 overflow-y-auto">
            <DashboardSkeleton />
        </div>
    );

    return (
        <div className="flex-1 p-6 pb-32 overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent-cyan to-blue-500 flex items-center justify-center text-[#0a0f1e] font-black text-xl shadow-[0_0_15px_rgba(0,245,255,0.4)] cursor-pointer" onClick={() => setShowAccountSwitch(true)}>
                        {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                    <div className="cursor-pointer" onClick={() => setShowAccountSwitch(true)}>
                        <p className="text-sm font-black text-white">{user?.name || 'Authorized User'}</p>
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 bg-white/5 w-fit mt-1">
                            {biometricEnabled ? <Fingerprint size={8} className="text-accent-cyan" /> : <Lock size={8} className="text-secondary" />}
                            <span className="text-[7px] font-black uppercase tracking-widest text-secondary">
                                {biometricEnabled ? 'Secured with Biometrics' : 'Secured with PIN'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {!isDemoActive && (
                        <div className="flex flex-col gap-1">
                            <button onClick={startDemo} className="flex items-center gap-1 px-2 py-1 bg-accent-cyan/10 border border-accent-cyan/20 rounded-md text-[8px] font-black uppercase tracking-widest text-accent-cyan hover:bg-white hover:text-[#0a0f1e] hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] transition-all duration-300">
                                <PlayCircle size={10} /> DEMO
                            </button>
                            <Link to="/split-demo" className="hidden lg:flex items-center gap-1 px-2 py-1 bg-white/5 border border-white/10 rounded-md text-[8px] font-black uppercase tracking-widest text-secondary hover:text-white transition-colors">
                                <Monitor size={10} /> SPLIT
                            </Link>
                        </div>
                    )}
                    {/* Language Selector */}
                    <div className="relative flex items-center">
                        <button 
                            onClick={() => setShowLangSelector(!showLangSelector)}
                            className={`flex items-center bg-white/5 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 transition-all duration-300 ${showLangSelector ? 'ring-1 ring-accent-cyan/30' : ''}`}
                        >
                            <span className={`text-[10px] font-black transition-all ${showLangSelector ? 'text-accent-cyan' : 'text-white'}`}>
                                {lang}
                            </span>
                        </button>
                        
                        <AnimatePresence>
                            {showLangSelector && (
                                <motion.div 
                                    initial={{ opacity: 0, y: -5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -5 }}
                                    className="absolute top-full mt-2 left-0 min-w-[48px] flex flex-col gap-1 p-1 rounded-lg bg-[#0a0f1e]/95 backdrop-blur-xl border border-white/10 shadow-2xl z-[60]"
                                >
                                    {['EN', 'HI', 'KN'].filter(l => l !== lang).map(l => (
                                        <button 
                                            key={l}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setLang(l);
                                                setShowLangSelector(false);
                                            }}
                                            className="w-full px-3 py-2 text-[9px] font-bold text-white/30 hover:text-white hover:bg-white/5 rounded transition-all text-center"
                                        >
                                            {l}
                                        </button>
                                    ))}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Notification Bell */}
                    <div className="relative cursor-pointer" onClick={() => {
                        setShowNotifications(!showNotifications);
                        if (!showNotifications && unreadCount > 0) markNotificationsAsRead();
                    }}>
                        <Bell size={20} className={unreadCount > 0 ? 'text-accent-cyan' : 'text-secondary'} />
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[8px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f1e]">
                                {unreadCount}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Notification Slide-in Panel */}
            <AnimatePresence>
                {showNotifications && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                            onClick={() => setShowNotifications(false)}
                        />
                        <motion.div 
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                            className="fixed right-0 top-0 bottom-0 w-80 bg-[#0a0f1e]/95 backdrop-blur-xl border-l border-white/10 z-50 flex flex-col shadow-[-10px_0_30px_rgba(0,0,0,0.5)]"
                        >
                            <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                                <h3 className="text-sm font-black uppercase tracking-widest text-white">Notifications</h3>
                                <div className="flex items-center gap-4">
                                    {unreadCount > 0 && (
                                        <button onClick={markNotificationsAsRead} className="text-[10px] font-bold text-accent-cyan uppercase hover:underline">
                                            Mark all read
                                        </button>
                                    )}
                                    <button onClick={() => setShowNotifications(false)} className="text-secondary hover:text-white transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 overflow-y-auto p-4 space-y-6 overflow-x-hidden">
                                {notifications.length === 0 ? (
                                    <EmptyNotifications />
                                ) : (
                                    Object.entries(groupedNotifications).map(([group, notifs]) => {
                                        if (notifs.length === 0) return null;
                                        return (
                                            <div key={group} className="space-y-3">
                                                <h4 className="text-[10px] font-black uppercase tracking-widest text-secondary ml-1">{group}</h4>
                                                {notifs.map((n) => (
                                                    <motion.div 
                                                        key={n.id}
                                                        drag="x"
                                                        dragConstraints={{ left: 0, right: 0 }}
                                                        dragElastic={{ left: 0.5, right: 0 }}
                                                        onDragEnd={(e, info) => {
                                                            if (info.offset.x < -80) deleteNotification(n.id);
                                                        }}
                                                        onClick={() => handleNotifClick(n)}
                                                        className={`relative p-4 rounded-xl border cursor-pointer transition-colors ${n.read ? 'bg-white/5 border-white/5 hover:bg-white/10' : 'bg-accent-cyan/10 border-accent-cyan/30 hover:bg-accent-cyan/20'}`}
                                                    >
                                                        <div className="absolute inset-y-0 right-[-60px] flex items-center justify-center w-[60px] text-red-500 opacity-50">
                                                            <Trash2 size={20} />
                                                        </div>
                                                        <div className="flex gap-3 relative z-10">
                                                            <div className={`mt-1 p-2 rounded-full ${n.read ? 'bg-white/10' : 'bg-accent-cyan/20'} h-fit`}>
                                                                {getNotifIcon(n.type)}
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-xs font-black uppercase leading-snug mb-1 ${n.read ? 'text-gray-300' : 'text-white'}`}>{n.title}</p>
                                                                <p className="text-[10px] text-secondary font-medium leading-relaxed">{n.message}</p>
                                                                <p className="text-[9px] text-accent-cyan/70 font-bold mt-2 uppercase tracking-widest">{getTimeAgo(n.timestamp)}</p>
                                                            </div>
                                                            {!n.read && (
                                                                <div className="w-2 h-2 rounded-full bg-accent-cyan shadow-[0_0_8px_rgba(0,245,255,0.8)] mt-2"></div>
                                                            )}
                                                        </div>
                                                    </motion.div>
                                                ))}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Balance Card */}
            <motion.div 
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                style={{ 
                    perspective: 1000,
                    rotateX: mousePos.y * 15,
                    rotateY: -mousePos.x * 15,
                }}
                onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                className="glass-card p-10 mb-12 text-center relative overflow-hidden group cursor-pointer transition-transform duration-200 ease-out"
            >
                <div className="absolute inset-0 bg-gradient-to-br from-accent-cyan/5 to-transparent pointer-events-none"></div>
                <p className="text-secondary text-[10px] font-black uppercase tracking-[0.3em] mb-4">Secure Vault Balance</p>
                
                <div className="flex items-center justify-center gap-3">
                    <span className="text-2xl font-black text-accent-cyan opacity-50">₹</span>
                    <AnimatePresence mode="wait">
                        {isBalanceHidden ? (
                            <motion.h1 
                                key="hidden"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-5xl font-black tracking-[0.2em] text-accent-cyan/20"
                            >
                                ●●●●●
                            </motion.h1>
                        ) : (
                            <motion.h1 
                                key="visible"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="text-6xl font-black tracking-tighter text-white font-heading"
                            >
                                {Number(balance).toLocaleString()}
                            </motion.h1>
                        )}
                    </AnimatePresence>
                </div>

                <div className="mt-8 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[8px] font-black tracking-widest text-secondary uppercase">
                    <Shield size={12} className="text-accent-cyan" />
                    Protocol Encryption: AES-256-GCM
                </div>
            </motion.div>

            {/* KYC Banner */}
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card p-4 mb-8 border-accent-cyan/10 flex items-center justify-between group cursor-pointer hover:bg-white/5 transition-all duration-300"
            >
                <div className="flex items-center gap-4">
                    <div className="w-11 h-11 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shadow-[0_0_15px_rgba(0,245,255,0.1)] group-hover:scale-110 transition-transform">
                        <Shield size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">KYC Required</h3>
                        <p className="text-[9px] text-secondary font-black uppercase tracking-widest mt-0.5">Verify identity for ₹10k limit</p>
                    </div>
                </div>
                <button className="px-5 py-2 rounded-lg bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest hover:bg-white hover:text-[#0a0f1e] transition-all shadow-lg">
                    Start
                </button>
            </motion.div>

            {/* AI Smart Insights */}
            <div className="mb-10">
                <div className="flex items-center justify-between mb-5 px-2">
                    <div className="flex items-center gap-3">
                        <div className="p-1.5 rounded-lg bg-accent-cyan/10">
                            <Sparkles size={14} className="text-accent-cyan" />
                        </div>
                        <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-secondary">AI Smart Insights</h3>
                    </div>
                    <button className="p-2 rounded-full hover:bg-white/5 transition-colors text-secondary hover:text-white">
                        <RefreshCcw size={12} />
                    </button>
                </div>

                <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="min-w-[240px] p-4 rounded-[1.5rem] bg-white/5 border border-white/5 relative overflow-hidden group cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent-cyan/5 blur-3xl -mr-12 -mt-12 group-hover:bg-accent-cyan/10 transition-colors"></div>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-orange-500/10 text-orange-500 shadow-lg shadow-orange-500/5">
                                <Zap size={18} fill="currentColor" />
                            </div>
                            <p className="text-xs font-bold leading-relaxed text-white/90 pr-4">
                                Balance trend is up 12% vs last week.
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-accent-cyan group-hover:gap-2 transition-all">
                            Tip <ArrowUpRight size={12} />
                        </div>
                        <button className="absolute top-3 right-3 text-white/10 hover:text-white/40 transition-colors">
                            <X size={12} />
                        </button>
                    </motion.div>

                    <motion.div 
                        whileHover={{ y: -5 }}
                        className="min-w-[240px] p-4 rounded-[1.5rem] bg-white/5 border border-white/5 relative overflow-hidden group cursor-pointer"
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 bg-accent-purple/5 blur-3xl -mr-12 -mt-12 group-hover:bg-accent-purple/10 transition-colors"></div>
                        <div className="flex items-start gap-3 mb-4">
                            <div className="p-3 rounded-xl bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5">
                                <Shield size={18} fill="currentColor" />
                            </div>
                            <p className="text-xs font-bold leading-relaxed text-white/90 pr-4">
                                Next trust points milestone: 75 points.
                            </p>
                        </div>
                        <div className="flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-accent-purple group-hover:gap-2 transition-all">
                            Goal <ArrowUpRight size={12} />
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Trust Score Ring */}
            <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center justify-center mb-10 cursor-pointer group"
                onClick={() => setShowTrustPopup(true)}
            >
                <div className="relative w-24 h-24 flex items-center justify-center group-active:scale-95 transition-transform">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 80 80">
                        <circle 
                            cx="40" cy="40" r={radius} 
                            stroke="rgba(255,255,255,0.05)" 
                            strokeWidth="6" fill="transparent" 
                        />
                        <circle 
                            cx="40" cy="40" r={radius} 
                            stroke={trustColor} 
                            strokeWidth="6" fill="transparent" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={strokeDashoffset}
                            strokeLinecap="round"
                            className="transition-all duration-1000 ease-out"
                            style={{ filter: `drop-shadow(0 0 8px ${trustColor}80)` }}
                        />
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black" style={{ color: trustColor }}>{Math.round(trustScore)}</span>
                    </div>
                </div>
                <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mt-3 group-hover:text-white transition-colors">Trust Score</p>
            </motion.div>

            {/* Quick Actions */}
            <div className="grid grid-cols-4 gap-4 mb-10">
                {[
                    { icon: <Send size={22} />, label: 'Send', path: '/send', color: 'text-accent-cyan' },
                    { icon: <QrCode size={22} />, label: 'Scan', path: '/receive', color: 'text-accent-yellow' },
                    { 
                        icon: <RefreshCcw size={22} className={isSyncing ? 'animate-spin' : ''} />, 
                        label: 'Sync', 
                        path: '/sync', 
                        color: 'text-green-400',
                        badge: pendingCount > 0 ? pendingCount : null
                    },
                    { icon: <Shield size={22} />, label: 'Vault', path: '/security', color: 'text-blue-400' }
                ].map((action, i) => (
                    <Link key={i} to={action.path} className="flex flex-col items-center gap-2 group relative">
                        <div className={`w-16 h-16 glass-card flex items-center justify-center ${action.color} group-active:scale-95 transition-transform duration-200 neon-border`}>
                            {action.icon}
                        </div>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-secondary group-hover:text-white transition-colors">{action.label}</span>
                        {action.badge && (
                            <span className="absolute top-0 right-2 w-5 h-5 bg-orange-500 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#0a0f1e] animate-bounce">
                                {action.badge}
                            </span>
                        )}
                    </Link>
                ))}
            </div>

            {/* Recent Activity */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-sm font-black uppercase tracking-widest">Recent Activity</h2>
                    <Link to="/pending" className="text-[10px] text-accent-cyan font-bold hover:underline tracking-widest uppercase">View All Protocol Logs</Link>
                </div>

                <div className="space-y-4">
                    <AnimatePresence>
                        {transactions.length === 0 ? (
                            <div className="glass-card py-6">
                                <EmptyTransactions onAction={() => navigate('/send')} />
                            </div>
                        ) : (
                            transactions.map((txn, i) => (
                                <motion.div 
                                    key={txn.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className="glass-card p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.type === 'SEND' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.1)]'}`}>
                                            {txn.type === 'SEND' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white group-hover:text-accent-cyan transition-colors">
                                                {txn.type === 'SEND' ? `To: ${txn.receiverName || 'Recipient'}` : `From: ${txn.senderName || 'Sender'}`}
                                            </p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[8px] text-secondary font-bold uppercase tracking-tighter">{getTimeAgo(txn.timestamp)}</span>
                                                <span className="w-1 h-1 rounded-full bg-white/10"></span>
                                                <div className="flex items-center gap-1">
                                                    {getStatusIcon(txn.status)}
                                                    <span className={`text-[8px] font-black uppercase ${
                                                        txn.status === 'COMPLETED' ? 'text-green-400' : 
                                                        txn.status === 'PENDING' ? 'text-accent-yellow' : 'text-red-400'
                                                    }`}>
                                                        {txn.status}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-sm font-black ${txn.type === 'SEND' ? 'text-red-400' : 'text-green-400'}`}>
                                            {txn.type === 'SEND' ? '-' : '+'}₹{txn.amount?.toLocaleString() || '0'}
                                        </p>
                                        <p className="text-[8px] text-secondary font-bold tracking-widest mt-1">ID: {txn.id?.slice(-6).toUpperCase()}</p>
                                    </div>
                                </motion.div>
                            ))
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Trust Score Breakdown Popup */}
            <AnimatePresence>
                {showTrustPopup && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setShowTrustPopup(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm glass-card p-6 z-50 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        >
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h2 className="text-lg font-black uppercase italic tracking-widest" style={{ color: trustColor }}>Offline Trust Score</h2>
                                    <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">Reputation Analysis</p>
                                </div>
                                <button onClick={() => setShowTrustPopup(false)} className="text-secondary hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
                                <div className="text-4xl font-black" style={{ color: trustColor }}>{Math.round(trustScore)}</div>
                                <div>
                                    <p className="text-xs font-bold text-white mb-1">Send Limit: ₹{offlineLimit.toLocaleString()}</p>
                                    <p className="text-[10px] text-secondary uppercase tracking-widest">
                                        {trustScore <= 40 ? 'Low Trust Tier' : trustScore <= 70 ? 'Standard Trust Tier' : 'Maximum Trust Tier'}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-3 mb-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary mb-2">Score Factors</h3>
                                {trustFactors.map((factor, i) => (
                                    <div key={i} className={`flex justify-between items-center p-3 rounded-lg border ${factor.achieved ? (factor.negative ? 'border-red-500/20 bg-red-500/5 text-red-400' : 'border-green-500/20 bg-green-500/5 text-green-400') : 'border-white/5 bg-white/5 text-secondary opacity-50'}`}>
                                        <div className="flex items-center gap-2">
                                            {factor.achieved ? <CheckCircle2 size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-secondary"></div>}
                                            <span className="text-[10px] font-bold uppercase tracking-widest">{factor.text}</span>
                                        </div>
                                        <span className="text-[10px] font-black">{factor.points > 0 && factor.achieved ? '+' : ''}{factor.points}</span>
                                    </div>
                                ))}
                            </div>

                            <div className="p-4 rounded-xl bg-accent-cyan/5 border border-accent-cyan/20">
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-accent-cyan mb-2">How to improve</h3>
                                <ul className="text-[10px] text-secondary space-y-2 list-disc pl-4 font-bold tracking-widest">
                                    <li>Successfully synchronize pending transactions.</li>
                                    <li>Maintain your account actively for over 7 days.</li>
                                    <li>Increase your total successful volume above ₹5,000.</li>
                                    <li>Avoid network rejections or duplicate scans.</li>
                                </ul>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Account Switch Popup */}
            <AnimatePresence>
                {showAccountSwitch && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[60]"
                            onClick={() => setShowAccountSwitch(false)}
                        />
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] max-w-sm glass-card p-6 z-[70] border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
                        >
                            <div className="flex justify-between items-center mb-8">
                                <div className="flex items-center gap-2">
                                    <Users size={20} className="text-accent-cyan" />
                                    <h2 className="text-lg font-black uppercase italic tracking-widest">Switch Profile</h2>
                                </div>
                                <button onClick={() => setShowAccountSwitch(false)} className="text-secondary hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="space-y-4">
                                {DEMO_ACCOUNTS.map((acc) => (
                                    <button 
                                        key={acc.phone} 
                                        onClick={() => switchAccount(acc.phone)}
                                        className={`w-full p-4 rounded-2xl border flex items-center justify-between transition-all active:scale-[0.98] ${acc.phone === user?.phone ? 'bg-accent-cyan/10 border-accent-cyan shadow-[0_0_15px_rgba(0,245,255,0.2)]' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${acc.theme === 'cyan' ? 'bg-accent-cyan text-black' : acc.theme === 'purple' ? 'bg-purple-500 text-white' : 'bg-orange-500 text-white'}`}>
                                                {acc.name.charAt(0)}
                                            </div>
                                            <div className="text-left">
                                                <p className="text-sm font-black text-white">{acc.name}</p>
                                                <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">{acc.upiId}</p>
                                            </div>
                                        </div>
                                        {acc.phone === user?.phone && (
                                            <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></div>
                                        )}
                                    </button>
                                ))}
                            </div>

                            {/* Role Toggle */}
                            <div className="mt-8 pt-8 border-t border-white/5">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-4">Account Role</p>
                                <button 
                                    onClick={() => {
                                        toggleMerchantMode();
                                        setShowAccountSwitch(false);
                                        toast.success(`Switched to ${!isMerchant ? 'Merchant' : 'Customer'} Mode`);
                                    }}
                                    className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between hover:bg-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMerchant ? 'bg-purple-500/20 text-purple-400' : 'bg-accent-cyan/20 text-accent-cyan'}`}>
                                            {isMerchant ? <Store size={20} /> : <User size={20} />}
                                        </div>
                                        <div className="text-left">
                                            <p className="text-sm font-black text-white">{isMerchant ? 'Merchant Mode' : 'Customer Mode'}</p>
                                            <p className="text-[10px] text-secondary uppercase font-bold tracking-widest">Tap to switch to {isMerchant ? 'Customer' : 'Merchant'}</p>
                                        </div>
                                    </div>
                                    <div className={`w-12 h-6 rounded-full relative transition-colors ${isMerchant ? 'bg-purple-500' : 'bg-white/10'}`}>
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isMerchant ? 'right-1' : 'left-1'}`}></div>
                                    </div>
                                </button>
                            </div>

                            <button 
                                onClick={logout}
                                className="w-full mt-8 py-4 border border-red-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-center gap-2"
                            >
                                <LogOut size={14} /> Clear Session
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Biometric Enrollment Prompt */}
            <AnimatePresence>
                {showBioPrompt && (
                    <motion.div 
                        initial={{ opacity: 0, y: 100 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 100 }}
                        className="fixed bottom-24 left-6 right-6 glass-card p-6 z-40 border-accent-cyan shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                    >
                        <div className="flex gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shrink-0">
                                <Fingerprint size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h3 className="text-sm font-black uppercase italic tracking-tighter text-white">Enable Biometrics?</h3>
                                    <button onClick={dismissBio} className="text-secondary hover:text-white"><X size={16} /></button>
                                </div>
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1 mb-4 leading-relaxed">
                                    Skip the PIN. Use your fingerprint or face to authorize payments instantly.
                                </p>
                                <div className="flex gap-3">
                                    <button 
                                        onClick={handleEnableBio}
                                        className="flex-1 btn-gradient py-2 text-[10px] uppercase tracking-widest font-black"
                                    >
                                        Enable Now
                                    </button>
                                    <button 
                                        onClick={dismissBio}
                                        className="px-4 py-2 rounded-lg bg-white/5 text-secondary text-[10px] font-black uppercase tracking-widest border border-white/5"
                                    >
                                        Later
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const ShieldCheck = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        <path d="m9 12 2 2 4-4" />
    </svg>
);


const Dashboard = () => {
    const { user, isMerchant, toggleMerchantMode, logout, switchAccount } = useAuth();
    const { balance, transactions, pendingCount, notifications, isSyncing, markNotificationsAsRead, deleteNotification, trustScore, trustFactors, offlineLimit, isLoading } = useWallet();
    const { isDemoActive, startDemo } = useDemo();
    const isOnline = useOnlineStatus();
    const navigate = useNavigate();
    const [showNotifications, setShowNotifications] = useState(false);
    const [showTrustPopup, setShowTrustPopup] = useState(false);
    const [showAccountSwitch, setShowAccountSwitch] = useState(false);
    const { biometricSupported, biometricEnabled, registerBiometric } = useSecurity();
    const [showBioPrompt, setShowBioPrompt] = useState(false);

    useEffect(() => {
        if (biometricSupported && !biometricEnabled) {
            const hasPrompted = sessionStorage.getItem('bio_prompted');
            if (!hasPrompted) {
                const timer = setTimeout(() => setShowBioPrompt(true), 2000);
                return () => clearTimeout(timer);
            }
        }
    }, [biometricSupported, biometricEnabled]);

    const handleEnableBio = async () => {
        const success = await registerBiometric();
        if (success) {
            setShowBioPrompt(false);
            sessionStorage.setItem('bio_prompted', 'true');
        }
    };

    const dismissBio = () => {
        setShowBioPrompt(false);
        sessionStorage.setItem('bio_prompted', 'true');
    };

    const getTrustColor = (score) => {
        if (score <= 40) return '#ef4444';
        if (score <= 70) return '#eab308';
        return '#22c55e';
    };
    
    const trustColor = getTrustColor(trustScore);
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (trustScore / 100) * circumference;

    const unreadCount = (notifications || []).filter(n => !n.read).length;

    const getTimeAgo = (timestamp) => {
        const seconds = Math.floor((new Date() - new Date(timestamp)) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'COMPLETED': return <CheckCircle2 size={10} className="text-green-400" />;
            case 'PENDING': return <Clock size={10} className="text-accent-yellow" />;
            case 'FAILED': return <AlertCircle size={10} className="text-red-400" />;
            default: return null;
        }
    };

    const getNotifIcon = (type) => {
        switch (type) {
            case 'payment_sent': return <ArrowUpRight className="text-red-400" size={18} />;
            case 'payment_received': return <ArrowDownLeft className="text-green-400" size={18} />;
            case 'sync_success': return <CheckCircle2 className="text-green-400" size={18} />;
            case 'sync_failed': return <AlertCircle className="text-red-400" size={18} />;
            case 'token_expiry': return <Clock className="text-accent-yellow" size={18} />;
            case 'offline': return <WifiOff className="text-red-400" size={18} />;
            case 'online': return <Wifi className="text-green-400" size={18} />;
            case 'trust_score': return <Award className="text-accent-cyan" size={18} />;
            default: return <Bell className="text-accent-cyan" size={18} />;
        }
    };

    const groupedNotifications = { TODAY: [], YESTERDAY: [], EARLIER: [] };
    (notifications || []).forEach(n => {
        const date = new Date(n.timestamp);
        const today = new Date();
        const yesterday = new Date();
        yesterday.setDate(today.getDate() - 1);
        if (date.toDateString() === today.toDateString()) groupedNotifications.TODAY.push(n);
        else if (date.toDateString() === yesterday.toDateString()) groupedNotifications.YESTERDAY.push(n);
        else groupedNotifications.EARLIER.push(n);
    });

    const handleNotifClick = (n) => {
        if (n.actionRoute) {
            setShowNotifications(false);
            navigate(n.actionRoute);
        }
    };

    if (isMerchant) return <MerchantDashboard />;

    return (
        <CustomerDashboard 
            user={user} logout={logout} switchAccount={switchAccount}
            balance={balance} transactions={transactions} pendingCount={pendingCount}
            notifications={notifications} isSyncing={isSyncing} markNotificationsAsRead={markNotificationsAsRead}
            deleteNotification={deleteNotification} trustScore={trustScore} trustFactors={trustFactors}
            offlineLimit={offlineLimit} isLoading={isLoading} isDemoActive={isDemoActive}
            startDemo={startDemo} isOnline={isOnline} navigate={navigate}
            showNotifications={showNotifications} setShowNotifications={setShowNotifications}
            showTrustPopup={showTrustPopup} setShowTrustPopup={setShowTrustPopup}
            showAccountSwitch={showAccountSwitch} setShowAccountSwitch={setShowAccountSwitch}
            biometricSupported={biometricSupported} biometricEnabled={biometricEnabled} registerBiometric={registerBiometric}
            showBioPrompt={showBioPrompt} setShowBioPrompt={setShowBioPrompt}
            isMerchant={isMerchant} toggleMerchantMode={toggleMerchantMode}
            handleEnableBio={handleEnableBio} dismissBio={dismissBio} trustColor={trustColor}
            radius={radius} circumference={circumference} strokeDashoffset={strokeDashoffset}
            unreadCount={unreadCount} getTimeAgo={getTimeAgo} getStatusIcon={getStatusIcon}
            getNotifIcon={getNotifIcon} groupedNotifications={groupedNotifications}
            handleNotifClick={handleNotifClick}
        />
    );
};

export default Dashboard;

