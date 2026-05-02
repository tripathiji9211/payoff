import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';
import { ChevronLeft, ArrowRight, CheckCircle2, Lock, Loader2, Delete, MessageSquare, AlertCircle, Copy, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '../context/DemoContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { getAmountSuggestions } from '../services/ai';
import { Zap } from 'lucide-react';

const SendPayment = () => {
    const { user } = useAuth();
    const { addTransaction, addNotification, balance, offlineLimit } = useWallet();
    const navigate = useNavigate();
    
    const [receiver, setReceiver] = useState('');
    const [amount, setAmount] = useState('');
    const [pin, setPin] = useState('');
    const [qrValue, setQrValue] = useState(null);
    const [compressedToken, setCompressedToken] = useState(null);
    const [step, setStep] = useState(1); // 1: Input, 2: PIN, 3: Generating, 4: Transmission
    const [activeTab, setActiveTab] = useState('QR'); // QR, SCAN, NEARBY
    const [timeLeft, setTimeLeft] = useState(600); // 10 minutes
    const { demoStep, nextStep, isDemoActive } = useDemo();
    const isOnline = useOnlineStatus();
    const { transactions: history } = useWallet();

    const [suggestions, setSuggestions] = useState([]);
    const [isSuggestionsLoading, setIsSuggestionsLoading] = useState(false);
    const scannerRef = useRef(null);
    const answerScannerRef = useRef(null);

    // WebRTC State
    const [rtcStatus, setRtcStatus] = useState('IDLE'); // IDLE, SEARCHING, OFFER_READY, SCANNING_ANSWER, CONNECTING, CONNECTED, COMPLETE
    const [offerQr, setOfferQr] = useState(null);
    const [rtcPeer, setRtcPeer] = useState(null);
    const [dataChannel, setDataChannel] = useState(null);

    // Cleanup WebRTC
    useEffect(() => {
        return () => {
            if (rtcPeer) rtcPeer.close();
            if (dataChannel) dataChannel.close();
        };
    }, [rtcPeer, dataChannel]);

    const startNearby = async () => {
        try {
            setRtcStatus('SEARCHING');
            const pc = new RTCPeerConnection({ iceServers: [] });
            const dc = pc.createDataChannel('offlinepay');
            
            dc.onopen = () => {
                setRtcStatus('CONNECTED');
                toast.success('P2P Channel Established');
                // Wait a moment then send
                setTimeout(() => {
                    dc.send(qrValue); // send the raw JSON payload
                    setRtcStatus('COMPLETE');
                    toast.success('Payload Transmitted Successfully');
                }, 1000);
            };

            pc.onicecandidate = (e) => {
                if (!e.candidate) {
                    const offerSdp = LZString.compressToBase64(JSON.stringify(pc.localDescription));
                    setOfferQr(offerSdp);
                    setRtcStatus('OFFER_READY');
                }
            };

            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            setRtcPeer(pc);
            setDataChannel(dc);
        } catch (e) {
            console.error(e);
            toast.error('WebRTC Initialization Failed');
        }
    };

    const handleScanAnswer = () => {
        setRtcStatus('SCANNING_ANSWER');
    };

    useEffect(() => {
        let scanner;
        const startAnswerScanner = async () => {
            if (activeTab === 'NEARBY' && rtcStatus === 'SCANNING_ANSWER') {
                try {
                    scanner = new Html5Qrcode('reader_answer');
                    answerScannerRef.current = scanner;

                    const config = { 
                        fps: 30, 
                        qrbox: { width: 280, height: 280 },
                        aspectRatio: 1.0
                    };

                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                    const onScan = async (decodedText) => {
                        try {
                            const decompressed = LZString.decompressFromBase64(decodedText);
                            const answer = JSON.parse(decompressed);
                            if (answer.type === 'answer') {
                                await scanner.stop();
                                setRtcStatus('CONNECTING');
                                await rtcPeer.setRemoteDescription(new RTCSessionDescription(answer));
                            } else {
                                toast.error('Invalid WebRTC Answer');
                            }
                        } catch (e) {
                            toast.error('Could not parse Answer QR');
                        }
                    };

                    if (isMobile) {
                        try {
                            await scanner.start({ facingMode: { exact: "environment" } }, config, onScan, () => {});
                        } catch (e) {
                            await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
                        }
                    } else {
                        await scanner.start({ facingMode: "user" }, config, onScan, () => {});
                    }
                } catch (err) {
                    console.error("Answer Scanner failed", err);
                }
            }
        };

        startAnswerScanner();

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(e => {});
            }
        };
    }, [activeTab, rtcStatus, rtcPeer]);

    // SCAN TAB LOGIC
    useEffect(() => {
        let scanner;
        const startMerchantScanner = async () => {
            if (activeTab === 'SCAN' && step === 1) {
                try {
                    scanner = new Html5Qrcode('reader_merchant');
                    scannerRef.current = scanner;

                    const config = { 
                        fps: 30, 
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    };

                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                    const onScan = async (decodedText) => {
                        try {
                            const data = JSON.parse(decodedText);
                            if (data.encrypted || data.isBill) {
                                setReceiver(data.receiverUpiId || '');
                                if (data.amount) setAmount(data.amount.toString());
                                await scanner.stop();
                                setActiveTab('QR');
                                toast.success('Bill Decoded');
                            } else {
                                setReceiver(decodedText);
                                await scanner.stop();
                                setActiveTab('QR');
                            }
                        } catch (e) {
                            setReceiver(decodedText);
                            await scanner.stop();
                            setActiveTab('QR');
                        }
                    };

                    if (isMobile) {
                        try {
                            await scanner.start({ facingMode: { exact: "environment" } }, config, onScan, () => {});
                            // Enable torch if mobile
                            try {
                                const track = scanner.getRunningTrack();
                                if (track && track.getCapabilities().torch) {
                                    await track.applyConstraints({ advanced: [{ torch: true }] });
                                }
                            } catch (e) {}
                        } catch (e) {
                            await scanner.start({ facingMode: "environment" }, config, onScan, () => {});
                        }
                    } else {
                        await scanner.start({ facingMode: "user" }, config, onScan, () => {});
                    }
                } catch (err) {
                    console.error("Merchant Scanner failed", err);
                }
            }
        };

        startMerchantScanner();

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(e => {});
            }
        };
    }, [activeTab, step]);

    // DEMO MODE HOOKS
    useEffect(() => {
        if (!isDemoActive) return;
        
        let timer;
        if (demoStep === 2) {
            setReceiver('merchant@offlinepay');
            setAmount('250');
            timer = setTimeout(() => {
                setStep(2);
                nextStep(); // advance to step 3
            }, 3000);
        }
        else if (demoStep === 3) {
            timer = setTimeout(() => {
                setPin('123456'); // auto trigger QR generation
            }, 1500);
        }
        else if (demoStep === 4) {
            // After QR generation, it will automatically wait a bit then nextStep handles navigation to Receive
            timer = setTimeout(() => {
                nextStep();
            }, 4000);
        }

        return () => clearTimeout(timer);
    }, [demoStep, isDemoActive]);

    useEffect(() => {
        const loadSuggestions = async () => {
            setIsSuggestionsLoading(true);
            const recentAmounts = history.slice(0, 10).map(t => t.amount);
            const result = await getAmountSuggestions(recentAmounts, isOnline);
            setSuggestions(result.suggestions || [100, 500, 1000]);
            setIsSuggestionsLoading(false);
        };
        if (step === 1) loadSuggestions();
    }, [history, isOnline, step]);

    useEffect(() => {
        let timer;
        if (step === 4 && timeLeft > 0) {
            timer = setInterval(() => setTimeLeft(prev => prev - 1), 1000);
        }
        return () => clearInterval(timer);
    }, [step, timeLeft]);

    const hasWarnedExpiryRef = useRef(false);
    useEffect(() => {
        if (step === 4 && timeLeft === 120 && !hasWarnedExpiryRef.current) {
            hasWarnedExpiryRef.current = true;
            addNotification('Token Expiring Soon', 'Your payment token expires in 2 minutes!', 'token_expiry', null);
        }
    }, [timeLeft, step, addNotification]);

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handlePinClick = (num) => {
        if (pin.length < 6) setPin(prev => prev + num);
    };

    const handleDelete = () => {
        setPin(prev => prev.slice(0, -1));
    };

    useEffect(() => {
        if (pin.length === 6) {
            handleGenerateQR();
        }
    }, [pin]);

    const handleGenerateQR = async () => {
        const numAmount = parseFloat(amount);
        if (numAmount > balance) {
            toast.error('Insufficient Balance');
            setStep(1);
            setPin('');
            return;
        }

        if (numAmount > offlineLimit) {
            toast.error('Increase your trust score to send more');
            setStep(1);
            setPin('');
            return;
        }

        setStep(3);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const txnId = `TXN_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
        const timestamp = new Date().toISOString();
        const expiresAt = Date.now() + 600000;
        const deviceId = CryptoJS.SHA256(navigator.userAgent + screen.width).toString().slice(0, 16);
        const nonce = CryptoJS.lib.WordArray.random(16).toString();

        const token = {
            v: "1.0",
            txnId,
            senderId: user?.id || 'ANONYMOUS',
            receiverUpiId: receiver,
            amount: numAmount,
            timestamp,
            expiresAt,
            deviceId,
            nonce
        };

        try {
            const encrypted = CryptoJS.AES.encrypt(JSON.stringify(token), pin).toString();
            const signature = CryptoJS.SHA256(JSON.stringify(token)).toString();
            const finalPayload = JSON.stringify({ encrypted, signature });

            // Compress for SMS transmission
            const compressed = LZString.compressToBase64(finalPayload);
            setCompressedToken(compressed);

            // Optimistic Debit & Store
            await addTransaction({
                id: txnId,
                type: 'SEND',
                receiverUpiId: receiver,
                amount: numAmount,
                status: 'PENDING',
                timestamp,
                expiresAt: new Date(expiresAt).toISOString()
            });

            await addNotification('Payment Generated', `You sent ₹${amount} to ${receiver} (Pending sync)`, 'payment_sent', '/pending');

            setQrValue(finalPayload);
            
            // Broadcast for Split-Demo mode
            const bc = new BroadcastChannel('offlinepay_transfer');
            bc.postMessage({ type: 'PAYMENT_TOKEN', payload: finalPayload });
            bc.close();

            setStep(4);
            toast.success('Payment Secured Offline');
        } catch (err) {
            console.error(err);
            toast.error('Encryption Failed');
            setStep(2);
            setPin('');
        }
    };

    const handleShareSMS = () => {
        const message = `OfflinePay Token: ${compressedToken} — Open app to receive ₹${amount} from ${user?.name || 'Sender'}`;
        window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(compressedToken);
        toast.success('Token Copied');
    };

    const handleWebShare = async () => {
        const message = `OfflinePay Token: ${compressedToken} — Open app to receive ₹${amount} from ${user?.name || 'Sender'}`;
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'OfflinePay Payment',
                    text: message,
                });
            } catch (err) {
                console.error(err);
            }
        } else {
            handleCopy();
        }
    };

    const getSmsSize = () => {
        if (!compressedToken) return 0;
        const msg = `OfflinePay Token: ${compressedToken} — Open app to receive ₹${amount} from ${user?.name || 'Sender'}`;
        return msg.length;
    };

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter font-heading">Secure Send</h1>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6"
                    >
                        <div className="glass-card p-6 border-accent-cyan/10">
                            <p className="text-secondary text-[10px] uppercase font-black tracking-widest mb-4">Recipient Identity</p>
                            <input 
                                type="text"
                                className="bg-white/5 border border-white/10 rounded-xl p-4 w-full outline-none focus:border-accent-cyan transition-colors font-bold text-sm"
                                placeholder="UPI ID or Phone Number"
                                value={receiver}
                                onChange={(e) => setReceiver(e.target.value)}
                            />
                        </div>

                        <div className="glass-card p-8 text-center border-accent-cyan/10">
                            <p className="text-secondary text-[10px] uppercase font-black tracking-widest mb-4">Transaction Amount</p>
                            <div className="flex items-center justify-center gap-3">
                                <span className="text-3xl font-black text-accent-cyan">₹</span>
                                <input 
                                    type="number" 
                                    className="bg-transparent text-6xl font-black outline-none w-full text-center placeholder:text-white/5"
                                    placeholder="0"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                />
                            </div>

                            {/* Smart AI Suggestions */}
                            <div className="mt-8">
                                <div className="flex items-center gap-2 justify-center mb-4">
                                    <Zap size={12} className="text-accent-cyan" />
                                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-secondary">AI Intelligent Amounts</span>
                                </div>
                                <div className="flex justify-center gap-3">
                                    {isSuggestionsLoading ? (
                                        <div className="animate-pulse flex gap-3">
                                            {[1, 2, 3].map(i => <div key={i} className="w-16 h-8 bg-white/5 rounded-lg"></div>)}
                                        </div>
                                    ) : (
                                        suggestions.map((val, idx) => (
                                            <button 
                                                key={idx}
                                                onClick={() => setAmount(val.toString())}
                                                className="px-4 py-2 glass-card border-white/10 hover:border-accent-cyan/50 hover:bg-accent-cyan/5 transition-all text-[11px] font-black text-white"
                                            >
                                                ₹{val}
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-center gap-1 mt-6">
                                <p className="text-[10px] text-secondary font-bold uppercase tracking-widest">
                                    Available: <span className="text-white">₹{balance.toLocaleString()}</span>
                                </p>
                                <p className={`text-[10px] font-bold uppercase tracking-widest ${parseFloat(amount || 0) > offlineLimit ? 'text-red-400' : 'text-accent-cyan'}`}>
                                    Your offline limit: ₹{offlineLimit.toLocaleString()}
                                </p>
                            </div>
                        </div>

                        <button 
                            onClick={() => setStep(2)}
                            disabled={!amount || parseFloat(amount) <= 0 || !receiver || parseFloat(amount) > offlineLimit}
                            className="btn-primary ripple-effect w-full py-5 flex items-center justify-center gap-2 disabled:opacity-30 disabled:grayscale"
                        >
                            Confirm Details <ArrowRight size={20} />
                        </button>
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="text-center mb-10">
                            <h2 className="text-lg font-black uppercase italic tracking-widest mb-2">Vault Authorization</h2>
                            <p className="text-secondary text-[10px] uppercase font-bold tracking-[0.2em] mb-8">Enter 6-Digit Security PIN</p>
                            <div className="flex justify-center gap-4">
                                {[...Array(6)].map((_, i) => (
                                    <motion.div 
                                        key={i}
                                        animate={{ 
                                            scale: pin.length > i ? [1, 1.4, 1] : 1,
                                            backgroundColor: pin.length > i ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.1)',
                                            boxShadow: pin.length > i ? '0 0 20px var(--accent-cyan)' : 'none'
                                        }}
                                        transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                                        className="w-4 h-4 rounded-full border border-white/10"
                                    ></motion.div>
                                ))}
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 px-4">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button key={num} onClick={() => handlePinClick(num.toString())} className="h-20 glass-card text-2xl font-black hover:bg-accent-cyan/10 active:scale-90 transition-all border-white/5">
                                    {num}
                                </button>
                            ))}
                            <div className="flex items-center justify-center opacity-20"><Lock size={24} /></div>
                            <button onClick={() => handlePinClick('0')} className="h-20 glass-card text-2xl font-black hover:bg-accent-cyan/10 active:scale-90 transition-all border-white/5">0</button>
                            <button onClick={handleDelete} className="h-20 glass-card flex items-center justify-center text-red-400 hover:bg-red-400/10 active:scale-90 transition-all border-white/5">
                                <Delete size={24} />
                            </button>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="relative mb-8">
                            <Loader2 size={80} className="text-accent-cyan animate-spin" />
                            <div className="absolute inset-0 bg-accent-cyan blur-3xl opacity-20 animate-pulse"></div>
                        </div>
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-2">Vault Locking...</h2>
                        <p className="text-secondary text-[10px] font-black uppercase tracking-[0.2em]">Encrypting Protocol with AES-256</p>
                    </div>
                )}

                {step === 4 && (
                    <motion.div 
                        key="step4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center"
                    >
                        <div className="w-full flex rounded-xl p-1 bg-white/5 border border-white/10 mb-8">
                            {['QR', 'SCAN', 'NEARBY'].map(tab => (
                                <motion.button 
                                    key={tab}
                                    onClick={() => {
                                        setActiveTab(tab);
                                        if (tab === 'NEARBY' && rtcStatus === 'IDLE') startNearby();
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                        activeTab === tab 
                                        ? 'bg-white text-[#0a0f1e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                                        : 'text-secondary hover:text-white'
                                    }`}
                                >
                                    {tab}
                                </motion.button>
                            ))}
                        </div>

                        {activeTab === 'SCAN' ? (
                            <div className="w-full flex flex-col items-center">
                                <div className="relative w-full aspect-square glass-card overflow-hidden border-accent-cyan/10 mb-8 p-1">
                                    <div id="reader_merchant" className="w-full h-full rounded-2xl overflow-hidden grayscale contrast-125"></div>
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="qr-scan-line"></div>
                                        <div className="absolute inset-0 border-[60px] border-[#0a0f1e]/80"></div>
                                        <div className="absolute inset-[60px] border-2 border-accent-cyan/20"></div>
                                    </div>
                                </div>
                                <div className="w-full">
                                    <label className="w-full py-4 glass-card border-white/10 flex flex-col items-center justify-center gap-2 hover:bg-white/5 hover:border-accent-cyan/50 transition-all cursor-pointer">
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            className="hidden" 
                                            onChange={async (e) => {
                                                const file = e.target.files[0];
                                                if (file && scannerRef.current) {
                                                    try {
                                                        const result = await scannerRef.current.scanFile(file, true);
                                                        // Extract logic from onScan
                                                        try {
                                                            const data = JSON.parse(result);
                                                            if (data.encrypted || data.isBill) {
                                                                setReceiver(data.receiverUpiId || '');
                                                                if (data.amount) setAmount(data.amount.toString());
                                                                toast.success('Bill Decoded');
                                                            } else {
                                                                setReceiver(result);
                                                            }
                                                        } catch (e) {
                                                            setReceiver(result);
                                                        }
                                                        setActiveTab('QR');
                                                    } catch (err) {
                                                        toast.error("No QR code found in image");
                                                    }
                                                }
                                            }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary group-hover:text-white transition-colors">Scan an Image File</span>
                                    </label>
                                </div>
                                <p className="text-[10px] text-center text-secondary font-black uppercase tracking-widest mt-4">Scan Merchant QR or Bill to Auto-Fill</p>

                            </div>
                        ) : activeTab === 'QR' ? (
                            <>
                                <div className={`p-1 rounded-3xl mb-8 relative transition-all duration-500 ${timeLeft < 120 ? 'bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.3)]' : 'bg-accent-cyan shadow-[0_0_40px_rgba(0,245,255,0.3)]'}`}>
                                    <div className={`bg-white p-6 rounded-[22px] ${timeLeft === 0 ? 'opacity-20 grayscale' : ''} relative overflow-hidden`}>
                                        <div className="qr-scan-line opacity-20"></div>
                                        <QRCodeSVG value={qrValue} size={260} level="H" />
                                    </div>
                                    {timeLeft === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="bg-red-500 text-white px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest shadow-2xl">Expired</div>
                                        </div>
                                    )}
                                </div>

                                <div className="text-center mb-8">
                                    <p className="text-secondary text-[10px] uppercase font-black tracking-widest mb-2">Token Expiry Countdown</p>
                                    <p className={`text-4xl font-black font-mono transition-colors ${timeLeft < 120 ? 'text-red-500 animate-pulse' : 'text-accent-yellow'}`}>
                                        {formatTime(timeLeft)}
                                    </p>
                                </div>

                                <div className="w-full space-y-4">
                                    <div className="glass-card p-5 border-l-4 border-accent-cyan flex justify-between items-center bg-accent-cyan/5">
                                        <div>
                                            <p className="text-[10px] text-secondary uppercase font-black mb-1">Authorization Successful</p>
                                            <p className="text-2xl font-black text-white">₹{amount}</p>
                                        </div>
                                        <CheckCircle2 className="text-accent-cyan" size={32} />
                                    </div>

                                    <div className="glass-card p-4 border-white/5">
                                        <div className="flex justify-between items-center mb-4">
                                            <p className="text-[10px] uppercase font-black tracking-widest text-secondary">Can't scan? Send via SMS</p>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-bold text-secondary">{getSmsSize()} chars</span>
                                                <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-widest ${getSmsSize() <= 160 ? 'bg-green-500/20 text-green-400' : 'bg-accent-yellow/20 text-accent-yellow'}`}>
                                                    {getSmsSize() <= 160 ? '✅ 1 SMS' : '⚠️ 2 SMS required'}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-3 gap-2">
                                            <button onClick={handleShareSMS} className="py-3 glass-card flex flex-col items-center justify-center gap-2 border-white/10 hover:bg-white/5 hover:border-accent-cyan/50 transition-colors group">
                                                <MessageSquare size={18} className="group-hover:text-accent-cyan transition-colors" />
                                                <span className="text-[8px] uppercase font-black tracking-widest">SMS</span>
                                            </button>
                                            <button onClick={handleCopy} className="py-3 glass-card flex flex-col items-center justify-center gap-2 border-white/10 hover:bg-white/5 hover:border-accent-cyan/50 transition-colors group">
                                                <Copy size={18} className="group-hover:text-accent-cyan transition-colors" />
                                                <span className="text-[8px] uppercase font-black tracking-widest">Copy</span>
                                            </button>
                                            <button onClick={handleWebShare} className="py-3 glass-card flex flex-col items-center justify-center gap-2 border-white/10 hover:bg-white/5 hover:border-accent-cyan/50 transition-colors group">
                                                <Share2 size={18} className="group-hover:text-accent-cyan transition-colors" />
                                                <span className="text-[8px] uppercase font-black tracking-widest">Share</span>
                                            </button>
                                        </div>
                                    </div>

                                    <button onClick={() => navigate('/')} className="w-full text-secondary text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors mt-4">
                                        Back to Control Center
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="w-full flex flex-col items-center">
                                {rtcStatus === 'SEARCHING' && (
                                    <div className="py-20 flex flex-col items-center relative">
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <div className="w-32 h-32 rounded-full border border-accent-cyan/30 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                            <div className="w-48 h-48 rounded-full border border-accent-cyan/20 absolute animate-[ping_2.5s_cubic-bezier(0,0,0.2,1)_infinite]"></div>
                                        </div>
                                        <Loader2 size={48} className="text-accent-cyan animate-spin mb-4 relative z-10" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary relative z-10">Initializing Local Radar...</p>
                                    </div>
                                )}
                                
                                {rtcStatus === 'OFFER_READY' && (
                                    <div className="flex flex-col items-center w-full">
                                        <div className="bg-white p-6 rounded-3xl mb-6 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
                                            <QRCodeSVG value={offerQr} size={220} level="M" />
                                        </div>
                                        <p className="text-sm font-black uppercase text-accent-cyan mb-2">Device Found</p>
                                        <p className="text-[10px] text-secondary text-center uppercase tracking-widest mb-8">Show this connection QR to receiver first,<br/>then scan their Answer to pair.</p>
                                        
                                        <button onClick={handleScanAnswer} className="btn-gradient w-full py-4 uppercase tracking-widest">
                                            Scan Receiver's Answer
                                        </button>
                                    </div>
                                )}

                                {rtcStatus === 'SCANNING_ANSWER' && (
                                    <>
                                        <div className="relative w-full aspect-square glass-card overflow-hidden border-accent-cyan/10 mb-8 p-1">
                                            <div id="reader_answer" className="w-full h-full rounded-2xl overflow-hidden grayscale contrast-125"></div>
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="scan-line"></div>
                                                <div className="absolute inset-0 border-[60px] border-[#0a0f1e]/80"></div>
                                                <div className="absolute inset-[60px] border-2 border-accent-cyan/20"></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-accent-cyan">
                                            <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Scanning Answer QR...</span>
                                        </div>
                                    </>
                                )}

                                {rtcStatus === 'CONNECTING' && (
                                    <div className="py-20 flex flex-col items-center">
                                        <Loader2 size={48} className="text-accent-cyan animate-spin mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Establishing P2P Tunnel...</p>
                                    </div>
                                )}

                                {rtcStatus === 'COMPLETE' && (
                                    <div className="py-10 flex flex-col items-center">
                                        <div className="w-20 h-20 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400 mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                                            <CheckCircle2 size={40} />
                                        </div>
                                        <h3 className="text-xl font-black uppercase italic tracking-tighter mb-2">Transmission Complete</h3>
                                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-secondary mb-8 text-center">Payload successfully delivered<br/>over secure local P2P channel.</p>
                                        <button onClick={() => navigate('/')} className="glass-card py-4 w-full uppercase tracking-widest text-[10px] font-black text-secondary hover:text-white transition-colors">
                                            Back to Control Center
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {timeLeft < 120 && step === 4 && timeLeft > 0 && (
                <div className="mt-8 p-4 glass-card bg-red-500/10 border-red-500/30 flex items-center gap-3 text-red-400">
                    <AlertCircle size={20} />
                    <p className="text-[10px] font-black uppercase tracking-widest">Protocol expiring soon. Re-generate if failed.</p>
                </div>
            )}
        </div>
    );
};

export default SendPayment;
