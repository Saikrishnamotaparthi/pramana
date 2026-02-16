"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, query, orderBy, getDocs, Timestamp, doc, getDoc, collectionGroup, deleteDoc, updateDoc } from "firebase/firestore";
import * as XLSX from "xlsx";
import { Loader2, Search, ExternalLink, ImageIcon, Download } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface Registration {
    id: string;
    name: string;
    email: string;
    phone: string;
    college: string;
    competitionId: string;
    category: string;
    teamName?: string;
    paymentScreenshotUrl?: string;
    userId: string;
    createdAt: Timestamp;
    status?: "pending" | "approved" | "rejected" | "deleted";
}

const formatDate = (timestamp: Timestamp) => {
    if (!timestamp) return "N/A";
    return new Date(timestamp.seconds * 1000).toLocaleString();
};

export default function CulturalRegistrationsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [registrations, setRegistrations] = useState<Registration[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCompetition, setSelectedCompetition] = useState<string>("All");

    // Mapping for display names to stored IDs
    const competitionMap: Record<string, string> = {
        "Natya Rasa": "natya-rasa",
        "Off The Record": "off-the-record",
        "Raw & Real": "raw-and-real"
    };

    // Derived Stats
    const stats = {
        total: registrations.length,
        gitamCount: registrations.filter(r => r.college?.toLowerCase().includes("gitam")).length,
        competitionCounts: registrations.reduce((acc, curr) => {
            acc[curr.competitionId] = (acc[curr.competitionId] || 0) + 1;
            return acc;
        }, {} as Record<string, number>),
        categoryCounts: registrations.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + 1;
            return acc;
        }, {} as Record<string, number>)
    };

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'cul_admin'))) {
            router.replace("/admin");
            return;
        }
    }, [user, loading]);

    useEffect(() => {
        const fetchRegistrations = async () => {
            try {
                // Fetch from subcollection 'registrations' across all 'culturals' docs
                const q = query(collectionGroup(db, "registrations"), orderBy("createdAt", "desc"));
                const querySnapshot = await getDocs(q);

                const data = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Registration[];

                // Filter out soft-deleted registrations
                setRegistrations(data.filter(r => r.status !== 'deleted'));
            } catch (error) {
                console.error("Error fetching registrations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, []);

    const filteredRegistrations = registrations.filter(reg => {
        const matchesSearch =
            reg.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            reg.competitionId.toLowerCase().includes(searchTerm.toLowerCase());

        let matchesCompetition = false;
        if (selectedCompetition === "All") {
            matchesCompetition = true;
        } else {
            // Get the stored ID for the selected display name
            const expectedId = competitionMap[selectedCompetition];
            // Compare with the registration's competitionId
            matchesCompetition = reg.competitionId === expectedId;
        }

        return matchesSearch && matchesCompetition;
    });

    const handleDelete = async (regId: string, userId: string, competitionId: string) => {
        if (!confirm("Are you sure you want to delete this registration? This action cannot be undone.")) return;

        try {
            // Soft Delete: Update status to 'deleted'
            await updateDoc(doc(db, "culturals", userId, "registrations", regId), {
                status: "deleted"
            });

            // Optional: You might want to update stats or other collections if needed
            // For now, just removing from UI
            setRegistrations(prev => prev.filter(r => r.id !== regId));
            alert("Registration deleted successfully.");

        } catch (error: any) {
            console.error("Delete error:", error);
            alert("Failed to delete: " + error.message);
        }
    };

    const handleExport = () => {
        if (!registrations.length) return;

        // Flatten data for Excel
        const exportData = registrations.map(reg => ({
            "Participant Name": reg.name,
            "Email": reg.email,
            "Phone": reg.phone,
            "College": reg.college,
            "Competition": reg.competitionId,
            "Category": reg.category,
            "Team Name": reg.teamName || "N/A",
            "Status": reg.status || "pending",
            "Registered At": reg.createdAt ? new Date(reg.createdAt.seconds * 1000).toLocaleString() : "N/A",
            "Payment Screenshot": reg.paymentScreenshotUrl || "N/A",
            "User ID": reg.userId,
            "Registration ID": reg.id
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Registrations");

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0];
        XLSX.writeFile(wb, `cultural_registrations_${dateStr}.xlsx`);
    };

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex flex-col gap-6 mb-10 animate-stagger-1">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Cultural Registrations</h1>
                                <p className="text-pramana-cream/60 mt-2 font-light">Manage entries for Natya Rasa, Off The Record, and Raw & Real</p>
                            </div>
                            <button
                                onClick={handleExport}
                                className="flex items-center gap-2 bg-pramana-gold text-black px-4 py-2 rounded font-bold hover:bg-white transition-colors"
                            >
                                <Download size={18} />
                                Export to Excel
                            </button>
                        </div>

                        {/* Stats Dashboard */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Total Entries</p>
                                <p className="text-2xl font-bold font-cinzel text-pramana-gold">{stats.total}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Natya Rasa</p>
                                <p className="text-2xl font-bold font-cinzel text-white">{stats.competitionCounts["natya-rasa"] || 0}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Off The Record</p>
                                <p className="text-2xl font-bold font-cinzel text-white">{stats.competitionCounts["off-the-record"] || 0}</p>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                                <p className="text-xs uppercase tracking-widest text-white/50 mb-1">Raw & Real</p>
                                <p className="text-2xl font-bold font-cinzel text-white">{stats.competitionCounts["raw-and-real"] || 0}</p>
                            </div>
                        </div>
                    </header>

                    <div className="bg-white/5 p-2 rounded-xl border border-white/10 mb-6 flex flex-wrap gap-2 animate-stagger-2">
                        {["All", "Natya Rasa", "Off The Record", "Raw & Real"].map((comp) => (
                            <button
                                key={comp}
                                onClick={() => setSelectedCompetition(comp)}
                                className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${selectedCompetition === comp
                                    ? "bg-pramana-gold text-black shadow-lg shadow-pramana-gold/20"
                                    : "text-white/50 hover:bg-white/10 hover:text-white"
                                    }`}
                            >
                                {comp}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 animate-stagger-2 mb-6">
                        {/* Search bar */}
                        <div className="relative w-full md:w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50" />
                            <input
                                type="text"
                                placeholder="Search filtered entries..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-full pl-10 pr-4 py-2 text-sm text-pramana-cream focus:border-pramana-gold focus:outline-none focus:ring-1 focus:ring-pramana-gold transition"
                            />
                        </div>
                    </div>

                    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden shadow-2xl animate-stagger-3">
                        {loading ? (
                            <div className="p-12 flex justify-center">
                                <Loader2 className="animate-spin w-8 h-8 text-pramana-gold" />
                            </div>
                        ) : filteredRegistrations.length === 0 ? (
                            <div className="p-12 text-center text-gray-500">
                                No registrations found for this selection.
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 text-pramana-gold uppercase font-bold text-xs tracking-wider">
                                        <tr>
                                            <th className="px-6 py-4">Participant</th>
                                            <th className="px-6 py-4">Competition</th>
                                            <th className="px-6 py-4">Contact</th>
                                            {/* Screenshot Removed */}
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4">Registered At</th>
                                            <th className="px-6 py-4">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {filteredRegistrations.map((reg) => (
                                            <tr key={reg.id} className="hover:bg-white/5 transition-colors">
                                                <td className="px-6 py-4">
                                                    <p className="font-bold text-white">{reg.name}</p>
                                                    {reg.teamName && (
                                                        <p className="text-xs text-pramana-gold font-mono mb-0.5">Team: {reg.teamName}</p>
                                                    )}
                                                    <p className="text-xs text-gray-500">{reg.college}</p>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-block px-2 py-1 rounded bg-white/10 text-xs font-mono mb-1">
                                                        {reg.competitionId}
                                                    </span>
                                                    <p className="text-gray-400 text-xs uppercase">{reg.category}</p>
                                                </td>
                                                <td className="px-6 py-4 text-gray-400">
                                                    <p>{reg.email}</p>
                                                    <p>{reg.phone}</p>
                                                </td>
                                                {/* Screenshot Data Removed */}
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${reg.status === 'approved' ? 'bg-green-500/20 text-green-500' :
                                                        reg.status === 'rejected' ? 'bg-red-500/20 text-red-500' :
                                                            'bg-yellow-500/20 text-yellow-500'
                                                        }`}>
                                                        {reg.status || 'pending'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                                    {formatDate(reg.createdAt)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => handleDelete(reg.id, reg.userId, reg.competitionId)}
                                                        className="bg-red-600/20 text-red-500 border border-red-600/50 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors text-xs font-bold"
                                                    >
                                                        Delete
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
