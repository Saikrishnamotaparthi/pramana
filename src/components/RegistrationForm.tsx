"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationField } from "@/types";
import { doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, X } from "lucide-react";

// Placeholder schema if none exists in DB
const DEFAULT_FIELDS: RegistrationField[] = [
    { id: 'fullName', label: 'Full Name', type: 'text', required: true, category: 'all' },
    { id: 'phone', label: 'Phone Number', type: 'text', required: true, category: 'all' },
    { id: 'branch', label: 'Branch/Department', type: 'text', required: true, category: 'gitam' },
    { id: 'rollNumber', label: 'Roll Number', type: 'text', required: true, category: 'gitam' },
    { id: 'college', label: 'College/Organization', type: 'text', required: true, category: 'non-gitam' },
];

export default function RegistrationForm() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [fields, setFields] = useState<RegistrationField[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Step Control
    const [step, setStep] = useState(1);
    const [referralCode, setReferralCode] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [referralError, setReferralError] = useState("");

    useEffect(() => {
        // Fetch fields from Firestore 'config/registration'
        async function fetchFields() {
            try {
                const docRef = doc(db, "config", "registration");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setFields(docSnap.data().fields || DEFAULT_FIELDS);
                } else {
                    setFields(DEFAULT_FIELDS);
                }
            } catch (error) {
                console.error("Error fetching fields", error);
                setFields(DEFAULT_FIELDS);
            }
        }
        fetchFields();
    }, []);

    useEffect(() => {
        // Pre-fill name/email if available
        if (user) {
            setFormData(prev => ({
                ...prev,
                fullName: user.displayName || "",
                email: user.email,
            }));
        }
    }, [user]);

    if (!user || loading) return (
        <div className="flex justify-center items-center h-64">
            <div className="animate-spin h-10 w-10 border-4 border-pramana-gold border-t-transparent rounded-full"></div>
        </div>
    );

    const isGitam = user.isGitamite;

    // Filter fields based on category
    const visibleFields = fields.filter(f =>
        f.category === 'all' ||
        (isGitam && f.category === 'gitam') ||
        (!isGitam && f.category === 'non-gitam')
    );

    const handleStep1Submit = (e: React.FormEvent) => {
        e.preventDefault();
        // If Non-Gitamite, go to Step 2 (Referral)
        // If Gitamite, submit directly
        if (!isGitam) {
            setStep(2);
        } else {
            completeRegistration();
        }
    };

    const validateReferral = async () => {
        if (!referralCode.trim()) return false;
        setIsValidating(true);
        setReferralError("");

        try {
            const codeRef = doc(db, "referral_codes", referralCode.trim());
            const codeSnap = await getDoc(codeRef);

            if (codeSnap.exists()) {
                return true;
            } else {
                setReferralError("Invalid Referral Code");
                return false;
            }
        } catch (error) {
            console.error("Validation error", error);
            setReferralError("Error validating code");
            return false;
        } finally {
            setIsValidating(false);
        }
    }

    const handleReferralSubmit = async () => {
        const isValid = await validateReferral();
        if (isValid) {
            completeRegistration(referralCode.trim());
        }
    };

    const completeRegistration = async (codeUsed?: string) => {
        setSubmitting(true);
        try {
            const response = await fetch('/api/complete-registration', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    uid: user.uid,
                    registrationData: formData,
                    referralCode: codeUsed
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Registration failed");
            }

            // Redirect
            window.location.href = "/dashboard";
        } catch (error: any) {
            console.error("Error submitting registration", error);
            alert(error.message || "Failed to register. Please try again.");
            setSubmitting(false);
        }
    };

    return (
        <div className="max-w-lg w-full mx-auto p-10 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl animate-fade-in-up transition-all duration-500">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-cinzel text-pramana-gold mb-2">
                    {step === 1 ? "Complete Profile" : "Referral Code"}
                </h2>
                <p className="text-pramana-cream/60 text-sm">
                    {step === 1 ? "Join the PRAMANA26 experience." : "Do you have a referral code?"}
                </p>

                {/* Step Indicator */}
                {!isGitam && (
                    <div className="flex justify-center gap-2 mt-4">
                        <div className={`h-1 w-8 rounded-full transition-colors ${step === 1 ? "bg-pramana-gold" : "bg-white/20"}`}></div>
                        <div className={`h-1 w-8 rounded-full transition-colors ${step === 2 ? "bg-pramana-gold" : "bg-white/20"}`}></div>
                    </div>
                )}
            </div>

            {step === 1 && (
                <form onSubmit={handleStep1Submit} className="space-y-6">
                    {visibleFields.map(field => (
                        <div key={field.id} className="flex flex-col group">
                            <label className="text-sm font-bold text-pramana-gold mb-2 group-focus-within:text-pramana-cream transition-colors uppercase tracking-wider">
                                {field.label} {field.required && "*"}
                            </label>
                            {field.type === 'select' ? (
                                <select
                                    required={field.required}
                                    className="bg-black/50 border border-white/10 text-white p-4 rounded-xl focus:outline-none focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold transition-all appearance-none"
                                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                >
                                    <option value="" className="bg-black text-gray-500">Select Option...</option>
                                    {field.options?.map(opt => <option key={opt} value={opt} className="bg-black">{opt}</option>)}
                                </select>
                            ) : (
                                <input
                                    type={field.type}
                                    required={field.required}
                                    className="bg-black/50 border border-white/10 text-white p-4 rounded-xl focus:outline-none focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold transition-all placeholder:text-white/20"
                                    placeholder={`Enter ${field.label}`}
                                    value={formData[field.id] || ""}
                                    onChange={(e) => setFormData({ ...formData, [field.id]: e.target.value })}
                                />
                            )}
                        </div>
                    ))}
                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-gradient-to-r from-pramana-gold to-yellow-600 text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:shadow-lg hover:shadow-pramana-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4 flex items-center justify-center gap-2 group/btn"
                    >
                        {submitting ? "SAVING..." : (isGitam ? "CONFIRM REGISTRATION" : "NEXT STEP")}
                        {!isGitam && !submitting && <ArrowRight className="group-hover/btn:translate-x-1 transition-transform" />}
                    </button>
                </form>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-pramana-gold mb-2 group-focus-within:text-pramana-cream transition-colors uppercase tracking-wider">
                            Enter Code (Optional)
                        </label>
                        <input
                            type="text"
                            className={`bg-black/50 border ${referralError ? 'border-red-500' : 'border-white/10'} text-white p-4 rounded-xl focus:outline-none focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold transition-all placeholder:text-white/20 text-center text-xl font-mono tracking-widest uppercase`}
                            placeholder="CODE123"
                            value={referralCode}
                            onChange={(e) => {
                                setReferralCode(e.target.value.toUpperCase());
                                setReferralError("");
                            }}
                        />
                        {referralError && <p className="text-red-400 text-sm mt-2 text-center">{referralError}</p>}
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleReferralSubmit}
                            disabled={submitting || !referralCode}
                            className="w-full bg-pramana-gold text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(184,134,11,0.2)]"
                        >
                            {submitting ? "VERIFYING..." : "APPLY & FINISH"}
                        </button>

                        <button
                            onClick={() => completeRegistration()}
                            disabled={submitting}
                            className="w-full bg-white/5 text-pramana-cream/60 py-3 rounded-xl font-bold text-sm tracking-widest hover:bg-white/10 hover:text-white transition-all"
                        >
                            SKIP FOR NOW
                        </button>
                    </div>

                    <button
                        onClick={() => setStep(1)}
                        className="w-full text-xs text-pramana-cream/30 hover:text-white mt-4 underline underline-offset-4"
                    >
                        Back to details
                    </button>
                </div>
            )}
        </div>
    );
}
