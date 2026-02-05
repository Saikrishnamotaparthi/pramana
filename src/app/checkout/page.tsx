"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PassConfig } from "@/types";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const passId = searchParams.get("passId");
    const router = useRouter();
    const { user, loading } = useAuth();

    const [pass, setPass] = useState<PassConfig | null>(null);
    const [userProfile, setUserProfile] = useState<any>(null);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [emailCopied, setEmailCopied] = useState(false);

    // Group Logic
    const [groupEmails, setGroupEmails] = useState<string[]>([]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login?redirect=/checkout?passId=" + passId);
                return;
            }

            const init = async () => {
                try {
                    // 1. Fetch Pass
                    if (!passId) throw new Error("No Pass ID");
                    const passSnap = await getDoc(doc(db, "passes_config", passId));
                    if (!passSnap.exists()) throw new Error("Pass not found");
                    const passData = { id: passSnap.id, ...passSnap.data() } as PassConfig;
                    setPass(passData);

                    // Initialize Group Emails if needed
                    if (passData.type === 'group') {
                        setGroupEmails(Array(passData.groupSize || 1).fill(""));
                    }

                    // 2. Fetch User Profile
                    const userSnap = await getDoc(doc(db, "users", user.uid));
                    const uData = userSnap.exists() ? userSnap.data() : {};
                    setUserProfile(uData);

                } catch (error) {
                    console.error(error);
                    alert("Error loading checkout details");
                    router.push("/tickets");
                }
            };
            init();
        }
    }, [loading, user, passId, router]);

    const handleProceed = () => {
        if (!pass) return;

        if (pass.type === 'group' && groupEmails.some(e => !e.trim())) {
            alert("Please enter all group member emails");
            return;
        }

        if (!pass.paymentLink) {
            alert("Payment link not configured (Contact Support).");
            return;
        }

        if (!termsAccepted) {
            alert("Please accept the terms.");
            return;
        }

        window.location.href = pass.paymentLink;
    };

    const handleCopyEmail = () => {
        navigator.clipboard.writeText(user?.email || "");
        setEmailCopied(true);
        setTimeout(() => setEmailCopied(false), 2000);
    };

    if (loading || !pass || !user) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-pramana-gold">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-10 w-10 border-2 border-pramana-gold border-t-transparent rounded-full"></div>
                <div className="text-xs font-cinzel tracking-[0.2em] animate-pulse">SECURING CONNECTION...</div>
            </div>
        </div>
    );

    // Access Control
    const isGitamite = userProfile?.isGitamite;
    if ((pass.category === 'gitam' && !isGitamite) || (pass.category === 'non-gitam' && isGitamite)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black px-6 text-center">
                <div className="glass-panel p-10 rounded-3xl border-red-500/20 max-w-lg w-full relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-red-500/50"></div>
                    <div className="text-6xl mb-6 opacity-80">🚫</div>
                    <h2 className="text-2xl font-bold text-red-500 font-cinzel mb-3">Access Restricted</h2>
                    <p className="text-white/60 mb-8 leading-relaxed">
                        This pass is reserved for <span className="text-white font-bold">{pass.category === 'gitam' ? "Gitam Students" : "Non-Gitam Guests"}</span>.
                        <br />Please select a pass that matches your profile.
                    </p>
                    <button onClick={() => router.push('/tickets')} className="px-8 py-3 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/30 transition-all text-sm font-bold tracking-widest uppercase">
                        View Compatible Passes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <main className="w-full max-w-7xl mx-auto px-6 py-12 md:py-20">

                {/* Header */}
                <header className="flex flex-col items-center text-center mb-16 animate-stagger-1 space-y-4">
                    <p className="text-pramana-gold font-bold tracking-[0.2em] text-sm uppercase">Verification & Payment</p>
                    <h1 className="text-5xl md:text-7xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold via-white to-pramana-gold neon-text-gold tracking-tight">
                        Confirm Purchase
                    </h1>
                    <div className="h-1 w-24 bg-gradient-to-r from-transparent via-pramana-gold to-transparent opacity-50"></div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

                    {/* Left Column: Pass Info */}
                    <div className="space-y-8 animate-stagger-2">

                        {/* Pass Card */}
                        <div className="glass-panel p-10 rounded-3xl border-white/10 relative group overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50 pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col gap-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <span className={`inline-block px-4 py-1.5 rounded-lg text-xs uppercase font-bold tracking-widest border ${pass.category === 'gitam' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                                                {pass.category || "General Access"}
                                            </span>
                                            {pass.type === 'group' && <span className="inline-block px-4 py-1.5 rounded-lg text-xs uppercase font-bold tracking-widest border bg-pramana-maroon/20 border-pramana-maroon/40 text-pramana-maroon">Group Pass</span>}
                                        </div>
                                        <h2 className="text-4xl font-cinzel font-bold text-white leading-tight">{pass.name}</h2>
                                        <p className="text-white/70 text-lg leading-relaxed max-w-lg">{pass.description}</p>
                                    </div>
                                    <div className="text-right hidden md:block">
                                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5 inline-block mb-4">
                                            ID: {pass.id.slice(0, 8)}
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-white/10"></div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-sm text-white/40 uppercase font-bold tracking-wider">Total Amount</p>
                                        <p className="text-6xl font-cinzel font-bold text-pramana-gold">₹{pass.price}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group Inputs */}
                        {pass.type === 'group' && (
                            <div className="space-y-6 pt-4">
                                <h3 className="text-2xl font-cinzel font-bold text-white flex items-center gap-3">
                                    <span className="text-pramana-gold">👥</span> Member Details
                                </h3>

                                <div className="grid gap-6">
                                    {groupEmails.map((email, idx) => (
                                        <div key={idx} className="relative group">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <span className="text-white/30 font-mono text-sm">{(idx + 1).toString().padStart(2, '0')}</span>
                                            </div>
                                            <input
                                                type="email"
                                                id={`member-${idx}`}
                                                value={email}
                                                onChange={(e) => {
                                                    const newEmails = [...groupEmails];
                                                    newEmails[idx] = e.target.value;
                                                    setGroupEmails(newEmails);
                                                }}
                                                className="block w-full pl-12 pr-4 py-4 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-pramana-gold focus:bg-white/10 transition-all text-lg"
                                                placeholder="Enter member email"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Payment & Checkout */}
                    <div className="lg:sticky lg:top-8 animate-stagger-3">
                        <div className="glass-panel p-8 md:p-10 rounded-3xl border border-pramana-gold/30 shadow-[0_0_50px_-10px_rgba(184,134,11,0.2)] relative">

                            {/* Header */}
                            <div className="flex items-center gap-4 mb-8">
                                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                                <h3 className="text-xl font-cinzel font-bold text-white tracking-wide">Finalize Payment</h3>
                            </div>

                            {/* Important Notices */}
                            <div className="space-y-6 mb-10">
                                {/* Redirect Notice - HIGHLIGHTED */}
                                <div className="bg-gradient-to-r from-amber-500/20 to-amber-900/20 border border-amber-500/50 p-6 rounded-2xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-20">
                                        <svg className="w-16 h-16 text-amber-500" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.34.208-.646.477-.859a4 4 0 10-4.954 0c.27.213.462.519.476.859h4.002z" /></svg>
                                    </div>
                                    <h4 className="text-amber-400 font-bold uppercase tracking-widest text-xs mb-2 flex items-center gap-2">
                                        <span className="text-lg">⚠️</span> Important Process
                                    </h4>
                                    <p className="text-amber-100 text-sm leading-relaxed font-medium">
                                        You will be redirected to <strong className="text-white border-b border-amber-500/50">G-EVENTS</strong> for payment. Once confirmed, your pass will be issued to your dashboard.
                                        <span className="block mt-2 text-amber-200/80 text-xs text-opacity-80 font-mono">Verification: 3–7 Working Days</span>
                                    </p>
                                </div>

                                {/* Email Warning */}
                                <div>
                                    <label className="text-sm font-bold text-red-400 mb-3 block animate-pulse">
                                        Please use this email ID only on G-EVENTS to avoid issues:
                                    </label>
                                    <div
                                        onClick={handleCopyEmail}
                                        className="group relative cursor-pointer"
                                    >
                                        <div className="bg-white/5 border border-white/20 hover:border-pramana-gold/50 rounded-xl p-5 text-lg font-mono text-white text-center transition-all">
                                            {user.email}
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pramana-gold text-xs font-bold tracking-wider opacity-0 group-hover:opacity-100 transition-opacity">
                                            {emailCopied ? "COPIED" : "CLICK TO COPY"}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Terms */}
                            <label className="flex items-start gap-4 cursor-pointer group mb-10 p-4 rounded-xl hover:bg-white/5 transition-colors border border-transparent hover:border-white/10">
                                <div
                                    className={`w-6 h-6 mt-0.5 rounded flex items-center justify-center transition-all duration-300 border ${termsAccepted ? 'bg-pramana-gold border-pramana-gold text-black' : 'border-white/30 text-transparent'}`}
                                >
                                    ✓
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={termsAccepted}
                                    onChange={() => setTermsAccepted(!termsAccepted)}
                                />
                                <span className="text-sm text-white/70 leading-relaxed group-hover:text-white transition-colors select-none">
                                    I confirm that I have verified my details and understand the <span className="underline decoration-white/30 underline-offset-4">refund & cancellation policy</span>.
                                </span>
                            </label>

                            {/* Button */}
                            <button
                                onClick={handleProceed}
                                disabled={!termsAccepted}
                                className={`w-full py-6 rounded-2xl font-cinzel font-bold text-xl tracking-[0.1em] transition-all duration-500 transform
                                    ${termsAccepted
                                        ? 'bg-gradient-to-r from-pramana-gold via-amber-300 to-pramana-gold text-black shadow-[0_0_40px_rgba(184,134,11,0.4)] hover:scale-[1.02] hover:shadow-[0_0_60px_rgba(184,134,11,0.6)]'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}`}
                            >
                                PROCEED TO PAY
                            </button>

                            <div className="text-center mt-8">
                                <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase flex justify-center items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                    Secured by Gitam Events
                                    <span className="w-1.5 h-1.5 rounded-full bg-white/20"></span>
                                </p>
                            </div>

                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-black">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="h-12 w-12 border-2 border-pramana-gold rounded-full animate-spin border-t-transparent"></div>
                </div>
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
