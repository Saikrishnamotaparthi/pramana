"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminSettingsPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [saving, setSaving] = useState(false);

    const [platformFeeGitam, setPlatformFeeGitam] = useState(0);
    const [platformFeePublic, setPlatformFeePublic] = useState(0);

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'superadmin'))) {
            router.push("/");
            return;
        }

        const fetchSettings = async () => {
            const { doc, getDoc } = await import("firebase/firestore");
            const { db } = await import("@/lib/firebase");
            try {
                const settingsRef = doc(db, "config", "fees");
                const snap = await getDoc(settingsRef);
                if (snap.exists()) {
                    const d = snap.data();
                    setPlatformFeeGitam(d.platformFeeGitam || 0);
                    setPlatformFeePublic(d.platformFeePublic || 0);
                }
            } catch (error) {
                console.error("Error fetching settings", error);
            }
        };

        if (user) fetchSettings();
    }, [user, loading, router]);

    const handleSave = async () => {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        if (!confirm("Save Settings?")) return;

        setSaving(true);
        try {
            await setDoc(doc(db, "config", "fees"), {
                platformFeeGitam: Number(platformFeeGitam),
                platformFeePublic: Number(platformFeePublic)
            }, { merge: true });
            alert("Settings Saved!");
        } catch (error) {
            console.error("Error saving settings", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    if (loading || !user) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <AdminSidebar />

            <main className="flex-1 p-8 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                <h1 className="text-3xl font-bold mb-8 font-cinzel text-pramana-gold">Global Settings</h1>

                <div className="bg-white/5 p-8 rounded-2xl shadow-xl border border-white/10 max-w-2xl backdrop-blur-md">
                    <h2 className="text-xl font-bold mb-6 font-cinzel text-pramana-cream border-b border-white/10 pb-4">Platform Fees</h2>

                    <div className="mb-6">
                        <label className="block text-sm font-bold mb-2 text-pramana-gold">Platform Fee (Gitamite)</label>
                        <div className="flex items-center group">
                            <span className="p-3 bg-black/40 border border-r-0 border-white/20 rounded-l text-pramana-gold font-serif text-lg">₹</span>
                            <input
                                type="number"
                                value={platformFeeGitam}
                                onChange={e => setPlatformFeeGitam(Number(e.target.value))}
                                className="w-full p-3 bg-black/40 border border-white/20 rounded-r focus:outline-none focus:border-pramana-gold text-white font-mono text-lg transition"
                            />
                        </div>
                        <p className="text-xs text-pramana-cream/50 mt-2 font-sans">Fee added to Gitamite purchases.</p>
                    </div>

                    <div className="mb-8">
                        <label className="block text-sm font-bold mb-2 text-pramana-gold">Platform Fee (Non-Gitamite)</label>
                        <div className="flex items-center group">
                            <span className="p-3 bg-black/40 border border-r-0 border-white/20 rounded-l text-pramana-gold font-serif text-lg">₹</span>
                            <input
                                type="number"
                                value={platformFeePublic}
                                onChange={e => setPlatformFeePublic(Number(e.target.value))}
                                className="w-full p-3 bg-black/40 border border-white/20 rounded-r focus:outline-none focus:border-pramana-gold text-white font-mono text-lg transition"
                            />
                        </div>
                        <p className="text-xs text-pramana-cream/50 mt-2 font-sans">Fee added to Public purchases.</p>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full bg-pramana-gold text-black px-6 py-4 rounded-xl font-bold hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition shadow-lg shadow-yellow-900/20 text-lg font-cinzel tracking-wide"
                    >
                        {saving ? "Saving..." : "Save Settings"}
                    </button>
                </div>
            </main>
        </div>
    );
}
