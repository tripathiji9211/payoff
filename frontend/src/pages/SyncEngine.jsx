import React, { useState, useEffect, useCallback } from 'react';
import { getPendingTransactions, clearPendingTransactions, STORES, putData, getData } from '../services/db';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { useWallet } from '../context/WalletContext';
import { ChevronLeft, RefreshCcw, Wifi, WifiOff, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '../context/DemoContext';
import { getRejectionExplanation } from '../services/ai';
import { BrainCircuit } from 'lucide-react';

const SyncEngine = () => {
    const isOnline = useOnlineStatus();
    const navigate = useNavigate();
    const { setIsSyncing, refreshWallet, addNotification } = useWallet();
    const [status, setStatus] = useState('idle'); // idle, syncing, completed
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [transactions, setTransactions] = useState([]);
    const [results, setResults] = useState({ settled: 0, failed: 0 });
    const { demoStep, nextStep, isDemoActive } = useDemo();
    const [aiExplanations, setAiExplanations] = useState({}); // { txnId: explanation }

    // DEMO AUTO ADVANCE
    useEffect(() => {
        if (isDemoActive && demoStep === 7 && status === 'completed') {
            const t = setTimeout(() => {
                nextStep();
            }, 3000);
            return () => clearTimeout(t);
        }
    }, [status, isDemoActive, demoStep, nextStep]);

    const loadPending = useCallback(async () => {
        const txns = await getPendingTransactions();
        setTransactions(txns);
        setProgress(prev => ({ ...prev, total: txns.length }));
        return txns;
    }, []);

    const runSync = useCallback(async (txnsToSync) => {
        if (!txnsToSync || txnsToSync.length === 0) {
            setStatus('idle');
            setIsSyncing(false);
            return;
        }

        setStatus('syncing');
        setIsSyncing(true);
        let settledCount = 0;
        let failedCount = 0;
        const settledIds = [];
        const failedIds = [];

        let currentBalanceData = await getData(STORES.WALLET, 'balance');
        let currentBalance = currentBalanceData ? currentBalanceData.value : 0;

        for (let i = 0; i < txnsToSync.length; i++) {
            const txn = txnsToSync[i];
            setProgress(prev => ({ ...prev, current: i + 1 }));

            // Update row UI to show it's currently syncing
            setTransactions(prev => prev.map(t => t.id === txn.id ? { ...t, _syncingNow: true } : t));

            // Simulated network delay (800ms to 1500ms)
            const delay = Math.floor(Math.random() * (1500 - 800 + 1)) + 800;
            await new Promise(resolve => setTimeout(resolve, delay));

            // 90% Success Rate Simulation
            const isSuccess = Math.random() > 0.1;
            const fullTxn = { ...txn, txnId: txn.txnId || txn.id };

            if (isSuccess) {
                settledCount++;
                settledIds.push(txn.id);
                const finalTxn = { ...fullTxn, status: 'COMPLETED', settledAt: new Date().toISOString() };
                await putData(STORES.HISTORY, finalTxn);
                
                // Record token as used to prevent replay
                await putData(STORES.USED_TOKENS, { txnId: fullTxn.txnId, usedAt: new Date().toISOString() });

                setTransactions(prev => prev.map(t => t.id === txn.id ? { ...finalTxn, _syncingNow: false } : t));
            } else {
                failedCount++;
                failedIds.push(txn.id);
                const finalTxn = { ...fullTxn, status: 'FAILED', reason: 'NETWORK_REJECTED' };
                await putData(STORES.HISTORY, finalTxn);
                
                // Handle Optimistic Reversals
                if (txn.type === 'SEND') {
                    currentBalance += txn.amount; // Refund Sent
                } else if (txn.type === 'RECEIVE') {
                    currentBalance -= txn.amount; // Deduct Received
                }
                
                setTransactions(prev => prev.map(t => t.id === txn.id ? { ...finalTxn, _syncingNow: false } : t));

                // Get AI Explanation for failure
                getRejectionExplanation({ type: txn.type, amount: txn.amount, reason: 'NETWORK_REJECTED' }, isOnline).then(res => {
                    setAiExplanations(prev => ({ ...prev, [txn.id]: res.text }));
                });
            }
        }

        // Apply Reversals
        await putData(STORES.WALLET, { key: 'balance', value: currentBalance });

        // Clean up Pending queue
        if (settledIds.length > 0) await clearPendingTransactions(settledIds);
        if (failedIds.length > 0) await clearPendingTransactions(failedIds);

        // Summary
        setResults({ settled: settledCount, failed: failedCount });
        setStatus('completed');
        setIsSyncing(false);
        
        toast.success(`${settledCount} Completed ✅, ${failedCount} Failed ❌`);
        if (settledCount > 0) {
            await addNotification('Sync Success', `${settledCount} transactions synced successfully!`, 'sync_success', '/');
        }
        if (failedCount > 0) {
            await addNotification('Sync Failed', `${failedCount} transactions failed to sync.`, 'sync_failed', '/');
        }
        
        refreshWallet();
    }, [setIsSyncing, refreshWallet, addNotification]);

    useEffect(() => {
        loadPending();
    }, [loadPending]);

    useEffect(() => {
        const handleOnline = async () => {
            toast('Back online! Syncing pending transactions...', { icon: '🌐' });
            const txns = await loadPending();
            if (txns.length > 0) {
                runSync(txns);
            }
        };

        window.addEventListener('online', handleOnline);
        
        // Initial check if we mounted while online with pending txns
        if (isOnline && status === 'idle' && transactions.length > 0 && progress.total > 0) {
            runSync(transactions);
        }

        return () => window.removeEventListener('online', handleOnline);
    }, [isOnline, loadPending, runSync, status, transactions.length, progress.total]);

    const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Sync Engine</h1>
            </div>

            <div className="glass-card p-8 text-center flex flex-col items-center gap-6 relative overflow-hidden border-accent-cyan/10 mb-8">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center relative ${isOnline ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                    {status === 'syncing' ? (
                        <RefreshCcw size={48} className="animate-spin text-accent-cyan" />
                    ) : status === 'completed' ? (
                        <CheckCircle2 size={48} className="text-green-400" />
                    ) : isOnline ? (
                        <Wifi size={48} />
                    ) : (
                        <WifiOff size={48} />
                    )}
                </div>

                <div className="w-full">
                    <h2 className="text-xl font-black uppercase italic tracking-widest mb-2">
                        {status === 'idle' && (isOnline ? 'Network Ready' : 'Offline Mode')}
                        {status === 'syncing' && 'Syncing Protocol...'}
                        {status === 'completed' && 'Synchronization Finished'}
                    </h2>
                    
                    {status === 'syncing' && (
                        <div className="mt-8 space-y-3 w-full">
                            <div className="flex justify-between text-[10px] uppercase font-black tracking-widest text-secondary">
                                <span>Processing Vault Queue</span>
                                <span className="text-accent-cyan">{progress.current} / {progress.total}</span>
                            </div>
                            <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercentage}%` }}
                                    className="h-full bg-gradient-to-r from-accent-cyan to-blue-500 shadow-[0_0_15px_rgba(0,245,255,0.4)]"
                                ></motion.div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="w-full">
                    {status === 'idle' && !isOnline && (
                        <div className="p-4 glass-card bg-red-500/5 border border-red-500/20 text-red-400 text-[10px] uppercase font-bold tracking-widest flex items-center justify-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                            Awaiting Cellular Uplink
                        </div>
                    )}
                    {status === 'idle' && isOnline && transactions.length > 0 && (
                        <button onClick={() => runSync(transactions)} className="btn-gradient w-full py-5 flex items-center justify-center gap-2">
                            <RefreshCcw size={20} /> Force Sync
                        </button>
                    )}
                    {status === 'completed' && (
                        <div className="flex gap-4">
                            <button onClick={() => navigate('/')} className="glass-card flex-1 py-4 text-xs font-black uppercase tracking-widest">
                                Dashboard
                            </button>
                            <button onClick={() => { setStatus('idle'); loadPending(); }} className="btn-gradient flex-1 py-4 text-xs tracking-widest">
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary">Pending Vault Queue</h3>
                
                <AnimatePresence>
                    {transactions.length === 0 ? (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-8 text-center text-secondary glass-card border-white/5">
                            <CheckCircle2 size={32} className="mx-auto mb-3 opacity-20" />
                            <p className="text-[10px] uppercase font-bold tracking-widest">Vault is fully synchronized</p>
                        </motion.div>
                    ) : (
                        transactions.map((txn) => (
                            <motion.div 
                                key={txn.id}
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className={`glass-card p-4 border-l-2 transition-all ${
                                    txn.status === 'COMPLETED' ? 'border-green-500 bg-green-500/5' : 
                                    txn.status === 'FAILED' ? 'border-red-500 bg-red-500/5' : 
                                    txn._syncingNow ? 'border-accent-cyan bg-accent-cyan/5 shadow-[0_0_15px_rgba(0,245,255,0.1)]' : 'border-white/10'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${txn.type === 'SEND' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
                                            {txn.type === 'SEND' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-white">{txn.type} PROTOCOL</p>
                                            <p className="text-[10px] text-secondary font-bold tracking-widest mt-0.5">₹{txn.amount}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {txn.status === 'COMPLETED' ? (
                                            <CheckCircle2 size={20} className="text-green-500" />
                                        ) : txn.status === 'FAILED' ? (
                                            <XCircle size={20} className="text-red-500" />
                                        ) : txn._syncingNow ? (
                                            <RefreshCcw size={16} className="animate-spin text-accent-cyan" />
                                        ) : (
                                            <Clock size={16} className="text-accent-yellow" />
                                        )}
                                        <span className={`text-[10px] font-black uppercase ${
                                            txn.status === 'COMPLETED' ? 'text-green-500' :
                                            txn.status === 'FAILED' ? 'text-red-500' :
                                            txn._syncingNow ? 'text-accent-cyan' : 'text-accent-yellow'
                                        }`}>
                                            {txn.status === 'PENDING' && txn._syncingNow ? 'SYNCING' : txn.status}
                                        </span>
                                    </div>
                                </div>
                                {aiExplanations[txn.id] && (
                                    <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg flex gap-2">
                                        <BrainCircuit size={14} className="text-red-400 shrink-0 mt-0.5" />
                                        <p className="text-[9px] text-red-300 italic leading-relaxed">
                                            {aiExplanations[txn.id]}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        ))
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default SyncEngine;
