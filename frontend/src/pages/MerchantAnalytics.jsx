import React, { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { ChevronLeft, TrendingUp, Users, Clock, Download, BarChart3, Calendar } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const MerchantAnalytics = () => {
    const { transactions } = useWallet();
    const navigate = useNavigate();
    const [period, setPeriod] = useState('TODAY'); // TODAY, WEEKLY, MONTHLY

    // Mock data based on real transactions + some filler for visual
    const hourlyData = [
        { h: '9AM', v: 450 }, { h: '10AM', v: 1200 }, { h: '11AM', v: 2800 }, 
        { h: '12PM', v: 1500 }, { h: '1PM', v: 800 }, { h: '2PM', v: 2200 },
        { h: '3PM', v: 3100 }, { h: '4PM', v: 1900 }, { h: '5PM', v: 1400 }
    ];

    const maxVal = Math.max(...hourlyData.map(d => d.v));

    const exportCSV = () => {
        const headers = "Date,Amount,Type,Status,Sender\n";
        const rows = transactions.map(t => `${t.timestamp},${t.amount},${t.type},${t.status},${t.senderId}`).join("\n");
        const blob = new Blob([headers + rows], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Analytics_${new Date().toLocaleDateString()}.csv`;
        link.click();
    };

    return (
        <div className="flex-1 flex flex-col p-6 pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="text-xl font-black uppercase italic tracking-tighter">Protocol Insights</h1>
                </div>
                <button onClick={exportCSV} className="w-10 h-10 rounded-full glass flex items-center justify-center text-accent-purple">
                    <Download size={20} />
                </button>
            </div>

            <div className="flex gap-2 mb-8 bg-white/5 p-1 rounded-xl">
                {['TODAY', 'WEEKLY', 'MONTHLY'].map(p => (
                    <button 
                        key={p} 
                        onClick={() => setPeriod(p)}
                        className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${period === p ? 'bg-accent-purple text-white shadow-lg shadow-purple-500/20' : 'text-secondary hover:text-white'}`}
                    >
                        {p}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="glass-card p-5 border-purple-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <TrendingUp size={14} className="text-accent-purple" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Gross Revenue</span>
                    </div>
                    <p className="text-2xl font-black italic">₹{transactions.reduce((s,t) => s + (t.type === 'RECEIVE' ? t.amount : 0), 0)}</p>
                    <p className="text-[8px] text-green-400 font-bold mt-1">+12.4% vs last period</p>
                </div>
                <div className="glass-card p-5 border-purple-500/10">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-accent-purple" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-secondary">Footfall</span>
                    </div>
                    <p className="text-2xl font-black italic">{transactions.length}</p>
                    <p className="text-[8px] text-accent-purple font-bold mt-1">42% New customers</p>
                </div>
            </div>

            <div className="glass-card p-6 border-purple-500/10 mb-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2">
                        <BarChart3 size={16} className="text-accent-purple" />
                        <h3 className="text-[10px] font-black uppercase tracking-widest">Hourly Velocity</h3>
                    </div>
                    <span className="text-[10px] text-secondary font-bold uppercase">Peak: 3PM</span>
                </div>

                <div className="flex items-end justify-between h-48 gap-2 px-2">
                    {hourlyData.map((d, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-3">
                            <motion.div 
                                initial={{ height: 0 }}
                                animate={{ height: `${(d.v / maxVal) * 100}%` }}
                                className={`w-full rounded-t-lg bg-gradient-to-t from-purple-600 to-accent-purple shadow-[0_0_15px_rgba(168,85,247,0.3)] min-h-[4px]`}
                            ></motion.div>
                            <span className="text-[8px] font-black text-secondary uppercase vertical-text">{d.h}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-secondary flex items-center gap-2">
                    <Clock size={14} /> Peak Engagement Zones
                </h3>
                
                <div className="glass-card p-5 border-purple-500/10">
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-white">Morning (9AM - 12PM)</span>
                        <div className="flex gap-1">
                            {[1,1,1,2,0].map((v,i) => <div key={i} className={`w-3 h-3 rounded-sm ${v === 2 ? 'bg-accent-purple' : v === 1 ? 'bg-purple-500/40' : 'bg-white/5'}`}></div>)}
                        </div>
                    </div>
                    <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-bold text-white">Afternoon (12PM - 4PM)</span>
                        <div className="flex gap-1">
                            {[2,2,2,2,1].map((v,i) => <div key={i} className={`w-3 h-3 rounded-sm ${v === 2 ? 'bg-accent-purple' : v === 1 ? 'bg-purple-500/40' : 'bg-white/5'}`}></div>)}
                        </div>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white">Evening (4PM - 9PM)</span>
                        <div className="flex gap-1">
                            {[1,0,0,0,0].map((v,i) => <div key={i} className={`w-3 h-3 rounded-sm ${v === 2 ? 'bg-accent-purple' : v === 1 ? 'bg-purple-500/40' : 'bg-white/5'}`}></div>)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MerchantAnalytics;
