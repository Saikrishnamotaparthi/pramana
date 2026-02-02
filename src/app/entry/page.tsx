"use client";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { Html5Qrcode, Html5QrcodeScannerState } from "html5-qrcode";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Image from "next/image";
import { Search, Loader2, CheckCircle, XCircle, User, Calendar, Shield, Camera, X, AlertTriangle } from "lucide-react";

export default function EntryPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeDay, setActiveDay] = useState<string | null>(null);
    const [debugInfo, setDebugInfo] = useState<string>("Initializing...");

    // UI State
    const [inputValue, setInputValue] = useState("");
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");
    const [showCamera, setShowCamera] = useState(false);
    const [cameraError, setCameraError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const inputRef = useRef<HTMLInputElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const scannerLock = useRef<boolean>(false); // Strict lock for async operations

    // Data State
    const [passData, setPassData] = useState<any>(null);
    const [checkInLoading, setCheckInLoading] = useState(false);
    const [checkInResult, setCheckInResult] = useState<{ success: boolean; message: string } | null>(null);

    // Focus input on load and keep focus (for barcode scanners) if not using camera
    useEffect(() => {
        const focusInput = () => {
            if (!searching && !passData && !checkInResult && !showCamera) {
                inputRef.current?.focus();
            }
        };
        const timer = setInterval(focusInput, 1000);
        return () => clearInterval(timer);
    }, [searching, passData, checkInResult, showCamera]);

    // Auth & Config Listener
    useEffect(() => {
        if (!loading) {
            if (!user || (user.role !== 'entry_admin' && user.role !== 'superadmin')) {
                // strict redirect allowed
            } else {
                const unsub = onSnapshot(doc(db, "config", "entry"), (doc) => {
                    if (doc.exists()) {
                        setActiveDay(doc.data().activeDay || 'none');
                    } else {
                        setActiveDay('none');
                    }
                });
                return () => unsub();
            }
        }
    }, [user, loading, router]);

    // Camera Logic
    useEffect(() => {
        let isMounted = true;
        const elementId = "reader";

        const startScanner = async () => {
            if (!showCamera) return;
            // Lock only if you want to block re-entry, but for start/stop toggles we rely on showCamera
            if (scannerLock.current) return;
            scannerLock.current = true;

            try {
                // Ensure UI element exists
                if (!document.getElementById(elementId)) {
                    await new Promise(r => setTimeout(r, 100));
                    if (!document.getElementById(elementId)) {
                        scannerLock.current = false;
                        return;
                    }
                }

                // Initialize if needed
                if (!scannerRef.current) {
                    try {
                        scannerRef.current = new Html5Qrcode(elementId);
                    } catch (e) {
                        console.error("Failed to create Html5Qrcode instance", e);
                        scannerLock.current = false;
                        return;
                    }
                }

                // Check state before starting
                try {
                    // @ts-ignore
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                } catch (e) { }

                setCameraError(null);
                await scannerRef.current.start(
                    { facingMode: "environment" },
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    (decodedText) => {
                        if (isMounted) onScanSuccess(decodedText);
                    },
                    (errorMessage) => {
                        // ignore
                    }
                );
            } catch (err: any) {
                console.error("Camera start error:", err);
                if (isMounted && showCamera) {
                    let msg = "Failed to access camera.";
                    if (typeof err === 'string') {
                        msg = err;
                    } else if (err?.name === 'NotAllowedError' || err?.message?.includes('permission') || err?.message?.includes('Permission denied')) {
                        msg = "Camera permission denied. Please allow camera access.";
                    } else if (err?.name === 'NotFoundError') {
                        msg = "No camera found.";
                    } else if (err?.name === 'NotReadableError') {
                        msg = "Camera in use or hardware error.";
                    }
                    setCameraError(msg);
                }
            } finally {
                scannerLock.current = false;
            }
        };

        const stopScanner = async () => {
            if (scannerRef.current) {
                try {
                    // @ts-ignore
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    try { scannerRef.current.clear(); } catch (e) { }
                } catch (e) { console.warn("Stop failed", e); }
                scannerRef.current = null;
            }
        };

        // Trigger start
        if (showCamera) {
            // Delay slightly to allow render
            const timer = setTimeout(() => startScanner(), 100);
            return () => {
                clearTimeout(timer);
                // We only define isMounted in useEffect scope, so this arrow func works fine
            };
        } else {
            stopScanner();
        }

        return () => {
            isMounted = false;
            stopScanner();
        };
    }, [showCamera, retryCount]);

    const onScanSuccess = (decodedText: string) => {
        // Stop scanning immediately logic moved to helper to be safe
        const stop = async () => {
            if (scannerRef.current) {
                try {
                    // @ts-ignore
                    const state = scannerRef.current.getState();
                    if (state === Html5QrcodeScannerState.SCANNING || state === Html5QrcodeScannerState.PAUSED) {
                        await scannerRef.current.stop();
                    }
                    try { scannerRef.current.clear(); } catch (e) { }
                } catch (e) { console.warn("Stop on success failed", e); }
                scannerRef.current = null;
            }
        };
        stop();

        setShowCamera(false);
        setInputValue(decodedText);
        performLookup(decodedText);
    };

    const performLookup = async (code: string) => {
        if (!code.trim() || searching) return;
        setSearching(true);
        setError("");
        setPassData(null);
        setCheckInResult(null);

        try {
            const res = await fetch("/api/lookup-pass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: code.trim() }),
            });
            const json = await res.json();

            if (json.success) {
                setPassData(json.pass);
                setInputValue("");
            } else {
                setError(json.message || "Pass not found");
                setInputValue("");
            }
        } catch (error) {
            console.error(error);
            setError("Network Error");
        } finally {
            setSearching(false);
        }
    };

    const handleLookup = () => performLookup(inputValue);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLookup();
        }
    };

    const handleCheckIn = async () => {
        if (!passData || !activeDay) return;
        setCheckInLoading(true);

        try {
            const codeToUse = passData.qrCode;

            const res = await fetch("/api/verify-entry", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: codeToUse })
            });
            const data = await res.json();

            setCheckInResult(data);

        } catch (error) {
            console.error(error);
            setCheckInResult({ success: false, message: "Check-in failed" });
        } finally {
            setCheckInLoading(false);
        }
    };

    const reset = () => {
        setPassData(null);
        setCheckInResult(null);
        setInputValue("");
        setError("");
        inputRef.current?.focus();
    };

    if (loading) return <div className="min-h-screen bg-black flex items-center justify-center text-pramana-gold">Loading...</div>;

    if (activeDay === 'none' || !activeDay) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black p-4 font-playfair text-center">
                <div className="bg-white/5 border border-white/10 p-10 rounded-3xl">
                    <h1 className="text-3xl font-bold text-pramana-gold mb-4 font-cinzel">Entry Closed</h1>
                    <p className="text-pramana-cream/60">No active session configured.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-pramana-black text-pramana-cream font-playfair pb-20 selection:bg-pramana-gold selection:text-black">
            {/* Header */}
            <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 sticky top-0 z-10 shadow-lg flex justify-between items-center">
                <div>
                    <h1 className="font-bold text-xl font-cinzel text-pramana-gold">Entry Portal</h1>
                    <p className="text-[10px] uppercase tracking-widest text-white/50">Admin: {user?.displayName}</p>
                </div>
                <div className="bg-green-500/10 border border-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-[0_0_10px_rgba(34,197,94,0.2)]">
                    {activeDay} Active
                </div>
            </div>

            <div className="max-w-3xl mx-auto p-4 md:p-8">

                {/* Search / Scan Input */}
                {!passData && !checkInResult && (
                    <div className="mt-10 animate-in fade-in zoom-in duration-300">
                        {showCamera ? (
                            <div className="relative bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 mb-8 p-4">
                                <button
                                    onClick={() => setShowCamera(false)}
                                    className="absolute top-4 right-4 z-20 bg-black/50 hover:bg-red-600/80 text-white p-2 rounded-full transition"
                                >
                                    <X size={24} />
                                </button>

                                {/* Camera Viewport */}
                                <div id="reader" className="w-full h-full min-h-[300px] bg-black"></div>

                                {cameraError && (
                                    <div className="absolute inset-0 z-10 bg-black/80 flex flex-col items-center justify-center p-6 text-center animate-in fade-in">
                                        <AlertTriangle size={48} className="text-red-500 mb-4" />
                                        <p className="text-red-400 font-bold mb-6">{cameraError}</p>
                                        <button
                                            onClick={() => setRetryCount(c => c + 1)}
                                            className="bg-white/10 hover:bg-white/20 px-6 py-2 rounded-xl text-white font-bold transition border border-white/20"
                                        >
                                            Try Again
                                        </button>
                                    </div>
                                )}

                                {!cameraError && (
                                    <p className="text-center mt-2 text-white/50 text-xs uppercase tracking-widest absolute bottom-4 left-0 right-0 pointer-events-none">Scanning...</p>
                                )}
                            </div>
                        ) : (
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-pramana-gold to-yellow-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative flex gap-2">
                                    <div className="flex-1 relative">
                                        <input
                                            ref={inputRef}
                                            autoFocus
                                            value={inputValue}
                                            onChange={e => setInputValue(e.target.value)}
                                            onKeyDown={handleKeyDown}
                                            placeholder="Scan QR or Enter Email..."
                                            className="w-full text-center text-2xl md:text-3xl font-bold p-8 rounded-2xl bg-black border border-white/20 text-pramana-gold placeholder:text-white/10 focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold outline-none transition-all font-mono shadow-2xl pl-20"
                                        />
                                        <div className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                                            {searching ? <Loader2 className="animate-spin" size={32} /> : <Search size={32} />}
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowCamera(true)}
                                        className="bg-white/5 border border-white/10 hover:bg-white/10 text-pramana-gold rounded-2xl p-6 flex items-center justify-center transition-all shadow-lg hover:border-pramana-gold/50"
                                    >
                                        <Camera size={32} />
                                    </button>
                                </div>
                            </div>
                        )}

                        {!showCamera && error && (
                            <div className="mt-6 bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2">
                                <XCircle />
                                <span className="font-bold">{error}</span>
                            </div>
                        )}
                        <p className="mt-8 text-center text-pramana-cream/30 text-sm uppercase tracking-widest">Ready to Scan</p>
                    </div>
                )}

                {/* Pass Details View */}
                {passData && !checkInResult && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                        {/* Identity Card */}
                        <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                            <div className="absolute top-0 left-0 w-1 h-full bg-pramana-gold"></div>
                            <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                                <div className="flex items-center gap-5">
                                    <div className="w-24 h-24 rounded-full bg-black border-2 border-pramana-gold/50 flex items-center justify-center overflow-hidden relative shadow-lg shrink-0">
                                        {passData.user?.photoURL ? (
                                            <img src={passData.user.photoURL} alt="User" className="w-full h-full object-cover" />
                                        ) : (
                                            <User size={40} className="text-pramana-gold" />
                                        )}
                                    </div>
                                    <div className="text-center md:text-left">
                                        <h2 className="text-3xl font-bold text-white font-cinzel mb-1">{passData.user?.displayName || "Unknown User"}</h2>
                                        <div className="text-pramana-cream/60 font-mono text-sm mb-2">{passData.email}</div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${passData.category === 'Gitam' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' : 'bg-purple-900/30 text-purple-400 border-purple-500/30'}`}>
                                            {passData.category}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-center md:text-right">
                                    <div className="text-2xl font-bold text-pramana-gold font-cinzel">{passData.passName}</div>
                                    <div className="text-xs text-white/40 font-mono mt-1">{passData.bookingId}</div>
                                </div>
                            </div>
                        </div>

                        {/* Status & Action */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-pramana-gold font-bold uppercase tracking-widest text-xs mb-4 flex items-center gap-2">Every Log</h3>
                                <div className="space-y-3">
                                    {['day1', 'day2'].map(day => (
                                        <div key={day} className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                            <span className="text-sm text-white/60 capitalize">{day.replace(/(\d)/, ' $1')}</span>
                                            {passData.entryLogs?.includes(day) ? (
                                                <span className="text-green-400 font-bold text-xs flex items-center gap-1"><CheckCircle size={12} /> Entered</span>
                                            ) : (
                                                <span className="text-white/20 font-bold text-xs">Not Entered</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col gap-4">
                                {passData.entryLogs?.includes(activeDay) ? (
                                    <div className="flex-1 bg-yellow-900/20 border border-yellow-500/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center">
                                        <div className="text-yellow-500 mb-2"><CheckCircle size={40} /></div>
                                        <h3 className="text-xl font-bold text-yellow-400 font-cinzel mb-1">Already Entered</h3>
                                        <p className="text-sm text-yellow-200/60">User checked in for {activeDay}.</p>
                                    </div>
                                ) : (
                                    <button
                                        onClick={handleCheckIn}
                                        disabled={checkInLoading}
                                        className="flex-1 bg-green-600 hover:bg-green-500 text-white rounded-2xl p-6 flex flex-col items-center justify-center text-center shadow-lg shadow-green-900/30 transition-all transform hover:scale-[1.02]"
                                    >
                                        {checkInLoading ? <Loader2 className="animate-spin mb-2" size={40} /> : <div className="text-white mb-2"><CheckCircle size={40} /></div>}
                                        <h3 className="text-2xl font-bold font-cinzel mb-1">CHECK IN</h3>
                                        <p className="text-sm text-green-100/60">Mark presence for {activeDay}</p>
                                    </button>
                                )}

                                <button
                                    onClick={reset}
                                    className="bg-white/10 hover:bg-white/20 text-white py-4 rounded-xl font-bold uppercase tracking-widest border border-white/10 transition"
                                >
                                    Cancel / Scan Next
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Check In Result Screen */}
                {checkInResult && (
                    <div className={`mt-10 rounded-3xl p-10 text-center shadow-2xl animate-in fade-in zoom-in duration-300 border ${checkInResult.success ? 'bg-gradient-to-br from-green-900 via-green-800 to-black border-green-500/50 shadow-green-900/50' : 'bg-gradient-to-br from-red-900 via-red-800 to-black border-red-500/50 shadow-red-900/50'}`}>
                        <div className="text-8xl mb-6 inline-block filter drop-shadow-2xl">{checkInResult.success ? '✅' : '🚫'}</div>
                        <h2 className={`text-5xl font-black mb-4 uppercase font-cinzel ${checkInResult.success ? 'text-green-50' : 'text-red-50'}`}>{checkInResult.success ? 'ADMITTED' : 'DENIED'}</h2>
                        <p className="text-xl font-medium text-white/90 mb-10 font-playfair tracking-wide">{checkInResult.message}</p>

                        <button
                            onClick={reset}
                            ref={btn => { if (btn) btn.focus() }} // Auto focus reset for quick cycle
                            className="w-full bg-white text-black font-bold py-6 rounded-2xl shadow-xl hover:scale-[1.02] transition transform text-xl font-cinzel tracking-widest uppercase"
                        >
                            Next Person
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
}
