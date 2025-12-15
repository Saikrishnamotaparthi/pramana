
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
    const [passes, setPasses] = useState<PassConfig[]>([]);
    const [hasPass, setHasPass] = useState(false);

    // Admin Preview State
    // Filter State
    const [filter, setFilter] = useState<'all' | 'gitam' | 'non-gitam'>('all');

    useEffect(() => {
        if (!loading) {
            const fetchPasses = async () => {
                try {
                    const q = query(collection(db, "passes_config"));
                    const snap = await getDocs(q);
                    const data = snap.docs.map(d => ({ ...d.data(), id: d.id })) as PassConfig[];
                    setPasses(data.filter(p => p.active !== false));
                } catch (error) {
                    console.error("Error fetching passes:", error);
                }
            };

            const checkExistingPass = async () => {
                if (user) {
                    const q = query(collection(db, "passes_issued"), where("issuedToEmail", "==", user.email));
                    const snap = await getDocs(q);
                    setHasPass(!snap.empty);
                }
            };

            fetchPasses();
            checkExistingPass();
        }
    }, [loading, user]);

    useEffect(() => {
        if (hasPass) {
            router.push("/dashboard");
        }
    }, [hasPass, router]);

    const handleBuy = (pass: PassConfig) => {
        if (!user) return router.push("/login?redirect=/tickets");
        if (hasPass) return alert("You already have a pass!");
        if (pass.status !== 'available') return;

        // Basic Category Check (Soft check, Hard check in Checkout)
        if (pass.category === 'gitam' && !user.isGitamite) return alert("This pass is exclusive for Gitamites.");
        if (pass.category === 'non-gitam' && user.isGitamite) return alert("This pass is valid for Non-Gitamites only.");

        router.push(`/checkout?passId=${pass.id}`);
    };

    // Combined loading state for initial render
    const { loading: authLoading } = useAuth();
    if (authLoading || loading) return <div className="min-h-screen flex items-center justify-center text-pramana-gold font-cinzel animate-pulse">Loading Access Protocol...</div>;

    const filteredPasses = passes.filter(p => {
        if (!p.active) return false;

        // Admin Preview Logic (implicit in filter now)
        // If user is admin, they can see everything via filter.
        // If user is normal, apply filter AND category check.

        // Apply UI Filter
        if (filter !== 'all' && p.category !== filter) return false;

        if (user && !(user.role === 'admin' || user.role === 'superadmin')) {
            if (p.category === 'gitam' && !user.isGitamite) return false;
            if (p.category === 'non-gitam' && user.isGitamite) return false;
        }

        return true;
    });


    return (
        <div className="min-h-screen p-6 md:p-12 relative overflow-hidden">
            <div className="max-w-7xl mx-auto relative z-10">
                <div className="text-center mb-16">
                    <h1 className="text-5xl md:text-6xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-cream via-pramana-gold to-pramana-cream drop-shadow-lg mb-4">
                        Secure Your Access
                    </h1>
                    <p className="text-xl text-pramana-cream/80 font-playfair max-w-2xl mx-auto">
                        Choose the pass that suits your journey. Experience PRAMANA26 like never before.
                    </p>
                </div>

                {/* Filters (Admin Only) */}
                {(user?.role === 'admin' || user?.role === 'superadmin') && (
                    <div className="flex justify-center mb-12 gap-4">
                        {['all', 'gitam', 'non-gitam'].map((cat) => (
                            <button
                                key={cat}
                                onClick={() => setFilter(cat as 'all' | 'gitam' | 'non-gitam')}
                                className={`px-8 py-3 rounded-full font-cinzel font-bold tracking-widest transition-all duration-300 border border-pramana-gold/50 ${filter === cat
                                    ? 'bg-pramana-gold text-black shadow-[0_0_20px_rgba(184,134,11,0.4)] scale-105'
                                    : 'bg-transparent text-pramana-gold hover:bg-pramana-gold/10'
                                    }`}
                            >
                                {cat === 'all' ? 'ALL PASSES' : cat.toUpperCase()}
                            </button>
                        ))}
                    </div>
                )}

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-pramana-gold"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredPasses.map(pass => {
                            const isSoldOut = pass.status === 'sold_out' || (pass.limit > 0 && pass.sold >= pass.limit);
                            const isComingSoon = pass.status === 'coming_soon';
                            const isAvailable = pass.status === 'available' && !isSoldOut;

                            let buttonText = "SOLD OUT";
                            if (hasPass) buttonText = "PURCHASED";
                            else if (isComingSoon) buttonText = "COMING SOON";
                            else if (isAvailable) buttonText = "ACQUIRE PASS";

                            return (
                                <div key={pass.id} className="group relative bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 overflow-hidden hover:border-pramana-gold/50 transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl">
                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 pointer-events-none"></div>

                                    <div className="p-8 relative z-10 flex flex-col h-full">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-pramana-gold text-black text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                                                {pass.category}
                                            </div>
                                            {pass.type === 'group' && (
                                                <div className="bg-pramana-maroon text-white text-xs font-bold px-3 py-1 rounded uppercase tracking-wider">
                                                    Group
                                                </div>
                                            )}
                                        </div>

                                        <h3 className="text-3xl font-cinzel font-bold text-pramana-cream mb-2 group-hover:text-pramana-gold transition-colors">{pass.name}</h3>
                                        <p className="text-pramana-cream/60 text-sm mb-6 line-clamp-2">{pass.description}</p>

                                        <div className="mt-auto">
                                            <div className="flex items-baseline mb-8">
                                                <span className="text-5xl font-playfair font-bold text-pramana-gold">₹{pass.price}</span>
                                            </div>

                                            {pass.showRemaining && (
                                                <div className="mb-6">
                                                    <div className="flex justify-between text-xs text-pramana-cream/60 mb-2 uppercase tracking-widest font-bold">
                                                        <span>Availability</span>
                                                        <span>{pass.limit - pass.sold} / {pass.limit}</span>
                                                    </div>
                                                    <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-pramana-gold"
                                                            style={{ width: `${((pass.limit - pass.sold) / pass.limit) * 100}%` }}
                                                        ></div>
                                                    </div>
                                                </div>
                                            )}

                                            <button
                                                onClick={() => handleBuy(pass)}
                                                disabled={!isAvailable || hasPass}
                                                className={`w-full py-4 rounded-xl font-cinzel font-bold text-lg tracking-widest transition-all duration-300 ${isAvailable && !hasPass
                                                    ? 'bg-gradient-to-r from-pramana-gold to-yellow-600 text-black shadow-lg hover:shadow-pramana-gold/30 hover:brightness-110'
                                                    : 'bg-white/10 text-white/30 cursor-not-allowed'
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
            </div>
        </div>
    );
}
