
"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { PassConfig } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

export default function TicketsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [passes, setPasses] = useState<(PassConfig | any)[]>([]); // Mixed types
    const [hasPass, setHasPass] = useState(false);

    // Filter State
    const [filter, setFilter] = useState<'all' | 'gitam' | 'non-gitam'>('all');

    useEffect(() => {
        if (!loading) {
            const fetchAllPasses = async () => {
                try {
                    // 1. Standard Passes
                    const qPasses = query(collection(db, "passes_config"));
                    const snapPasses = await getDocs(qPasses);
                    const standardPasses = snapPasses.docs.map(d => ({ ...d.data(), id: d.id, isBulk: false })) as unknown as PassConfig[];

                    // 2. Bulk Passes
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
                    // Check individual pass
                    const q = query(collection(db, "passes_issued"), where("issuedToEmail", "==", user.email));
                    const snap = await getDocs(q);

                    // Also check if they have a PENDING bulk request (optional, but good UX)
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
        if (hasPass) {
            // router.push("/dashboard"); 
            // Commenting out auto-redirect to allow browsing even if they have a pass (maybe buying for others? Though standard logic says 1 pass per user).
            // Actually, requirements often state 1 pass per user. 
            // Re-enabling redirect if strictly enforced, but usually better to show "Purchased" button.
            // keeping existing logic:
            router.push("/dashboard");
        }
    }, [hasPass, router]);

    const handleBuy = (pass: PassConfig | any) => {
        if (!user) return router.push("/login?redirect=/tickets");
        if (hasPass) return alert("You already have a pass or pending request!");

        if (pass.isBulk) {
            if (pass.status !== 'active') return;
            router.push(`/bulk-checkout?id=${pass.id}`);
            return;
        }

        if (pass.status !== 'available') return;

        // Basic Category Check
        if (pass.category === 'gitam' && !user.isGitamite) return alert("This pass is exclusive for Gitamites.");
        if (pass.category === 'non-gitam' && user.isGitamite) return alert("This pass is valid for Non-Gitamites only.");

        router.push(`/checkout?passId=${pass.id}`);
    };

    // Combined loading state for initial render
    const { loading: authLoading } = useAuth();
    if (authLoading || loading) return (
        <div className="min-h-screen flex items-center justify-center bg-black text-pramana-gold">
            <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-10 w-10 border-2 border-pramana-gold border-t-transparent rounded-full font-cinzel"></div>
                <div className="text-xs font-cinzel tracking-[0.2em] animate-pulse">LOADING ACCESS PROTOCOL...</div>
            </div>
        </div>
    );

    const filteredPasses = passes.filter(p => {
        // Status checks
        if (!p.isBulk && !p.active) return false;
        if (p.isBulk && p.status === 'inactive') return false;
        // Show closed and coming_soon for visibility

        // Apply UI Filter
        // Bulk passes usually 'all' or specific? Let's assume 'all' for now unless specific property added.
        // If filter is 'gitam', show gitam passes + bulk (if valid)? 
        // Let's treat bulk as 'all' category for now.
        const cat = p.category || 'all';
        if (filter !== 'all' && cat !== 'all' && cat !== filter) return false;

        if (user && !(user.role === 'admin' || user.role === 'superadmin')) {
            if (cat === 'gitam' && !user.isGitamite) return false;
            // if (cat === 'non-gitam' && user.isGitamite) return false; // Non-gitam usually buyable by anyone? Or strictly non-gitam? 
            // Existing logic enforced strictness.
            if (cat === 'non-gitam' && user.isGitamite) return false;
        }

        return true;
    });

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <main className="admin-page-container">
                <div className="admin-content-wrapper">

                    {/* Header Section */}
                    <header className="flex flex-col md:flex-row justify-between items-end gap-6 border-b border-white/10 pb-8 animate-stagger-1 text-center md:text-left">
                        <div>
                            <p className="text-pramana-gold font-bold tracking-widest text-xs uppercase mb-2">Exclusive Access</p>
                            <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold via-white to-pramana-gold neon-text-gold">
                                Secure Your Access
                            </h1>
                            <p className="text-pramana-cream/60 mt-2 font-playfair text-lg max-w-2xl">
                                Choose the pass that suits your journey. Experience PRAMANA26 like never before.
                            </p>
                        </div>

                        {/* Filters (Admin Only) */}
                        {(user?.role === 'admin' || user?.role === 'superadmin') && (
                            <div className="flex bg-white/5 rounded-full p-1 border border-white/10">
                                {['all', 'gitam', 'non-gitam'].map((cat) => (
                                    <button
                                        key={cat}
                                        onClick={() => setFilter(cat as 'all' | 'gitam' | 'non-gitam')}
                                        className={`px-4 py-2 rounded-full text-xs font-bold tracking-widest uppercase transition-all duration-300 ${filter === cat
                                            ? 'bg-pramana-gold text-black shadow-lg'
                                            : 'text-pramana-cream/50 hover:text-white'
                                            }`}
                                    >
                                        {cat === 'all' ? 'All' : cat}
                                    </button>
                                ))}
                            </div>
                        )}
                    </header>

                    {/* Passes Grid */}
                    <div className="animate-stagger-2">
                        {filteredPasses.length === 0 ? (
                            <div className="text-center py-20 text-pramana-cream/50">
                                <p className="text-xl font-cinzel">No passes available at this time.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {filteredPasses.map(pass => {
                                    // Logic Split
                                    const isBulk = pass.isBulk;

                                    let isSoldOut = false;
                                    let isComingSoon = false;
                                    let isAvailable = true;

                                    if (isBulk) {
                                        isComingSoon = pass.status === 'coming_soon';
                                        isAvailable = pass.status === 'active';
                                        isSoldOut = pass.status === 'closed';
                                    } else {
                                        isSoldOut = pass.status === 'sold_out' || (pass.limit > 0 && pass.sold >= pass.limit);
                                        isComingSoon = pass.status === 'coming_soon';
                                        isAvailable = pass.status === 'available' && !isSoldOut;
                                    }

                                    let buttonText = "SOLD OUT";
                                    if (hasPass) buttonText = "PURCHASED";
                                    else if (isComingSoon) buttonText = "COMING SOON";
                                    else if (isAvailable) buttonText = isBulk ? "GET BUNDLE" : "ACQUIRE PASS";

                                    return (
                                        <div key={pass.id} className="glass-panel group relative rounded-3xl overflow-hidden hover:border-pramana-gold/40 transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)]">

                                            <div className="absolute top-0 right-0 w-32 h-32 bg-pramana-gold/5 rounded-full blur-[50px] pointer-events-none group-hover:bg-pramana-gold/10 transition-colors"></div>

                                            {/* Badge */}
                                            {isBulk && (
                                                <div className="absolute top-0 right-0 bg-gradient-to-l from-pramana-gold to-yellow-600 text-black font-bold text-[10px] px-4 py-1 rounded-bl-xl shadow-lg z-20">
                                                    BULK OFFER
                                                </div>
                                            )}

                                            <div className="p-8 relative z-10 flex flex-col h-full">
                                                <div className="flex justify-between items-start mb-6">
                                                    <div className={`text-xs font-bold px-3 py-1 rounded uppercase tracking-wider border ${pass.category === 'gitam' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : pass.category === 'non-gitam' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-white/10 text-white/60 border-white/20'}`}>
                                                        {pass.category || 'Standard'}
                                                    </div>
                                                    {!isBulk && pass.type === 'group' && (
                                                        <div className="bg-pramana-maroon/20 border border-pramana-maroon/40 text-pramana-maroon text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                                                            Group
                                                        </div>
                                                    )}
                                                </div>

                                                <h3 className="text-3xl font-cinzel font-bold text-white mb-2 group-hover:text-pramana-gold transition-colors">{pass.name}</h3>

                                                {isBulk ? (
                                                    <div className="mb-6 space-y-2">
                                                        <p className="text-white/80 font-bold border-l-2 border-pramana-gold pl-3">{pass.memberCount} Members Access</p>
                                                        <p className="text-xs text-pramana-cream/50 pl-3">Perfect for squads.</p>
                                                    </div>
                                                ) : (
                                                    <p className="text-white/60 text-sm mb-6 line-clamp-2 leading-relaxed">{pass.description}</p>
                                                )}

                                                <div className="mt-auto pt-6 border-t border-white/5">
                                                    <div className="flex flex-col mb-6">
                                                        {isBulk && pass.costPrice > pass.price && (
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <span className="text-lg text-white/50 line-through decoration-red-500/50 decoration-2">₹{pass.costPrice}</span>
                                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                                                    Save {Math.round(((pass.costPrice - pass.price) / pass.costPrice) * 100)}%
                                                                </span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-4xl font-cinzel font-bold text-pramana-gold">₹{pass.price}</span>
                                                            {!isBulk && <span className="text-xs text-white/40 uppercase tracking-widest">/ Person</span>}
                                                            {isBulk && <span className="text-xs text-white/40 uppercase tracking-widest">/ Bundle</span>}
                                                        </div>
                                                    </div>

                                                    {!isBulk && pass.showRemaining && (
                                                        <div className="mb-6">
                                                            <div className="flex justify-between text-[10px] text-white/40 mb-2 uppercase tracking-widest font-bold">
                                                                <span>Availability</span>
                                                                <span>{pass.limit - pass.sold} / {pass.limit}</span>
                                                            </div>
                                                            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                                                <div
                                                                    className="h-full bg-gradient-to-r from-pramana-gold to-white"
                                                                    style={{ width: `${((pass.limit - pass.sold) / pass.limit) * 100}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <button
                                                        onClick={() => handleBuy(pass)}
                                                        disabled={!isAvailable || (hasPass && !isBulk)} // Allow bulk maybe? No, stick to policy.
                                                        className={`w-full py-4 rounded-xl font-cinzel font-bold text-lg tracking-widest transition-all duration-300 relative overflow-hidden group/btn ${isAvailable && !hasPass
                                                            ? 'bg-pramana-gold text-black shadow-[0_0_20px_rgba(184,134,11,0.3)] hover:shadow-[0_0_40px_rgba(184,134,11,0.5)]'
                                                            : 'bg-white/10 text-white/20 cursor-not-allowed'
                                                            }`}
                                                    >
                                                        <span className="relative z-10">{buttonText}</span>
                                                        {isAvailable && !hasPass && (
                                                            <div className="absolute inset-0 bg-white/30 transform -skew-x-12 translate-x-[-150%] group-hover/btn:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
