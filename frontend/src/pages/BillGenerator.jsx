import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';
import { Plus, Trash2, ChevronLeft, Receipt, ArrowRight, CheckCircle2, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import CryptoJS from 'crypto-js';
import { putData, STORES } from '../services/db';

const BillGenerator = () => {
    const { user } = useAuth();
    const { balance, offlineLimit } = useWallet();
    const navigate = useNavigate();
    
    const [items, setItems] = useState([{ id: 1, name: '', price: '' }]);
    const [step, setStep] = useState(1); // 1: Edit, 2: PIN, 3: QR
    const [pin, setPin] = useState('');
    const [qrValue, setQrValue] = useState(null);

    const addItem = () => {
        setItems([...items, { id: Date.now(), name: '', price: '' }]);
    };

    const removeItem = (id) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        }
    };

    const updateItem = (id, field, value) => {
        setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const total = items.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);

    const handleGenerate = () => {
        if (items.some(i => !i.name || !i.price)) {
            toast.error('Complete all item details');
            return;
        }
        setStep(2);
    };

    const handlePinClick = (num) => {
        if (pin.length < 6) setPin(p => p + num);
    };

    useEffect(() => {
        if (pin.length === 6) {
            generateSecureBill();
        }
    }, [pin]);

    const generateSecureBill = async () => {
        try {
            const billData = {
                v: "1.1", // Bill protocol
                txnId: `BILL_${Date.now()}`,
                senderId: user.name,
                receiverUpiId: user.upiId,
                amount: total,
                items: items.map(i => ({ name: i.name, price: parseFloat(i.price) })),
                timestamp: new Date().toISOString(),
                expiresAt: Date.now() + 1800000, // 30 mins
                isBill: true
            };

            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(billData), pin).toString();
            const signature = CryptoJS.SHA256(JSON.stringify(billData)).toString();
            const payload = JSON.stringify({ encrypted, signature });

            // Store in DB
            await putData(STORES.BILLS, billData);

            setQrValue(payload);
            setStep(3);
            toast.success('Secure Bill Generated');
        } catch (e) {
            toast.error('Bill Generation Failed');
            setPin('');
            setStep(1);
        }
    };

    return (
        <div className="flex-1 flex flex-col p-6 pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter">Bill Generator</h1>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
                        <div className="glass-card p-6 border-purple-500/10">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-[10px] font-black uppercase tracking-widest text-secondary">Itemized Invoice</h2>
                                <button onClick={addItem} className="text-accent-purple flex items-center gap-1 text-[10px] font-black uppercase tracking-widest">
                                    <Plus size={14} /> Add Item
                                </button>
                            </div>

                            <div className="space-y-4 mb-8">
                                {items.map((item, idx) => (
                                    <div key={item.id} className="flex gap-3 items-end">
                                        <div className="flex-1">
                                            <input 
                                                type="text" 
                                                placeholder="Item Name"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-accent-purple"
                                                value={item.name}
                                                onChange={(e) => updateItem(item.id, 'name', e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <input 
                                                type="number" 
                                                placeholder="₹0"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-xs outline-none focus:border-accent-purple text-right"
                                                value={item.price}
                                                onChange={(e) => updateItem(item.id, 'price', e.target.value)}
                                            />
                                        </div>
                                        <button onClick={() => removeItem(item.id)} className="w-10 h-10 flex items-center justify-center text-red-400 opacity-50 hover:opacity-100">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            <div className="border-t border-white/5 pt-6 flex justify-between items-center">
                                <span className="text-[10px] font-black uppercase tracking-widest text-secondary">Total Amount</span>
                                <span className="text-3xl font-black text-accent-purple">₹{total}</span>
                            </div>
                        </div>

                        <button onClick={handleGenerate} className="btn-gradient w-full py-5 flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600">
                            Generate Secure Bill <ArrowRight size={20} />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col items-center">
                        <div className="text-center mb-10">
                            <Lock size={40} className="text-accent-purple mx-auto mb-6" />
                            <h2 className="text-xl font-black uppercase italic tracking-tighter">Sign Protocol</h2>
                            <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-2">Enter Signature PIN</p>
                        </div>
                        <div className="flex justify-center gap-4 mb-12">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className={`w-4 h-4 rounded-full border border-white/10 ${pin.length > i ? 'bg-accent-purple' : 'bg-white/5'}`}></div>
                            ))}
                        </div>
                        <div className="grid grid-cols-3 gap-4 w-full px-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((n, i) => (
                                <button 
                                    key={i} 
                                    onClick={() => n === 'DEL' ? setPin(p => p.slice(0,-1)) : (n !== '' && handlePinClick(n.toString()))}
                                    className="h-16 glass-card text-xl font-black"
                                >{n}</button>
                            ))}
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center">
                        <div className="bg-white p-6 rounded-[32px] shadow-[0_0_50px_rgba(168,85,247,0.3)] mb-10">
                            <QRCodeSVG value={qrValue} size={260} level="M" />
                        </div>
                        <div className="text-center mb-10">
                            <p className="text-[10px] text-accent-purple font-black uppercase tracking-widest mb-1 flex items-center justify-center gap-2">
                                <CheckCircle2 size={12} /> Secure Bill Encrypted
                            </p>
                            <h2 className="text-3xl font-black">₹{total}</h2>
                            <p className="text-[10px] text-secondary font-black uppercase tracking-widest mt-2">Scan to Pay & View Items</p>
                        </div>
                        <button onClick={() => navigate('/')} className="glass-card w-full py-4 uppercase text-[10px] font-black tracking-widest">
                            Cancel & Return
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default BillGenerator;
