"use client";

import Image from "next/image";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { useState, useEffect } from "react";
import { ArrowRight, ChevronDown, CheckCircle2, AlertCircle, X, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import AppFooter from "@/components/AppFooter";

// --- ANIMATION VARIANTS ---
const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

interface Stall {
    id: string;
    category: string;
    name: string;
    status: string;
}

export default function FoodStallsPage() {
    const { user, signInWithGoogle, loading } = useAuth();
    const router = useRouter();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<"B" | "C" | null>(null);
    const [availableStallsB, setAvailableStallsB] = useState<Stall[]>([]);
    const [availableStallsC, setAvailableStallsC] = useState<Stall[]>([]);
    const [isLoadingStalls, setIsLoadingStalls] = useState(true);
    const [paymentLinks, setPaymentLinks] = useState({ b: "", c: "" });

    // Form State
    const [formData, setFormData] = useState({
        name: "",
        phone: "",
        stallId: "",
        stallName: ""
    });
    const [screenshot, setScreenshot] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    useEffect(() => {
        if (user) {
            setFormData(prev => ({ ...prev, name: user.displayName || "" }));
        }
    }, [user]);

    useEffect(() => {
        const fetchInitialData = async () => {
            setIsLoadingStalls(true);
            try {
                // Fetch settings for payment links
                const settingsDoc = await getDoc(doc(db, "settings", "cultural"));
                if (settingsDoc.exists()) {
                    setPaymentLinks({
                        b: settingsDoc.data()["food-stall-b-payment"] || "",
                        c: settingsDoc.data()["food-stall-c-payment"] || ""
                    });
                }

                // Fetch stalls
                const stallsSnap = await getDocs(query(collection(db, "foodStalls")));
                const allStalls = stallsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));

                setAvailableStallsB(allStalls.filter(s => s.category === "B").sort((a, b) => a.name.localeCompare(b.name)));
                setAvailableStallsC(allStalls.filter(s => s.category === "C").sort((a, b) => a.name.localeCompare(b.name)));
            } catch (error) {
                console.error("Error fetching initial data", error);
            } finally {
                setIsLoadingStalls(false);
            }
        };

        fetchInitialData();
    }, []);

    const handleEntry = async () => {
        if (loading || isLoggingIn) return;
        if (user) {
            router.push("/foodstalls/dashboard");
        } else {
            setIsLoggingIn(true);
            try {
                await signInWithGoogle();
                router.push("/foodstalls/dashboard");
            } catch (error) {
                console.error("Login failed", error);
            } finally {
                setIsLoggingIn(false);
            }
        }
    };

    const openBookingModal = async (category: "B" | "C", stallId?: string) => {
        if (!user) {
            setIsLoggingIn(true);
            try {
                await signInWithGoogle();
            } catch (error) {
                console.error("Login failed", error);
                setIsLoggingIn(false);
                return;
            }
            setIsLoggingIn(false);
        }

        setSelectedCategory(category);
        setIsModalOpen(true);
        setSubmitSuccess(false);

        const stalls = category === "B" ? availableStallsB : availableStallsC;
        const initialStall = stallId ? stalls.find(s => s.id === stallId) : null;

        setFormData(prev => ({
            ...prev,
            stallId: initialStall?.id || "",
            stallName: initialStall?.name || ""
        }));
        setScreenshot(null);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !formData.stallId || !screenshot) return;

        setIsSubmitting(true);
        try {
            const payload = new FormData();
            payload.append("userId", user.uid);
            payload.append("name", formData.name);
            payload.append("email", user.email || "");
            payload.append("phone", formData.phone);
            payload.append("stallId", formData.stallId);
            payload.append("stallName", formData.stallName);
            payload.append("paymentScreenshot", screenshot);

            const res = await fetch("/api/foodstalls/book", {
                method: "POST",
                body: payload
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to book");

            setSubmitSuccess(true);
        } catch (error: any) {
            console.error("Booking error:", error);
            alert(error.message || "Failed to submit booking.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const categories = [
        {
            type: "A",
            title: "Category A",
            price: "Sold Out",
            amenities: [
                "20x20 Canopy",
                "2 Tables & 4 Chairs",
                "1 Socket (5amp) & 1 Light"
            ],
            soldOut: true,
            color: "from-red-500/20 to-red-900/40"
        },
        {
            type: "B",
            title: "Category B",
            price: "₹25,000",
            amenities: [
                "10x10 Canopy",
                "2 Tables & 4 Chairs",
                "1 Socket (5amp) & 1 Light"
            ],
            soldOut: false,
            color: "from-pramana-gold/20 to-yellow-900/40"
        },
        {
            type: "C",
            title: "Category C",
            price: "₹20,000",
            amenities: [
                "10x10 Open Roof Canopy",
                "2 Tables & 4 Chairs",
                "1 Socket (5amp) & 1 Light"
            ],
            soldOut: false,
            color: "from-blue-500/20 to-blue-900/40"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-pramana-cream selection:bg-pramana-gold selection:text-black overflow-x-hidden">
            {/* START HEADER */}
            <header className="fixed top-0 left-0 right-0 z-40 px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex justify-between items-center bg-black/50 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 shadow-2xl shadow-black/50">
                    <Link href="/" className="w-32 h-10 md:w-40 md:h-12 relative opacity-90 hover:opacity-100 transition-opacity">
                        <Image src="/gitam-logo.png" alt="GITAM" fill className="object-contain object-left" sizes="(max-width: 768px) 128px, 160px" priority />
                    </Link>

                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="hidden md:block w-32 relative h-10 opacity-80">
                            <Image src="/student-life-logo.png" alt="Student Life" fill className="object-contain" sizes="128px" />
                        </div>
                        <div className="w-24 h-8 md:w-32 md:h-10 relative opacity-90 hover:opacity-100 transition-opacity hidden md:block">
                            <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-right" sizes="(max-width: 768px) 128px, 160px" priority />
                        </div>
                        <button
                            onClick={handleEntry}
                            disabled={isLoggingIn}
                            className="group relative px-5 py-2 md:px-6 md:py-2 bg-pramana-gold text-black rounded-full font-bold font-cinzel text-[10px] md:text-xs uppercase tracking-widest overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-shadow duration-300"
                        >
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                {isLoggingIn ? "Processing..." : user ? "Dashboard" : "Login"}
                            </span>
                            <div className="absolute inset-0 bg-black/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                </div>
            </header>
            {/* END HEADER */}

            {/* HERO SECTION */}
            <section className="relative min-h-[70vh] flex flex-col items-center justify-center overflow-hidden pt-20">
                <div className="absolute inset-0 z-0 bg-black">
                    <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-pramana-gold/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-orange-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                </div>

                <div className="relative z-10 w-full max-w-4xl mx-auto px-4 text-center space-y-6 flex flex-col items-center">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8 }}
                        className="mb-4 relative w-64 h-16 md:w-60 md:h-60"
                    >
                        <Image src="/pramana-logo.png" alt="Pramana 26" fill className="object-contain" priority />
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.2 }}
                        className="text-5xl md:text-6xl lg:text-7xl font-cinzel font-bold text-white tracking-tight drop-shadow-2xl"
                    >
                        OPEN FOOD STALLS
                    </motion.h1>

                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.4 }}
                        className="text-white/60 text-lg md:text-xl max-w-2xl font-light"
                    >
                        Reserve your spot at the grandest fest of the year. Set up your stall and serve the thousands of attendees at Pramana '26.
                    </motion.p>
                </div>
            </section>

            {/* STALLS PRICING */}
            <section className="py-24 px-6 bg-[#080808] relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16 text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="h-[1px] w-12 bg-pramana-gold"></div>
                            <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">Available Options</span>
                            <div className="h-[1px] w-12 bg-pramana-gold"></div>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-white">Choose Your Space</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-24">
                        {categories.map((cat, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: idx * 0.2 }}
                                className={`relative overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-sm group hover:-translate-y-2 transition-transform duration-500`}
                            >
                                <div className={`absolute inset-0 bg-gradient-to-br ${cat.color} opacity-20 group-hover:opacity-40 transition-opacity duration-500`}></div>

                                <div className="p-8 relative z-10 flex flex-col h-full">
                                    <div className="mb-6 border-b border-white/10 pb-6">
                                        <h3 className="text-2xl font-cinzel font-bold text-white mb-2">{cat.title}</h3>
                                        <p className={`text-4xl font-mono font-bold ${cat.soldOut ? 'text-red-500' : 'text-pramana-gold'}`}>{cat.price}</p>
                                    </div>

                                    <div className="flex-grow space-y-4 mb-8">
                                        {cat.amenities.map((amenity, i) => (
                                            <div key={i} className="flex items-start gap-3 text-white/70">
                                                <CheckCircle2 className="w-5 h-5 text-pramana-gold flex-shrink-0 mt-0.5" />
                                                <span>{amenity}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* LIVE STALLS SECTION */}
            <section className="py-24 px-6 bg-black relative z-10 border-t border-white/5">
                <div className="max-w-7xl mx-auto">
                    <div className="mb-16 text-center">
                        <div className="flex items-center justify-center gap-4 mb-4">
                            <div className="h-[1px] w-12 bg-pramana-gold"></div>
                            <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">Live Availability</span>
                            <div className="h-[1px] w-12 bg-pramana-gold"></div>
                        </div>
                        <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-white">Book Your Stall</h2>
                    </div>

                    {isLoadingStalls ? (
                        <div className="flex justify-center py-12">
                            <div className="animate-spin h-8 w-8 border-2 border-pramana-gold border-t-transparent rounded-full"></div>
                        </div>
                    ) : (
                        <div className="space-y-16">
                            {/* CATEGORY B LISTING */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-pramana-gold/10 blur-[100px] rounded-full pointer-events-none"></div>
                                <h3 className="text-3xl font-cinzel font-bold text-white mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
                                    Category B Stalls
                                    <span className="text-lg text-pramana-gold font-mono tracking-widest">₹25,000</span>
                                </h3>

                                {availableStallsB.length === 0 ? (
                                    <p className="text-white/50 italic text-center py-8">No Category B stalls currently available.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {availableStallsB.map(stall => (
                                            <div
                                                key={stall.id}
                                                className="bg-[#222222] rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h4 className="text-2xl font-bold font-cinzel text-white break-words pr-2">{stall.name}</h4>
                                                        <span className="bg-yellow-900/40 text-yellow-500 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider whitespace-nowrap">
                                                            CATEGORY B
                                                        </span>
                                                    </div>

                                                    <div className="flex items-baseline mb-6">
                                                        <span className="text-3xl font-bold text-white tracking-tight">₹25,000</span>
                                                    </div>
                                                </div>

                                                <button
                                                    disabled={stall.status !== "available"}
                                                    onClick={() => stall.status === "available" && openBookingModal("B", stall.id)}
                                                    className={`w-full py-3.5 rounded-xl font-bold transition-all ${stall.status === "available"
                                                        ? "bg-[#C68925] hover:bg-[#d9982a] text-white shadow-lg"
                                                        : "bg-white/10 text-white/30 cursor-not-allowed"
                                                        }`}
                                                >
                                                    {stall.status === "available" ? "BOOK NOW" : "Sold Out"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* CATEGORY C LISTING */}
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 lg:p-12 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-64 h-64 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none"></div>
                                <h3 className="text-3xl font-cinzel font-bold text-white mb-8 border-b border-white/10 pb-4 flex justify-between items-center">
                                    Category C Stalls
                                    <span className="text-lg text-blue-400 font-mono tracking-widest">₹20,000</span>
                                </h3>

                                {availableStallsC.length === 0 ? (
                                    <p className="text-white/50 italic text-center py-8">No Category C stalls currently available.</p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {availableStallsC.map(stall => (
                                            <div
                                                key={stall.id}
                                                className="bg-[#222222] rounded-2xl p-6 flex flex-col justify-between border border-white/5 hover:border-white/10 transition-colors"
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-6">
                                                        <h4 className="text-2xl font-bold font-cinzel text-white break-words pr-2">{stall.name}</h4>
                                                        <span className="bg-yellow-900/40 text-yellow-500 text-[10px] sm:text-xs font-bold px-3 py-1.5 rounded uppercase tracking-wider whitespace-nowrap">
                                                            CATEGORY C
                                                        </span>
                                                    </div>

                                                    <div className="flex items-baseline mb-6">
                                                        <span className="text-3xl font-bold text-white tracking-tight">₹20,000</span>
                                                    </div>
                                                </div>

                                                <button
                                                    disabled={stall.status !== "available"}
                                                    onClick={() => stall.status === "available" && openBookingModal("C", stall.id)}
                                                    className={`w-full py-3.5 rounded-xl font-bold transition-all ${stall.status === "available"
                                                        ? "bg-[#C68925] hover:bg-[#d9982a] text-white shadow-lg"
                                                        : "bg-white/10 text-white/30 cursor-not-allowed"
                                                        }`}
                                                >
                                                    {stall.status === "available" ? "BOOK NOW" : "Sold Out"}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </section >

            {/* MODAL */}
            {
                isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-[#0f0f0f] border border-white/10 p-6 md:p-10 rounded-3xl w-full max-w-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>

                            {!submitSuccess ? (
                                <>
                                    <h3 className="text-3xl font-cinzel font-bold text-pramana-gold mb-2">Book Category {selectedCategory}</h3>
                                    <p className="text-white/60 text-sm mb-8">Complete the details below and upload your payment proof to reserve your stall.</p>

                                    {selectedCategory === "B" && availableStallsB.length === 0 ? (
                                        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl text-center">
                                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                            <p className="text-white font-bold">Sorry, all Category B stalls are currently sold out or pending approval.</p>
                                        </div>
                                    ) : selectedCategory === "C" && availableStallsC.length === 0 ? (
                                        <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-xl text-center">
                                            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
                                            <p className="text-white font-bold">Sorry, all Category C stalls are currently sold out or pending approval.</p>
                                        </div>
                                    ) : (
                                        <form onSubmit={handleSubmit} className="space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase tracking-widest text-pramana-gold font-bold">Full Name</label>
                                                    <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pramana-gold transition-colors" placeholder="John Doe" />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-xs uppercase tracking-widest text-pramana-gold font-bold">Phone Number</label>
                                                    <input required type="tel" value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pramana-gold transition-colors" placeholder="+91 9876543210" />
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs uppercase tracking-widest text-pramana-gold font-bold">Selected Stall</label>
                                                <div className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-white font-mono text-lg flex items-center justify-between">
                                                    <span>{formData.stallName || "None Selected"}</span>
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                </div>
                                            </div>

                                            <div className="p-4 bg-pramana-gold/10 border border-pramana-gold/30 rounded-xl space-y-3">
                                                <h4 className="font-bold text-pramana-gold uppercase tracking-wider text-sm flex items-center gap-2">
                                                    Payment Instructions
                                                </h4>
                                                <ul className="text-sm border-white/60 text-white/80 space-y-1 list-disc list-inside mb-4">
                                                    <li>Use the exact amount: {selectedCategory === "B" ? "₹25,000" : "₹20,000"}</li>
                                                    <li>Ensure the login email matches your Google account exactly.</li>
                                                    <li>Verification will take 24-48 hours.</li>
                                                </ul>

                                                <div className="w-full flex justify-center py-4 border-t border-white/10">
                                                    <a
                                                        href={selectedCategory === "B" ? paymentLinks.b : paymentLinks.c}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="px-8 py-4 bg-green-500 hover:bg-green-600 text-black font-bold rounded-xl text-lg uppercase tracking-widest shadow-[0_0_20px_rgba(34,197,94,0.3)] transition-all animate-pulse"
                                                    >
                                                        Pay Here
                                                    </a>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-xs uppercase tracking-widest text-pramana-gold font-bold">Upload Payment Screenshot</label>
                                                <div className="relative border-2 border-dashed border-white/20 rounded-xl p-8 hover:border-pramana-gold/50 transition-colors text-center group cursor-pointer bg-black/20">
                                                    <input
                                                        type="file"
                                                        required
                                                        accept="image/*"
                                                        onChange={e => e.target.files && setScreenshot(e.target.files[0])}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                                    />
                                                    <Upload className="w-8 h-8 text-white/40 mx-auto mb-3 group-hover:text-pramana-gold transition-colors" />
                                                    <p className="text-white/60 text-sm">
                                                        {screenshot ? (
                                                            <span className="text-white font-bold">{screenshot.name}</span>
                                                        ) : "Click or drag to upload screenshot"}
                                                    </p>
                                                </div>
                                            </div>

                                            <button
                                                disabled={isSubmitting}
                                                type="submit"
                                                className="w-full bg-pramana-gold text-black py-4 rounded-xl font-bold font-cinzel text-lg tracking-widest hover:bg-yellow-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {isSubmitting ? "SUBMITTING..." : "CONFIRM BOOKING"}
                                            </button>
                                        </form>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-12 space-y-6">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                        <CheckCircle2 className="w-10 h-10 text-green-500" />
                                    </div>
                                    <h3 className="text-3xl font-cinzel font-bold text-white">Booking Submitted</h3>
                                    <p className="text-white/60 max-w-md mx-auto">
                                        Your stall request and payment screenshot have been received. We will verify your payment within 24-48 hours.
                                    </p>
                                    <button
                                        onClick={() => router.push("/foodstalls/dashboard")}
                                        className="mt-6 inline-block bg-white text-black px-8 py-3 rounded-xl font-bold font-cinzel uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                    >
                                        Go to Dashboard
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </div>
                )
            }
            <AppFooter />
        </div >
    );
}
