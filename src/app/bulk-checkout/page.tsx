"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import Image from "next/image";

function BulkCheckoutContent() {
    const searchParams = useSearchParams();
    const configId = searchParams.get("id");
    const router = useRouter();
    const { user, loading } = useAuth();

    const [config, setConfig] = useState<any>(null);
    const [step, setStep] = useState<1 | 2>(1); // 1: Payment, 2: Members

    // Step 1: Payment
    const [screenshotFile, setScreenshotFile] = useState<File | null>(null);

    // Step 2: Members
    const [memberEmails, setMemberEmails] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Validation Cache
    const [emailStatus, setEmailStatus] = useState<Record<string, { status: 'valid' | 'invalid' | 'registered' | 'has_pass', name?: string, message?: string }>>({});

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push(`/login?redirect=/bulk-checkout?id=${configId}`);
                return;
            }
            if (!configId) {
                alert("Invalid Link");
                router.push("/");
                return;
            }
            fetchConfig();
        }
    }, [user, loading, configId, router]);

    const fetchConfig = async () => {
        try {
            const ref = doc(db, "bulk_pass_configs", configId!);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                if (data.status !== 'active') {
                    alert("This offer is no longer active.");
                    router.push("/");
                    return;
                }
                setConfig({ id: snap.id, ...data });
                // Main User + (N-1) members = N total
                setMemberEmails(Array((data.memberCount || 4) - 1).fill(""));
            } else {
                alert("Offer not found");
                router.push("/");
            }
        } catch (e) {
            console.error(e);
        }
    };

    // --- Validation Logic ---
    const validateEmail = async (email: string, index: number) => {
        if (!email || !email.includes('@')) {
            setEmailStatus(prev => ({ ...prev, [index]: { status: 'invalid', message: 'Invalid Email' } }));
            return;
        }

        try {
            const res = await fetch("/api/bulk-pass/validate", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ emails: [email] })
            });
            const data = await res.json();

            if (data.success && data.results[email]) {
                const result = data.results[email];
                setEmailStatus(prev => ({ ...prev, [index]: result }));
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleEmailChange = (index: number, val: string) => {
        const newEmails = [...memberEmails];
        newEmails[index] = val;
        setMemberEmails(newEmails);

        // Reset status for this index
        setEmailStatus(prev => {
            const copy = { ...prev };
            delete copy[index];
            return copy;
        });
    };

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("File size too large (Max 5MB)");
            return;
        }
        setScreenshotFile(file);
    };

    const handleSubmit = async () => {
        if (!screenshotFile) return alert("Please upload payment screenshot");
        if (memberEmails.some(e => !e || !e.includes('@'))) return alert("Please enter valid emails for all members");
        if (Object.values(emailStatus).some(s => s.status === 'has_pass')) return alert("Some members already have passes. Please remove them.");

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('passConfigId', config.id);
            // Normalize emails to ensure matching in Dashboard & Rules
            const normalizedMain = (user?.email || '').toLowerCase().trim();
            const normalizedMembers = memberEmails.map(e => e.toLowerCase().trim());

            formData.append('mainUserEmail', normalizedMain);
            formData.append('memberEmails', JSON.stringify(normalizedMembers));
            formData.append('screenshot', screenshotFile);

            const res = await fetch("/api/bulk-pass/submit", {
                method: "POST",
                body: formData
            });
            const data = await res.json();

            if (data.success) {
                alert("Request Submitted! Verification takes 24-48 hours.");
                router.push("/dashboard");
            } else {
                alert("Submission failed: " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Submission error");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !config) return <div className="min-h-screen bg-black flex items-center justify-center text-pramana-gold">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">

            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,134,11,0.05),transparent_60%)]"></div>
            </div>

            <main className="w-full max-w-4xl mx-auto px-6 py-12 relative z-10">

                {/* Header with Logo */}
                <header className="flex flex-col items-center mb-12 animate-fade-in-down">
                    <div className="relative w-20 h-20 mb-6">
                        <Image
                            src="/pramana-logo.png"
                            alt="Pramana Logo"
                            fill
                            className="object-contain"
                        />
                    </div>
                    <p className="text-pramana-gold text-xs font-bold tracking-widest uppercase mb-2">Group Protocol</p>
                    <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-white mb-6">Bulk Checkout</h1>
                    <div className="h-px w-24 bg-pramana-gold/30 mx-auto"></div>
                </header>

                <div className="bg-[#050505] border border-pramana-gold/20 p-8 md:p-12 rounded-2xl shadow-[0_0_50px_-20px_rgba(184,134,11,0.1)] animate-fade-in-up">
                    {/* Progress */}
                    <div className="flex items-center justify-center mb-12 gap-6 relative">
                        {/* Connecting Line */}
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-[1px] bg-white/10 -z-10"></div>

                        <div className={`relative flex flex-col items-center gap-2 group cursor-pointer ${step === 2 ? 'opacity-50 hover:opacity-100 transition-opacity' : ''}`} onClick={() => step === 2 && setStep(1)}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-cinzel font-bold text-sm transition-all duration-500 border ${step === 1 ? 'bg-pramana-gold border-pramana-gold text-black' : 'bg-black border-pramana-gold text-pramana-gold'}`}>1</div>
                            <span className="text-[9px] uppercase tracking-widest font-bold text-pramana-gold">Payment</span>
                        </div>

                        <div className={`relative flex flex-col items-center gap-2 group`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-cinzel font-bold text-sm transition-all duration-500 border ${step === 2 ? 'bg-pramana-gold border-pramana-gold text-black' : 'bg-white/5 border-white/10 text-white/30'}`}>2</div>
                            <span className={`text-[9px] uppercase tracking-widest font-bold ${step === 2 ? 'text-pramana-gold' : 'text-white/30'}`}>Members</span>
                        </div>
                    </div>

                    <div className="mb-10 p-6 bg-black border border-white/10 rounded flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-center md:text-left">
                            <h2 className="text-2xl font-cinzel font-bold text-white mb-1">{config.name}</h2>
                            <p className="text-sm text-pramana-cream/60 flex items-center justify-center md:justify-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-pramana-gold"></span>
                                {config.memberCount} Members Access
                            </p>
                        </div>
                        <div className="text-center md:text-right">
                            <p className="text-xs uppercase tracking-widest text-pramana-cream/40 mb-1">Total Amount</p>
                            <p className="text-3xl font-cinzel font-bold text-pramana-gold">₹{config.price}</p>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded relative">
                                <h3 className="text-sm font-bold text-blue-400 mb-4 font-cinzel uppercase tracking-wider flex items-center gap-2">
                                    Payment Instructions
                                </h3>
                                <ul className="space-y-3 text-sm text-blue-100/70 leading-relaxed font-sans pl-2">
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">1.</span>
                                        <span>Click link below to pay <strong>₹{config.price}</strong>.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">2.</span>
                                        <span>Take screenshot of success.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <span className="text-blue-400 font-bold">3.</span>
                                        <span>Upload proof below.</span>
                                    </li>
                                </ul>
                            </div>

                            <a
                                href={config.paymentLink}
                                target="_blank"
                                className="block w-full py-4 bg-white text-black hover:bg-pramana-gold transition-colors duration-300 rounded text-center font-bold text-sm tracking-widest uppercase shadow-lg hover:shadow-pramana-gold/20 font-cinzel"
                            >
                                Open Payment Gateway ↗
                            </a>

                            <div>
                                <label className="block text-xs font-bold text-pramana-gold uppercase tracking-widest mb-4">Upload Payment Proof</label>
                                <div className="group border border-dashed border-white/20 hover:border-pramana-gold/50 rounded-xl p-8 text-center transition-all bg-white/5 hover:bg-white/10">
                                    {screenshotFile ? (
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-500 text-xl border border-green-500/20">
                                                ✓
                                            </div>
                                            <div>
                                                <p className="font-bold text-white text-lg font-cinzel">File Uploaded</p>
                                                <p className="text-xs text-white/50 mt-1 font-mono">{screenshotFile.name}</p>
                                            </div>
                                            <button onClick={() => setScreenshotFile(null)} className="text-xs px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors">
                                                Change
                                            </button>
                                        </div>
                                    ) : (
                                        <>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleUpload}
                                                className="hidden"
                                                id="screenshot-upload"
                                            />
                                            <label htmlFor="screenshot-upload" className="cursor-pointer flex flex-col items-center gap-4">
                                                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-white/30 text-xl border border-white/5 group-hover:border-pramana-gold/30 transition-colors">
                                                    +
                                                </div>
                                                <div className="space-y-1">
                                                    <p className="text-white font-bold text-sm">Upload Screenshot</p>
                                                </div>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!screenshotFile}
                                className="w-full py-4 bg-pramana-gold text-black font-bold rounded hover:bg-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-cinzel tracking-wider uppercase text-sm"
                            >
                                Proceed to Members
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-8 animate-fade-in">
                            <h3 className="text-xl font-cinzel font-bold text-white flex items-center gap-3 pb-4 border-b border-white/10">
                                Member Details
                            </h3>

                            {/* Main User (Fixed) */}
                            <div className="p-4 bg-white/5 rounded border border-white/10">
                                <label className="block text-[10px] uppercase tracking-widest text-pramana-gold mb-2">Team Leader (You)</label>
                                <input disabled value={user?.email || ""} className="w-full bg-transparent text-white font-mono text-sm border-none focus:outline-none opacity-70" />
                            </div>

                            {/* Additional Members */}
                            <div className="grid gap-4">
                                {memberEmails.map((email, idx) => (
                                    <div key={idx} className="relative group">
                                        <label className="block text-[10px] uppercase tracking-widest text-pramana-cream/40 mb-2 group-focus-within:text-pramana-gold transition-colors">Member {idx + 2}</label>
                                        <input
                                            value={email}
                                            onChange={(e) => handleEmailChange(idx, e.target.value)}
                                            onBlur={() => validateEmail(email, idx)}
                                            placeholder="Enter registered email address"
                                            className={`w-full bg-black border ${emailStatus[idx]?.status === 'invalid' || emailStatus[idx]?.status === 'has_pass' ? 'border-red-500/50' : 'border-white/10'} rounded p-4 text-white placeholder-white/20 focus:outline-none focus:border-pramana-gold transition-all`}
                                        />
                                        {emailStatus[idx] && (
                                            <div className={`text-xs mt-2 flex items-center gap-2 ${emailStatus[idx].status === 'valid' ? 'text-pramana-gold' :
                                                    emailStatus[idx].status === 'registered' ? 'text-green-500' :
                                                        'text-red-500'
                                                }`}>
                                                <span className={`w-1.5 h-1.5 rounded-full ${emailStatus[idx].status === 'registered' ? 'bg-green-500' :
                                                        emailStatus[idx].status === 'valid' ? 'bg-pramana-gold' : 'bg-red-500'
                                                    }`}></span>
                                                {emailStatus[idx].message}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <div className="pt-8 flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="px-6 py-4 bg-white/5 text-white font-bold rounded hover:bg-white/10 transition border border-white/10 font-cinzel text-xs uppercase tracking-wider"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-1 py-4 bg-pramana-gold text-black font-bold rounded hover:bg-white transition-all duration-300 disabled:opacity-50 font-cinzel text-xs uppercase tracking-wider"
                                >
                                    {submitting ? "Processing..." : "Submit Request"}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

export default function BulkCheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white">Loading...</div>}>
            <BulkCheckoutContent />
        </Suspense>
    );
}
