import React, { useState, useEffect } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { useWallet } from '../context/WalletContext';
import { getAllData, STORES } from '../services/db';
import { QRCodeSVG } from 'qrcode.react';
import CryptoJS from 'crypto-js';
import LZString from 'lz-string';
import { ChevronLeft, Camera, CheckCircle2, AlertCircle, ShieldAlert, X, Check, Lock, Loader2, User, MessageSquare } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { useDemo } from '../context/DemoContext';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { detectFraud } from '../services/ai';
import { Shield, ShieldCheck, ShieldAlert as ShieldAlertIcon, Zap } from 'lucide-react';
import SuccessCheckmark from '../components/SuccessCheckmark';

const ReceivePayment = () => {
    const { user } = useAuth();
    const { addTransaction, addNotification } = useWallet();
    const navigate = useNavigate();
    
    const [scannedWrapper, setScannedWrapper] = useState(null);
    const [scannedData, setScannedData] = useState(null);
    const [pin, setPin] = useState('');
    const [error, setError] = useState(null);
    const [step, setStep] = useState(1); // 1: Scan/Paste/Nearby, 2: PIN, 3: Processing, 4: Error, 5: Confirm, 6: Success
    const [activeTab, setActiveTab] = useState('SCAN');
    const [pasteToken, setPasteToken] = useState('');
    
    // WebRTC State
    const [rtcStatus, setRtcStatus] = useState('SCANNING'); // SCANNING, GENERATING, ANSWER_READY, CONNECTED
    const [answerQr, setAnswerQr] = useState(null);
    const { demoStep, nextStep, isDemoActive } = useDemo();
    const isOnline = useOnlineStatus();
    const { trustScore: receiverTrustScore, transactions: receiverHistory } = useWallet();

    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [fraudResult, setFraudResult] = useState(null);
    const scannerRef = React.useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [cameraError, setCameraError] = useState(null);

    // Split-Demo Broadcast Listener
    useEffect(() => {
        const bc = new BroadcastChannel('offlinepay_transfer');
        bc.onmessage = (event) => {
            if (event.data.type === 'PAYMENT_TOKEN' && step === 1) {
                try {
                    const wrapper = JSON.parse(event.data.payload);
                    setScannedWrapper(wrapper);
                    setStep(2);
                    toast.success('P2P Protocol Intercepted', { icon: '📡' });
                } catch(e) {}
            }
        };
        return () => bc.close();
    }, [step]);

    // DEMO MODE HOOKS
    useEffect(() => {
        if (!isDemoActive) return;
        
        let timer;
        if (demoStep === 4) {
            // Simulate scan success
            timer = setTimeout(() => {
                setScannedData({
                    txnId: `TXN_DEMO_${Date.now()}`,
                    senderId: 'Authorized User',
                    amount: 250,
                    expiresAt: Date.now() + 600000
                });
                setStep(5);
                toast.success('Protocol Signal Locked');
                nextStep();
            }, 3000);
        }
        else if (demoStep === 5) {
            // Simulate clicking accept
            timer = setTimeout(() => {
                handleAccept();
                setTimeout(nextStep, 2000); // Wait for success screen then go to step 6
            }, 3000);
        }

        return () => clearTimeout(timer);
    }, [demoStep, isDemoActive]);

    useEffect(() => {
        let scanner;
        const startScanner = async () => {
            if (step === 1 && (activeTab === 'SCAN' || (activeTab === 'NEARBY' && rtcStatus === 'SCANNING'))) {
                const targetId = activeTab === 'SCAN' ? "reader" : "reader"; // Both use 'reader' div
                
                try {
                    scanner = new Html5Qrcode(targetId);
                    scannerRef.current = scanner;

                    const config = { 
                        fps: 30, 
                        qrbox: { width: 280, height: 280 },
                        aspectRatio: 1.0
                    };

                    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

                    const handleScan = (decodedText) => {
                        onScanSuccess(decodedText);
                    };

                    if (isMobile) {
                        try {
                            await scanner.start(
                                { facingMode: { exact: "environment" } },
                                config,
                                handleScan,
                                () => {}
                            );
                            
                            // Enable Torch if supported
                            try {
                                const track = scanner.getRunningTrack();
                                if (track && track.getCapabilities().torch) {
                                    await track.applyConstraints({ advanced: [{ torch: true }] });
                                }
                            } catch (e) {
                                console.log("Torch not supported", e);
                            }
                        } catch (err) {
                            // Fallback if 'exact environment' fails
                            await scanner.start(
                                { facingMode: "environment" },
                                config,
                                handleScan,
                                () => {}
                            );
                        }
                    } else {
                        await scanner.start(
                            { facingMode: "user" },
                            config,
                            handleScan,
                            () => {}
                        );
                    }
                    setIsCameraActive(true);
                    setCameraError(null);
                } catch (err) {
                    console.error("Camera access failed", err);
                    setCameraError("Camera access denied or unavailable");
                    setIsCameraActive(false);
                }
            }
        };

        startScanner();

        return () => {
            if (scanner && scanner.isScanning) {
                scanner.stop().catch(err => console.error("Error stopping scanner", err));
            }
        };
    }, [step, activeTab, rtcStatus]);

    async function onScanSuccess(decodedText) {
        if (activeTab === 'SCAN') {
            try {
                const wrapper = JSON.parse(decodedText);
                if (wrapper.encrypted && wrapper.signature) {
                    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
                    setScannedWrapper(wrapper);
                    setStep(2);
                    toast.success('Protocol Signal Locked');
                } else {
                    toast.error('Invalid Protocol Format');
                }
            } catch (e) {
                toast.error('Could not parse signal');
            }
        } else if (activeTab === 'NEARBY') {
            try {
                const decompressed = LZString.decompressFromBase64(decodedText);
                const offer = JSON.parse(decompressed);
                
                if (offer.type === 'offer') {
                    if (scannerRef.current) scannerRef.current.stop().catch(() => {});
                    setRtcStatus('GENERATING');
                    
                    const pc = new RTCPeerConnection({ iceServers: [] });
                    
                    pc.ondatachannel = (event) => {
                        const channel = event.channel;
                        channel.onmessage = (e) => {
                            setRtcStatus('CONNECTED');
                            const data = JSON.parse(e.data);
                            if (data.encrypted && data.signature) {
                                setScannedWrapper(data);
                                toast.success('P2P Payload Received');
                                setStep(2);
                            }
                        };
                    };

                    pc.onicecandidate = (e) => {
                        if (!e.candidate) {
                            const answerSdp = LZString.compressToBase64(JSON.stringify(pc.localDescription));
                            setAnswerQr(answerSdp);
                            setRtcStatus('ANSWER_READY');
                        }
                    };

                    await pc.setRemoteDescription(new RTCSessionDescription(offer));
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                } else {
                    toast.error('Invalid WebRTC Offer');
                }
            } catch (e) {
                toast.error('Invalid Connection QR');
            }
        }
    }

    const handleVerifyPaste = () => {
        if (!pasteToken) {
            toast.error('Please paste a token first');
            return;
        }
        try {
            const decompressed = LZString.decompressFromBase64(pasteToken.trim());
            if (!decompressed) throw new Error('Decompression failed');
            const wrapper = JSON.parse(decompressed);
            if (wrapper.encrypted && wrapper.signature) {
                setScannedWrapper(wrapper);
                setStep(2);
                toast.success('Protocol Signal Locked');
            } else {
                toast.error('Invalid Protocol Format');
            }
        } catch (e) {
            toast.error('Invalid or corrupted SMS Token');
        }
    };

    const handlePinClick = (num) => {
        if (pin.length < 6) setPin(prev => prev + num);
    };

    useEffect(() => {
        if (pin.length === 6) {
            handleDecrypt();
        }
    }, [pin]);

    const handleDecrypt = async () => {
        setStep(3);
        await new Promise(resolve => setTimeout(resolve, 1000));

        try {
            // 1. Decrypt
            const bytes = CryptoJS.AES.decrypt(scannedWrapper.encrypted, pin);
            const decryptedString = bytes.toString(CryptoJS.enc.Utf8);
            
            if (!decryptedString) {
                toast.error('Authorization Failed: Invalid PIN');
                setStep(2);
                setPin('');
                return;
            }

            const data = JSON.parse(decryptedString);

            // 2. Verify Signature
            const expectedSignature = CryptoJS.SHA256(JSON.stringify(data)).toString();
            if (scannedWrapper.signature !== expectedSignature) {
                setError('CRITICAL: Protocol Signature Mismatch. Data may be tampered.');
                setStep(4);
                return;
            }

            // 3. Check Expiry
            if (Date.now() > data.expiresAt) {
                setError('Token Expired ❌');
                setStep(4);
                return;
            }

            // 4. Check Device Binding (Anti-Spoofing)
            const currentDeviceId = CryptoJS.SHA256(navigator.userAgent + screen.width).toString().slice(0, 16);
            if (data.deviceId && data.deviceId !== currentDeviceId) {
                // In a real multi-device scenario this would fail. 
                // In our Split-Demo on same machine, it matches!
                console.warn('Device fingerprint mismatch detected');
            }

            // 5. Check Duplicate
            const history = await getAllData(STORES.HISTORY) || [];
            if (history.some(t => t.id === data.txnId)) {
                setError('Duplicate Scan: This token has already been processed.');
                setStep(4);
                return;
            }

            setScannedData(data);
            setStep(5);

            // Trigger AI Fraud Analysis
            setIsAnalyzing(true);
            const analysisContext = {
                amount: data.amount,
                senderId: data.senderId,
                receiverUpiId: user.upiId,
                timestamp: data.timestamp || Date.now(),
                tokenAge: Date.now() - (data.timestamp || Date.now()),
                senderTrustScore: data.trustScore || 50,
                receiverTrustScore,
                receiverTransactionHistory: receiverHistory.slice(0, 5).map(t => ({ amount: t.amount, type: t.type })),
                timeOfDay: new Date().getHours(),
                isWeekend: [0, 6].includes(new Date().getDay())
            };

            const result = await detectFraud(analysisContext, isOnline);
            setFraudResult(result);
            setIsAnalyzing(false);
        } catch (e) {
            console.error(e);
            toast.error('Security Module Failure');
            setStep(2);
            setPin('');
        }
    };

    const handleAccept = async () => {
        const txn = {
            ...scannedData,
            id: scannedData.txnId, // Ensure we use the original txnId
            type: 'RECEIVE',
            status: 'PENDING',
            settledAt: null
        };

        await addTransaction(txn);
        await addNotification('Incoming Funds Vaulted', `Received ₹${scannedData.amount} from ${scannedData.senderId} (Pending).`, 'payment_received', '/pending');
        
        setStep(6);
        toast.success('Payment Received ✅ — Will confirm when online');
    };

    const handleReject = () => {
        toast.error('Payment Rejected');
        navigate('/');
    };

    return (
        <div className="flex-1 flex flex-col p-6 overflow-y-auto pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter font-heading">Secure Receive</h1>
            </div>

            <AnimatePresence mode="wait">
                {step === 1 && (
                    <motion.div 
                        key="step1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col items-center"
                    >
                        <div className="w-full flex rounded-xl p-1 bg-white/5 border border-white/10 mb-8">
                            {[
                                { id: 'SCAN', label: 'Scan QR', icon: <Camera size={16} /> },
                                { id: 'NEARBY', label: 'Nearby', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 12-8.5 8.5c-1.3 1.3-3.3 1.3-4.6 0a3.2 3.2 0 0 1 0-4.6L10.4 7.4"/><path d="m14.5 14.5 5.5-5.5"/><path d="m21.6 8.4-5.5-5.5c-1.3-1.3-3.3-1.3-4.6 0a3.2 3.2 0 0 0 0 4.6l3 3"/></svg> },
                                { id: 'PASTE', label: 'Paste Token', icon: <MessageSquare size={16} /> }
                            ].map(tab => (
                                <motion.button 
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className={`flex-1 py-3 flex items-center justify-center gap-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-[#0a0f1e] shadow-[0_0_20px_rgba(255,255,255,0.2)]' 
                                        : 'text-secondary hover:text-white'
                                    }`}
                                >
                                    {tab.icon} {tab.label}
                                </motion.button>
                            ))}
                        </div>

                        {activeTab === 'SCAN' ? (
                            <>
                                <div className="relative w-full aspect-square glass-card overflow-hidden border-accent-cyan/10 mb-8 p-1">
                                    <div id="reader" className="w-full h-full rounded-2xl overflow-hidden grayscale contrast-125"></div>
                                    <div className="absolute inset-0 pointer-events-none">
                                        <div className="qr-scan-line"></div>
                                        <div className="absolute inset-0 border-[60px] border-[#0a0f1e]/80"></div>
                                        <div className="absolute inset-[60px] border-2 border-accent-cyan/20"></div>
                                        <div className="absolute top-[55px] left-[55px] w-10 h-10 border-t-4 border-l-4 border-accent-cyan shadow-[0_0_20px_rgba(0,245,255,0.4)]"></div>
                                        <div className="absolute top-[55px] right-[55px] w-10 h-10 border-t-4 border-r-4 border-accent-cyan shadow-[0_0_20px_rgba(0,245,255,0.4)]"></div>
                                        <div className="absolute bottom-[55px] left-[55px] w-10 h-10 border-b-4 border-l-4 border-accent-cyan shadow-[0_0_20px_rgba(0,245,255,0.4)]"></div>
                                        <div className="absolute bottom-[55px] right-[55px] w-10 h-10 border-b-4 border-r-4 border-accent-cyan shadow-[0_0_20px_rgba(0,245,255,0.4)]"></div>
                                    </div>
                                </div>
                                <div className="flex items-center justify-center gap-2 text-accent-cyan mb-4">
                                    <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></div>
                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                        {cameraError ? cameraError : "Point camera at payment QR"}
                                    </span>
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
                                                        onScanSuccess(result);
                                                    } catch (err) {
                                                        toast.error("No QR code found in image");
                                                    }
                                                }
                                            }}
                                        />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-secondary group-hover:text-white transition-colors">Scan an Image File</span>
                                    </label>
                                </div>
                            </>
                        ) : activeTab === 'NEARBY' ? (
                            <div className="w-full flex flex-col items-center">
                                {rtcStatus === 'SCANNING' && (
                                    <>
                                        <div className="relative w-full aspect-square glass-card overflow-hidden border-accent-cyan/10 mb-8 p-1">
                                            <div id="reader" className="w-full h-full rounded-2xl overflow-hidden grayscale contrast-125"></div>
                                            <div className="absolute inset-0 pointer-events-none">
                                                <div className="scan-line"></div>
                                                <div className="absolute inset-0 border-[60px] border-[#0a0f1e]/80"></div>
                                                <div className="absolute inset-[60px] border-2 border-accent-cyan/20"></div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-center gap-2 text-accent-cyan">
                                            <div className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></div>
                                            <span className="text-[10px] font-black uppercase tracking-widest">Scan Sender's Connection QR</span>
                                        </div>
                                    </>
                                )}
                                {rtcStatus === 'GENERATING' && (
                                    <div className="py-20 flex flex-col items-center">
                                        <Loader2 size={48} className="text-accent-cyan animate-spin mb-4" />
                                        <p className="text-[10px] font-black uppercase tracking-widest text-secondary">Generating Secure Answer...</p>
                                    </div>
                                )}
                                {rtcStatus === 'ANSWER_READY' && (
                                    <div className="flex flex-col items-center">
                                        <div className="bg-white p-6 rounded-3xl mb-6 shadow-[0_0_30px_rgba(0,245,255,0.3)]">
                                            <QRCodeSVG value={answerQr} size={220} level="M" />
                                        </div>
                                        <p className="text-sm font-black uppercase text-accent-cyan mb-2">Answer Generated</p>
                                        <p className="text-[10px] text-secondary text-center uppercase tracking-widest mb-6">Have the sender scan this Answer QR<br/>to complete the P2P connection.</p>
                                        <div className="flex items-center gap-2 bg-blue-500/10 text-blue-400 px-4 py-2 rounded-full text-[10px] font-bold tracking-widest">
                                            <Loader2 size={12} className="animate-spin" /> Waiting for sender to connect...
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="w-full flex flex-col flex-1">
                                <p className="text-[10px] text-secondary font-black uppercase tracking-widest mb-4">Paste your OfflinePay SMS token here</p>
                                <textarea 
                                    className="w-full h-48 glass-card bg-white/5 border border-white/10 rounded-xl p-4 text-xs font-mono text-white resize-none outline-none focus:border-accent-cyan focus:shadow-[0_0_15px_rgba(0,245,255,0.2)] transition-all mb-8"
                                    placeholder="e.g. N4IgzgphAmIFwDYwBcQC8QA0BWAXAAkwGMAY"
                                    value={pasteToken}
                                    onChange={(e) => setPasteToken(e.target.value)}
                                ></textarea>
                                <button 
                                    onClick={handleVerifyPaste}
                                    className="btn-gradient w-full py-5 flex items-center justify-center gap-2"
                                >
                                    Verify SMS Token <ChevronLeft size={20} className="rotate-180" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {step === 2 && (
                    <motion.div 
                        key="step2"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col items-center"
                    >
                        <div className="glass-card p-8 w-full text-center border-accent-cyan/10">
                            <ShieldAlert className="mx-auto mb-6 text-accent-cyan" size={48} />
                            <h2 className="text-xl font-black uppercase italic tracking-tighter mb-2">Protocol Authorization</h2>
                            <p className="text-secondary text-[10px] font-black uppercase tracking-widest mb-8">Enter Sender's Authorization PIN</p>
                            
                            <div className="flex justify-center gap-4 mb-10">
                                {[...Array(6)].map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`w-4 h-4 rounded-full border border-white/10 transition-all duration-300 ${pin.length > i ? 'bg-accent-cyan shadow-[0_0_15px_rgba(0,245,255,0.5)] scale-125' : 'bg-white/5'}`}
                                    ></div>
                                ))}
                            </div>
                            
                            <div className="grid grid-cols-3 gap-4">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, 'DEL'].map((num, i) => (
                                    <button 
                                        key={i} 
                                        onClick={() => {
                                            if (num === 'DEL') setPin(p => p.slice(0, -1));
                                            else if (num !== '') handlePinClick(num.toString());
                                        }}
                                        className={`h-16 glass-card text-xl font-black flex items-center justify-center ${num === 'DEL' ? 'text-red-400' : ''} ${num === '' ? 'opacity-0 pointer-events-none' : 'hover:bg-accent-cyan/10'}`}
                                    >
                                        {num}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 3 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <Loader2 size={64} className="text-accent-cyan animate-spin mb-6" />
                        <h2 className="text-xl font-black uppercase italic tracking-widest">Verifying Protocol...</h2>
                    </div>
                )}

                {step === 4 && (
                    <motion.div 
                        key="step4"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                        <div className="w-20 h-20 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6">
                            <AlertCircle size={40} />
                        </div>
                        <h2 className="text-2xl font-black uppercase italic text-red-500 mb-4 tracking-tighter">Security Alert</h2>
                        <p className="text-secondary text-xs mb-10 px-6 font-bold uppercase tracking-widest leading-loose">{error}</p>
                        <button onClick={() => setStep(1)} className="btn-gradient bg-red-500 text-white w-full py-4">Re-init Signal Scanner</button>
                    </motion.div>
                )}

                {step === 5 && scannedData && (
                    <motion.div 
                        key="step5"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex-1 flex flex-col"
                    >
                        <div className="glass-card p-8 border-accent-cyan/20">
                            <div className="flex items-center gap-4 mb-10">
                                <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shadow-[0_0_20px_rgba(0,245,255,0.1)]">
                                    <CheckCircle2 size={32} />
                                </div>
                                <div>
                                    <h2 className="text-lg font-black uppercase italic tracking-tighter font-heading">Secure Link v{scannedData.v || '1.0'}</h2>
                                    <p className="text-[10px] text-accent-cyan font-black uppercase tracking-widest">Integrity Verified</p>
                                </div>
                            </div>

                            <div className="space-y-6 mb-10">
                                <div className="flex justify-between items-center border-b border-white/5 pb-4">
                                    <span className="text-[10px] text-secondary uppercase font-black tracking-widest">Originator</span>
                                    <span className="text-sm font-black">{scannedData.senderId}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] text-secondary uppercase font-black tracking-widest">Protocol Value</span>
                                    <span className="text-4xl font-black text-accent-cyan shadow-[0_0_15px_rgba(0,245,255,0.2)]">₹{scannedData.amount}</span>
                                </div>
                            </div>

                            {/* AI Fraud Analysis Result */}
                            <div className="mb-10">
                                {isAnalyzing ? (
                                    <div className="glass-card p-4 border-dashed border-accent-cyan/30 flex items-center justify-center gap-3">
                                        <Loader2 size={16} className="text-accent-cyan animate-spin" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-accent-cyan">AI Threat Analysis in Progress...</span>
                                    </div>
                                ) : fraudResult ? (
                                    <motion.div 
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className={`glass-card p-5 border-2 ${
                                            fraudResult.riskLevel === 'HIGH' ? 'border-red-500 bg-red-500/5' :
                                            fraudResult.riskLevel === 'MEDIUM' ? 'border-yellow-500 bg-yellow-500/5' :
                                            'border-green-500 bg-green-500/5'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between mb-3">
                                            <div className="flex items-center gap-3">
                                                {fraudResult.riskLevel === 'HIGH' ? (
                                                    <ShieldAlertIcon size={20} className="text-red-500" />
                                                ) : fraudResult.riskLevel === 'MEDIUM' ? (
                                                    <Shield size={20} className="text-yellow-500" />
                                                ) : (
                                                    <ShieldCheck size={20} className="text-green-500" />
                                                )}
                                                <div>
                                                    <p className={`text-[10px] font-black uppercase tracking-widest ${
                                                        fraudResult.riskLevel === 'HIGH' ? 'text-red-500' :
                                                        fraudResult.riskLevel === 'MEDIUM' ? 'text-yellow-500' :
                                                        'text-green-500'
                                                    }`}>
                                                        AI {fraudResult.riskLevel} RISK DETECTED
                                                    </p>
                                                    <p className="text-[9px] text-secondary font-bold uppercase tracking-wider mt-0.5">
                                                        {fraudResult.isLocal ? '⚡ Local Guard' : '🌐 Cloud Sentinel'} v4.2
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-[8px] text-secondary font-black uppercase tracking-widest mb-1">Risk Score</p>
                                                <p className={`text-xs font-black ${
                                                    fraudResult.riskScore > 70 ? 'text-red-500' :
                                                    fraudResult.riskScore > 30 ? 'text-yellow-500' :
                                                    'text-green-500'
                                                }`}>
                                                    {fraudResult.riskScore}/100
                                                </p>
                                            </div>
                                        </div>

                                        <p className="text-[10px] text-white/80 font-medium mb-3 leading-relaxed">
                                            {fraudResult.reason}
                                        </p>

                                        {fraudResult.flags && fraudResult.flags.length > 0 && (
                                            <div className="flex flex-wrap gap-2">
                                                {fraudResult.flags.map((flag, idx) => (
                                                    <span key={idx} className="px-2 py-1 rounded bg-white/5 border border-white/10 text-[8px] font-black uppercase tracking-widest text-secondary">
                                                        🚩 {flag}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </motion.div>
                                ) : null}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={handleReject} className="glass-card py-5 flex items-center justify-center gap-2 text-red-400 border-red-500/10 hover:bg-red-500/5 transition-colors font-black uppercase text-[10px] tracking-widest">
                                    <X size={18} /> Reject
                                </button>
                                <button onClick={handleAccept} className="btn-gradient py-5 flex items-center justify-center gap-2">
                                    <Check size={18} /> Accept
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}

                {step === 6 && (
                    <motion.div 
                        key="step6"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="flex-1 flex flex-col items-center justify-center text-center"
                    >
                        <div className="mb-10">
                            <SuccessCheckmark size={120} />
                        </div>
                        <h2 className="text-4xl font-black uppercase italic tracking-tighter mb-4 font-heading text-accent-green">Vaulted</h2>
                        <p className="text-secondary text-[10px] mb-12 uppercase font-black tracking-[0.2em] leading-relaxed">Transaction secured in local storage.<br/>Balance optimized.</p>
                        <button 
                            onClick={() => navigate('/')} 
                            className="btn-primary px-12 py-5 uppercase tracking-widest shadow-[0_10px_30px_rgba(0,245,255,0.2)] w-full"
                        >
                            Return Home
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ReceivePayment;
