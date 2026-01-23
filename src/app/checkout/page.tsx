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
            <main className="admin-page-container">
                <div className="admin-content-wrapper">

                    {/* Header */}
                    <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8 animate-stagger-1 text-center md:text-left">
                        <div>
                            <p className="text-pramana-gold font-bold tracking-widest text-xs uppercase mb-2">Final Step</p>
                            <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold via-white to-pramana-gold neon-text-gold">
                                Checkout
                            </h1>
                            <p className="text-pramana-cream/60 mt-2 font-playfair text-lg">
                                Complete your purchase to secure your entry.
                            </p>
                        </div>
                        <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
                            Secure ID: {pass.id.slice(0, 8)}
                        </div>
                    </header>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start mt-8">

                        {/* Left Column: Pass Info & Inputs */}
                        <div className="lg:col-span-7 space-y-8 animate-stagger-2">

                            <div className="mb-2">
                                <h2 className="text-2xl font-cinzel font-bold text-white leading-tight">Summary</h2>
                            </div>

                            {/* Pass Card */}
                            <div className="glass-panel p-8 rounded-3xl border-white/10 relative group overflow-hidden">
                                <div className="absolute -right-20 -top-20 w-64 h-64 bg-pramana-gold/5 rounded-full blur-[80px] pointer-events-none group-hover:bg-pramana-gold/10 transition-colors duration-1000"></div>

                                <div className="flex flex-col md:flex-row justify-between md:items-center gap-6 relative z-10">
                                    <div className="space-y-2">
                                        <div className="flex gap-2">
                                            <span className={`inline-block px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border ${pass.category === 'gitam' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-purple-500/10 border-purple-500/20 text-purple-400'}`}>
                                                {pass.category || "General Access"}
                                            </span>
                                            {pass.type === 'group' && <span className="inline-block px-3 py-1 rounded-md text-[10px] uppercase font-bold tracking-widest border bg-pramana-maroon/20 border-pramana-maroon/40 text-pramana-maroon">Group</span>}
                                        </div>
                                        <h3 className="text-2xl font-cinzel font-bold text-white">{pass.name}</h3>
                                        <p className="text-white/70 text-sm leading-relaxed max-w-md">{pass.description}</p>
                                    </div>
                                    <div className="text-left md:text-right">
                                        <p className="text-xs text-white/40 uppercase font-bold tracking-wider mb-1">Total</p>
                                        <p className="text-4xl font-cinzel font-bold text-pramana-gold">₹{pass.price}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Group Inputs (Conditional) */}
                            {pass.type === 'group' && (
                                <div className="space-y-6">
                                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                                        <div className="h-8 w-8 rounded-full bg-white/5 flex items-center justify-center text-pramana-gold">👥</div>
                                        <h3 className="text-xl font-cinzel font-bold text-white">Group Members</h3>
                                    </div>

                                    <div className="grid gap-4">
                                        {groupEmails.map((email, idx) => (
                                            <div key={idx} className="relative group">
                                                <input
                                                    type="email"
                                                    id={`member-${idx}`}
                                                    value={email}
                                                    onChange={(e) => {
                                                        const newEmails = [...groupEmails];
                                                        newEmails[idx] = e.target.value;
                                                        setGroupEmails(newEmails);
                                                    }}
                                                    className="peer w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-transparent focus:outline-none focus:border-pramana-gold transition-colors"
                                                    placeholder="Email"
                                                />
                                                <label
                                                    htmlFor={`member-${idx}`}
                                                    className="absolute left-0 -top-3.5 text-xs text-pramana-gold transition-all peer-placeholder-shown:text-base peer-placeholder-shown:text-white/40 peer-placeholder-shown:top-2.5 peer-focus:-top-3.5 peer-focus:text-xs peer-focus:text-pramana-gold cursor-text"
                                                >
                                                    Member {idx + 1} Email
                                                </label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right Column: Payment & Checkout - Sticky Desktop */}
                        <div className="lg:col-span-5 lg:sticky lg:top-8 space-y-6 animate-stagger-3">

                            {/* Payment Card */}
                            <div className="glass-panel p-8 rounded-3xl border-t-4 border-t-pramana-gold shadow-2xl relative">

                                <h3 className="text-lg font-cinzel font-bold text-white mb-6 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-pramana-gold rounded-full animate-pulse"></span>
                                    Payment Details
                                </h3>

                                {/* Enhanced Note */}
                                <div className="mb-8 p-5 rounded-2xl bg-amber-500/5 border border-amber-500/20 relative overflow-hidden group">
                                    <div className="absolute inset-0 bg-gradient-to-r from-amber-500/0 via-amber-500/5 to-amber-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-in-out"></div>
                                    <div className="flex gap-4">
                                        <div className="text-2xl mt-0.5">⚠️</div>
                                        <div className="space-y-2">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-amber-500">Redirect Notice</p>
                                            <p className="text-xs text-amber-100/80 leading-relaxed">
                                                You will be redirected to <strong className="text-white">G-EVENTS</strong> for payment.
                                                <br />Verification is automatic. Your digital pass will appear on your dashboard shortly after payment.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Email Copy Field */}
                                <div className="mb-8">
                                    <label className="text-[10px] uppercase font-bold text-white/40 mb-3 block">Registered Email (Required for Payment)</label>
                                    <div
                                        onClick={handleCopyEmail}
                                        className="group relative cursor-pointer"
                                    >
                                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 pr-12 text-sm font-mono text-white/90 truncate transition-all group-hover:bg-white/10 group-hover:border-white/20">
                                            {user.email}
                                        </div>
                                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-pramana-gold text-xs font-bold tracking-wider pointer-events-none">
                                            {emailCopied ? "COPIED" : "COPY"}
                                        </div>
                                    </div>
                                </div>

                                {/* Terms Checkbox */}
                                <label className="flex items-start gap-4 cursor-pointer group mb-8 p-2 rounded-lg hover:bg-white/5 transition-colors">
                                    <div
                                        className={`w-5 h-5 mt-0.5 rounded border flex items-center justify-center transition-all duration-300 ${termsAccepted ? 'bg-pramana-gold border-pramana-gold' : 'border-white/30 group-hover:border-white/50'}`}
                                    >
                                        {termsAccepted && <span className="text-black text-xs font-bold">✓</span>}
                                    </div>
                                    <input
                                        type="checkbox"
                                        className="hidden"
                                        checked={termsAccepted}
                                        onChange={() => setTermsAccepted(!termsAccepted)}
                                    />
                                    <span className="text-xs text-white/60 leading-relaxed group-hover:text-white/80 transition-colors select-none">
                                        I confirm that I have verified my details and understand the refund & cancellation policy.
                                    </span>
                                </label>

                                {/* Action Button */}
                                <button
                                    onClick={handleProceed}
                                    disabled={!termsAccepted}
                                    className={`w-full py-5 rounded-2xl font-cinzel font-bold text-lg tracking-widest transition-all duration-300 transform
                                        ${termsAccepted
                                            ? 'bg-pramana-gold text-black shadow-[0_0_30px_rgba(184,134,11,0.3)] hover:scale-[1.02] hover:shadow-[0_0_50px_rgba(184,134,11,0.5)]'
                                            : 'bg-white/10 text-white/20 cursor-not-allowed'}`}
                                >
                                    PROCEED TO PAY
                                </button>

                                <div className="text-center mt-6">
                                    <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">Secured by Gitam Events</p>
                                </div>

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
