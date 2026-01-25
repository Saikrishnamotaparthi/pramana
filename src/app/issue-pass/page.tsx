"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/hooks/useAuth";
import QRCode from "qrcode";
import { Printer, RotateCw, AlertTriangle, CheckCircle } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function IssuePassPage() {
    const { loading } = useAuth();

    // UI State
    const [inputValue, setInputValue] = useState("");
    const [searching, setSearching] = useState(false);

    // Lookup Result
    const [passData, setPassData] = useState<any>(null);
    const [physicalQrUrl, setPhysicalQrUrl] = useState("");
    const [processing, setProcessing] = useState(false);

    // Auto Print State Removed

    // Print Settings
    const [printSettings, setPrintSettings] = useState({
        width: "300px",
        height: "300px",
    });

    const inputRef = useRef<HTMLInputElement>(null);

    // Load settings from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("printSettings");
        if (saved) setPrintSettings(JSON.parse(saved));
    }, []);

    const saveSettings = (newSettings: any) => {
        setPrintSettings(newSettings);
        localStorage.setItem("printSettings", JSON.stringify(newSettings));
    };

    const handleLookup = async (qr: string) => {
        if (!qr || searching) return;
        setSearching(true);
        setPassData(null);
        setPhysicalQrUrl("");

        try {
            const res = await fetch("/api/lookup-pass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: qr }),
            });
            const json = await res.json();

            if (json.success) {
                setPassData(json.pass);
                if (json.pass.physicalQr) {
                    const url = await QRCode.toDataURL(json.pass.physicalQr);
                    setPhysicalQrUrl(url);
                }
            } else {
                alert(json.message || "Pass not found");
            }
        } catch (error) {
            console.error(error);
            alert("Scan Error");
        } finally {
            setSearching(false);
            setInputValue("");
        }
    };

    const handleIssue = async (action: 'issue' | 'reissue') => {
        if (!passData) return;
        setProcessing(true);
        try {
            const res = await fetch("/api/issue-physical", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    passDocId: passData.id,
                    action: action
                }),
            });
            const json = await res.json();
            if (json.success) {
                const url = await QRCode.toDataURL(json.physicalQr);
                setPhysicalQrUrl(url);
                setPassData((prev: any) => ({ ...prev, physicalQr: json.physicalQr, issuedPhysical: true }));

                // Trigger Print Removed
                // setIsPrinting(true);
            } else {
                alert(json.message);
            }
        } catch (error) {
            console.error(error);
            alert("Issuance Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLookup(inputValue);
        }
    };

    const reset = () => {
        setPassData(null);
        setPhysicalQrUrl("");
        setInputValue("");
        setTimeout(() => inputRef.current?.focus(), 100);
    };

    // Print Modal Component using Portal
    const PrintPortal = () => {
        if (!physicalQrUrl) return null;

        // We only render this into portal when we have a URL

        /* 
           Logic:
           We always render the Portal if we have a URL, so 'window.print' can see it.
           We use CSS to hide usage. 
           Wait, user wants auto-print on issue.
        */

        return createPortal(
            <div id="print-overlay">
                <style jsx global>{`
                    /* Default Screen Styles: Hide Overlay */
                    #print-overlay {
                        display: none;
                    }

                    @media print {
                        @page {
                            size: ${printSettings.width} ${printSettings.height};
                            margin: 0;
                        }
                        body {
                            visibility: hidden;
                            margin: 0;
                            padding: 0;
                            height: 100vh;
                            width: 100vw;
                            overflow: hidden;
                        }
                        #print-overlay {
                            display: flex !important;
                            visibility: visible !important;
                            position: fixed;
                            top: 0;
                            left: 0;
                            width: 100%;
                            height: 100%;
                            background: white;
                            align-items: center;
                            justify-content: center;
                            z-index: 99999;
                        }
                        /* Hide everything else explicitly just in case */
                        #app-root, #__next, main, header, footer, nav, aside, .next-route-announcer {
                            display: none !important;
                        }
                    }
                `}</style>
                <div style={{ width: printSettings.width, height: printSettings.height }} className="flex items-center justify-center overflow-hidden">
                    <img
                        src={physicalQrUrl}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', imageRendering: 'pixelated' }}
                    />
                </div>
            </div>,
            document.body
        );
    };

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (loading) return <div>Loading...</div>;



    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />

            {/* Render Print Portal */}
            {mounted && physicalQrUrl && <PrintPortal />}

            <div className="flex-1 flex flex-col w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black relative">
                {/* Header */}
                <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center shadow-lg sticky top-0 z-10">
                    <h1 className="text-xl font-bold font-cinzel text-pramana-gold">Physical Pass Issuance</h1>
                    <div className="flex items-center gap-4 text-sm">
                        <span className="font-bold text-pramana-cream/60">Print Size:</span>
                        <input className="bg-black/50 border border-white/10 text-white p-1 w-16 text-center rounded focus:outline-none focus:border-pramana-gold" value={printSettings.width} onChange={e => saveSettings({ ...printSettings, width: e.target.value })} />
                        <span className="text-pramana-cream/40">x</span>
                        <input className="bg-black/50 border border-white/10 text-white p-1 w-16 text-center rounded focus:outline-none focus:border-pramana-gold" value={printSettings.height} onChange={e => saveSettings({ ...printSettings, height: e.target.value })} />
                        <button onClick={() => window.print()} className="bg-white/10 p-2 rounded hover:bg-white/20 text-pramana-gold border border-white/5 transition"><Printer size={16} /></button>
                    </div>
                </div>

                <main className="flex-1 flex flex-col items-center p-8 justify-center">
                    {!passData && (
                        <div className="w-full max-w-2xl text-center">
                            <input
                                ref={inputRef}
                                autoFocus
                                value={inputValue}
                                onChange={e => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Scan Booking QR..."
                                className="w-full text-center text-4xl font-bold p-12 rounded-3xl bg-black/50 border-4 border-pramana-gold/30 text-pramana-gold placeholder:text-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)] focus:border-pramana-gold focus:ring-4 focus:ring-pramana-gold/20 outline-none transition-all font-cinzel tracking-wider"
                            />
                            {searching && <RotateCw className="animate-spin text-pramana-gold mx-auto mt-8" size={48} />}
                            <p className="mt-8 text-pramana-cream/40 font-medium animate-pulse uppercase tracking-widest text-sm">Ready to Scan</p>
                        </div>
                    )}

                    {passData && (
                        <div className="w-full max-w-xl bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
                            <div className={`p-8 ${passData.category === 'gitam' ? 'bg-gradient-to-r from-blue-900/80 to-blue-800/80' : 'bg-gradient-to-r from-purple-900/80 to-purple-800/80'} text-white flex justify-between items-start border-b border-white/10`}>
                                <div>
                                    <h2 className="text-3xl font-bold font-cinzel text-pramana-gold mb-1">{passData.passName}</h2>
                                    <p className="opacity-80 font-mono text-sm">{passData.email}</p>
                                </div>
                                <span className="bg-black/40 border border-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider text-pramana-gold shadow-lg">{passData.category}</span>
                            </div>
                            <div className="p-8">
                                <div className="mb-8 flex items-center gap-4 bg-black/20 p-4 rounded-xl border border-white/5">
                                    {passData.issuedPhysical ? (
                                        <><CheckCircle className="text-green-500" size={32} /><div className="flex flex-col"><span className="text-xl font-bold text-green-400 font-cinzel">Issued Successfully</span><span className="text-xs text-white/30 font-mono">{passData.physicalQr}</span></div></>
                                    ) : (
                                        <><AlertTriangle className="text-yellow-500" size={32} /><span className="text-xl font-bold text-yellow-400 font-cinzel">Pending Issuance</span></>
                                    )}
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {!passData.issuedPhysical ? (
                                        <button onClick={() => handleIssue('issue')} disabled={processing} className="col-span-2 bg-gradient-to-r from-pramana-gold to-yellow-600 text-black py-5 rounded-xl font-bold text-lg hover:shadow-lg hover:shadow-pramana-gold/20 flex justify-center items-center gap-3 transition-all font-cinzel tracking-wider">
                                            {processing ? <RotateCw className="animate-spin" /> : "ISSUE PASS"}
                                        </button>
                                    ) : (
                                        <>
                                            <button onClick={() => window.print()} className="bg-white/10 text-white py-4 rounded-xl font-bold hover:bg-white/20 border border-white/10 shadow-lg flex justify-center items-center gap-2 transition"><Printer /> REPRINT</button>
                                            <button onClick={() => confirm("Invalidate old QR?") && handleIssue('reissue')} disabled={processing} className="bg-red-900/30 text-red-400 border border-red-500/30 py-4 rounded-xl font-bold hover:bg-red-900/50 flex justify-center items-center gap-2 transition">
                                                {processing ? <RotateCw className="animate-spin" /> : "RE-ISSUE"}
                                            </button>
                                        </>
                                    )}
                                </div>
                                <button onClick={reset} className="w-full mt-8 text-pramana-cream/30 hover:text-white font-bold text-xs uppercase tracking-widest transition-colors block">Cancel / Scan Next</button>
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
