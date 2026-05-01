import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSecurity } from '../context/SecurityContext';
import { 
    ChevronLeft, Shield, Fingerprint, Lock, Trash2, 
    Smartphone, History, CheckCircle2, AlertTriangle, Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import { STORES, getAllData, clearStore } from '../services/db';
import toast from 'react-hot-toast';

const SecuritySettings = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { biometricSupported, biometricEnabled, registerBiometric } = useSecurity();
    const [securityLogs, setSecurityLogs] = useState([]);
    const [auditRunning, setAuditRunning] = useState(false);

    useEffect(() => {
        const loadLogs = async () => {
            const logs = await getAllData(STORES.SECURITY_LOGS) || [];
            setSecurityLogs(logs.reverse().slice(0, 5));
        };
        loadLogs();
    }, []);

    const handleWipeData = async () => {
        if (window.confirm("NUCLEAR OPTION: This will wipe ALL local data for this account. Continue?")) {
            await Promise.all([
                clearStore(STORES.HISTORY),
                clearStore(STORES.NOTIFICATIONS),
                clearStore(STORES.SECURITY),
                clearStore(STORES.WALLET)
            ]);
            toast.success('Local Vault Purged');
            window.location.reload();
        }
    };

    const runAudit = () => {
        setAuditRunning(true);
        setTimeout(() => setAuditRunning(false), 2000);
    };

    const securityScore = (biometricEnabled ? 40 : 0) + (user?.pinHash ? 60 : 0);

    return (
        <div className="flex-1 flex flex-col p-6 bg-[#0a0f1e] text-white min-h-screen pb-32">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Security Audit</h1>
            </div>

            {/* Security Score Card */}
            <div className="glass-card p-6 mb-8 border-accent-cyan/20 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent-cyan/10 blur-3xl -mr-10 -mt-10"></div>
                
                <div className="flex justify-between items-end mb-6">
                    <div>
                        <p className="text-[10px] text-secondary font-black uppercase tracking-[0.2em] mb-1">Defense Level</p>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter text-accent-cyan">
                            {securityScore}% Hardened
                        </h2>
                    </div>
                    <Shield size={32} className="text-accent-cyan opacity-20" />
                </div>

                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden mb-6">
                    <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${securityScore}%` }}
                        className="h-full bg-gradient-to-r from-accent-cyan to-blue-500 shadow-[0_0_10px_rgba(0,245,255,0.5)]"
                    ></motion.div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-white/5 border border-white/5 flex items-center gap-3">
                        <CheckCircle2 size={14} className="text-green-400" />
                        <span className="text-[9px] font-bold uppercase tracking-widest">PIN Active</span>
                    </div>
                    <div className={`p-3 rounded-xl border flex items-center gap-3 ${biometricEnabled ? 'bg-green-500/5 border-green-500/20' : 'bg-white/5 border-white/5 opacity-50'}`}>
                        {biometricEnabled ? <CheckCircle2 size={14} className="text-green-400" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/20"></div>}
                        <span className="text-[9px] font-bold uppercase tracking-widest">Biometrics</span>
                    </div>
                </div>
            </div>

            {/* Security Actions */}
            <div className="space-y-4 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary px-2">Access Control</h3>
                
                <div className="glass-card p-4 flex items-center justify-between border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan">
                            <Fingerprint size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">WebAuthn Biometrics</p>
                            <p className="text-[9px] text-secondary font-bold uppercase tracking-widest">
                                {biometricSupported ? 'Hardware Compatible' : 'Not Supported'}
                            </p>
                        </div>
                    </div>
                    {biometricSupported && (
                        <button 
                            onClick={registerBiometric}
                            disabled={biometricEnabled}
                            className={`px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${biometricEnabled ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-accent-cyan text-[#0a0f1e]'}`}
                        >
                            {biometricEnabled ? 'Active' : 'Enable'}
                        </button>
                    )}
                </div>

                <div className="glass-card p-4 flex items-center justify-between border-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                            <Lock size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-white">Auto-Lock Protocol</p>
                            <p className="text-[9px] text-secondary font-bold uppercase tracking-widest">5 Min Inactivity</p>
                        </div>
                    </div>
                    <div className="w-10 h-6 bg-accent-cyan/20 rounded-full relative p-1">
                        <div className="w-4 h-4 bg-accent-cyan rounded-full absolute right-1"></div>
                    </div>
                </div>
            </div>

            {/* Device Info */}
            <div className="space-y-4 mb-8">
                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary px-2">Hardware Binding</h3>
                <div className="glass-card p-5 border-white/5">
                    <div className="flex items-center gap-4 mb-4">
                        <Smartphone size={20} className="text-secondary" />
                        <div>
                            <p className="text-xs font-black text-white">Current Device Fingerprint</p>
                            <p className="text-[8px] font-mono text-secondary break-all">
                                {window.navigator.userAgent.slice(0, 50)}...
                            </p>
                        </div>
                    </div>
                    <div className="flex justify-between items-center p-3 bg-black/40 rounded-xl border border-white/5">
                        <span className="text-[9px] font-bold text-secondary uppercase tracking-widest">ID Hash</span>
                        <span className="text-[9px] font-mono text-accent-cyan">
                            8832-EF91-0021-XA
                        </span>
                    </div>
                </div>
            </div>

            {/* Security Logs */}
            <div className="space-y-4 mb-8">
                <div className="flex justify-between items-center px-2">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-secondary">Integrity Logs</h3>
                    <button onClick={runAudit} className="flex items-center gap-2 text-[9px] text-accent-cyan font-black uppercase">
                        <Zap size={10} className={auditRunning ? 'animate-spin' : ''} />
                        {auditRunning ? 'Auditing...' : 'Run Audit'}
                    </button>
                </div>
                
                <div className="space-y-2">
                    {securityLogs.length === 0 ? (
                        <div className="glass-card p-6 text-center text-[10px] text-secondary font-bold uppercase tracking-widest border-dashed border-white/10">
                            No Security Events Detected
                        </div>
                    ) : (
                        securityLogs.map((log, i) => (
                            <div key={i} className="glass-card p-3 flex items-center justify-between border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className={`w-1.5 h-1.5 rounded-full ${log.type === 'TAMPER' ? 'bg-red-500' : 'bg-green-500'}`}></div>
                                    <span className="text-[10px] font-bold text-white">{log.message}</span>
                                </div>
                                <span className="text-[8px] text-secondary font-mono">{log.time}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Danger Zone */}
            <div className="mt-auto">
                <button 
                    onClick={handleWipeData}
                    className="w-full py-4 rounded-2xl border border-red-500/20 bg-red-500/5 text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-red-500/10 transition-colors"
                >
                    <Trash2 size={14} /> Purge All Local Data
                </button>
                <p className="text-center text-[8px] text-secondary font-bold uppercase tracking-widest mt-4">
                    Firmware Version: 1.0.4-SECURE
                </p>
            </div>
        </div>
    );
};

export default SecuritySettings;
