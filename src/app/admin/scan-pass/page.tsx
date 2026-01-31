"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";
import { Search, Loader2, CheckCircle, XCircle, AlertTriangle, User, Calendar, Shield } from "lucide-react";
import { RegistrationField } from "@/types";

export default function ScanPassPage() {
    const { user, loading } = useAuth();

    // UI State
    const [inputValue, setInputValue] = useState("");
    const [searching, setSearching] = useState(false);
    const [error, setError] = useState("");

    // Aadhar Modal State
    const [showAadharModal, setShowAadharModal] = useState(false);
    const [aadharImageUrl, setAadharImageUrl] = useState<string | null>(null);
    const [loadingAadhar, setLoadingAadhar] = useState(false);

    // Data State
    const [passData, setPassData] = useState<any>(null);
    const [registrationConfig, setRegistrationConfig] = useState<RegistrationField[]>([]);

    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch Config on Mount
    useEffect(() => {
        const fetchConfig = async () => {
            try {
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const docSnap = await getDoc(doc(db, "config", "registration"));
                if (docSnap.exists()) {
                    setRegistrationConfig(docSnap.data().fields || []);
                }
            } catch (err) {
                console.error("Failed to fetch registration config", err);
            }
        };
        fetchConfig();
    }, []);

    // Focus input on load
    useEffect(() => {
        setTimeout(() => inputRef.current?.focus(), 100);
    }, []);

    const handleLookup = async (qr: string) => {
        if (!qr || searching) return;
        setSearching(true);
        setError("");
        setPassData(null);

        try {
            const res = await fetch("/api/lookup-pass", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ qrCode: qr }),
            });
            const json = await res.json();

            if (json.success) {
                setPassData(json.pass);
            } else {
                setError(json.message || "Pass not found");
                // Clear input after a short delay if error, or keep it? 
                // Better keep it to let them fix manual typos, but for scanner usually we clear.
                // Let's clear for scanner flow.
                setInputValue("");
            }
        } catch (error) {
            console.error(error);
            setError("Network Error");
        } finally {
            setSearching(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleLookup(inputValue);
        }
    };

    const clear = () => {
        setPassData(null);
        setInputValue("");
        setError("");
        inputRef.current?.focus();
    };

    const handleViewAadhar = async (uid: string) => {
        setShowAadharModal(true);
        setLoadingAadhar(true);
        setAadharImageUrl(null);

        try {
            if (!user) return;
            const { auth } = await import("@/lib/firebase");
            const token = await auth.currentUser?.getIdToken();

            if (!token) {
                throw new Error("Authentication failed");
            }

            const response = await fetch(`/api/admin/view-aadhar?uid=${uid}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                if (response.status === 404) {
                    alert("Aadhar file not found for this user.");
                    setShowAadharModal(false);
                } else {
                    throw new Error("Failed to fetch document");
                }
                return;
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            setAadharImageUrl(url);

        } catch (error) {
            console.error("Error viewing aadhar", error);
            alert("Error loading document");
            setShowAadharModal(false);
        } finally {
            setLoadingAadhar(false);
        }
    };

    const closeAadharModal = () => {
        setShowAadharModal(false);
        if (aadharImageUrl) {
            URL.revokeObjectURL(aadharImageUrl);
            setAadharImageUrl(null);
        }
    };

    // Helper for rendering values
    const renderValue = (val: any) => {
        if (val === null || val === undefined) return <span className="text-white/20 italic">Empty</span>;
        if (typeof val === 'boolean') return val ? "Yes" : "No";
        return String(val);
    };

    if (loading) return null;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />

            <main className="flex-1 flex flex-col relative bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                {/* Header */}
                <div className="bg-white/5 backdrop-blur-md border-b border-white/10 p-4 flex justify-between items-center sticky top-0 z-20">
                    <h1 className="text-xl font-bold font-cinzel text-pramana-gold">Deep Scan Inspection</h1>
                    <button onClick={clear} className="text-sm bg-white/10 hover:bg-white/20 px-3 py-1 rounded text-white transition">Reset</button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {/* Search Area */}
                    {!passData && (
                        <div className="max-w-xl mx-auto mt-10 md:mt-20 text-center animate-in fade-in zoom-in duration-500">
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-pramana-gold to-yellow-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                <div className="relative">
                                    <input
                                        ref={inputRef}
                                        autoFocus
                                        value={inputValue}
                                        onChange={e => setInputValue(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        placeholder="Scan QR or Enter ID..."
                                        className="w-full text-center text-2xl md:text-3xl font-bold p-8 rounded-2xl bg-black border border-white/20 text-pramana-gold placeholder:text-white/10 focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold outline-none transition-all font-mono shadow-2xl"
                                    />
                                    <div className="absolute right-6 top-1/2 -translate-y-1/2 text-white/20 pointer-events-none">
                                        {searching ? <Loader2 className="animate-spin" size={32} /> : <Search size={32} />}
                                    </div>
                                </div>
                            </div>

                            {error && (
                                <div className="mt-6 bg-red-900/20 border border-red-500/30 text-red-400 p-4 rounded-xl flex items-center justify-center gap-3 animate-in fade-in slide-in-from-top-2">
                                    <XCircle />
                                    <span className="font-bold">{error}</span>
                                </div>
                            )}

                            <p className="mt-8 text-pramana-cream/30 text-sm uppercase tracking-widest">Ready to Inspect</p>
                        </div>
                    )}

                    {/* Result View */}
                    {passData && (
                        <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                            {/* Top Card: Identity */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl relative">
                                <div className="absolute top-0 left-0 w-1 h-full bg-pramana-gold"></div>
                                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between bg-gradient-to-b from-white/5 to-transparent">
                                    <div className="flex items-center gap-5">
                                        <div className="w-20 h-20 rounded-full bg-black border-2 border-pramana-gold/50 flex items-center justify-center overflow-hidden relative shadow-lg">
                                            {passData.user?.photoURL ? (
                                                <img src={passData.user.photoURL} alt="User" className="w-full h-full object-cover" />
                                            ) : (
                                                <User size={32} className="text-pramana-gold" />
                                            )}
                                        </div>
                                        <div>
                                            <h2 className="text-2xl md:text-3xl font-bold text-white font-cinzel mb-1">{passData.user?.displayName || "Unknown User"}</h2>
                                            <div className="flex items-center gap-2 text-pramana-cream/60 font-mono text-sm mb-2">
                                                <span>{passData.email}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                <span className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border ${passData.category === 'Gitam' ? 'bg-blue-900/30 text-blue-400 border-blue-500/30' : 'bg-purple-900/30 text-purple-400 border-purple-500/30'}`}>
                                                    {passData.category}
                                                </span>
                                                <span className="px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-white/10 text-white/60 border border-white/10">
                                                    {passData.user?.role || 'User'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <div className="text-pramana-gold font-cinzel font-bold text-xl md:text-2xl">{passData.passName}</div>
                                        <div className="text-xs text-pramana-cream/40 font-mono uppercase tracking-widest mt-1">ID: {passData.id.slice(0, 8)}...</div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Left Col: Status */}
                                <div className="space-y-6">
                                    {/* Pas Status */}
                                    <div className="bg-black/40 border border-white/10 rounded-2xl p-6">
                                        <h3 className="text-pramana-gold font-bold uppercase tracking-widest text-xs mb-5 flex items-center gap-2">
                                            <Shield size={14} /> Pass Status
                                        </h3>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                                <span className="text-sm text-pramana-cream/60">Physical Issued</span>
                                                {passData.issuedPhysical ? (
                                                    <span className="flex items-center gap-2 text-green-400 font-bold text-sm"><CheckCircle size={14} /> Yes</span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-yellow-500 font-bold text-sm"><AlertTriangle size={14} /> Pending</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                                <span className="text-sm text-pramana-cream/60">Day 1 Entry</span>
                                                {(passData.entryLogs || []).includes('day1') ? (
                                                    <span className="flex items-center gap-2 text-green-400 font-bold text-sm"><CheckCircle size={14} /> Entered</span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-white/30 font-bold text-sm"><XCircle size={14} /> No Entry</span>
                                                )}
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg border border-white/5">
                                                <span className="text-sm text-pramana-cream/60">Day 2 Entry</span>
                                                {(passData.entryLogs || []).includes('day2') ? (
                                                    <span className="flex items-center gap-2 text-green-400 font-bold text-sm"><CheckCircle size={14} /> Entered</span>
                                                ) : (
                                                    <span className="flex items-center gap-2 text-white/30 font-bold text-sm"><XCircle size={14} /> No Entry</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right Col: Registration Data */}
                                <div className="lg:col-span-2 bg-black/40 border border-white/10 rounded-2xl p-6">
                                    <h3 className="text-pramana-gold font-bold uppercase tracking-widest text-xs mb-5 flex items-center gap-2">
                                        <ClipboardListIcon /> Registration Data
                                    </h3>

                                    {passData.user?.registrationData ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                                            {/* Render configured fields first */}
                                            {registrationConfig.map(field => {
                                                const val = passData.user.registrationData[field.id];
                                                if (val === undefined || val === null || val === '') return null;
                                                return (
                                                    <div key={field.id} className="border-b border-white/5 pb-2">
                                                        <label className="block text-[10px] uppercase tracking-wider text-pramana-cream/40 mb-1">{field.label}</label>
                                                        <div className="text-white font-medium break-words text-sm">
                                                            {/* Special handling for Aadhar File Path */}
                                                            {(field.id === 'aadharFilePath' || field.id === 'aadhar_card') ? (
                                                                <button
                                                                    onClick={() => handleViewAadhar(passData.user.id || passData.user.uid || (passData.email))} // Pass email if UID missing, but ideally we need UID. Lookup pass API should return UID.
                                                                    // Wait, lookup-pass returns `user` object constructed manually. Let's assume we can get UID from there or need to add it.
                                                                    // Let's check api/lookup-pass. 
                                                                    // It returns: user: { displayName, role, isGitamite, registrationData, photoURL }
                                                                    // It DOES NOT return UID currently. I need to update API to return UID or fetch it.
                                                                    // Actually users collection has 'id' as doc id?
                                                                    // Let's rely on passData.user having a UID or being able to find it.
                                                                    // Ah, I need to update lookup-pass to return UID.
                                                                    // For now let's modify this call signature to assume UID is present, and I'll fix API in next step if needed.
                                                                    // Actually, lookup pass API finds user by email. User doc ID is usually UID.
                                                                    // So I should ensure 'user' object in API response includes 'uid': doc.id. 
                                                                    className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-600/30 transition flex items-center gap-2"
                                                                >
                                                                    <span>👁️ View ID Card</span>
                                                                </button>
                                                            ) : renderValue(val)}
                                                        </div>
                                                    </div>
                                                );
                                            })}

                                            {/* Render any remaining fields not in config */}
                                            {Object.entries(passData.user.registrationData).map(([key, value]) => {
                                                // Skip if already rendered via config
                                                if (registrationConfig.find(f => f.id === key)) return null;
                                                return (
                                                    <div key={key} className="border-b border-white/5 pb-2">
                                                        <label className="block text-[10px] uppercase tracking-wider text-pramana-cream/40 mb-1 capitalize">{key.replace(/_/g, ' ')}</label>
                                                        <div className="text-white font-medium break-words text-sm">
                                                            {(key === 'aadharFilePath' || key === 'aadhar_card') ? (
                                                                <button
                                                                    onClick={() => handleViewAadhar(passData.user.uid)}
                                                                    className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 px-3 py-1 rounded text-xs font-bold hover:bg-yellow-600/30 transition flex items-center gap-2"
                                                                >
                                                                    <span>👁️ View ID Card</span>
                                                                </button>
                                                            ) : renderValue(value)}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="text-center py-10 text-white/20 italic">
                                            No registration data found for this user.
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Aadhar Modal */}
                {showAadharModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
                        <div className="bg-[#0a0a0a] border border-white/10 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative">
                            <button
                                onClick={closeAadharModal}
                                className="absolute top-4 right-4 text-white/50 hover:text-white transition"
                            >
                                <XCircle size={24} />
                            </button>
                            <h3 className="text-xl font-bold font-cinzel text-pramana-gold mb-6">User Identity Document</h3>

                            <div className="flex items-center justify-center min-h-[300px] bg-white/5 rounded-xl border border-white/5 overflow-hidden">
                                {loadingAadhar ? (
                                    <div className="flex flex-col items-center gap-4">
                                        <Loader2 className="animate-spin text-pramana-gold" size={48} />
                                        <p className="text-pramana-cream/50 text-sm">Securely fetching document...</p>
                                    </div>
                                ) : aadharImageUrl ? (
                                    <img src={aadharImageUrl} alt="Aadhar Card" className="max-w-full max-h-[70vh] object-contain" />
                                ) : (
                                    <div className="text-center text-red-400">
                                        <AlertTriangle size={48} className="mx-auto mb-2 opacity-50" />
                                        <p>Failed to load document.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

function ClipboardListIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="M12 11h4" /><path d="M12 16h4" /><path d="M8 11h.01" /><path d="M8 16h.01" /></svg>
    )
}
