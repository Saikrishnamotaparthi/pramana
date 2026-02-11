"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, getDocs, query, where } from "firebase/firestore";

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
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <main className="w-full max-w-4xl mx-auto px-6 py-12">
                <header className="mb-12 text-center animate-stagger-1">
                    <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Bulk Access Checkout</h1>
                    <p className="text-white/60 mt-2">Secure passes for your entire squad.</p>
                </header>

                <div className="glass-panel p-8 rounded-3xl border border-white/10 animate-stagger-2">
                    {/* Progress */}
                    <div className="flex items-center justify-center mb-10 gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= 1 ? 'bg-pramana-gold text-black' : 'bg-white/10 text-white/40'}`}>1</div>
                        <div className={`h-1 w-20 rounded-full transition-all ${step >= 2 ? 'bg-pramana-gold' : 'bg-white/10'}`}></div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all ${step >= 2 ? 'bg-pramana-gold text-black' : 'bg-white/10 text-white/40'}`}>2</div>
                    </div>

                    <div className="mb-8 p-6 bg-white/5 rounded-2xl border border-white/10 flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-cinzel font-bold text-white">{config.name}</h2>
                            <p className="text-sm text-pramana-cream/60">{config.memberCount} Members Access</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs uppercase tracking-widest text-pramana-cream/40">Total Amount</p>
                            <p className="text-3xl font-bold text-pramana-gold">₹{config.price}</p>
                        </div>
                    </div>

                    {step === 1 && (
                        <div className="space-y-8 animate-fade-in">
                            <div className="bg-blue-900/10 border border-blue-500/20 p-6 rounded-2xl">
                                <h3 className="text-lg font-bold text-blue-400 mb-2">Instructions</h3>
                                <ul className="list-disc list-inside text-sm text-blue-200/70 space-y-1">
                                    <li>Click the link below to make the payment of <strong>₹{config.price}</strong> in G-events.</li>
                                    <li>Take a clear screenshot of the successful transaction or confirmation mail of G-EVENTS.</li>
                                    <li>Upload the screenshot here to proceed.</li>
                                    <li>After uploading, add your {config.memberCount - 1} other mails correctly. (You cannot edit them after uploading).</li>
                                </ul>
                            </div>

                            <a
                                href={config.paymentLink}
                                target="_blank"
                                className="block w-full py-4 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-center font-bold text-white transition decoration-none"
                            >
                                🔗 Open Payment Gateway
                            </a>

                            <div>
                                <label className="block text-sm font-bold text-pramana-gold uppercase tracking-widest mb-4">Upload Payment Proof</label>
                                <div className="border-2 border-dashed border-white/20 rounded-2xl p-8 text-center hover:border-pramana-gold/50 transition bg-black/20">
                                    {screenshotFile ? (
                                        <div className="text-green-400 flex flex-col items-center gap-2">
                                            <span className="text-4xl">✅</span>
                                            <p className="font-bold">File Selected</p>
                                            <p className="text-xs text-white/60">{screenshotFile.name}</p>
                                            <button onClick={() => setScreenshotFile(null)} className="text-xs underline text-white/40 hover:text-white mt-2">Remove & Re-upload</button>
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
                                                <span className="text-4xl opacity-50">📤</span>
                                                <span className="text-white/60">Click to upload screenshot</span>
                                            </label>
                                        </>
                                    )}
                                </div>
                            </div>

                            <button
                                onClick={() => setStep(2)}
                                disabled={!screenshotFile}
                                className="w-full py-4 bg-pramana-gold text-black font-bold rounded-xl hover:bg-yellow-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Next: Add Members
                            </button>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 animate-fade-in">
                            <h3 className="text-xl font-cinzel font-bold text-white mb-6">Group Member Details</h3>

                            {/* Main User (Fixed) */}
                            <div className="p-4 bg-white/5 rounded-xl border border-white/10 opacity-60">
                                <label className="block text-xs uppercase tracking-widest text-pramana-cream/40 mb-1">Member 1 (You)</label>
                                <input disabled value={user?.email || ""} className="w-full bg-transparent text-white font-mono" />
                            </div>

                            {/* Additional Members */}
                            {memberEmails.map((email, idx) => (
                                <div key={idx} className="relative">
                                    <label className="block text-xs uppercase tracking-widest text-pramana-cream/40 mb-1">Member {idx + 2}</label>
                                    <div className="flex gap-2">
                                        <input
                                            value={email}
                                            onChange={(e) => handleEmailChange(idx, e.target.value)}
                                            onBlur={() => validateEmail(email, idx)}
                                            placeholder="Enter registered email"
                                            className={`flex-1 bg-white/5 border ${emailStatus[idx]?.status === 'invalid' || emailStatus[idx]?.status === 'has_pass' ? 'border-red-500/50' : 'border-white/10'} rounded-xl p-3 text-white focus:outline-none focus:border-pramana-gold transition`}
                                        />
                                    </div>
                                    {emailStatus[idx] && (
                                        <p className={`text-xs mt-1 absolute right-0 -bottom-5 ${emailStatus[idx].status === 'valid' ? 'text-yellow-500/60' :
                                            emailStatus[idx].status === 'registered' ? 'text-green-400' :
                                                'text-red-400'
                                            }`}>
                                            {emailStatus[idx].message}
                                        </p>
                                    )}
                                </div>
                            ))}

                            <div className="pt-8 flex gap-4">
                                <button
                                    onClick={() => setStep(1)}
                                    className="flex-1 py-4 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex-[2] py-4 bg-gradient-to-r from-pramana-gold to-yellow-600 text-black font-bold rounded-xl hover:shadow-[0_0_20px_rgba(184,134,11,0.4)] transition disabled:opacity-50"
                                >
                                    {submitting ? "Submitting..." : "Complete Request"}
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
