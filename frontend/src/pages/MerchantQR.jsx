import React, { useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { useAuth } from '../context/AuthContext';
import { Download, Printer, ChevronLeft, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const MerchantQR = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const qrRef = useRef();

    const downloadQR = () => {
        const svg = qrRef.current.querySelector('svg');
        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = 1000;
            canvas.height = 1000;
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 100, 100, 800, 800);
            
            // Add Label
            ctx.fillStyle = '#0a0f1e';
            ctx.font = 'bold 40px Outfit';
            ctx.textAlign = 'center';
            ctx.fillText(user.name, 500, 920);
            ctx.font = '30px Outfit';
            ctx.fillText(user.upiId, 500, 960);

            const url = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `MerchantQR_${user.name}.png`;
            link.href = url;
            link.click();
            toast.success('QR Downloaded');
        };
        
        img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
    };

    const printQR = () => {
        window.print();
    };

    return (
        <div className="flex-1 flex flex-col p-6 pb-32 bg-[#0a0f1e] text-white min-h-screen">
            <div className="flex items-center gap-4 mb-8 no-print">
                <button onClick={() => navigate(-1)} className="w-10 h-10 rounded-full glass flex items-center justify-center">
                    <ChevronLeft size={20} />
                </button>
                <h1 className="text-xl font-black uppercase italic tracking-tighter font-heading">Business Identity</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center">
                <div ref={qrRef} className="bg-white p-8 rounded-[40px] shadow-[0_0_50px_rgba(157,78,221,0.3)] mb-10 print:shadow-none print:m-0 relative overflow-hidden">
                    <div className="qr-scan-line opacity-20"></div>
                    <QRCodeSVG 
                        value={user.upiId} 
                        size={280} 
                        level="H"
                        includeMargin={false}
                    />
                </div>

                <div className="text-center mb-12 print:mt-4">
                    <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-1 font-heading">{user.name}</h2>
                    <p className="text-accent-purple font-black uppercase tracking-[0.2em] text-[10px]">{user.upiId}</p>
                </div>

                <div className="grid grid-cols-2 gap-4 w-full no-print">
                    <button onClick={downloadQR} className="glass-card py-5 flex flex-col items-center gap-2 border-purple-500/10 hover:bg-purple-500/5 transition-all group">
                        <Download size={24} className="group-hover:text-accent-purple transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Download PNG</span>
                    </button>
                    <button onClick={printQR} className="glass-card py-5 flex flex-col items-center gap-2 border-purple-500/10 hover:bg-purple-500/5 transition-all group">
                        <Printer size={24} className="group-hover:text-accent-purple transition-colors" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Print Sticker</span>
                    </button>
                </div>

                <button className="mt-8 text-secondary text-[10px] uppercase font-black tracking-widest hover:text-white transition-colors no-print flex items-center gap-2">
                    <Share2 size={14} /> Share UPI Identity
                </button>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print, .print * { visibility: visible; }
                    .no-print { display: none !important; }
                    #root { background: white !important; }
                    .flex-1 { display: block !important; }
                }
            `}</style>
        </div>
    );
};

export default MerchantQR;
