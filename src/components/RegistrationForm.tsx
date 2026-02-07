"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { RegistrationField } from "@/types";
import { doc, updateDoc, getDoc, runTransaction } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter, useSearchParams } from "next/navigation";
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
    const searchParams = useSearchParams();
    const [fields, setFields] = useState<RegistrationField[]>([]);
    const [formData, setFormData] = useState<Record<string, string>>({});
    const [submitting, setSubmitting] = useState(false);

    // Step Control
    const [step, setStep] = useState(1);
    const [referralCode, setReferralCode] = useState("");
    const [isValidating, setIsValidating] = useState(false);
    const [referralError, setReferralError] = useState("");

    // Aadhar Upload State
    const [aadharFile, setAadharFile] = useState<File | null>(null);
    const [aadharAck, setAadharAck] = useState(false);

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
        // If Non-Gitamite, go to Step 2 (Aadhar)
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
            const formDataToSend = new FormData();
            formDataToSend.append('uid', user.uid);
            formDataToSend.append('registrationData', JSON.stringify(formData));
            if (codeUsed) formDataToSend.append('referralCode', codeUsed);

            if (!isGitam && aadharFile) {
                formDataToSend.append('aadharFile', aadharFile);
            }

            const response = await fetch('/api/complete-registration', {
                method: 'POST',
                body: formDataToSend // auto-sets Content-Type to multipart/form-data
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.error || "Registration failed");
            }

            // Redirect
            const returnUrl = searchParams.get('returnUrl');
            window.location.href = returnUrl || "/dashboard";
        } catch (error: any) {
            console.error("Error submitting registration", error);
            alert(error.message || "Failed to register. Please try again.");
            setSubmitting(false);
        }
    };

    const getStepTitle = () => {
        if (step === 1) return "Complete Profile";
        if (step === 2) return "Identity Verification";
        if (step === 3) return "Referral Code";
        return "";
    }

    const getStepSubtitle = () => {
        if (step === 1) return "Join the PRAMANA26 experience.";
        if (step === 2) return "Upload your ID for verification.";
        if (step === 3) return "Do you have a referral code?";
        return "";
    }

    return (
        <div className="max-w-lg w-full mx-auto p-10 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl animate-fade-in-up transition-all duration-500">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-cinzel text-pramana-gold mb-2">
                    {getStepTitle()}
                </h2>
                <p className="text-pramana-cream/60 text-sm">
                    {getStepSubtitle()}
                </p>

                {/* Step Indicator */}
                {!isGitam && (
                    <div className="flex justify-center gap-2 mt-4">
                        <div className={`h-1 w-8 rounded-full transition-colors ${step >= 1 ? "bg-pramana-gold" : "bg-white/20"}`}></div>
                        <div className={`h-1 w-8 rounded-full transition-colors ${step >= 2 ? "bg-pramana-gold" : "bg-white/20"}`}></div>
                        <div className={`h-1 w-8 rounded-full transition-colors ${step >= 3 ? "bg-pramana-gold" : "bg-white/20"}`}></div>
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

            {!isGitam && step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">

                    {/* Aadhar Upload Section */}
                    <div className="flex flex-col group border-b border-white/10 pb-6 mb-4">
                        <label className="text-sm font-bold text-pramana-gold mb-2 uppercase tracking-wider">
                            Upload Aadhar Card (Front Side) *
                        </label>
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    const file = e.target.files[0];
                                    if (file.size > 5 * 1024 * 1024) { // 5MB
                                        alert("File size exceeds 5MB limit. Please upload a smaller file.");
                                        e.target.value = "";
                                        setAadharFile(null);
                                        return;
                                    }
                                    setAadharFile(file);
                                }
                            }}
                            className="text-white text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pramana-gold file:text-black hover:file:bg-yellow-500 mb-2 cursor-pointer"
                        />
                        <p className="text-xs text-white/50 mb-4 italic">
                            Note: This Aadhar card is only for verification purpose only. Max Size: 5MB.
                        </p>

                        <div className="flex items-start gap-3 mt-2">
                            <div
                                onClick={() => setAadharAck(!aadharAck)}
                                className={`w-5 h-5 mt-0.5 rounded border border-pramana-gold flex items-center justify-center cursor-pointer transition-colors ${aadharAck ? 'bg-pramana-gold' : 'bg-transparent'}`}
                            >
                                {aadharAck && <Check className="w-3 h-3 text-black" />}
                            </div>
                            <p className="text-xs text-white/70 cursor-pointer select-none" onClick={() => setAadharAck(!aadharAck)}>
                                I consent to the use of my Aadhaar details for one-time event entry verification only. No data will be stored or retained.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={() => setStep(3)}
                        disabled={!aadharFile || !aadharAck}
                        className="w-full bg-pramana-gold text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(184,134,11,0.2)] flex items-center justify-center gap-2 group/btn"
                    >
                        NEXT STEP <ArrowRight className="group-hover/btn:translate-x-1 transition-transform" />
                    </button>

                    <button
                        onClick={() => setStep(1)}
                        className="w-full text-xs text-pramana-cream/30 hover:text-white mt-4 underline underline-offset-4"
                    >
                        Back to details
                    </button>
                </div>
            )}

            {!isGitam && step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-10 duration-500">
                    <div className="flex flex-col group">
                        <label className="text-sm font-bold text-pramana-gold mb-2 group-focus-within:text-pramana-cream transition-colors uppercase tracking-wider">
                            Enter Code (Optional)
                        </label>
                        <input
                            type="text"
                            name="referralCode"
                            autoComplete="off"
                            onInvalid={(e: any) => e.preventDefault()}
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
                            type="button"
                            onClick={handleReferralSubmit}
                            disabled={submitting || !referralCode}
                            className="w-full bg-pramana-gold text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(184,134,11,0.2)]"
                        >
                            {submitting ? "VERIFYING..." : "APPLY & FINISH"}
                        </button>

                        <button
                            onClick={() => completeRegistration()}
                            disabled={submitting}
                            className="w-full bg-white/5 text-pramana-cream/60 py-3 rounded-xl font-bold text-sm tracking-widest hover:bg-white/10 hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            SKIP FOR NOW
                        </button>
                    </div>

                    <button
                        onClick={() => setStep(2)}
                        className="w-full text-xs text-pramana-cream/30 hover:text-white mt-4 underline underline-offset-4"
                    >
                        Back to verification
                    </button>
                </div>
            )}
        </div>
    );
}
