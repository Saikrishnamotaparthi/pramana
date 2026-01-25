"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Html5QrcodeScanner } from "html5-qrcode";
import { collection, query, where, getDocs, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Client DB for search
import Image from "next/image";

type ScanResult = {
    success: boolean;
    message: string;
    passName?: string;
    user?: string;
    status?: 'ALREADY_ENTERED' | 'CLOSED' | 'INVALID';
};

export default function EntryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeDay, setActiveDay] = useState<string | null>(null);
    const [mode, setMode] = useState<'scan' | 'manual' | 'gun'>('scan');
    const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

    // Scan State
    const [scanning, setScanning] = useState(false);
    const [lastResult, setLastResult] = useState<ScanResult | null>(null);
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    // Manual State
    const [searchTerm, setSearchTerm] = useState("");
    const [foundPass, setFoundPass] = useState<any | null>(null);
    const [manualLoading, setManualLoading] = useState(false);

    // Gun Mode State
    const gunInputRef = useRef<HTMLInputElement>(null);
    const [gunBuffer, setGunBuffer] = useState("");

    // Auto-focus Gun Input
    useEffect(() => {
        if (mode === 'gun' && !lastResult) {
            const timer = setInterval(() => {
                gunInputRef.current?.focus();
            }, 500); // Keep forcing focus
            return () => clearInterval(timer);
        }
    }, [mode, lastResult]);

    const handleGunInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            if (gunBuffer.trim().length > 0) {
                verifyEntry(gunBuffer.trim());
                setGunBuffer("");
            }
        }
    };

    useEffect(() => {
        if (!loading) {
            if (!user || (user.role !== 'entry_admin' && user.role !== 'superadmin')) {
                // router.push("/"); // strict redirect handled in AuthProvider, but safe to keep
            } else {
                // Realtime Listener for Active Day
                const unsub = onSnapshot(doc(db, "config", "entry"), (doc) => {
                    if (doc.exists()) {
                        const data = doc.data();
                        setDebugInfo(`Config Found: ${JSON.stringify(data)}`);
                        setActiveDay(data.activeDay || 'none');
                    } else {
                        setDebugInfo("Config Doc Missing");
                        setActiveDay('none');
                    }
                }, (error) => {
                    console.error("Config Listener Error:", error);
                    setDebugInfo(`Listener Error: ${error.message} (Role: ${user?.role})`);
                });

                return () => unsub();
            }
        }
    }, [user, loading, router]);

    // Initialize Scanner when mode is 'scan'
    useEffect(() => {
        if (mode === 'scan' && activeDay && activeDay !== 'none' && !lastResult) {
            // Small delay to ensure DOM is ready
            const timer = setTimeout(() => {
                if (!scannerRef.current) {
                    try {
                        const scanner = new Html5QrcodeScanner(
                            "reader",
                            { fps: 10, qrbox: 250 },
                            /* verbose= */ false
                        );
                        scanner.render(onScanSuccess, (err) => { /* ignore errors */ });
                        scannerRef.current = scanner;
                        setScanning(true);
                    } catch (e) {
                        console.error("Scanner init error", e);
                    }
                }
            }, 500);
            return () => clearTimeout(timer);
        } else {
            // Cleanup
            if (scannerRef.current) {
                scannerRef.current.clear().catch(console.error);
                scannerRef.current = null;
                setScanning(false);
            }
        }
    }, [mode, activeDay, lastResult]);

    const onScanSuccess = (decodedText: string, decodedResult: any) => {
        if (scannerRef.current) {
            scannerRef.current.pause(); // Pause scanning
        }
        verifyEntry(decodedText);
    };

    const verifyEntry = async (qrCode: string, isManual = false) => {
        try {
            const res = await fetch("/api/verify-entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode })
            });
            const data = await res.json();
            setLastResult(data);
        } catch (error) {
            console.error(error);
            setLastResult({ success: false, message: "Network/Server Error" });
        }
    };

    const resetScan = () => {
        setLastResult(null);
        if (scannerRef.current) {
            scannerRef.current.resume();
        }
    };

    const handleManualSearch = async () => {
        if (!searchTerm) return;
        setManualLoading(true);
        setFoundPass(null);
        setLastResult(null);
        try {
            // Search by email or phone in 'users' or 'passes_issued'
            // Let's search 'passes_issued' directly for 'issuedToEmail' or 'phone'(if stored?)
            // We'll assume Email for now.
            const q = query(collection(db, "passes_issued"), where("issuedToEmail", "==", searchTerm));
            const snap = await getDocs(q);
            if (!snap.empty) {
                // Find the first ACTIVE pass
                const validPass = snap.docs.find(d => d.data().status === 'active');
                if (validPass) {
                    setFoundPass({ ...validPass.data(), id: validPass.id });
                } else {
                    alert("User found but no active pass.");
                }
            } else {
                alert("No pass found with this email.");
            }
        } catch (error) {
            console.error(error);
            alert("Search failed");
        } finally {
            setManualLoading(false);
        }
    };

    const manualEntryAdmit = async () => {
        if (!foundPass) return;
        setManualLoading(true);
        // Use the pass's QR code (preferred) or Physical QR
        const codeToUse = foundPass.qrCode || foundPass.physicalQr;
        if (!codeToUse) {
            alert("Error: Pass has no QR code to verify.");
            setManualLoading(false);
            return;
        }
        await verifyEntry(codeToUse, true);
        setManualLoading(false);
        setFoundPass(null); // Clear search result to show Verification Result
    };

    if (loading) return <div className="p-10 text-center">Loading...</div>;

    if (activeDay === 'none' || !activeDay) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-pramana-black bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black p-4 font-playfair selection:bg-pramana-gold selection:text-black">
                <div className="bg-white/5 backdrop-blur-xl p-10 rounded-3xl shadow-2xl text-center max-w-md w-full mb-4 border border-white/10 animate-fade-in-up">
                    <h1 className="text-3xl font-bold text-pramana-gold mb-4 font-cinzel">Entry Closed</h1>
                    <p className="text-pramana-cream/60 mb-8">Entry is not currently active for any day.</p>

                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pramana-black text-pramana-cream font-playfair pb-20 selection:bg-pramana-gold selection:text-black">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-10 shadow-lg">
                <div className="flex justify-between items-center mb-3">
                    <h1 className="font-bold text-xl font-cinzel text-pramana-gold">Entry Portal</h1>
                    <div className="text-xs bg-pramana-gold/20 border border-pramana-gold/30 text-pramana-gold px-3 py-1 rounded-full uppercase tracking-wider font-bold">
                        Admin: {user?.displayName?.split(' ')[0]}
                    </div>
                </div>
                <div className="bg-black/40 border border-white/5 p-3 rounded-xl text-center flex justify-between items-center px-4">
                    <span className="text-xs text-pramana-cream/40 uppercase tracking-widest">ACTIVE SESSION</span>
                    <span className="font-bold text-green-400 uppercase tracking-widest shadow-green-500/20 drop-shadow-sm">{activeDay}</span>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-4 gap-3">
                <button
                    onClick={() => { setMode('scan'); setLastResult(null); setFoundPass(null); }}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border ${mode === 'scan' ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.2)]' : 'bg-white/5 border-white/5 text-pramana-cream/40 hover:bg-white/10'}`}
                >
                    📷 Scan
                </button>
                <button
                    onClick={() => { setMode('gun'); setLastResult(null); setFoundPass(null); }}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border ${mode === 'gun' ? 'bg-orange-600/20 border-orange-500 text-orange-400 shadow-[0_0_20px_rgba(234,88,12,0.2)]' : 'bg-white/5 border-white/5 text-pramana-cream/40 hover:bg-white/10'}`}
                >
                    🔫 Gun
                </button>
                <button
                    onClick={() => { setMode('manual'); setLastResult(null); setFoundPass(null); }}
                    className={`flex-1 py-4 rounded-2xl font-bold transition-all border ${mode === 'manual' ? 'bg-purple-600/20 border-purple-500 text-purple-400 shadow-[0_0_20px_rgba(147,51,234,0.2)]' : 'bg-white/5 border-white/5 text-pramana-cream/40 hover:bg-white/10'}`}
                >
                    🔍 Manual
                </button>
            </div>

            {/* Main Content */}
            <div className="p-4 max-w-2xl mx-auto">
                {lastResult ? (
                    <div className={`rounded-3xl p-8 text-center shadow-2xl animate-in fade-in zoom-in duration-300 border mb-8 ${lastResult.success ? 'bg-gradient-to-br from-green-900 via-green-800 to-black border-green-500/50 shadow-green-900/50' : 'bg-gradient-to-br from-red-900 via-red-800 to-black border-red-500/50 shadow-red-900/50'}`}>
                        <div className="text-7xl mb-6 shadow-xl rounded-full inline-block bg-black/30 p-4 backdrop-blur-sm">{lastResult.success ? '✅' : '🚫'}</div>
                        <h2 className={`text-4xl font-black mb-2 uppercase font-cinzel ${lastResult.success ? 'text-green-400' : 'text-red-400'}`}>{lastResult.success ? 'ALLOWED' : 'DENIED'}</h2>
                        <p className="text-xl font-medium text-white/90 mb-8 font-playfair tracking-wide">{lastResult.message}</p>

                        {lastResult.passName && (
                            <div className="bg-black/40 p-6 rounded-2xl mb-8 text-left border border-white/10 backdrop-blur-md">
                                <p className="text-xs uppercase tracking-wider text-white/40 mb-2">Participant Details</p>
                                <p className="font-bold text-2xl text-white font-cinzel mb-1">{lastResult.passName}</p>
                                <p className="text-base text-white/70 truncate font-mono">{lastResult.user}</p>
                            </div>
                        )}

                        <button
                            onClick={resetScan}
                            className="w-full bg-white text-black font-bold py-5 rounded-2xl shadow-xl hover:scale-[1.02] transition transform text-lg font-cinzel tracking-widest uppercase"
                        >
                            {mode === 'scan' ? 'Scan Next' : 'Check Another'}
                        </button>
                    </div>
                ) : (
                    <>
                        {mode === 'scan' && (
                            <div className="bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 relative group">
                                <div className="absolute inset-0 border-2 border-pramana-gold/30 rounded-3xl pointer-events-none z-10"></div>
                                <div id="reader" className="w-full opacity-80 group-hover:opacity-100 transition-opacity"></div>
                                <p className="text-center p-6 text-pramana-cream/40 text-sm uppercase tracking-widest font-bold">Point camera at QR Code</p>
                            </div>
                        )}

                        {mode === 'manual' && (
                            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl shadow-xl border border-white/10">
                                <h3 className="font-bold text-xl mb-6 font-cinzel text-pramana-gold">Search Attendee</h3>
                                <div className="flex gap-3 mb-8">
                                    <input
                                        type="email"
                                        placeholder="Enter registered email"
                                        className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white placeholder-white/20 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 transition-all font-mono"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <button
                                        onClick={handleManualSearch}
                                        disabled={manualLoading}
                                        className="bg-purple-600/20 border border-purple-500/50 text-purple-400 px-6 rounded-xl font-bold disabled:opacity-50 hover:bg-purple-600/30 transition shadow-[0_0_15px_rgba(147,51,234,0.3)]"
                                    >
                                        {manualLoading ? '...' : 'Go'}
                                    </button>
                                </div>

                                {foundPass && (
                                    <div className="bg-black/40 p-5 rounded-2xl border border-white/10 animate-fade-in-up">
                                        <div className="flex items-center gap-4 mb-6">
                                            {foundPass.photoURL ? (
                                                <Image src={foundPass.photoURL} alt="User" width={60} height={60} className="rounded-full bg-slate-800 border-2 border-pramana-gold/50" />
                                            ) : (
                                                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center font-bold text-2xl text-pramana-gold border-2 border-pramana-gold/50">
                                                    {foundPass.userName?.[0] || 'U'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-bold text-lg text-pramana-cream font-cinzel">{foundPass.passName}</p>
                                                <p className="text-sm text-pramana-cream/80">{foundPass.userName}</p>
                                                <p className="text-xs text-pramana-cream/40 font-mono mt-1">{foundPass.issuedToEmail}</p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                <p className="text-xs text-pramana-cream/40 uppercase tracking-wider mb-1">Category</p>
                                                <p className="font-bold capitalize text-pramana-gold">{foundPass.category || 'General'}</p>
                                            </div>
                                            <div className="bg-white/5 p-3 rounded-xl border border-white/5">
                                                <p className="text-xs text-pramana-cream/40 uppercase tracking-wider mb-1">Log</p>
                                                <p className="font-bold text-pramana-cream">{foundPass.entryLogs?.length || 0} Entries</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={manualEntryAdmit}
                                            disabled={manualLoading}
                                            className="w-full bg-green-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-green-500 transition shadow-green-900/30 font-cinzel tracking-wider text-lg"
                                        >
                                            {manualLoading ? "Processing..." : "MARK ENTRY"}
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}


                        {mode === 'gun' && (
                            <div className="bg-white/5 backdrop-blur-md p-10 rounded-3xl shadow-xl text-center border-2 border-orange-500/30">
                                <h3 className="font-bold text-2xl mb-4 text-orange-400 font-cinzel">Hardware Scanner Mode</h3>
                                <p className="text-pramana-cream/40 mb-10">Connect USB Scanner and ensure it ends with Enter.</p>

                                <div className="relative max-w-sm mx-auto">
                                    <div className="absolute inset-0 bg-orange-500/10 rounded-2xl animate-pulse"></div>
                                    <input
                                        ref={gunInputRef}
                                        type="text"
                                        value={gunBuffer}
                                        onChange={(e) => setGunBuffer(e.target.value)}
                                        onKeyDown={handleGunInput}
                                        placeholder="Scan here..."
                                        className="relative w-full bg-black/60 border-2 border-orange-500/50 text-center text-3xl font-mono text-orange-200 p-6 rounded-2xl focus:outline-none focus:ring-4 focus:ring-orange-500/20 placeholder-white/10"
                                    />
                                </div>
                                <p className="mt-6 text-xs text-pramana-cream/30 uppercase tracking-widest">Auto-focus enabled</p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div >
    );
}
