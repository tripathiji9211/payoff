import React, { useState, useEffect } from 'react';
import { getAllData, STORES } from '../services/db';
import { ChevronLeft, Receipt, CheckCircle2, ArrowRight, Wallet, History, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

const SettlementHistory = () => {
    const navigate = useNavigate();
    const [settlements, setSettlements] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadSettlements = async () => {
            setIsLoading(true);
            const history = await getAllData(STORES.HISTORY) || [];
            
            // In our mock logic, each "Sync" operation could be considered a settlement batch
            const grouped = history
                .filter(t => t.status === 'COMPLETED' && t.settledAt)
                .reduce((acc, t) => {
                    const date = t.settledAt.split('T')[0];
                    if (!acc[date]) acc[date] = { id: date, date, total: 0, count: 0, transactions: [] };
                    acc[date].total += t.amount;
                    acc[date].count += 1;
                    acc[date].transactions.push(t);
                    return acc;
                }, {});

            setSettlements(Object.values(grouped).sort((a,b) => b.date.localeCompare(a.date)));
            setIsLoading(false);
        };
        loadSettlements();
    }, []);

    return (
        <div className="flex-1 flex flex-col p-6 pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Settlement Ledger</h1>
            </div>

            <div className="relative mb-8">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-secondary" />
                <input 
                    type="text" 
                    placeholder="Search Batch ID or Date..."
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-xs outline-none focus:border-accent-purple transition-all"
                />
            </div>

            <div className="space-y-4">
                {isLoading ? (
                    [1,2,3].map(i => <div key={i} className="h-32 glass-card animate-pulse"></div>)
                ) : settlements.length === 0 ? (
                    <div className="py-20 text-center opacity-50">
                        <History size={48} className="mx-auto mb-4" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No settlement batches found</p>
                    </div>
                ) : (
                    settlements.map((s, idx) => (
                        <motion.div 
                            key={s.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className="glass-card p-6 border-purple-500/10 hover:border-accent-purple/30 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-2 h-2 rounded-full bg-green-400"></div>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-green-400">Settled & Balanced</p>
                                    </div>
                                    <h3 className="text-sm font-black italic">{new Date(s.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
                                    <p className="text-[8px] text-secondary font-black uppercase tracking-widest mt-1">Batch ID: SETL_{s.id.replace(/-/g, '')}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-black italic text-white">₹{s.total.toLocaleString()}</p>
                                    <p className="text-[8px] text-secondary font-black uppercase tracking-widest mt-1">{s.count} Protocols Processed</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex -space-x-2">
                                    {[...Array(Math.min(3, s.count))].map((_, i) => (
                                        <div key={i} className="w-6 h-6 rounded-full bg-accent-purple border-2 border-[#0d1b2a] flex items-center justify-center text-[8px] font-black">
                                            {s.transactions[i].senderId[0]}
                                        </div>
                                    ))}
                                    {s.count > 3 && (
                                        <div className="w-6 h-6 rounded-full bg-white/10 border-2 border-[#0d1b2a] flex items-center justify-center text-[8px] font-black">
                                            +{s.count - 3}
                                        </div>
                                    )}
                                </div>
                                <button className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-accent-purple group-hover:gap-3 transition-all">
                                    View Batch <ArrowRight size={14} />
                                </button>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>

            <div className="mt-8 glass-card p-5 bg-purple-500/5 border border-purple-500/10 flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-accent-purple/10 flex items-center justify-center text-accent-purple">
                    <Wallet size={24} />
                </div>
                <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Settlement Protocol</p>
                    <p className="text-xs font-black">Funds are automatically settled to your linked bank account every 24 hours.</p>
                </div>
            </div>
        </div>
    );
};

export default SettlementHistory;
