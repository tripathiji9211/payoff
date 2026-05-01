import React, { useState, useEffect, useMemo } from 'react';
import { getAllData, STORES } from '../services/db';
import { useWallet } from '../context/WalletContext';
import { ChevronLeft, RefreshCcw, Clock, ArrowUpRight, ArrowDownLeft, Calendar, CheckCircle2, AlertCircle, Search, Filter, Download, X, Copy, AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const TransactionHistory = () => {
    const navigate = useNavigate();
    const { pendingCount } = useWallet();
    const [history, setHistory] = useState([]);
    
    // Filters
    const [filterTab, setFilterTab] = useState('ALL');
    const [searchQuery, setSearchQuery] = useState('');
    const [dateFilter, setDateFilter] = useState('ALL_TIME');
    
    // Bottom Sheet
    const [selectedTxn, setSelectedTxn] = useState(null);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        const txns = await getAllData(STORES.HISTORY);
        const sorted = txns.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setHistory(sorted);
    };

    // Date filtering logic
    const isDateInRange = (timestamp, range) => {
        const date = new Date(timestamp);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        switch (range) {
            case 'TODAY':
                return date >= today;
            case 'THIS_WEEK':
                const startOfWeek = new Date(today);
                startOfWeek.setDate(today.getDate() - today.getDay());
                return date >= startOfWeek;
            case 'THIS_MONTH':
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                return date >= startOfMonth;
            default:
                return true;
        }
    };

    const filteredHistory = useMemo(() => {
        return history.filter(txn => {
            // Tab Filter
            if (filterTab === 'SENT' && txn.type !== 'SEND') return false;
            if (filterTab === 'RECEIVED' && txn.type !== 'RECEIVE') return false;
            if (filterTab === 'PENDING' && txn.status !== 'PENDING') return false;
            if (filterTab === 'FAILED' && txn.status !== 'FAILED') return false;

            // Search Filter (UPI or Amount)
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const targetUpi = (txn.type === 'SEND' ? txn.receiverUpiId : txn.senderId)?.toLowerCase() || '';
                const amountStr = txn.amount.toString();
                if (!targetUpi.includes(query) && !amountStr.includes(query)) return false;
            }

            // Date Filter
            if (!isDateInRange(txn.timestamp, dateFilter)) return false;

            return true;
        });
    }, [history, filterTab, searchQuery, dateFilter]);

    // Stats calculation (This Month)
    const stats = useMemo(() => {
        let sent = 0;
        let received = 0;
        let pending = 0;
        
        history.forEach(txn => {
            if (txn.status === 'PENDING') pending++;
            if (isDateInRange(txn.timestamp, 'THIS_MONTH')) {
                if (txn.type === 'SEND' && txn.status !== 'FAILED') sent += txn.amount;
                if (txn.type === 'RECEIVE' && txn.status !== 'FAILED') received += txn.amount;
            }
        });
        
        return { sent, received, pending };
    }, [history]);

    const formatDateTime = (timestamp) => {
        const d = new Date(timestamp);
        const day = d.getDate().toString().padStart(2, '0');
        const month = d.toLocaleString('en-GB', { month: 'short' });
        const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${day} ${month}, ${time}`;
    };

    const getStatusStyle = (status) => {
        switch (status) {
            case 'COMPLETED': return 'text-green-400 bg-green-500/10 border-green-500/20';
            case 'PENDING': return 'text-accent-yellow bg-accent-yellow/10 border-accent-yellow/20';
            case 'FAILED': return 'text-red-400 bg-red-500/10 border-red-500/20';
            default: return 'text-secondary bg-white/5 border-white/10';
        }
    };

    const handleCopy = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Transaction ID Copied');
    };

    const exportCSV = () => {
        const headers = ['Transaction ID', 'Type', 'Amount', 'Status', 'Date', 'Counterparty'];
        const rows = history.map(t => [
            t.txnId || t.id,
            t.type,
            t.amount,
            t.status,
            new Date(t.timestamp).toISOString(),
            t.type === 'SEND' ? (t.receiverUpiId || 'Unknown') : (t.senderId || 'Unknown')
        ]);
        const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `OfflinePay_History_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Export Successful');
    };

    return (
        <div className="flex-1 flex flex-col bg-[#0a0f1e] text-white min-h-screen relative overflow-hidden">
            <div className="p-6 pb-4">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass-card flex items-center justify-center border border-white/5">
                            <ChevronLeft size={20} />
                        </button>
                        <h1 className="text-xl font-black uppercase italic tracking-tighter">Transaction History</h1>
                    </div>
                    <button onClick={exportCSV} className="w-10 h-10 rounded-full glass-card flex items-center justify-center text-accent-cyan border border-accent-cyan/20">
                        <Download size={18} />
                    </button>
                </div>

                {/* Stats Summary Card */}
                <div className="glass-card p-5 mb-6 border-accent-cyan/10 grid grid-cols-2 gap-4 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-accent-cyan/5 rounded-full blur-2xl"></div>
                    <div>
                        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">Sent (This Month)</p>
                        <p className="text-xl font-black text-white">₹{stats.sent.toLocaleString()}</p>
                    </div>
                    <div>
                        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mb-1">Received (This Month)</p>
                        <p className="text-xl font-black text-accent-cyan">₹{stats.received.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 pt-3 border-t border-white/5 flex justify-between items-center">
                        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">Pending to sync</p>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-accent-yellow animate-pulse"></span>
                            <p className="text-xs font-black text-accent-yellow">{stats.pending} TRANSACTIONS</p>
                        </div>
                    </div>
                </div>

                {/* Filter Bar */}
                <div className="space-y-4 mb-6">
                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {['ALL', 'SENT', 'RECEIVED', 'PENDING', 'FAILED'].map(tab => (
                            <button 
                                key={tab} 
                                onClick={() => setFilterTab(tab)}
                                className={`px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${filterTab === tab ? 'bg-accent-cyan text-[#0a0f1e] shadow-[0_0_15px_rgba(0,245,255,0.3)]' : 'glass-card text-secondary hover:text-white'}`}
                            >
                                {tab}
                            </button>
                        ))}
                    </div>
                    
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" size={16} />
                            <input 
                                type="text" placeholder="Search UPI ID or Amount..." 
                                className="w-full bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold tracking-widest outline-none focus:border-accent-cyan transition-colors text-white"
                                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} 
                            />
                        </div>
                        <select 
                            className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-[10px] font-black uppercase tracking-widest outline-none text-white focus:border-accent-cyan appearance-none"
                            value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}
                        >
                            <option value="ALL_TIME">All Time</option>
                            <option value="TODAY">Today</option>
                            <option value="THIS_WEEK">This Week</option>
                            <option value="THIS_MONTH">This Month</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Transaction List */}
            <div className="flex-1 overflow-y-auto px-6 pb-32">
                <AnimatePresence>
                    {filteredHistory.length === 0 ? (
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center py-20 text-center opacity-40"
                        >
                            <Filter size={48} className="mb-4 text-accent-cyan" />
                            <p className="text-sm font-black uppercase tracking-widest">No Matches</p>
                            <p className="text-[10px] mt-2 uppercase tracking-widest font-bold">Try adjusting your filters.</p>
                        </motion.div>
                    ) : (
                        filteredHistory.map((txn, i) => (
                            <motion.div 
                                key={txn.txnId || txn.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                onClick={() => setSelectedTxn(txn)}
                                className="glass-card p-4 mb-3 border border-white/5 hover:border-accent-cyan/30 transition-all group cursor-pointer active:scale-95"
                            >
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${txn.type === 'SEND' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400 shadow-[0_0_20px_rgba(34,197,94,0.1)]'}`}>
                                            {txn.type === 'SEND' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-white group-hover:text-accent-cyan transition-colors">
                                                {txn.type === 'SEND' ? (txn.receiverUpiId || 'Unknown') : (txn.senderId || 'Unknown')}
                                            </p>
                                            <p className="text-[10px] text-secondary font-bold uppercase tracking-widest mt-1">
                                                {formatDateTime(txn.timestamp)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className={`text-lg font-black ${txn.type === 'SEND' ? 'text-red-400' : 'text-green-400'}`}>
                                            {txn.type === 'SEND' ? '-' : '+'}₹{txn.amount.toLocaleString()}
                                        </p>
                                        <div className={`inline-flex items-center justify-center px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-widest mt-1 ${getStatusStyle(txn.status)}`}>
                                            {txn.status}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>

            {/* Transaction Detail Bottom Sheet */}
            <AnimatePresence>
                {selectedTxn && (
                    <>
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedTxn(null)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"
                        />
                        <motion.div 
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="absolute bottom-0 left-0 right-0 bg-[#0d1b2a] border-t border-accent-cyan/20 rounded-t-3xl p-6 z-50 shadow-[0_-10px_40px_rgba(0,245,255,0.1)]"
                        >
                            <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-6"></div>
                            
                            <div className="flex justify-between items-center mb-8">
                                <div>
                                    <h2 className="text-xl font-black uppercase italic tracking-widest">Protocol Detail</h2>
                                    <p className="text-[10px] text-accent-cyan font-bold uppercase tracking-widest mt-1">Offline Payload Inspector</p>
                                </div>
                                <button onClick={() => setSelectedTxn(null)} className="w-8 h-8 rounded-full glass-card flex items-center justify-center border-white/10 text-secondary hover:text-white">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="glass-card p-4 border-white/5 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Transaction ID</p>
                                        <p className="text-xs font-mono text-white break-all">{selectedTxn.txnId || selectedTxn.id}</p>
                                    </div>
                                    <button onClick={() => handleCopy(selectedTxn.txnId || selectedTxn.id)} className="p-2 text-accent-cyan hover:bg-accent-cyan/10 rounded-lg transition-colors">
                                        <Copy size={16} />
                                    </button>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="glass-card p-4 border-white/5">
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Offline Token Hash</p>
                                        <p className="text-[10px] font-mono text-white opacity-50 truncate">{(selectedTxn.txnId || selectedTxn.id).split('_').pop().repeat(4)}</p>
                                    </div>
                                    <div className="glass-card p-4 border-white/5">
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-1">Vault Status</p>
                                        <span className={`text-[10px] font-black uppercase ${selectedTxn.status === 'COMPLETED' ? 'text-green-400' : selectedTxn.status === 'FAILED' ? 'text-red-400' : 'text-accent-yellow'}`}>
                                            {selectedTxn.status}
                                        </span>
                                    </div>
                                </div>

                                <div className="glass-card p-4 border-white/5">
                                    <div className="flex justify-between mb-2">
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Offline Initiation</p>
                                        <p className="text-[10px] font-bold text-white">{formatDateTime(selectedTxn.timestamp)}</p>
                                    </div>
                                    <div className="flex justify-between">
                                        <p className="text-[10px] text-secondary font-black uppercase tracking-widest">Network Synchronization</p>
                                        <p className="text-[10px] font-bold text-accent-cyan">{selectedTxn.settledAt ? formatDateTime(selectedTxn.settledAt) : 'Pending Uplink'}</p>
                                    </div>
                                </div>

                                {selectedTxn.status === 'FAILED' && selectedTxn.reason && (
                                    <div className="glass-card p-4 border-red-500/20 bg-red-500/5">
                                        <p className="text-[10px] text-red-400 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                                            <AlertTriangle size={12} /> Rejection Reason
                                        </p>
                                        <p className="text-xs font-bold text-white">{selectedTxn.reason}</p>
                                    </div>
                                )}
                            </div>

                            <button className="glass-card w-full py-4 flex items-center justify-center gap-2 text-red-400 border-red-500/20 hover:bg-red-500/10 transition-colors uppercase text-[10px] font-black tracking-widest">
                                <AlertTriangle size={16} /> Report Discrepancy
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
};

export default TransactionHistory;
