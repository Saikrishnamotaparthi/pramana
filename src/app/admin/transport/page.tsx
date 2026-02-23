"use client";

import React, { useEffect, useState } from "react";
import * as XLSX from 'xlsx';
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { Bus, Download, Search, Loader2 } from "lucide-react";

export default function TransportAdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [requests, setRequests] = useState<any[]>([]);
    const [stats, setStats] = useState({ totalNeed: 0, gitamites: 0, nonGitamites: 0 });
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        if (!authLoading && (!user || !['superadmin', 'admin', 'view_admin'].includes(user.role))) {
            router.push("/");
            return;
        }

        const fetchRequests = async () => {
            try {
                const q = query(collection(db, "transport_requests"), orderBy("updatedAt", "desc"));
                const querySnapshot = await getDocs(q);
                let totalNeed = 0;
                let gitamites = 0;
                let nonGitamites = 0;

                const data = querySnapshot.docs.map(doc => {
                    const req = doc.data();
                    const email = (req.email || "").toLowerCase();
                    const isGitam = email.endsWith('@gitam.edu') || email.endsWith('@gitam.in') || email.endsWith('@student.gitam.edu');

                    if (req.needsTransport === 'yes') {
                        totalNeed++;
                        if (isGitam) gitamites++; else nonGitamites++;
                    }

                    return {
                        id: doc.id,
                        ...req,
                        isGitam,
                        updatedAt: req.updatedAt?.toDate()?.toLocaleString() || "N/A"
                    };
                });

                setRequests(data);
                setStats({ totalNeed, gitamites, nonGitamites });
            } catch (error) {
                console.error("Error fetching transport requests:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) fetchRequests();
    }, [user, authLoading, router]);

    const handleExport = () => {
        const exportData = requests.map(req => ({
            "Name": req.displayName || "N/A",
            "Email": req.email || "N/A",
            "User Type": req.isGitam ? "Internal (Gitamite)" : "External",
            "Needs Transport": req.needsTransport?.toUpperCase() || "N/A",
            "Has Bus Pass": req.hasBusPass?.toUpperCase() || "N/A",
            "Stop Name": req.stopName || "N/A",
            "Submitted At": req.updatedAt
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Transport Requests");
        XLSX.writeFile(wb, "Pramana_Transport_Requests.xlsx");
    };

    const filteredRequests = requests.filter(req =>
        req.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        req.stopName?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen bg-pramana-black items-center justify-center">
                <Loader2 className="w-8 h-8 text-pramana-gold animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />

            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 animate-stagger-1">
                        <div>
                            <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold flex items-center gap-3">
                                <Bus className="w-8 h-8" /> Transport Requests
                            </h2>
                            <p className="text-pramana-cream/60 mt-2 font-light tracking-wide">
                                Manage and export transport requirements for Pramana'26.
                            </p>
                        </div>
                        <button
                            onClick={handleExport}
                            className="glass-panel text-pramana-gold px-6 py-2 rounded-full font-bold shadow-lg shadow-pramana-gold/10 hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 border-pramana-gold/20"
                        >
                            <Download size={18} /> Export Excel
                        </button>
                    </header>

                    {/* Analytics Overview */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-8 animate-stagger-2">
                        <div className="glass-panel p-6 rounded-2xl glass-panel-hover group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-pramana-gold transition">Total Need</p>
                                    <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">{stats.totalNeed}</h3>
                                    <p className="text-[10px] text-pramana-cream/40 mt-1 uppercase tracking-tight font-mono">Students requiring bus</p>
                                </div>
                                <span className="p-3 bg-pramana-gold/10 text-pramana-gold rounded-xl border border-pramana-gold/20">🚌</span>
                            </div>
                        </div>
                        <div className="glass-panel p-6 rounded-2xl glass-panel-hover group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-blue-400 transition">Gitamites</p>
                                    <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">{stats.gitamites}</h3>
                                    <p className="text-[10px] text-pramana-cream/40 mt-1 uppercase tracking-tight font-mono">Institutional users</p>
                                </div>
                                <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">🎓</span>
                            </div>
                        </div>
                        <div className="glass-panel p-6 rounded-2xl glass-panel-hover group">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-purple-400 transition">Non-Gitamites</p>
                                    <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">{stats.nonGitamites}</h3>
                                    <p className="text-[10px] text-pramana-cream/40 mt-1 uppercase tracking-tight font-mono">External participants</p>
                                </div>
                                <span className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">🌍</span>
                            </div>
                        </div>
                    </div>

                    <div className="mb-6 relative animate-stagger-3">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-pramana-cream/40 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search by name, email, or stop..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-6 py-4 text-pramana-cream focus:outline-none focus:ring-2 focus:ring-pramana-gold/50 transition-all"
                        />
                    </div>

                    <div className="glass-panel rounded-2xl overflow-hidden border border-white/10 animate-stagger-3">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 border-b border-white/10 text-pramana-cream/50 text-xs uppercase tracking-widest">
                                    <tr>
                                        <th className="px-6 py-4">User</th>
                                        <th className="px-6 py-4 text-center">Need Transport</th>
                                        <th className="px-6 py-4 text-center">Bus Pass</th>
                                        <th className="px-6 py-4">Stop Name</th>
                                        <th className="px-6 py-4 text-right">Submitted At</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredRequests.map((req) => (
                                        <tr key={req.id} className="hover:bg-white/5 transition-colors group text-sm">
                                            <td className="px-6 py-4">
                                                <div className="font-bold text-white group-hover:text-pramana-gold transition">{req.displayName || "N/A"}</div>
                                                <div className="text-xs text-pramana-cream/40">{req.email}</div>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${req.needsTransport === 'yes'
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20'
                                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                                    }`}>
                                                    {req.needsTransport || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${req.hasBusPass === 'yes'
                                                    ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                    : 'bg-white/5 text-pramana-cream/30 border-white/10'
                                                    }`}>
                                                    {req.hasBusPass || "N/A"}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-pramana-cream font-medium">
                                                {req.stopName || <span className="text-pramana-cream/20 italic">No Stop Specified</span>}
                                            </td>
                                            <td className="px-6 py-4 text-right text-xs text-pramana-cream/40 font-mono">
                                                {req.updatedAt}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredRequests.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-pramana-cream/30 italic">
                                                No transport requests found.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
