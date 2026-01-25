"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, query, orderBy, deleteDoc, doc, updateDoc, setDoc } from "firebase/firestore";
import { Trash2, UserPlus, RefreshCw, Copy, Check, Search, Phone, Mail, Award, Ticket } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";

interface ReferralCode {
    id: string;
    code: string;
    influencerName: string;
    influencerEmail: string;
    influencerPhone: string;
    registrations: number;
    passesIssued: number;
    createdAt: any;
}

export default function ReferralAdminPage() {
    const [referrals, setReferrals] = useState<ReferralCode[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [copied, setCopied] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        influencerName: "",
        influencerEmail: "",
        influencerPhone: "",
        code: ""
    });

    const fetchReferrals = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, "referral_codes"), orderBy("createdAt", "desc"));
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ReferralCode[];
            setReferrals(data);
        } catch (error) {
            console.error("Error fetching referrals", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReferrals();
    }, []);

    const generateCode = () => {
        if (!formData.influencerName) return;
        const namePart = formData.influencerName.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
        const randomPart = Math.floor(1000 + Math.random() * 9000);
        setFormData(prev => ({ ...prev, code: `PRAMANA${namePart}${randomPart}` }));
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            if (referrals.some(r => r.code === formData.code)) {
                alert("Code already exists! Please choose another.");
                setSubmitting(false);
                return;
            }

            await setDoc(doc(db, "referral_codes", formData.code), {
                ...formData,
                registrations: 0,
                passesIssued: 0,
                createdAt: new Date().toISOString()
            });

            setFormData({ influencerName: "", influencerEmail: "", influencerPhone: "", code: "" });
            fetchReferrals();
        } catch (error) {
            console.error("Error creating referral", error);
            alert("Failed to create referral code");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this code?")) return;
        try {
            await deleteDoc(doc(db, "referral_codes", id));
            setReferrals(prev => prev.filter(r => r.id !== id));
        } catch (error) {
            console.error("Error deleting", error);
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setCopied(text);
        setTimeout(() => setCopied(null), 2000);
    };

    // Filter Logic
    const filteredReferrals = referrals.filter(r =>
        r.influencerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.influencerEmail.toLowerCase().includes(searchTerm.toLowerCase())
    );



    // ... existing imports ...

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <div className="flex-1 p-8 pb-32 overflow-y-auto h-screen scrollbar-hide">
                <div className="max-w-7xl mx-auto space-y-12">

                    {/* Header */}
                    <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-6 gap-4">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white">
                                Referral Management
                            </h1>
                            <p className="text-pramana-cream/60 mt-2">Create codes for influencers and track performance.</p>
                        </div>
                        <button
                            onClick={fetchReferrals}
                            className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-pramana-gold transition-colors"
                            title="Refresh Data"
                        >
                            <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Create Form */}
                        <div className="lg:col-span-1">
                            <div className="glass-panel p-8 rounded-2xl border border-white/10 bg-white/5 sticky top-8">
                                <h2 className="text-xl font-cinzel font-bold text-white mb-6 flex items-center gap-2">
                                    <UserPlus className="text-pramana-gold" size={20} />
                                    New Influencer
                                </h2>
                                <form onSubmit={handleCreate} className="space-y-4">
                                    <div>
                                        <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Name</label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.influencerName}
                                            onChange={e => setFormData({ ...formData, influencerName: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-pramana-gold outline-none transition-colors"
                                            placeholder="Influencer Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Email</label>
                                        <input
                                            type="email"
                                            required
                                            value={formData.influencerEmail}
                                            onChange={e => setFormData({ ...formData, influencerEmail: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-pramana-gold outline-none transition-colors"
                                            placeholder="email@example.com"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Phone</label>
                                        <input
                                            type="tel"
                                            required
                                            value={formData.influencerPhone}
                                            onChange={e => setFormData({ ...formData, influencerPhone: e.target.value })}
                                            className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-pramana-gold outline-none transition-colors"
                                            placeholder="+91 99999 99999"
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Referral Code</label>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                required
                                                value={formData.code}
                                                onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })}
                                                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white font-mono tracking-wider focus:border-pramana-gold outline-none transition-colors"
                                                placeholder="CODE123"
                                            />
                                            <button
                                                type="button"
                                                onClick={generateCode}
                                                className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg hover:bg-white/10 text-xs font-bold uppercase tracking-wider transition-colors"
                                            >
                                                Auto
                                            </button>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={submitting}
                                        className="w-full mt-4 bg-pramana-gold text-black font-bold font-cinzel py-3 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                                    >
                                        {submitting ? "Creating..." : "Create Code"}
                                    </button>
                                </form>
                            </div>
                        </div>

                        {/* Stats & List */}
                        <div className="lg:col-span-2 space-y-8">
                            {/* Overall Stats */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                                    <p className="text-xs uppercase tracking-widest text-pramana-cream/50">Total Registrations</p>
                                    <p className="text-4xl font-bold text-white font-cinzel mt-2">
                                        {referrals.reduce((acc, curr) => acc + (curr.registrations || 0), 0)}
                                    </p>
                                </div>
                                <div className="bg-white/5 border border-white/10 p-6 rounded-xl">
                                    <p className="text-xs uppercase tracking-widest text-pramana-cream/50">Passes Issued</p>
                                    <p className="text-4xl font-bold text-pramana-gold font-cinzel mt-2">
                                        {referrals.reduce((acc, curr) => acc + (curr.passesIssued || 0), 0)}
                                    </p>
                                </div>
                            </div>

                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pramana-cream/40" size={20} />
                                <input
                                    type="text"
                                    placeholder="Search influencer, email, or code..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-white focus:outline-none focus:border-pramana-gold/50 transition-colors"
                                />
                            </div>

                            {/* Cards Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {filteredReferrals.length === 0 ? (
                                    <div className="col-span-full py-12 text-center text-pramana-cream/30 italic rounded-xl border border-white/5 bg-white/[0.02]">
                                        No influencers found matching your search.
                                    </div>
                                ) : (
                                    filteredReferrals.map((ref) => (
                                        <div key={ref.id} className="group relative bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-pramana-gold/30 hover:bg-white/10 transition-all duration-300">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-pramana-gold to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>

                                            <div className="p-6">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="font-bold text-lg text-white font-cinzel group-hover:text-pramana-gold transition-colors">{ref.influencerName}</h3>
                                                        <button
                                                            onClick={() => copyToClipboard(ref.code)}
                                                            className="mt-1 flex items-center gap-2 text-xs font-mono bg-black/40 px-2 py-1 rounded text-pramana-gold/80 hover:text-pramana-gold hover:bg-black/60 transition-colors w-fit"
                                                        >
                                                            {ref.code}
                                                            {copied === ref.code ? <Check size={12} /> : <Copy size={12} className="opacity-50" />}
                                                        </button>
                                                    </div>
                                                    <button
                                                        onClick={() => handleDelete(ref.id)}
                                                        className="p-2 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div className="space-y-2 mb-6 text-sm text-pramana-cream/60">
                                                    <div className="flex items-center gap-2">
                                                        <Mail size={14} className="text-pramana-gold/50" />
                                                        <span className="truncate">{ref.influencerEmail}</span>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Phone size={14} className="text-pramana-gold/50" />
                                                        <span>{ref.influencerPhone}</span>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-4">
                                                    <div className="bg-black/20 rounded-lg p-2 text-center pointer-events-none group-hover:bg-black/40 transition-colors">
                                                        <div className="text-[10px] uppercase tracking-wider text-white/30 mb-1 flex justify-center items-center gap-1">
                                                            <Award size={10} /> Regs
                                                        </div>
                                                        <div className="text-xl font-bold text-white font-cinzel">{ref.registrations || 0}</div>
                                                    </div>
                                                    <div className="bg-green-900/10 rounded-lg p-2 text-center pointer-events-none group-hover:bg-green-900/20 transition-colors border border-green-500/10">
                                                        <div className="text-[10px] uppercase tracking-wider text-green-400/50 mb-1 flex justify-center items-center gap-1">
                                                            <Ticket size={10} /> Issued
                                                        </div>
                                                        <div className="text-xl font-bold text-green-400 font-cinzel">{ref.passesIssued || 0}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
