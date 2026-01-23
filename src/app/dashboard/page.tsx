"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { downloadTicket } from "@/utils/downloadTicket";
import TicketTemplate from "@/components/TicketTemplate";

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
    const [bannerBase64, setBannerBase64] = useState<string | null>(null);

    // Ticket Downloading Logic
    const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);
    // Removed refs as we use the standalone utility now

    useEffect(() => {
        if (!loading && user) {
            // Redirect Admins to Admin Portal
            if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'view_admin') {
                router.replace("/admin");
                return;
            }

            const fetchData = async () => {
                setFetching(true);
                try {
                    // 0. Pre-load Banner as Base64 to ensure html2canvas captures it
                    try {
                        const response = await fetch('/ticket-banner.png');
                        const blob = await response.blob();
                        const reader = new FileReader();
                        reader.onloadend = () => {
                            setBannerBase64(reader.result as string);
                        };
                        reader.readAsDataURL(blob);
                    } catch (e) {
                        console.error("Failed to load banner", e);
                    }

                    // 1. Fetch User Profile
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


    if (loading || fetching) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-pramana-gold">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-12 w-12 border-4 border-pramana-gold border-t-transparent rounded-full shadow-[0_0_20px_rgba(184,134,11,0.5)]"></div>
                <div className="text-sm font-cinzel tracking-widest animate-pulse">LOADING DASHBOARD</div>
            </div>
        </div>
    );

    if (!user) return null;

    // Helper to trigger download
    const handleDownloadTicket = async (passId: string) => {
        console.log("Starting download process for:", passId);
        setDownloadingPassId(passId);
        try {
            const pass = myPasses.find(p => p.id === passId);
            if (!pass) return;

            await downloadTicket({
                pass,
                user: { displayName: user.displayName },
                qrCodeUrl: qrUrls[passId],
                bannerUrl: bannerBase64 // Use the base64 we preloaded, or fallback to url if needed
            });

        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download ticket. Please try again.");
        } finally {
            setDownloadingPassId(null);
        }
    };

    // Find the pass object that is currently being downloaded to render in the hidden template
    // We keep this variable if we want to show a visual modal, but we removed the hidden capture div.
    const activeDownloadPass = myPasses.find(p => p.id === downloadingPassId);

    const isRegistrationComplete = userProfile?.isRegistered || (userProfile?.phone && userProfile?.college);

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            {/* Visible Ticket Template Modal for Generation - Visual Feedback Only */}
            {/* Visible Ticket Template Modal for Generation - Visual Feedback Only */}
            {activeDownloadPass && user && (
                <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center p-4">
                    <div className="text-pramana-gold font-cinzel text-xl mb-4 animate-pulse">
                        Minting Your Royal Pass...
                    </div>

                    {/* Simple Spinner instead of Old Template */}
                    <div className="relative w-24 h-24">
                        <div className="absolute inset-0 border-4 border-pramana-gold/30 rounded-full"></div>
                        <div className="absolute inset-0 border-4 border-pramana-gold border-t-transparent rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-2xl">⚜️</span>
                        </div>
                    </div>

                    <div className="mt-8 text-white/50 text-sm font-mono">
                        Please wait while we secure your entry token.
                    </div>
                </div>
            )}

            {/* Reusing Admin container style for consistent futuristic background */}
            <main className="admin-page-container">
                <div className="container mx-auto max-w-6xl pb-20 space-y-12">

                    {/* Header Section */}
                    <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8 animate-stagger-1">
                        <div>
                            <p className="text-pramana-gold font-bold tracking-widest text-xs uppercase mb-2">Authenticated User</p>
                            <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold via-white to-pramana-gold neon-text-gold">
                                My Dashboard
                            </h1>
                            <p className="text-pramana-cream/60 mt-2 font-playfair text-lg">Welcome back, <span className="text-white">{user.displayName}</span></p>
                        </div>
                        <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10 backdrop-blur-sm">
                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                            <span className="text-xs font-mono text-pramana-cream/50 uppercase">System Online</span>
                        </div>
                    </header>

                    {/* Registration Check - Glass Card */}
                    {!isRegistrationComplete && (
                        <div className="glass-panel p-1 rounded-2xl animate-stagger-2 relative overflow-hidden group">
                            <div className="absolute inset-0 bg-red-900/10 animate-pulse"></div>
                            <div className="bg-black/40 p-6 rounded-xl flex flex-col md:flex-row justify-between items-center gap-6 relative z-10">
                                <div className="flex items-center gap-4">
                                    <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center text-red-400 border border-red-500/30 text-xl shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                                        !
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-red-400 font-cinzel text-lg">Registration Incomplete</h3>
                                        <p className="text-sm text-pramana-cream/70">Complete your profile to unlock full event access and features.</p>
                                    </div>
                                </div>
                                <Link href="/register" className="whitespace-nowrap bg-red-600/20 text-red-400 border border-red-500/50 px-6 py-2.5 rounded-lg font-bold hover:bg-red-600 hover:text-white transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.5)]">
                                    Complete Profile &rarr;
                                </Link>
                            </div>
                        </div>
                    )}

                    {/* Passes Section */}
                    <div className="animate-stagger-3">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-2xl font-cinzel font-bold text-white flex items-center gap-3">
                                    <span className="text-pramana-gold text-3xl">❖</span> My Passes
                                </h2>
                                <div className="h-1 w-20 bg-gradient-to-r from-pramana-gold to-transparent mt-2 rounded-full"></div>
                            </div>
                            {myPasses.length > 0 && <span className="text-pramana-cream/40 font-mono text-xs">{myPasses.length} Active Pass(es)</span>}
                        </div>

                        {myPasses.length === 0 && (
                            <div className="glass-panel p-6 rounded-2xl mb-8 border-yellow-500/20 bg-yellow-900/5">
                                <p className="text-sm text-yellow-200/80 text-center font-mono leading-relaxed">
                                    <span className="text-yellow-500 font-bold">NOTICE:</span> If you have recently purchased a pass on G-EVENTS, your digital ticket will be displayed here shortly after verification.<br />
                                    Once the payment is completed, you will receive a payment confirmation email from G-EVENTS.<br />
                                    For any assistance, please contact us at <a href="mailto:pramana.hyd@gitam.edu" className="underline hover:text-white">pramana.hyd@gitam.edu</a>.
                                </p>
                            </div>
                        )}

                        {myPasses.length === 0 ? (
                            <div className="glass-panel p-16 rounded-3xl text-center flex flex-col items-center justify-center border-dashed border-white/10 group hover:border-pramana-gold/30 transition-all duration-500">
                                <div className="h-24 w-24 bg-white/5 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-500 ring-1 ring-white/10 group-hover:ring-pramana-gold/50">
                                    <span className="text-4xl opacity-50 grayscale group-hover:grayscale-0 transition-all duration-500">🎟️</span>
                                </div>
                                <h3 className="text-2xl font-bold text-white font-cinzel mb-2">No Passes Found</h3>
                                <p className="text-pramana-cream/50 mb-8 max-w-md">Your adventure hasn't started yet. Purchase a pass to unlock the experience.</p>
                                <Link
                                    href="/tickets"
                                    className="relative group overflow-hidden px-8 py-3 bg-pramana-gold text-black font-bold rounded-full font-cinzel shadow-[0_0_20px_rgba(184,134,11,0.3)] hover:shadow-[0_0_40px_rgba(184,134,11,0.6)] transition-all duration-300"
                                >
                                    <span className="relative z-10">Purchase Passes</span>
                                    <div className="absolute inset-0 bg-white/30 transform -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
                                </Link>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
                                {myPasses.map(pass => (
                                    <div key={pass.id} className="group relative perspective">
                                        {/* Holographic Card Effect */}
                                        <div className="glass-panel rounded-3xl overflow-hidden transition-all duration-500 group-hover:transform group-hover:-translate-y-2 group-hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] border-white/10 group-hover:border-pramana-gold/40 relative z-10">

                                            {/* Digital Noise Overlay */}
                                            <div className="absolute inset-0 opacity-5 pointer-events-none mix-blend-overlay"></div>

                                            {/* Pass Header */}
                                            <div className="bg-gradient-to-br from-gray-900 to-black p-6 relative border-b border-white/5">
                                                <div className="absolute top-0 right-0 w-32 h-32 bg-pramana-gold/10 rounded-full blur-[50px] pointer-events-none"></div>
                                                <div className="flex justify-between items-start mb-2">
                                                    <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-pramana-gold/10 text-pramana-gold border border-pramana-gold/20">
                                                        Official Access
                                                    </span>
                                                    <div className="h-8 w-8 rounded-full border border-white/10 flex items-center justify-center">
                                                        <span className="text-xs">⚜️</span>
                                                    </div>
                                                </div>
                                                <h3 className="font-cinzel font-bold text-2xl text-white mb-1 group-hover:text-pramana-gold transition-colors">{pass.passName}</h3>
                                                <p className="text-xs text-white/40 font-mono tracking-wider">{pass.bookingId}</p>
                                            </div>

                                            {/* QR Section */}
                                            <div className="p-8 flex flex-col items-center bg-black/40 relative">
                                                {/* Scanning Line Animation */}
                                                <div className="absolute top-0 left-0 w-full h-[2px] bg-pramana-gold/50 shadow-[0_0_15px_#b8860b] transform translate-y-[-10px] group-hover:animate-scan opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                                <div className="bg-white p-3 rounded-xl shadow-[0_0_30px_rgba(255,255,255,0.1)] mb-6 transition-transform duration-300 group-hover:scale-105">
                                                    {qrUrls[pass.id] ? (
                                                        <img src={qrUrls[pass.id]} alt="QR" className="w-48 h-48 object-contain mix-blend-multiply" />
                                                    ) : (
                                                        <div className="w-48 h-48 bg-slate-100 animate-pulse rounded-lg flex items-center justify-center text-slate-300">Generating...</div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleDownloadTicket(pass.id)}
                                                    disabled={downloadingPassId === pass.id}
                                                    className="flex items-center gap-2 text-xs font-bold text-pramana-cream/60 hover:text-white transition-colors uppercase tracking-widest group/btn disabled:opacity-50"
                                                >
                                                    {downloadingPassId === pass.id ? (
                                                        <><span>GENERATING...</span><div className="animate-spin h-3 w-3 border-2 border-white border-t-transparent rounded-full"></div></>
                                                    ) : (
                                                        <><span>Download Ticket</span><span className="group-hover/btn:translate-y-1 transition-transform">↓</span></>
                                                    )}
                                                </button>
                                            </div>

                                            {/* Status Footer */}
                                            <div className="p-4 bg-white/5 border-t border-white/5 grid grid-cols-2 divide-x divide-white/10">
                                                <div className="px-4 text-center">
                                                    <p className="text-[10px] uppercase text-pramana-cream/40 tracking-widest mb-1">Day 1 Access</p>
                                                    <div className={`text-sm font-bold ${pass.entryLogs?.includes('day1') ? 'text-green-400' : 'text-white/60'}`}>
                                                        {pass.entryLogs?.includes('day1') ? '✓ CHECKED IN' : 'PENDING'}
                                                    </div>
                                                </div>
                                                <div className="px-4 text-center">
                                                    <p className="text-[10px] uppercase text-pramana-cream/40 tracking-widest mb-1">Day 2 Access</p>
                                                    <div className={`text-sm font-bold ${pass.entryLogs?.includes('day2') ? 'text-blue-400' : 'text-white/60'}`}>
                                                        {pass.entryLogs?.includes('day2') ? '✓ CHECKED IN' : 'PENDING'}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
