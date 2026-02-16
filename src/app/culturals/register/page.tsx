"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion } from "framer-motion";
import { Upload, CheckCircle, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";
import { saveCulturalRegistration, getUserRegistrations, invalidateUserRegistrationsCache, getCompetitionCounts } from "@/lib/culturals";
import { db } from "@/lib/firebase";
import { doc, getDoc } from "firebase/firestore"; // Removing unused imports
import Image from "next/image";
import Link from "next/link";

const competitions = {
    "natya-rasa": {
        title: "Natya Rasa",
        categories: [
            { name: "Solo", price: "Free" },
            { name: "Crew", price: "Free" }
        ]
    },
    "off-the-record": {
        title: "Off The Record",
        categories: [
            { name: "Solo", price: "Free" },
            { name: "Duo/Trio", price: "Free" },
            { name: "Band", price: "Free" }
        ]
    },
    "raw-and-real": {
        title: "Raw and Real",
        categories: [
            { name: "Solo", price: "Free" },
            { name: "Crew", price: "Free" }
        ]
    }
};

function RegisterForm() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, signInWithGoogle, loading: authLoading } = useAuth();

    const competitionId = searchParams.get("competition") as keyof typeof competitions | null;
    const [selectedComp, setSelectedComp] = useState<keyof typeof competitions | "">(competitionId || "");
    const [category, setCategory] = useState("");
    const [phone, setPhone] = useState("");
    const [dob, setDob] = useState("");
    const [age, setAge] = useState<number | null>(null);
    const [isAgeValid, setIsAgeValid] = useState(false);
    const [college, setCollege] = useState("");
    const [teamName, setTeamName] = useState("");
    // const [file, setFile] = useState<File | null>(null); // Removed
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [whatsappLink, setWhatsappLink] = useState("");

    const [existingRegistrations, setExistingRegistrations] = useState<{ competitionId: string, category: string }[]>([]);
    const [registrationStatus, setRegistrationStatus] = useState<Record<string, boolean>>({});
    const [categoryLimits, setCategoryLimits] = useState<Record<string, number | undefined>>({}); // Store limits
    const [categoryCounts, setCategoryCounts] = useState<Record<string, number>>({}); // Store current counts (simulated or fetched)

    // Calculate age and validate whenever DOB changes
    useEffect(() => {
        if (dob) {
            const birthDate = new Date(dob);
            const today = new Date();
            let calculatedAge = today.getFullYear() - birthDate.getFullYear();
            const m = today.getMonth() - birthDate.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                calculatedAge--;
            }
            setAge(calculatedAge);

            // Validate Age (16 - 25 years)
            if (calculatedAge >= 16 && calculatedAge <= 25) {
                setIsAgeValid(true);
                setError(""); // Clear any previous error related to age
            } else {
                setIsAgeValid(false);
            }
        } else {
            setAge(null);
            setIsAgeValid(false);
        }
    }, [dob]);

    useEffect(() => {
        if (competitionId && competitions[competitionId]) {
            setSelectedComp(competitionId);
        }
    }, [competitionId]);

    // Reset team name if category changes to Solo
    useEffect(() => {
        if (category === 'Solo') {
            setTeamName("");
        }
    }, [category]);

    useEffect(() => {
        if (!user) return;
        const fetchExisting = async () => {
            try {
                const data = await getUserRegistrations(user.uid);
                const exRegs = data.map((d: any) => ({
                    competitionId: d.competitionId,
                    category: d.category
                }));
                setExistingRegistrations(exRegs);

                // Fetch global settings
                const settingsRef = doc(db, "settings", "cultural");
                const settingsSnap = await getDoc(settingsRef);
                if (settingsSnap.exists()) {
                    const data = settingsSnap.data();
                    setRegistrationStatus({
                        "natya-rasa": data["natya-rasa-open"] !== false,
                        "off-the-record": data["off-the-record-open"] !== false,
                        "raw-and-real": data["raw-and-real-open"] !== false
                    });

                    // Store limits
                    setCategoryLimits({
                        "natya-rasa-Solo": data["natya-rasa-Solo-limit"],
                        "natya-rasa-Crew": data["natya-rasa-Crew-limit"],
                        "off-the-record-Solo": data["off-the-record-Solo-limit"],
                        "off-the-record-Duo/Trio": data["off-the-record-Duo/Trio-limit"],
                        "off-the-record-Band": data["off-the-record-Band-limit"],
                        "raw-and-real-Solo": data["raw-and-real-Solo-limit"],
                        "raw-and-real-Crew": data["raw-and-real-Crew-limit"]
                    });
                }

                // Fetch Counts (This is expensive to do for all, but for client-side validtion, we need it)
                // We'll trust the server for strict enforcement, but for UI we can try to be helpful.
                // Fetching ALL registrations is too much. 
                // Let's just rely on the server error for "Full" if we can't easily get counts.
                // OR: We can implement a counter in settings? No time to refactor everything to use counters.
                // Compromise: We won't show "Full" aggressively on load unless we have data, 
                // but we will handle the "Registration limit reached" error from API gracefully.
                // Actually, the user asked to "automatically close registration".
                // I'll leave the UI as "Open" but if the API returns limit error, I'll show it.
                // Better: Let's fetch counts for the SELECTED competition when it changes.

            } catch (error) {
                console.error("Error fetching data:", error);
            }
        };
        fetchExisting();
    }, [user]);

    // Effect to fetch counts when competition is selected
    useEffect(() => {
        if (!selectedComp) return;

        const fetchCounts = async () => {
            const counts = await getCompetitionCounts(selectedComp);
            setCategoryCounts(counts);
        };

        fetchCounts();
    }, [selectedComp]);

    const isRegistered = (compId: string, catName: string) => {
        return existingRegistrations.some(r => r.competitionId === compId && r.category === catName);
    };

    if (authLoading) {
        return <div className="min-h-screen flex items-center justify-center text-white"><Loader2 className="animate-spin w-8 h-8" /></div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center space-y-6">
                <h1 className="text-3xl font-cinzel text-white">Login Required</h1>
                <p className="text-pramana-cream/60">You need to sign in to register for competitions.</p>
                <button
                    onClick={() => signInWithGoogle()}
                    className="px-8 py-3 bg-pramana-gold text-black font-bold rounded-full hover:bg-white transition-colors"
                >
                    Sign in with Google
                </button>
            </div>
        );
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!selectedComp || !category || !phone || !dob || !college) {
            setError("Please fill all fields.");
            return;
        }

        if (!isAgeValid) {
            setError("You must be between 16 and 25 years old to register.");
            return;
        }

        if (registrationStatus[selectedComp] === false) {
            setError("Registration for this competition is currently closed.");
            return;
        }

        if (category !== 'Solo' && !teamName) {
            setError("Please enter a Team Name.");
            return;
        }

        if (!user.email) {
            setError("User email is missing.");
            return;
        }

        setUploading(true);
        try {
            const result = await saveCulturalRegistration({
                userId: user.uid,
                name: user.displayName || "Unknown",
                email: user.email,
                phone,
                dob,
                college,
                competitionId: selectedComp,
                category,
                teamName: teamName || undefined,
            });

            // Invalidate cache so dashboard refetches data
            invalidateUserRegistrationsCache(user.uid);

            if (result.whatsappLink) {
                setWhatsappLink(result.whatsappLink);
            }

            setSuccess(true);
        } catch (err: any) {
            console.error("Submission error:", err);
            setError(err.message || "Failed to submit registration. Please try again.");
        } finally {
            setUploading(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6 animate-fade-in">
                <div className="w-20 h-20 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-4">
                    <CheckCircle className="w-10 h-10" />
                </div>
                <h2 className="text-3xl font-cinzel text-white">Registration Successful!</h2>
                <p className="text-pramana-cream/60 max-w-md">
                    Your registration has been approved.
                </p>

                {whatsappLink && (
                    <div className="bg-green-600/20 border border-green-600/50 p-6 rounded-xl max-w-md w-full">
                        <p className="text-green-400 text-sm font-bold uppercase tracking-widest mb-4">Join the WhatsApp Group</p>
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-500 transition-colors"
                        >
                            Join Group
                        </a>
                    </div>
                )}

                <Link
                    href="/culturals/dashboard"
                    className="px-8 py-3 bg-white/10 text-white hover:bg-white hover:text-black font-bold rounded-full transition-colors"
                >
                    Go to Dashboard
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto py-12 px-6">
            <Link href="/culturals/dashboard" className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-8">
                <ArrowLeft className="w-4 h-4" /> Back to Dashboard
            </Link>

            <div className="space-y-2 mb-8">
                <h1 className="text-4xl font-cinzel text-white font-bold">Registration</h1>
                <p className="text-pramana-cream/60">Fill in your details to participate.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
                {/* 1. Select Competition */}
                <div className="space-y-4">
                    <label className="block text-sm text-pramana-gold uppercase tracking-widest font-bold">Competition</label>
                    <select
                        value={selectedComp}
                        onChange={(e) => {
                            setSelectedComp(e.target.value as any);
                            setCategory(""); // Reset category
                        }}
                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                    >
                        <option value="" disabled>Select Competition</option>
                        {Object.entries(competitions).map(([key, comp]) => (
                            <option key={key} value={key} className="bg-black text-white">{comp.title}</option>
                        ))}
                    </select>
                </div>

                {/* 2. Select Category (if competition selected) */}
                {selectedComp && (
                    <div className="space-y-4 animate-fade-in">
                        <label className="block text-sm text-pramana-gold uppercase tracking-widest font-bold">Category</label>
                        <div className="grid grid-cols-2 gap-4">
                            {competitions[selectedComp].categories.map((cat) => {
                                const registered = isRegistered(selectedComp as string, cat.name);
                                const limitKey = `${selectedComp}-${cat.name}`; // e.g., natya-rasa-Solo
                                const limit = categoryLimits[limitKey];
                                const count = categoryCounts[cat.name] || 0;
                                const isFull = (typeof limit === 'number' && limit >= 0) && count >= limit;

                                return (
                                    <div
                                        key={cat.name}
                                        onClick={() => !registered && !isFull && setCategory(cat.name)}
                                        className={`
                                            relative p-4 rounded-lg flex flex-col items-center justify-center gap-2 transition-all border
                                            ${registered
                                                ? 'bg-white/5 border-white/5 opacity-50 cursor-not-allowed'
                                                : isFull
                                                    ? 'bg-red-500/10 border-red-500/20 opacity-70 cursor-not-allowed'
                                                    : category === cat.name
                                                        ? 'border-pramana-gold bg-pramana-gold/10 cursor-pointer'
                                                        : 'border-white/10 hover:border-white/30 cursor-pointer'
                                            }
                                        `}
                                    >
                                        {registered && (
                                            <div className="absolute top-2 right-2 text-green-500">
                                                <CheckCircle className="w-4 h-4" />
                                            </div>
                                        )}
                                        {isFull && !registered && (
                                            <div className="absolute top-2 right-2 text-red-500">
                                                <span className="text-xs font-bold uppercase">Full</span>
                                            </div>
                                        )}
                                        <span className="text-white font-bold">{cat.name}</span>
                                        <span className="text-pramana-gold text-lg">
                                            {registered ? "Registered" : isFull ? "Full" : cat.price}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 3. Basic Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs text-pramana-cream/50 uppercase">Full Name</label>
                        <input type="text" value={user.displayName || ""} disabled className="w-full bg-white/5 border border-white/10 rounded p-3 text-white/50 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-pramana-cream/50 uppercase">Email</label>
                        <input type="email" value={user.email || ""} disabled className="w-full bg-white/5 border border-white/10 rounded p-3 text-white/50 cursor-not-allowed" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-pramana-cream/50 uppercase">Phone Number</label>
                        <input
                            type="tel"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            placeholder="+91..."
                            className="w-full bg-transparent border border-white/20 rounded p-3 text-white focus:border-pramana-gold focus:outline-none"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-pramana-cream/50 uppercase">Date of Birth</label>
                            {age !== null && (
                                <span className={`text-xs font-bold ${isAgeValid ? 'text-green-500' : 'text-red-500'}`}>
                                    Age: {age} {isAgeValid ? "" : "(Must be 16-25)"}
                                </span>
                            )}
                        </div>
                        <input
                            type="date"
                            value={dob}
                            onChange={(e) => setDob(e.target.value)}
                            className="w-full bg-transparent border border-white/20 rounded p-3 text-white focus:border-pramana-gold focus:outline-none [color-scheme:dark]"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-pramana-cream/50 uppercase">University / College</label>
                        <input
                            type="text"
                            value={college}
                            onChange={(e) => setCollege(e.target.value)}
                            placeholder="Enter college name"
                            className="w-full bg-transparent border border-white/20 rounded p-3 text-white focus:border-pramana-gold focus:outline-none"
                            required
                        />
                    </div>

                    {category && category !== 'Solo' && (
                        <div className="space-y-2 md:col-span-2 animate-fade-in">
                            <label className="text-xs text-pramana-cream/50 uppercase">Team Name</label>
                            <input
                                type="text"
                                value={teamName}
                                onChange={(e) => setTeamName(e.target.value)}
                                placeholder="Enter your crew/band/team name"
                                className="w-full bg-transparent border border-white/20 rounded p-3 text-white focus:border-pramana-gold focus:outline-none"
                                required
                            />
                        </div>
                    )}
                </div>

                {error && (
                    <div className="bg-red-500/10 text-red-500 px-4 py-3 rounded flex items-center gap-2 text-sm">
                        <AlertCircle className="w-4 h-4" /> {error}
                    </div>
                )}

                <button
                    type="submit"
                    disabled={uploading || !isAgeValid}
                    className="w-full py-4 bg-pramana-gold text-black font-cinzel font-bold text-lg rounded-full hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {uploading && <Loader2 className="animate-spin w-5 h-5" />}
                    {uploading ? "Submitting..." : "Complete Registration"}
                </button>

            </form>
        </div>
    );
}

export default function RegisterPage() {
    return (
        <div className="min-h-screen bg-[#050505] text-pramana-cream font-playfair">
            <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-pramana-gold" /></div>}>
                <RegisterForm />
            </Suspense>
        </div>
    );
}
