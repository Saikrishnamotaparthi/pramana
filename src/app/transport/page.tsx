"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { CheckCircle, Bus, MapPin, Send, Loader2 } from "lucide-react";

export default function TransportPage() {
    const { user, signInWithGoogle, loading: authLoading } = useAuth();
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        needsTransport: "no",
        hasBusPass: "no",
        stopName: ""
    });

    const router = useRouter();

    useEffect(() => {
        const checkExisting = async () => {
            if (user) {
                const docRef = doc(db, "transport_requests", user.uid);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFormData(docSnap.data() as any);
                    setSubmitted(true);
                }
            }
        };
        checkExisting();
    }, [user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        setLoading(true);
        try {
            await setDoc(doc(db, "transport_requests", user.uid), {
                ...formData,
                email: user.email,
                displayName: user.displayName,
                updatedAt: serverTimestamp(),
            }, { merge: true });
            setSubmitted(true);
        } catch (error) {
            console.error("Error submitting transport form:", error);
            alert("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black">
                <Loader2 className="w-8 h-8 text-pramana-gold animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 text-center">
                <h1 className="text-4xl font-primary text-pramana-gold mb-6">Transport Request</h1>
                <p className="text-pramana-cream/80 mb-8 max-w-md">
                    Please continue with Google to submit your transport needs for Pramana'26.
                </p>
                <button
                    onClick={() => signInWithGoogle()}
                    className="flex items-center gap-3 bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-gray-200 transition-all shadow-xl"
                >
                    <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                    Continue with Google
                </button>
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-black px-4 text-center">
                <div className="mb-6 bg-pramana-gold/20 p-4 rounded-full">
                    <CheckCircle className="w-16 h-16 text-pramana-gold" />
                </div>
                <h1 className="text-3xl font-primary text-pramana-gold mb-4">Request Submitted!</h1>
                <p className="text-pramana-cream/80 mb-8 max-w-md">
                    Thank you, {user.displayName}. Your transport preferences have been recorded.
                </p>
                <button
                    onClick={() => setSubmitted(false)}
                    className="text-pramana-gold hover:underline font-medium"
                >
                    Edit your response
                </button>
                <button
                    onClick={() => router.push("/")}
                    className="mt-6 bg-pramana-gold/10 border border-pramana-gold/30 px-6 py-2 rounded-lg text-pramana-cream hover:bg-pramana-gold/20 transition-all"
                >
                    Back to Home
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black py-20 px-4">
            <div className="max-w-xl mx-auto bg-gray-900/50 border border-white/10 p-8 rounded-2xl backdrop-blur-sm">
                <h1 className="text-3xl font-primary text-pramana-gold mb-2 flex items-center gap-3">
                    <Bus className="w-8 h-8" /> Transport Form
                </h1>
                <p className="text-pramana-cream/60 mb-8">
                    Help us plan better transport arrangements for Pramana'26.
                </p>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Do you need transport? */}
                    <div className="space-y-4">
                        <label className="text-lg font-medium text-pramana-cream block">
                            Do you need transport? <span className="text-red-500">*</span>
                        </label>
                        <div className="flex gap-4">
                            {["yes", "no"].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, needsTransport: option })}
                                    className={`flex-1 py-3 px-6 rounded-xl border transition-all capitalize font-medium ${formData.needsTransport === option
                                            ? "bg-pramana-gold text-black border-pramana-gold"
                                            : "bg-white/5 border-white/10 text-pramana-cream hover:bg-white/10"
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Do you have bus pass? */}
                    <div className={`space-y-4 transition-all ${formData.needsTransport === "no" ? "opacity-30 pointer-events-none" : ""}`}>
                        <label className="text-lg font-medium text-pramana-cream block">
                            Do you have a GITAM bus pass?
                        </label>
                        <div className="flex gap-4">
                            {["yes", "no"].map((option) => (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, hasBusPass: option })}
                                    className={`flex-1 py-3 px-6 rounded-xl border transition-all capitalize font-medium ${formData.hasBusPass === option
                                            ? "bg-pramana-gold text-black border-pramana-gold"
                                            : "bg-white/5 border-white/10 text-pramana-cream hover:bg-white/10"
                                        }`}
                                >
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Stop Name */}
                    <div className={`space-y-4 transition-all ${formData.needsTransport === "no" ? "opacity-30 pointer-events-none" : ""}`}>
                        <label className="text-lg font-medium text-pramana-cream block flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-pramana-gold" /> Pick-up/Drop Stop Name
                        </label>
                        <input
                            type="text"
                            required={formData.needsTransport === "yes"}
                            value={formData.stopName}
                            onChange={(e) => setFormData({ ...formData, stopName: e.target.value })}
                            placeholder="e.g., Miyapur, KPHB, Suchitra"
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-6 py-4 text-pramana-cream focus:outline-none focus:ring-2 focus:ring-pramana-gold/50 transition-all"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-pramana-gold text-black py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-3 hover:translate-y-[-2px] hover:shadow-xl hover:shadow-pramana-gold/20 transition-all disabled:opacity-50 disabled:translate-y-0"
                    >
                        {loading ? (
                            <Loader2 className="w-6 h-6 animate-spin" />
                        ) : (
                            <>
                                <Send className="w-5 h-5" />
                                Submit Request
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}
