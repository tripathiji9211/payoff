import React from 'react';
import { motion } from 'framer-motion';
import { Wallet, BellOff, WifiOff, CheckCircle2 } from 'lucide-react';

export const EmptyTransactions = ({ onAction }) => (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-24 h-24 rounded-full bg-accent-cyan/5 border border-accent-cyan/10 flex items-center justify-center mb-6"
        >
            <Wallet size={40} className="text-accent-cyan opacity-40" />
        </motion.div>
        <h3 className="text-lg font-black uppercase italic tracking-tighter mb-2 font-heading">Protocol Empty</h3>
        <p className="text-[10px] text-secondary font-bold uppercase tracking-widest leading-loose mb-8 max-w-[200px]">
            Your offline ledger is clear. Start your first secure local transaction.
        </p>
        <button 
            onClick={onAction}
            className="btn-primary px-8 py-3 text-[10px] font-black"
        >
            Send Payment
        </button>
    </div>
);

export const EmptyNotifications = () => (
    <div className="flex flex-col items-center justify-center py-20 opacity-40">
        <motion.div
            animate={{ 
                rotate: [0, -10, 10, -10, 0],
                y: [0, -5, 0]
            }}
            transition={{ duration: 4, repeat: Infinity }}
        >
            <BellOff size={48} />
        </motion.div>
        <p className="mt-6 text-[10px] font-black uppercase tracking-[0.2em]">Silence is secure</p>
    </div>
);

export const AllCaughtUp = () => (
    <div className="flex flex-col items-center justify-center py-12 text-accent-green">
        <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-16 h-16 rounded-full bg-accent-green/10 flex items-center justify-center mb-4"
        >
            <CheckCircle2 size={32} />
        </motion.div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]">Sync Protocol 100%</p>
        <p className="text-[8px] opacity-60 uppercase font-bold mt-1">All local blocks verified</p>
    </div>
);
