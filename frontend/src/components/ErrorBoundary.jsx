import React from 'react';
import { AlertCircle, RefreshCcw } from 'lucide-react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("Uncaught offline error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-[#0a0f1e] text-white flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-24 h-24 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                        <AlertCircle size={48} />
                    </div>
                    <h1 className="text-2xl font-black uppercase italic tracking-tighter mb-4 text-red-400">Critical Failure</h1>
                    <p className="text-secondary text-xs uppercase font-bold tracking-[0.2em] mb-8 leading-loose">
                        The application encountered an unexpected fault.<br />Your encrypted vault data remains safe.
                    </p>
                    <div className="bg-white/5 border border-white/10 p-4 rounded-xl w-full max-w-md text-left mb-8 overflow-auto max-h-32">
                        <p className="text-red-300 font-mono text-[10px] whitespace-pre-wrap">{this.state.error?.toString()}</p>
                    </div>
                    <button 
                        onClick={() => window.location.reload()}
                        className="btn-gradient px-8 py-4 flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] font-black w-full max-w-xs"
                    >
                        <RefreshCcw size={16} /> Reboot System
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
