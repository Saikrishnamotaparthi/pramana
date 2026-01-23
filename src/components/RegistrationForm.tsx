"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { UserProfile, RegistrationField } from "@/types";
import { doc, updateDoc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";

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
                    // Optionally seed it here? No, let admin do it.
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
    }, [user, router]);

    if (!user || loading) return <p>Loading...</p>;

    const isGitam = user.isGitamite;

    // Filter fields based on category
    const visibleFields = fields.filter(f =>
        f.category === 'all' ||
        (isGitam && f.category === 'gitam') ||
        (!isGitam && f.category === 'non-gitam')
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await updateDoc(doc(db, "users", user.uid), {
                registrationData: formData,
                isRegistered: true
            });
            // Update local state or force reload? AuthProvider listens to user doc, so it should update.
            window.location.href = "/dashboard"; // Force reload to ensure context updates or just router.push
        } catch (error) {
            console.error("Error submitting registration", error);
            alert("Failed to register. Please try again.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg w-full mx-auto p-10 bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 shadow-2xl animate-fade-in-up">
            <div className="text-center mb-8">
                <h2 className="text-3xl font-bold font-cinzel text-pramana-gold mb-2">Complete Profile</h2>
                <p className="text-pramana-cream/60 text-sm">Join the PRAMANA26 experience.</p>
            </div>

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
                className="w-full bg-gradient-to-r from-pramana-gold to-yellow-600 text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:shadow-lg hover:shadow-pramana-gold/20 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            >
                {submitting ? "SAVING..." : "CONFIRM REGISTRATION"}
            </button>
        </form>
    );
}
