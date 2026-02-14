"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { PassConfig } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Image from "next/image";

// --- Components ---

// PassDeadlineDisplay Component (replaces CountdownTarget for robustness)
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
        <div className="flex flex-col items-center bg-black/80 border border-pramana-gold/30 px-3 py-1.5 rounded min-w-[3.5rem]">
            <span className="text-sm font-cinzel font-bold text-pramana-gold">{val.toString().padStart(2, '0')}</span>
            <span className="text-[9px] text-pramana-gold/50 uppercase tracking-wider">{label}</span>
        </div>
    );

    if (isExpired) {
        return (
            <div className="mt-2 text-center md:text-left">
                <span className="text-[10px] font-bold uppercase tracking-widest text-red-500/70 block mb-1">Pass Closed</span>
                <div className="flex gap-2 justify-center md:justify-start">
                    <TimeBox val={0} label="Day" />
                    <TimeBox val={0} label="Hr" />
                    <TimeBox val={0} label="Min" />
                    <TimeBox val={0} label="Sec" />
                </div>
            </div>
        );
    }

    if (!timeLeft) return null;

    return (
        <div className="mt-2 text-center md:text-left">
            <span className="text-[10px] font-bold uppercase tracking-widest text-red-500 block mb-1">Ends In</span>
            <div className="flex gap-2 justify-center md:justify-start">
                <TimeBox val={timeLeft.d} label="Day" />
                <TimeBox val={timeLeft.h} label="Hr" />
                <TimeBox val={timeLeft.m} label="Min" />
                <TimeBox val={timeLeft.s} label="Sec" />
            </div>
        </div>
    );
};

// --- Main Page ---

export default function TicketsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [passes, setPasses] = useState<(PassConfig | any)[]>([]);
    const [hasPass, setHasPass] = useState(false);
    const [now, setNow] = useState(new Date());
    const [filter, setFilter] = useState<'all' | 'gitam' | 'non-gitam'>('all');

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (!loading) {
            const fetchAllPasses = async () => {
                try {
                    const qPasses = query(collection(db, "passes_config"));
                    const snapPasses = await getDocs(qPasses);
                    const standardPasses = snapPasses.docs.map(d => ({ ...d.data(), id: d.id, isBulk: false })) as unknown as PassConfig[];

                    const qBulk = query(collection(db, "bulk_pass_configs"));
                    const snapBulk = await getDocs(qBulk);
                    const bulkPasses = snapBulk.docs.map(d => ({ ...d.data(), id: d.id, isBulk: true, category: 'all' })) as unknown as PassConfig[];

                    const all = [...standardPasses.filter(p => p.active !== false), ...bulkPasses.filter(p => (p as any).status !== 'inactive')];
                    setPasses(all);
                } catch (error) {
                    console.error("Error fetching passes:", error);
                }
            };
            const checkExistingPass = async () => {
                if (user) {
                    const q = query(collection(db, "passes_issued"), where("issuedToEmail", "==", user.email));
                    const snap = await getDocs(q);
                    const qBulk = query(collection(db, "bulk_pass_requests"), where("mainUserEmail", "==", user.email), where("status", "==", "pending"));
                    const snapBulk = await getDocs(qBulk);
                    setHasPass(!snap.empty || !snapBulk.empty);
                }
            };
            fetchAllPasses();
            checkExistingPass();
        }
    }, [loading, user]);

    useEffect(() => {
        if (hasPass) router.push("/dashboard");
    }, [hasPass, router]);

    const handleBuy = (pass: PassConfig | any) => {
        if (!user) return router.push("/login?redirect=/tickets");
        if (hasPass) return alert("You already have a pass or pending request!");
        if (pass.isBulk) {
            if (pass.status !== 'active') return;
            router.push(`/bulk-checkout?id=${pass.id}`);
            return;
        }
        if (pass.scheduleEnabled) {
            const now = new Date();
            const liveDate = pass.liveDate ? new Date(pass.liveDate) : null;
            const isLive = liveDate ? now >= liveDate : true;
            if (pass.status !== 'available') {
                if (pass.status === 'coming_soon' && isLive) { /* allow */ } else { return; }
            }
            if (pass.liveDate && now < new Date(pass.liveDate)) return alert("This pass is not yet live.");
            if (pass.endDate && now > new Date(pass.endDate)) return alert("This pass has expired.");
        } else {
            if (pass.status !== 'available') return;
        }
        if (pass.category === 'gitam' && !user.isGitamite) return alert("This pass is exclusive for Gitamites.");
        if (pass.category === 'non-gitam' && user.isGitamite) return alert("This pass is valid for Non-Gitamites only.");
        router.push(`/checkout?passId=${pass.id}`);
    };

    const { loading: authLoading } = useAuth();
    if (authLoading || loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-pramana-gold">
            <div className="flex flex-col items-center gap-6">
                <div className="h-16 w-16 border-2 border-pramana-gold/30 border-t-pramana-gold rounded-full animate-spin"></div>
            </div>
        </div>
    );

    const filteredPasses = passes.filter(p => {
        if (!p.isBulk && !p.active) return false;
        if (p.isBulk && p.status === 'inactive') return false;
        const cat = p.category || 'all';
        if (filter !== 'all' && cat !== 'all' && cat !== filter) return false;
        if (user && !(user.role === 'admin' || user.role === 'superadmin')) {
            if (cat === 'gitam' && !user.isGitamite) return false;
            if (cat === 'non-gitam' && user.isGitamite) return false;
        }
        return true;
    });

    return (
        <div className="flex min-h-screen bg-black text-pramana-cream selection:bg-pramana-gold selection:text-black overflow-x-hidden font-playfair relative">

            {/* Mascot Background Integration */}
            <div className="fixed bottom-0 right-0 z-0 pointer-events-none opacity-20 w-[300px] h-[300px] md:w-[600px] md:h-[600px]">
                <Image
                    src="/royal_mascot_v3.png"
                    alt="Mascot"
                    fill
                    className="object-contain object-bottom-right"
                />
            </div>

            {/* Elegant Background */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_center,rgba(184,134,11,0.08),transparent_70%)]"></div>
            </div>

            <main className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-12 relative z-10">

                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-center md:items-end gap-10 mb-16 animate-fade-in-down border-b border-pramana-gold/10 pb-8">
                    <div className="flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                        {/* Logo */}
                        <div className="relative w-24 h-24 md:w-32 md:h-32 flex-shrink-0">
                            <Image
                                src="/pramana-logo.png"
                                alt="Pramana Logo"
                                fill
                                className="object-contain drop-shadow-[0_0_15px_rgba(184,134,11,0.3)]"
                            />
                        </div>

                        <div>
                            <div className="inline-flex items-center gap-2 mb-2 px-3 py-1 rounded-full bg-pramana-gold/10 border border-pramana-gold/20 mx-auto md:mx-0">
                                <div className="w-1.5 h-1.5 rounded-full bg-pramana-gold animate-pulse"></div>
                                <span className="text-[10px] font-bold tracking-widest uppercase text-pramana-gold">Official Access</span>
                            </div>
                            <h1 className="text-4xl md:text-6xl font-cinzel font-bold text-pramana-gold mb-2 drop-shadow-lg">
                                SECURE ACCESS
                            </h1>
                            <p className="text-pramana-cream/60 font-playfair text-lg max-w-xl leading-relaxed mx-auto md:mx-0">
                                Choose your royal entry. Experience the legacy.
                            </p>
                        </div>
                    </div>

                    {/* Minimalist Filters */}
                    {(user?.role === 'admin' || user?.role === 'superadmin') && (
                        <div className="flex bg-black border border-pramana-gold/20 rounded-full p-1 mx-auto md:mx-0">
                            {['all', 'gitam', 'non-gitam'].map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setFilter(cat as 'all' | 'gitam' | 'non-gitam')}
                                    className={`px-6 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${filter === cat
                                        ? 'bg-pramana-gold text-black shadow-[0_0_15px_rgba(184,134,11,0.4)]'
                                        : 'text-pramana-gold/50 hover:text-pramana-gold hover:bg-pramana-gold/10'
                                        }`}
                                >
                                    {cat === 'all' ? 'All' : cat}
                                </button>
                            ))}
                        </div>
                    )}
                </header>

                {/* Grid */}
                {filteredPasses.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-40 border border-pramana-gold/10 bg-black rounded-lg text-center">
                        <div className="w-16 h-16 border border-pramana-gold/30 rounded-full flex items-center justify-center text-pramana-gold mb-4 text-2xl">❖</div>
                        <p className="text-2xl font-cinzel text-pramana-gold mb-2">Access Closed</p>
                        <p className="text-pramana-cream/50">Passes are currently unavailable.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPasses
                            .map(pass => {
                                // Status Logic Extracted for Sorting
                                const liveDate = pass.liveDate ? new Date(pass.liveDate) : null;
                                const endDate = pass.endDate ? new Date(pass.endDate) : null;
                                const isBeforeLive = liveDate ? now < liveDate : false;
                                const isAfterEnd = endDate ? now > endDate : false;

                                let isSoldOut = false;
                                let isComingSoon = false;
                                let isAvailable = true;

                                if (pass.isBulk) {
                                    let effectiveStatus = pass.status;
                                    if (pass.scheduleEnabled && pass.status === 'coming_soon' && liveDate && !isBeforeLive) effectiveStatus = 'active';

                                    isComingSoon = effectiveStatus === 'coming_soon' || (pass.scheduleEnabled && isBeforeLive);
                                    isSoldOut = effectiveStatus === 'closed' || (pass.scheduleEnabled && isAfterEnd);
                                    isAvailable = effectiveStatus === 'active' && !isComingSoon && !isSoldOut;
                                } else {
                                    let effectiveStatus = pass.status;
                                    if (pass.scheduleEnabled && pass.status === 'coming_soon' && liveDate && !isBeforeLive) effectiveStatus = 'available';

                                    isSoldOut = effectiveStatus === 'sold_out' || (pass.limit > 0 && pass.sold >= pass.limit) || (pass.scheduleEnabled && isAfterEnd);
                                    isComingSoon = effectiveStatus === 'coming_soon' || (pass.scheduleEnabled && isBeforeLive);
                                    isAvailable = effectiveStatus === 'available' && !isSoldOut && !isComingSoon;
                                }

                                // Assign Sort Weight
                                let sortWeight = 3; // Default (Sold Out)
                                if (isAvailable) sortWeight = 1;
                                else if (isComingSoon) sortWeight = 2;

                                return { ...pass, isAvailable, isSoldOut, isComingSoon, sortWeight };
                            })
                            .sort((a, b) => {
                                // Primary Sort: Status Priority
                                if (a.sortWeight !== b.sortWeight) return a.sortWeight - b.sortWeight;

                                // Secondary Sort: Explicit Order
                                const orderA = a.order !== undefined ? a.order : 999;
                                const orderB = b.order !== undefined ? b.order : 999;
                                return orderA - orderB;
                            })
                            .map((pass, idx) => {
                                const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).replace(',', '');
                                const isBulk = pass.isBulk;
                                const { isAvailable, isSoldOut, isComingSoon } = pass;

                                let buttonText = "Sold Out";
                                if (hasPass) buttonText = "Purchased";
                                else if (isComingSoon) buttonText = "Coming Soon";
                                else if (isAvailable) buttonText = "Acquire Pass";

                                // Discount Calculation
                                let discountPercent = 0;
                                if (isBulk && pass.costPrice > pass.price) {
                                    discountPercent = Math.round(((pass.costPrice - pass.price) / pass.costPrice) * 100);
                                }

                                return (
                                    <div key={pass.id}
                                        className="group relative h-full flex flex-col transition-all duration-500 hover:-translate-y-2"
                                        style={{ animationDelay: `${idx * 100}ms` }}
                                    >
                                        <div className="relative h-full bg-black/20 backdrop-blur-sm border border-pramana-gold/20 hover:border-pramana-gold/60 rounded-xl p-8 flex flex-col shadow-[0_10px_30px_-10px_rgba(0,0,0,0.8)] hover:shadow-[0_10px_40px_-10px_rgba(184,134,11,0.15)] transition-all duration-500 overflow-hidden">

                                            {/* Decorative Corner */}
                                            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-pramana-gold/10 to-transparent pointer-events-none"></div>
                                            <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-pramana-gold/40"></div>

                                            {/* Discount Badge - BIG & PROMINENT */}
                                            {discountPercent > 0 && (
                                                <div className="absolute top-6 right-6 z-20 transform rotate-12 group-hover:rotate-0 transition-transform duration-300">
                                                    <div className="bg-gradient-to-br from-red-600 to-red-900 text-white font-cinzel font-bold px-4 py-2 rounded shadow-[0_0_20px_rgba(220,38,38,0.6)] border border-red-500/50 flex flex-col items-center justify-center animate-pulse">
                                                        <span className="text-[10px] uppercase tracking-widest opacity-80 leading-none mb-1">Save</span>
                                                        <span className="text-3xl leading-none">{discountPercent}%</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Header */}
                                            <div className="relative z-10 mb-8">
                                                <div className="flex flex-col items-start gap-4 mb-6">
                                                    <div className="flex flex-wrap gap-2">
                                                        <div className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${pass.category === 'gitam' ? 'bg-blue-900/20 text-blue-400 border-blue-500/30' :
                                                            pass.category === 'non-gitam' ? 'bg-purple-900/20 text-purple-400 border-purple-500/30' :
                                                                'bg-pramana-gold/10 text-pramana-gold border-pramana-gold/30'
                                                            }`}>
                                                            {pass.category || 'General'}
                                                        </div>
                                                        {/* Overlap Fix: Moved tags here */}
                                                        {isBulk && <span className="px-3 py-1 rounded bg-pramana-gold text-black text-[10px] font-bold uppercase tracking-widest">Bulk Pack</span>}
                                                        {!isBulk && pass.type === 'group' && <span className="px-3 py-1 rounded bg-pramana-maroon text-white text-[10px] font-bold uppercase tracking-widest">Group</span>}
                                                    </div>
                                                </div>

                                                <h3 className="text-3xl font-cinzel font-bold text-white mb-2 leading-tight group-hover:text-pramana-gold transition-colors duration-300 drop-shadow-md">
                                                    {pass.name}
                                                </h3>

                                                {/* Status / Timing */}
                                                <div className="min-h-[3rem]">
                                                    {pass.scheduleEnabled && isComingSoon && pass.liveDate && (
                                                        <div className="mt-2 text-center md:text-left">
                                                            <span className="text-[10px] font-bold uppercase tracking-widest text-pramana-gold block mb-1">Unlocks In</span>
                                                            <PassDeadlineDisplay target={pass.liveDate} />
                                                        </div>
                                                    )}
                                                    {pass.scheduleEnabled && !isComingSoon && pass.endDate && (
                                                        <PassDeadlineDisplay target={pass.endDate} />
                                                    )}
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <div className="flex-1 mb-8 relative z-10">
                                                {isBulk ? (
                                                    <div className="p-4 bg-black/40 backdrop-blur-sm rounded border border-pramana-gold/10 hover:border-pramana-gold/30 transition-colors">
                                                        <div className="flex items-baseline gap-2 mb-1">
                                                            <span className="text-2xl font-bold text-pramana-gold">{pass.memberCount}</span>
                                                            <span className="text-xs text-pramana-gold/60 uppercase tracking-widest">Members</span>
                                                        </div>
                                                        <p className="text-sm text-pramana-cream/60 leading-relaxed">Perfect for squads planning to attend together.</p>
                                                    </div>
                                                ) : pass.description ? (
                                                    <p className="text-pramana-cream/80 text-sm leading-7 border-l border-pramana-gold/20 pl-4 font-medium drop-shadow-sm">
                                                        {pass.description}
                                                    </p>
                                                ) : (
                                                    <div className="space-y-3 opacity-10">
                                                        <div className="h-px bg-pramana-gold w-3/4"></div>
                                                        <div className="h-px bg-pramana-gold w-full"></div>
                                                        <div className="h-px bg-pramana-gold w-1/2"></div>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Footer */}
                                            <div className="mt-auto relative z-10">
                                                <div className="flex justify-between items-end mb-6 border-t border-pramana-gold/10 pt-6">
                                                    <div>
                                                        {isBulk && pass.costPrice > pass.price && (
                                                            <span className="block text-sm font-bold text-red-500 line-through mb-1 opacity-70">₹{pass.costPrice}</span>
                                                        )}
                                                        <div className="flex items-baseline gap-1">
                                                            <span className="text-4xl font-cinzel font-bold text-pramana-gold drop-shadow-sm">₹{pass.price}</span>
                                                            <span className="text-xs text-pramana-cream/50 uppercase tracking-widest">/ {isBulk ? 'bundle' : 'person'}</span>
                                                        </div>
                                                    </div>

                                                    {/* Capacity Bar */}
                                                    {!isBulk && pass.showRemaining && !isSoldOut && !isComingSoon && (
                                                        <div className="text-right">
                                                            <div className="text-[10px] font-bold text-pramana-gold uppercase tracking-widest mb-1">
                                                                {Math.round((pass.sold / pass.limit) * 100)}% Claimed
                                                            </div>
                                                            <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                                                                <div className="h-full bg-pramana-gold rounded-full" style={{ width: `${Math.min(100, (pass.sold / pass.limit) * 100)}%` }}></div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <button
                                                    onClick={() => handleBuy(pass)}
                                                    disabled={!isAvailable || (hasPass && !isBulk)}
                                                    className={`w-full py-4 rounded font-cinzel font-bold text-sm tracking-[0.15em] uppercase transition-all duration-300 ${isAvailable && !hasPass
                                                        ? 'bg-pramana-gold text-black hover:bg-white cursor-pointer shadow-[0_0_20px_rgba(184,134,11,0.2)]'
                                                        : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
                                                        }`}
                                                >
                                                    {buttonText}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                    </div>
                )}
            </main>
        </div>
    );
}
