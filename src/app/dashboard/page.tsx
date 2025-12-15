"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";

interface IssuedPass {
    id: string;
    passName: string;
    bookingId: string;
    qrCode: string;
    status: string;
    issuedToEmail: string;
    purchaseDate: string;
    entryLogs?: string[];
}

interface UserProfile {
    phone?: string;
    college?: string;
    isGitamite?: boolean;
    isRegistered?: boolean;
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [myPasses, setMyPasses] = useState<IssuedPass[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [fetching, setFetching] = useState(true);
    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});

    useEffect(() => {
        if (!loading && user) {
            const fetchData = async () => {
                setFetching(true);
                try {
                    // 1. Fetch User Profile to check registration status
                    const userRef = doc(db, "users", user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                        setUserProfile(userSnap.data() as UserProfile);
                    }

                    // 2. Fetch Passes
                    const q = query(
                        collection(db, "passes_issued"),
                        where("issuedToEmail", "==", user.email)
                    );
                    const snap = await getDocs(q);
                    const passes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as IssuedPass[];

                    // Sort locally by date desc
                    passes.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());
                    setMyPasses(passes);

                    // Generate QRs
                    const urls: Record<string, string> = {};
                    for (const p of passes) {
                        urls[p.id] = await QRCode.toDataURL(p.qrCode);
                    }
                    setQrUrls(urls);
                } catch (error) {
                    console.error("Error fetching data", error);
                } finally {
                    setFetching(false);
                }
            };
            fetchData();
        } else if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    if (loading || fetching) return <div className="min-h-screen flex items-center justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

    if (!user) return null;

    const isRegistrationComplete = userProfile?.isRegistered || (userProfile?.phone && userProfile?.college);

    return (
        <div className="min-h-screen p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
                    <div>
                        <h1 className="text-3xl font-cinzel font-bold text-pramana-gold">My Dashboard</h1>
                        <p className="text-pramana-cream/60 mt-1 font-playfair">Welcome back, {user.displayName}</p>
                    </div>
                </header>

                {/* Registration Check */}
                {!isRegistrationComplete && (
                    <div className="bg-pramana-gold/10 border-l-4 border-pramana-gold p-4 mb-8 rounded backdrop-blur-sm">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-bold text-pramana-gold">Registration Incomplete</p>
                                <p className="text-sm text-pramana-cream/80">Please complete your profile to access all features.</p>
                            </div>
                            <Link href="/register" className="bg-pramana-gold text-black px-4 py-2 rounded font-bold hover:bg-yellow-600 transition">
                                Complete Profile
                            </Link>
                        </div>
                    </div>
                )}

                {/* Passes Section */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-2xl font-cinzel font-bold text-pramana-cream">My Passes</h2>
                    </div>

                    {myPasses.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-md rounded-2xl p-10 text-center border border-white/10">
                            <div className="text-6xl mb-4 grayscale opacity-50">🎟️</div>
                            <h3 className="text-xl font-bold text-pramana-gold mb-2">No Passes Found</h3>
                            <p className="text-pramana-cream/60 mb-6">You haven't purchased any event passes yet.</p>
                            <Link
                                href="/tickets"
                                className="inline-block bg-pramana-gold text-black px-8 py-3 rounded-full font-bold shadow-lg shadow-pramana-gold/20 hover:bg-yellow-600 hover:scale-105 transition transform"
                            >
                                View Available Passes
                            </Link>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myPasses.map(pass => (
                                <div key={pass.id} className="bg-white/5 backdrop-blur-md rounded-2xl overflow-hidden shadow-2xl border border-white/10 flex flex-col group hover:border-pramana-gold/50 transition-colors">
                                    <div className="bg-gradient-to-r from-pramana-gold to-yellow-600 text-black p-4 text-center relative overflow-hidden">
                                        <div className="relative z-10">
                                            <h3 className="font-cinzel font-bold text-lg">{pass.passName}</h3>
                                            <p className="text-xs text-black/70 font-mono mt-1 font-bold">{pass.qrCode}</p>
                                        </div>
                                    </div>

                                    <div className="p-6 flex-1 flex flex-col items-center">
                                        {/* QR Display */}
                                        <div className="bg-white p-2 rounded-xl shadow-inner mb-6">
                                            {qrUrls[pass.id] ? (
                                                <img src={qrUrls[pass.id]} alt="QR" className="w-48 h-48 object-contain" />
                                            ) : (
                                                <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg"></div>
                                            )}
                                        </div>

                                        {/* Status Indicators */}
                                        <div className="w-full grid grid-cols-2 gap-3 mb-6">
                                            <div className={`p-3 rounded-lg border text-center ${pass.entryLogs?.includes('day1') ? 'bg-green-500/20 border-green-500/50 text-green-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-1">Day 1</p>
                                                <p className="font-bold">{pass.entryLogs?.includes('day1') ? "Entered" : "Pending"}</p>
                                            </div>
                                            <div className={`p-3 rounded-lg border text-center ${pass.entryLogs?.includes('day2') ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-white/5 border-white/10 text-white/40'}`}>
                                                <p className="text-xs font-bold uppercase tracking-wider mb-1">Day 2</p>
                                                <p className="font-bold">{pass.entryLogs?.includes('day2') ? "Entered" : "Pending"}</p>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => {
                                                const link = document.createElement('a');
                                                link.download = `Pass-${pass.passName}.png`;
                                                link.href = qrUrls[pass.id];
                                                link.click();
                                            }}
                                            className="mt-auto w-full py-3 rounded-xl border border-pramana-gold/30 text-pramana-gold font-bold hover:bg-pramana-gold hover:text-black transition"
                                        >
                                            Download Ticket
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
