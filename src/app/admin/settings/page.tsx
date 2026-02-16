"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { Loader2, Save, Link as LinkIcon, AlertCircle, CheckCircle } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminSettingsPage() {
    const [links, setLinks] = useState<any>({
        "natya-rasa": "",
        "off-the-record": "",
        "raw-and-real": "",
        "natya-rasa-open": true,
        "off-the-record-open": true,
        "raw-and-real-open": true,
        // Limits - initialized as undefined
        "natya-rasa-Solo-limit": undefined,
        "natya-rasa-Crew-limit": undefined,
        "off-the-record-Solo-limit": undefined,
        "off-the-record-Duo/Trio-limit": undefined,
        "off-the-record-Band-limit": undefined,
        "raw-and-real-Solo-limit": undefined,
        "raw-and-real-Crew-limit": undefined
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, "settings", "cultural");
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    setLinks({
                        "natya-rasa": docSnap.data()["natya-rasa"] || "",
                        "off-the-record": docSnap.data()["off-the-record"] || "",
                        "raw-and-real": docSnap.data()["raw-and-real"] || "",
                        "natya-rasa-open": docSnap.data()["natya-rasa-open"] !== false,
                        "off-the-record-open": docSnap.data()["off-the-record-open"] !== false,
                        "raw-and-real-open": docSnap.data()["raw-and-real-open"] !== false,

                        // Limits
                        "natya-rasa-Solo-limit": docSnap.data()["natya-rasa-Solo-limit"],
                        "natya-rasa-Crew-limit": docSnap.data()["natya-rasa-Crew-limit"],
                        "off-the-record-Solo-limit": docSnap.data()["off-the-record-Solo-limit"],
                        "off-the-record-Duo/Trio-limit": docSnap.data()["off-the-record-Duo/Trio-limit"],
                        "off-the-record-Band-limit": docSnap.data()["off-the-record-Band-limit"],
                        "raw-and-real-Solo-limit": docSnap.data()["raw-and-real-Solo-limit"],
                        "raw-and-real-Crew-limit": docSnap.data()["raw-and-real-Crew-limit"],
                    });
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                setMessage({ type: 'error', text: "Failed to load settings." });
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);

        try {
            await setDoc(doc(db, "settings", "cultural"), {
                ...links,
                updatedAt: new Date(),
                updatedBy: auth.currentUser?.email || "unknown"
            }, { merge: true });

            setMessage({ type: 'success', text: "Payment links updated successfully!" });
        } catch (error) {
            console.error("Error saving settings:", error);
            setMessage({ type: 'error', text: "Failed to save settings." });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="mb-10 animate-stagger-1">
                        <h1 className="text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">
                            Settings
                        </h1>
                        <p className="text-pramana-cream/60 mt-2 font-light">
                            Manage global configurations
                        </p>
                    </header>

                    <div className="bg-[#111] border border-white/10 rounded-xl p-8 max-w-2xl animate-stagger-2 shadow-2xl">
                        <h2 className="text-xl font-cinzel text-white mb-6 flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-pramana-gold" />
                            Cultural Settings
                        </h2>

                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="animate-spin text-pramana-gold" />
                            </div>
                        ) : (
                            <form onSubmit={handleSave} className="space-y-6">
                                <div className="space-y-4">
                                    <h3 className="text-lg text-pramana-gold font-bold">WhatsApp Group Links</h3>
                                    <div className="space-y-2">
                                        <label className="text-sm uppercase tracking-widest text-pramana-gold/80 font-bold">
                                            Natya Rasa
                                        </label>
                                        <input
                                            type="url"
                                            value={links["natya-rasa"]}
                                            onChange={(e) => setLinks({ ...links, "natya-rasa": e.target.value })}
                                            placeholder="https://chat.whatsapp.com/..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:border-pramana-gold focus:outline-none focus:ring-1 focus:ring-pramana-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm uppercase tracking-widest text-pramana-gold/80 font-bold">
                                            Off The Record
                                        </label>
                                        <input
                                            type="url"
                                            value={links["off-the-record"]}
                                            onChange={(e) => setLinks({ ...links, "off-the-record": e.target.value })}
                                            placeholder="https://chat.whatsapp.com/..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:border-pramana-gold focus:outline-none focus:ring-1 focus:ring-pramana-gold transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm uppercase tracking-widest text-pramana-gold/80 font-bold">
                                            Raw & Real
                                        </label>
                                        <input
                                            type="url"
                                            value={links["raw-and-real"]}
                                            onChange={(e) => setLinks({ ...links, "raw-and-real": e.target.value })}
                                            placeholder="https://chat.whatsapp.com/..."
                                            className="w-full bg-white/5 border border-white/10 rounded-lg p-4 text-white focus:border-pramana-gold focus:outline-none focus:ring-1 focus:ring-pramana-gold transition-all"
                                        />
                                    </div>
                                </div>

                                {/* Registration Status Section */}
                                <div className="space-y-4 border-t border-white/10 pt-6">
                                    <h3 className="text-lg text-pramana-gold font-bold">Registration Settings</h3>

                                    {/* Natya Rasa */}
                                    <div className="bg-white/5 p-4 rounded-lg space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white text-lg">Natya Rasa</span>
                                            <button
                                                type="button"
                                                onClick={() => setLinks({ ...links, "natya-rasa-open": !links["natya-rasa-open"] })}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${links["natya-rasa-open"] !== false ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                    }`}
                                            >
                                                {links["natya-rasa-open"] !== false ? "Open" : "Closed"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Solo Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["natya-rasa-Solo-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "natya-rasa-Solo-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Crew Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["natya-rasa-Crew-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "natya-rasa-Crew-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Off The Record */}
                                    <div className="bg-white/5 p-4 rounded-lg space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white text-lg">Off The Record</span>
                                            <button
                                                type="button"
                                                onClick={() => setLinks({ ...links, "off-the-record-open": !links["off-the-record-open"] })}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${links["off-the-record-open"] !== false ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                    }`}
                                            >
                                                {links["off-the-record-open"] !== false ? "Open" : "Closed"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Solo Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["off-the-record-Solo-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "off-the-record-Solo-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Duo/Trio Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["off-the-record-Duo/Trio-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "off-the-record-Duo/Trio-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Band Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["off-the-record-Band-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "off-the-record-Band-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Raw & Real */}
                                    <div className="bg-white/5 p-4 rounded-lg space-y-4">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-white text-lg">Raw & Real</span>
                                            <button
                                                type="button"
                                                onClick={() => setLinks({ ...links, "raw-and-real-open": !links["raw-and-real-open"] })}
                                                className={`px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${links["raw-and-real-open"] !== false ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
                                                    }`}
                                            >
                                                {links["raw-and-real-open"] !== false ? "Open" : "Closed"}
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Solo Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["raw-and-real-Solo-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "raw-and-real-Solo-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs uppercase text-pramana-gold">Crew Limit</label>
                                                <input
                                                    type="number"
                                                    value={links["raw-and-real-Crew-limit"] || ""}
                                                    onChange={(e) => setLinks({ ...links, "raw-and-real-Crew-limit": parseInt(e.target.value) || 0 })}
                                                    placeholder="Unlimited"
                                                    className="w-full bg-black/20 border border-white/10 rounded p-2 text-white text-sm"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {message && (
                                    <div className={`p-4 rounded-lg flex items-center gap-2 text-sm font-bold ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                        }`}>
                                        {message.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                                        {message.text}
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="px-8 py-3 bg-pramana-gold text-black font-cinzel font-bold rounded-lg hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {saving ? "Saving..." : "Save Settings"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
