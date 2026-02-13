"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { downloadTicket } from "@/utils/downloadTicket";
import Image from "next/image";

interface IssuedPass {
    id: string;
    passId?: string;
    passName: string;
    bookingId: string;
    qrCode: string;
    status: string;
    issuedToEmail: string;
    purchaseDate: string;
    entryLogs?: string[];
    issuedPhysical?: boolean;
    passConfig?: any; // To store full config including dates
}

const PassDeadlineDisplay = ({ target }: { target: string }) => {
    const [timeLeft, setTimeLeft] = useState<{ d: number, h: number, m: number, s: number } | null>(null);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        const calculateTimeLeft = () => {
            const difference = +new Date(target) - +new Date();
            if (difference > 0) {
                return {
                    d: Math.floor(difference / (1000 * 60 * 60 * 24)),
                    h: Math.floor((difference / (1000 * 60 * 60)) % 24),
                    m: Math.floor((difference / 1000 / 60) % 60),
                    s: Math.floor((difference / 1000) % 60),
                };
            }
            return null;
        };

        const updateStatus = () => {
            const t = calculateTimeLeft();
            if (t) {
                setTimeLeft(t);
                setIsExpired(false);
            } else {
                setTimeLeft(null);
                setIsExpired(+new Date(target) <= +new Date());
            }
        };

        updateStatus();
        const timer = setInterval(updateStatus, 1000);

        return () => clearInterval(timer);
    }, [target]);

    const TimeBox = ({ val, label }: { val: number, label: string }) => (
        <div className="flex flex-col items-center bg-black/80 border border-pramana-gold/30 px-2 py-1 rounded min-w-[2.5rem]">
            <span className="text-xs font-cinzel font-bold text-pramana-gold">{val.toString().padStart(2, '0')}</span>
            <span className="text-[8px] text-pramana-gold/50 uppercase tracking-wider">{label}</span>
        </div>
    );

    if (isExpired) {
        return (
            <div className="mb-4 text-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 block mb-1">Pass Closed</span>
                <div className="flex gap-1.5 mt-2 justify-center">
                    <TimeBox val={0} label="D" />
                    <TimeBox val={0} label="H" />
                    <TimeBox val={0} label="M" />
                    <TimeBox val={0} label="S" />
                </div>
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className="mb-4 text-center">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 block mb-1">Ends In</span>
            <div className="flex gap-1.5 mt-2 justify-center">
                <TimeBox val={timeLeft.d} label="D" />
                <TimeBox val={timeLeft.h} label="H" />
                <TimeBox val={timeLeft.m} label="M" />
                <TimeBox val={timeLeft.s} label="S" />
            </div>
        </div>
    );
};

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
    const [bulkRequests, setBulkRequests] = useState<any[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [fetching, setFetching] = useState(true);
    const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
    const [bannerBase64, setBannerBase64] = useState<string | null>(null);
    const [showQR, setShowQR] = useState(false);

    // Ticket Downloading Logic
    const [downloadingPassId, setDownloadingPassId] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && user) {
            // Redirect Admins to Admin Portal
            if (user.role === 'admin' || user.role === 'superadmin' || user.role === 'view_admin') {
                router.replace("/admin");
                return;
            }

            if (user.role === 'ppass_admin') {
                router.replace("/issue-pass");
                return;
            }

            const fetchData = async () => {
                setFetching(true);
                try {
                    // 0. Pre-load Banner
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

                    // 1.5 Fetch Config for QR Visibility
                    const configRef = doc(db, "config", "entry");
                    const configSnap = await getDoc(configRef);
                    if (configSnap.exists()) {
                        setShowQR(configSnap.data().showQR || false);
                    }

                    // 2. Fetch Passes
                    const email = user.email?.toLowerCase().trim();
                    const q = query(
                        collection(db, "passes_issued"),
                        where("issuedToEmail", "==", email)
                    );
                    const snap = await getDocs(q);
                    const passes = snap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as IssuedPass[];

                    // Sort locally by date desc
                    passes.sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

                    // Enrich with Pass Config for Dates
                    const passesWithConfig = await Promise.all(passes.map(async (p) => {
                        if (p.passId) {
                            try {
                                const configRef = doc(db, "passes_config", p.passId);
                                const configSnap = await getDoc(configRef);
                                if (configSnap.exists()) {
                                    return { ...p, passConfig: configSnap.data() };
                                }
                                // Try bulk config if not found
                                const bulkConfigRef = doc(db, "bulk_pass_configs", p.passId);
                                const bulkConfigSnap = await getDoc(bulkConfigRef);
                                if (bulkConfigSnap.exists()) {
                                    return { ...p, passConfig: bulkConfigSnap.data() };
                                }
                            } catch (e) {
                                console.error("Error fetching pass config", e);
                            }
                        }
                        return p;
                    }));

                    setMyPasses(passesWithConfig);

                    // 3. Fetch Bulk Requests
                    const requestsRef = collection(db, "bulk_pass_requests");
                    const q1 = query(requestsRef, where("mainUserEmail", "==", email));
                    const q2 = query(requestsRef, where("memberEmails", "array-contains", email));

                    const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
                    const reqsMap = new Map();

                    snap1.docs.forEach(d => reqsMap.set(d.id, { id: d.id, ...d.data() }));
                    snap2.docs.forEach(d => reqsMap.set(d.id, { id: d.id, ...d.data() }));

                    // Filter
                    const ownedConfigIds = new Set(passes.map(p => p.passId).filter(Boolean));
                    setBulkRequests(Array.from(reqsMap.values()).filter((r: any) => {
                        if (r.status === 'approved') return false;
                        if (r.status === 'rejected' && ownedConfigIds.has(r.passConfigId)) return false;
                        return true;
                    }));

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
                <div className="h-12 w-12 border-2 border-pramana-gold border-t-transparent rounded-full animate-spin"></div>
            </div>
        </div>
    );

    if (!user) return null;

    const handleDownloadTicket = async (passId: string) => {
        setDownloadingPassId(passId);
        try {
            const pass = myPasses.find(p => p.id === passId);
            if (!pass) return;

            await downloadTicket({
                pass,
                user: { displayName: user.displayName },
                qrCodeUrl: qrUrls[passId],
                bannerUrl: bannerBase64
            });

        } catch (error) {
            console.error("Download failed", error);
            alert("Failed to download ticket. Please try again.");
        } finally {
            setDownloadingPassId(null);
        }
    };

    const isRegistrationComplete = userProfile?.isRegistered || (userProfile?.phone && userProfile?.college);

    return (
        <div className="flex min-h-screen bg-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black relative overflow-x-hidden">

            {/* Mascot Background Integration */}
            <div className="fixed bottom-0 right-0 z-0 pointer-events-none opacity-20 md:opacity-40 w-[180px] h-[180px] md:w-[500px] md:h-[500px]">
                <Image
                    src="/royal_mascot_v3.png"
                    alt="Mascot"
                    fill
                    className="object-contain object-bottom-right"
                />
            </div>

            {/* Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(184,134,11,0.05),transparent_40%)]"></div>
            </div>

            <main className="w-full max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12 relative z-10 space-y-8 md:space-y-12">

                {/* Header Section */}
                <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-6 animate-fade-in-down border-b border-pramana-gold/20 pb-6 md:pb-8">
                    <div className="flex items-center gap-4 md:gap-6 text-center md:text-left">
                        <div className="relative w-16 h-16 md:w-24 md:h-24 flex-shrink-0">
                            <Image
                                src="/pramana-logo.png"
                                alt="Pramana Logo"
                                fill
                                className="object-contain"
                            />
                        </div>
                        <div>
                            <p className="text-pramana-gold font-bold tracking-widest text-xs md:text-sm uppercase mb-1 md:mb-2">My Dashboard</p>
                            <h1 className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-1 md:mb-2">
                                Welcome, {user.displayName?.split(' ')[0]}
                            </h1>
                            <p className="text-pramana-cream/60 font-playfair text-base md:text-lg">Manage your passes and profile.</p>
                        </div>
                    </div>
                </header>

                {/* Registration Check */}
                {!isRegistrationComplete && (
                    <div className="bg-red-900/10 border border-red-500/20 p-6 rounded flex flex-col md:flex-row justify-between items-center gap-6 animate-fade-in-up">
                        <div className="flex items-center gap-4">
                            <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 text-lg border border-red-500/20">!</div>
                            <div>
                                <h3 className="font-bold text-red-400 font-cinzel text-lg">Action Required</h3>
                                <p className="text-sm text-red-100/60">Complete your profile to unlock full event access.</p>
                            </div>
                        </div>
                        <Link href="/register" className="px-6 py-3 bg-red-500/10 hover:bg-red-500 hover:text-white border border-red-500/30 rounded text-red-400 font-bold transition-all text-sm uppercase tracking-wider">
                            Complete Profile
                        </Link>
                    </div>
                )}

                {/* Bulk Requests Section */}
                {bulkRequests.length > 0 && (
                    <div className="animate-fade-in-up">
                        <h2 className="text-xl font-cinzel font-bold text-white flex items-center gap-3 mb-6">
                            <span className="text-pramana-gold">📋</span> Bulk Requests
                        </h2>
                        <div className="grid gap-4">
                            {bulkRequests.map(req => (
                                <div key={req.id} className="bg-black border border-white/10 p-6 rounded flex flex-col md:flex-row justify-between items-center gap-4 hover:border-pramana-gold/30 transition-colors">
                                    <div>
                                        <div className="flex items-center gap-3 mb-1">
                                            <h3 className="font-bold text-white">{req.name || 'Group Request'}</h3>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                    'bg-red-500/10 text-red-500 border-red-500/20'
                                                }`}>
                                                {req.status}
                                            </span>
                                        </div>
                                        <p className="text-sm text-pramana-cream/40">
                                            {new Date(req.submittedAt?.toDate()).toLocaleDateString()}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs uppercase tracking-widest text-pramana-cream/40 mb-1">Members</p>
                                        <p className="text-xl font-bold text-white">{req.memberEmails?.length + 1}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Passes Section */}
                <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
                    <div className="flex justify-between items-end mb-8">
                        <h2 className="text-2xl font-cinzel font-bold text-white flex items-center gap-3">
                            <span className="text-pramana-gold">🎟️</span> My Passes
                        </h2>
                    </div>

                    {myPasses.length === 0 ? (
                        <div className="bg-black/50 border border-dashed border-pramana-gold/30 rounded-xl p-16 text-center relative overflow-hidden group">
                            {/* Highlighted Note */}
                            <div className="absolute top-0 inset-x-0 bg-gradient-to-b from-pramana-gold/10 to-transparent h-32 pointer-events-none"></div>

                            <div className="relative z-10">
                                <div className="w-16 h-16 border border-pramana-gold/20 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl text-pramana-gold">❖</div>
                                <h3 className="text-xl font-cinzel font-bold text-white mb-2">No Passes Found</h3>
                                <p className="text-pramana-cream/50 mb-8 max-w-sm mx-auto">Your journey begins here. Browse available passes.</p>
                                <Link href="/tickets" className="inline-block px-8 py-3 bg-pramana-gold text-black font-bold rounded hover:bg-white transition-colors font-cinzel text-sm uppercase tracking-wider shadow-[0_0_20px_rgba(184,134,11,0.2)]">
                                    View Tickets
                                </Link>

                                {/* Important Note - Highlighted */}
                                <div className="mt-12 p-6 border border-pramana-gold/40 bg-pramana-gold/5 rounded relative max-w-2xl mx-auto shadow-[0_0_30px_-5px_rgba(184,134,11,0.1)]">
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 bg-black border border-pramana-gold text-pramana-gold text-[10px] font-bold uppercase tracking-widest">
                                        Pass Verification
                                    </div>
                                    <p className="text-pramana-cream/80 text-sm leading-relaxed">
                                        Passes usually appear within <strong>5-7 working days</strong> after payment verification.
                                        <br />If you have paid but don't see your pass after 7 days, please fill out the <a href="https://forms.gle/mRA8r8CFUV8FyadY7" target="_blank" className="text-pramana-gold underline hover:text-white transition-colors font-bold">Support Form</a>.
                                    </p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {myPasses.map(pass => (
                                <div key={pass.id} className="bg-black border border-pramana-gold/20 rounded-xl overflow-hidden hover:shadow-[0_0_30px_rgba(184,134,11,0.15)] transition-all duration-300 hover:-translate-y-1 group">

                                    {/* Card Header */}
                                    <div className="bg-[#050505] p-6 border-b border-pramana-gold/10 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 border border-pramana-gold/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                                        <div className="relative z-10">
                                            <span className="inline-block px-2 py-1 bg-pramana-gold/10 rounded text-[10px] font-bold uppercase tracking-widest text-pramana-gold mb-3 border border-pramana-gold/20">Official Pass</span>
                                            <h3 className="text-xl font-cinzel font-bold text-white leading-tight">{pass.passName}</h3>
                                        </div>
                                    </div>

                                    {/* QR Section */}
                                    <div className="p-8 flex flex-col items-center justify-center bg-black">
                                        <div className="bg-white p-3 rounded shadow-lg mb-6 group-hover:scale-105 transition-transform duration-300 border-2 border-pramana-gold/50">
                                            {showQR ? (
                                                qrUrls[pass.id] ? (
                                                    <img src={qrUrls[pass.id]} alt="QR" className="w-48 h-48 object-contain mix-blend-multiply" />
                                                ) : (
                                                    <div className="w-48 h-48 bg-gray-100 animate-pulse rounded flex items-center justify-center text-gray-400 text-xs">Generating...</div>
                                                )
                                            ) : (
                                                <div className="w-48 h-48 bg-gray-100 rounded flex flex-col items-center justify-center text-gray-400 gap-2">
                                                    <span className="text-3xl opacity-30">🔒</span>
                                                    <span className="text-[10px] uppercase font-bold tracking-widest">QR Coming Soon</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Countdown Timer */}
                                        {pass.passConfig?.scheduleEnabled && pass.passConfig?.endDate && (
                                            <PassDeadlineDisplay target={pass.passConfig.endDate} />
                                        )}

                                        <button
                                            onClick={() => handleDownloadTicket(pass.id)}
                                            disabled={downloadingPassId === pass.id || !showQR}
                                            className="px-6 py-2 border border-pramana-gold text-pramana-gold font-bold uppercase tracking-widest text-xs rounded hover:bg-pramana-gold hover:text-black transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {downloadingPassId === pass.id ? 'Downloading...' : 'Download Ticket ↓'}
                                        </button>
                                    </div>

                                    {/* Footer Stats */}
                                    <div className="border-t border-white/5 p-4 grid grid-cols-2 divide-x divide-white/10 bg-white/[0.02]">
                                        <div className="text-center">
                                            <p className="text-[9px] uppercase tracking-widest text-pramana-cream/40 mb-1">Day 1</p>
                                            <p className={`font-bold text-sm ${pass.entryLogs?.includes('day1') ? 'text-green-500' : 'text-white/40'}`}>
                                                {pass.entryLogs?.includes('day1') ? 'Entered' : '-'}
                                            </p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[9px] uppercase tracking-widest text-pramana-cream/40 mb-1">Day 2</p>
                                            <p className={`font-bold text-sm ${pass.entryLogs?.includes('day2') ? 'text-green-500' : 'text-white/40'}`}>
                                                {pass.entryLogs?.includes('day2') ? 'Entered' : '-'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

            </main>
        </div>
    );
}
