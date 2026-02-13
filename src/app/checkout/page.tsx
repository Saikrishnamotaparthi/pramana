"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { PassConfig } from "@/types";
import Image from "next/image";

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
        <div className="min-h-screen flex items-center justify-center bg-black text-white">
            <div className="flex flex-col items-center gap-4">
                <div className="h-12 w-12 border-2 border-pramana-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );

    // Access Control
    const isGitamite = userProfile?.isGitamite;
    if ((pass.category === 'gitam' && !isGitamite) || (pass.category === 'non-gitam' && isGitamite)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black px-6 text-center text-white">
                <div className="bg-[#050505] p-10 rounded border border-white/10 max-w-lg w-full">
                    <h2 className="text-2xl font-cinzel font-bold mb-4 text-red-500">Access Restricted</h2>
                    <p className="text-white/60 mb-8 leading-relaxed">
                        This pass is reserved for <span className="text-white font-bold">{pass.category === 'gitam' ? "Gitam Students" : "Non-Gitam Guests"}</span>.
                    </p>
                    <button onClick={() => router.push('/tickets')} className="px-8 py-3 rounded bg-white text-black font-bold uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors">
                        View Compatible Passes
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(184,134,11,0.05),transparent_50%)]"></div>
            </div>

            <main className="w-full max-w-7xl mx-auto px-6 py-12 relative z-10">

                {/* Header */}
                <header className="flex flex-col items-center text-center mb-16 animate-fade-in-down">
                    <div className="relative w-20 h-20 mb-6">
                        <Image
                            src="/pramana-logo.png"
                            alt="Pramana Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <p className="text-pramana-gold font-bold tracking-[0.2em] text-xs uppercase mb-2">Final Step</p>
                    <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-white mb-6">
                        Confirm Purchase
                    </h1>
                    <div className="h-px w-20 bg-pramana-gold/30"></div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-start">

                    {/* Left Column: Pass Info */}
                    <div className="space-y-8 animate-fade-in-up">

                        {/* Pass Card */}
                        <div className="bg-[#050505] p-8 md:p-10 rounded-xl border border-pramana-gold/20 relative overflow-hidden group hover:border-pramana-gold/40 transition-colors duration-500">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-pramana-gold/5 rounded-full blur-[80px] pointer-events-none"></div>

                            <div className="relative z-10 flex flex-col gap-8">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-4">
                                        <div className="flex gap-3">
                                            <span className={`inline-block px-3 py-1 rounded text-[10px] uppercase font-bold tracking-widest border ${pass.category === 'gitam' ? 'bg-blue-900/20 border-blue-500/30 text-blue-300' : 'bg-purple-900/20 border-purple-500/30 text-purple-300'}`}>
                                                {pass.category || "General Access"}
                                            </span>
                                            {pass.type === 'group' && <span className="inline-block px-3 py-1 rounded text-[10px] uppercase font-bold tracking-widest border bg-pramana-maroon text-white border-transparent">Group Pass</span>}
                                        </div>
                                        <h2 className="text-3xl md:text-4xl font-cinzel font-bold text-white leading-tight">{pass.name}</h2>
                                        <p className="text-pramana-cream/70 text-lg leading-relaxed max-w-lg">{pass.description}</p>
                                    </div>
                                </div>

                                <div className="h-px w-full bg-pramana-gold/10"></div>

                                <div className="flex justify-between items-end">
                                    <div className="space-y-1">
                                        <p className="text-xs text-pramana-cream/40 uppercase font-bold tracking-widest">Total Amount</p>
                                        <p className="text-5xl font-cinzel font-bold text-pramana-gold">₹{pass.price}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Group Inputs */}
                        {pass.type === 'group' && (
                            <div className="space-y-6 pt-4">
                                <h3 className="text-xl font-cinzel font-bold text-white flex items-center gap-3">
                                    Member Details
                                </h3>

                                <div className="grid gap-4">
                                    {groupEmails.map((email, idx) => (
                                        <div key={idx} className="relative group">
                                            <label className="block text-[10px] uppercase tracking-widest text-pramana-gold mb-2 ml-1">Member {idx + 1}</label>
                                            <input
                                                type="email"
                                                id={`member-${idx}`}
                                                value={email}
                                                onChange={(e) => {
                                                    const newEmails = [...groupEmails];
                                                    newEmails[idx] = e.target.value;
                                                    setGroupEmails(newEmails);
                                                }}
                                                className="block w-full px-5 py-4 bg-black border border-white/10 rounded text-white placeholder-white/20 focus:outline-none focus:border-pramana-gold transition-all font-sans"
                                                placeholder="Enter email address"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Column: Payment & Checkout */}
                    <div className="lg:sticky lg:top-8 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                        <div className="bg-[#050505] p-8 md:p-10 rounded-xl border border-white/10 shadow-2xl relative">

                            {/* Header */}
                            <div className="mb-8 border-b border-white/5 pb-6">
                                <h3 className="text-xl font-cinzel font-bold text-white tracking-wide">Finalize Payment</h3>
                            </div>

                            {/* Notice */}
                            <div className="mb-8 bg-amber-900/10 border border-amber-500/20 p-6 rounded relative overflow-hidden">
                                <h4 className="text-amber-500 font-bold uppercase tracking-widest text-[10px] mb-2 flex items-center gap-2">
                                    <span className="text-lg">⚠</span> Process Info
                                </h4>
                                <p className="text-amber-100/80 text-sm leading-relaxed">
                                    You will be redirected to <strong>G-EVENTS</strong> for payment. Use the email below to ensure your pass is automatically verified.
                                </p>
                            </div>

                            {/* Email Copy */}
                            <div className="mb-8">
                                <label className="text-[10px] uppercase tracking-widest font-bold text-pramana-cream/40 mb-3 block">
                                    Registered Email (Click to Copy)
                                </label>
                                <div
                                    onClick={handleCopyEmail}
                                    className="group relative cursor-pointer active:scale-[0.98] transition-transform"
                                >
                                    <div className="bg-black border border-white/10 hover:border-pramana-gold/50 rounded p-4 text-center transition-all flex items-center justify-center gap-3">
                                        <span className="font-mono text-white text-lg">{user.email}</span>
                                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-xs text-pramana-gold">Copy</span>
                                    </div>
                                    {emailCopied && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-3 py-1 bg-pramana-gold text-black text-[10px] font-bold rounded animate-fade-in-up">
                                            Copied!
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Terms */}
                            <label className="flex items-start gap-4 cursor-pointer group mb-10 p-4 rounded hover:bg-white/5 transition-colors border border-transparent hover:border-white/5">
                                <div
                                    className={`w-5 h-5 flex-shrink-0 mt-0.5 rounded border flex items-center justify-center transition-all duration-300 ${termsAccepted ? 'bg-pramana-gold border-pramana-gold text-black' : 'border-white/30 text-transparent'}`}
                                >
                                    ✓
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={termsAccepted}
                                    onChange={() => setTermsAccepted(!termsAccepted)}
                                />
                                <span className="text-sm text-pramana-cream/60 leading-relaxed group-hover:text-white transition-colors select-none">
                                    I confirm that I have verified my details and understand the refund & cancellation policy.
                                </span>
                            </label>

                            {/* Button */}
                            <button
                                onClick={handleProceed}
                                disabled={!termsAccepted}
                                className={`w-full py-5 rounded font-cinzel font-bold text-sm tracking-[0.15em] uppercase transition-all duration-300 transform
                                    ${termsAccepted
                                        ? 'bg-pramana-gold text-black hover:bg-white hover:shadow-[0_0_20px_rgba(184,134,11,0.3)]'
                                        : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'}`}
                            >
                                Proceed to Pay
                            </button>

                            <div className="text-center mt-6">
                                <p className="text-[10px] text-white/20 font-mono tracking-widest uppercase">
                                    Secure Payment Gateway
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
                <div className="h-12 w-12 border-2 border-pramana-gold rounded-full animate-spin border-t-transparent"></div>
            </div>
        }>
            <CheckoutContent />
        </Suspense>
    );
}
