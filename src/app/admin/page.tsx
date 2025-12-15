"use client";

import * as XLSX from 'xlsx';

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function AdminDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [activeDay, setActiveDay] = useState<'none' | 'day1' | 'day2'>('none');
    const [stats, setStats] = useState({
        revenue: 0,
        passesSold: 0,
        gitamSold: 0,
        publicSold: 0,
        checkedIn: 0,
        totalUsers: 0,
        gitamUsers: 0,
        publicUsers: 0,
        day1: { gitam: 0, nonGitam: 0, total: 0 },
        day2: { gitam: 0, nonGitam: 0, total: 0 }
    });

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'view_admin'))) {
            router.push("/");
            return;
        }

        if (user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'view_admin')) {
            const fetchStats = async () => {
                const { collection, getDocs, getCountFromServer, query, where, doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");

                // 0. Fetch Users First (Source of Truth for Category)
                const usersQuery = query(collection(db, "users"), where("role", "==", "user"));
                const usersSnap = await getDocs(usersQuery);
                const totalUsers = usersSnap.size;
                let gitamUsers = 0;
                let publicUsers = 0;

                const userMap = new Map();
                usersSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.isGitamite) gitamUsers++;
                    else publicUsers++;

                    if (data.email) {
                        userMap.set(data.email, data.isGitamite);
                    }
                });

                // 1. Revenue & Sales
                const passesSnap = await getDocs(collection(db, "passes_config"));
                let revenue = 0;
                let passesSold = 0;
                passesSnap.forEach(doc => {
                    const data = doc.data();
                    revenue += (data.price || 0) * (data.sold || 0);
                    passesSold += (data.sold || 0);
                });

                // 2. Detailed Splits (Using User Map for Category)
                const issuedSnap = await getDocs(collection(db, "passes_issued"));
                let gitamSold = 0;
                let publicSold = 0;
                let checkedIn = 0;

                // Day Specific Stats
                let d1Gitam = 0, d1NonGitam = 0, d1Total = 0;
                let d2Gitam = 0, d2NonGitam = 0, d2Total = 0;

                issuedSnap.forEach(doc => {
                    const data = doc.data();
                    if (data.status === 'active') {
                        // Determine Category: User Profile > Email Check
                        const isGitamite = userMap.has(data.issuedToEmail)
                            ? userMap.get(data.issuedToEmail)
                            : data.issuedToEmail?.endsWith("@gitam.edu");

                        if (isGitamite) gitamSold++;
                        else publicSold++;

                        if (data.admitted) checkedIn++;

                        // Day Stats Check
                        const logs = data.entryLogs || [];
                        if (logs.includes('day1')) {
                            d1Total++;
                            if (isGitamite) d1Gitam++; else d1NonGitam++;
                        }
                        if (logs.includes('day2')) {
                            d2Total++;
                            if (isGitamite) d2Gitam++; else d2NonGitam++;
                        }
                    }
                });

                // 3. Fetch Config
                const configRef = doc(db, "config", "entry");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    setActiveDay((configSnap.data().activeDay as 'none' | 'day1' | 'day2') || 'none');
                }

                setStats({
                    revenue,
                    passesSold,
                    gitamSold,
                    publicSold,
                    checkedIn,
                    totalUsers,
                    gitamUsers,
                    publicUsers,
                    day1: { gitam: d1Gitam, nonGitam: d1NonGitam, total: d1Total },
                    day2: { gitam: d2Gitam, nonGitam: d2NonGitam, total: d2Total }
                });
            };
            fetchStats();
        }
    }, [user, loading, router]);

    const updateActiveDay = async (day: 'none' | 'day1' | 'day2') => {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        if (confirm(`Set Active Day to ${day}?`)) {
            await setDoc(doc(db, "config", "entry"), { activeDay: day }, { merge: true });
            setActiveDay(day);
        }
    };

    const handleExport = async () => {
        const { collection, getDocs } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        if (!confirm("Download Entry Report (Day 1 & Day 2)?")) return;

        try {
            // 1. Fetch Users to Map Names & Categories (Fix N/A & Category Mismatch)
            const usersSnap = await getDocs(collection(db, "users"));
            const userMap = new Map();
            usersSnap.forEach(u => {
                const d = u.data();
                if (d.email) {
                    userMap.set(d.email, {
                        name: d.displayName || d.email.split('@')[0],
                        isGitamite: d.isGitamite
                    });
                }
            });

            // 2. Fetch Passes
            const snap = await getDocs(collection(db, "passes_issued"));

            const day1Rows: any[] = [];
            const day2Rows: any[] = [];

            snap.forEach(doc => {
                const p = doc.data();
                const logs = p.entryLogs || [];

                // Resolve User Data
                const userProfile = userMap.get(p.issuedToEmail);
                const resolvedName = p.userName || userProfile?.name || p.issuedToEmail?.split('@')[0] || "Unknown";

                // Determine Category: User Profile > Email Check
                let category = "Non-Gitamite";
                if (userProfile && userProfile.isGitamite !== undefined) {
                    category = userProfile.isGitamite ? "Gitamite" : "Non-Gitamite";
                } else if (p.issuedToEmail?.endsWith("@gitam.edu")) {
                    category = "Gitamite";
                }

                const rowBase = {
                    "Name": resolvedName,
                    "Email": p.issuedToEmail || "N/A",
                    "Category": category,
                    "Last Scan Time": p.lastEntryAt ? new Date(p.lastEntryAt).toLocaleString() : "Not Scanned"
                };

                if (logs.includes('day1')) {
                    day1Rows.push(rowBase);
                }
                if (logs.includes('day2')) {
                    day2Rows.push(rowBase);
                }
            });

            const wb = XLSX.utils.book_new();

            // Day 1 Sheet
            if (day1Rows.length > 0) {
                const ws1 = XLSX.utils.json_to_sheet(day1Rows);
                XLSX.utils.book_append_sheet(wb, ws1, "Day 1");
            } else {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Info: "No Day 1 Entries" }]), "Day 1");
            }

            // Day 2 Sheet
            if (day2Rows.length > 0) {
                const ws2 = XLSX.utils.json_to_sheet(day2Rows);
                XLSX.utils.book_append_sheet(wb, ws2, "Day 2");
            } else {
                XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ Info: "No Day 2 Entries" }]), "Day 2");
            }

            XLSX.writeFile(wb, "Entry_Report_Split.xlsx");
        } catch (error) {
            console.error("Export failed", error);
            alert("Export failed");
        }
    };

    if (loading || !user) return <div className="p-10 flex items-center justify-center min-h-screen"><div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div></div>;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <AdminSidebar />

            <main className="flex-1 p-8 overflow-y-auto max-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h2 className="text-3xl font-cinzel font-bold text-pramana-gold">Dashboard Overview</h2>
                        <p className="text-pramana-cream/60 mt-1">Real-time statistics and updates.</p>
                    </div>
                    <button
                        onClick={handleExport}
                        className="bg-white/5 hover:bg-white/10 border border-white/10 text-pramana-gold px-4 py-2 rounded-lg font-bold shadow transition flex items-center gap-2"
                    >
                        📂 Export CSV
                    </button>
                </header>

                {/* Active Day Control */}
                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-8 backdrop-blur-sm">
                    <h3 className="text-lg font-bold mb-4 font-cinzel text-pramana-cream">Entry Control</h3>
                    <div className="flex gap-4">
                        <button onClick={() => updateActiveDay('none')} className={`px-4 py-2 rounded-lg font-bold transition ${activeDay === 'none' ? 'bg-red-600/80 text-white shadow-lg shadow-red-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Close Entry</button>
                        <button onClick={() => updateActiveDay('day1')} className={`px-4 py-2 rounded-lg font-bold transition ${activeDay === 'day1' ? 'bg-green-600/80 text-white shadow-lg shadow-green-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Day 1 Active</button>
                        <button onClick={() => updateActiveDay('day2')} className={`px-4 py-2 rounded-lg font-bold transition ${activeDay === 'day2' ? 'bg-blue-600/80 text-white shadow-lg shadow-blue-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Day 2 Active</button>
                    </div>
                    <p className="text-sm text-pramana-cream/40 mt-2">Current Active Mode: <span className="font-bold uppercase text-pramana-gold">{activeDay}</span></p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:bg-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-pramana-cream/50 text-sm font-medium uppercase tracking-wider mb-1">Total Revenue</p>
                                <h3 className="text-3xl font-bold text-pramana-gold font-cinzel">₹{stats.revenue.toLocaleString()}</h3>
                            </div>
                            <span className="p-2 bg-green-500/10 text-green-400 rounded-lg">💰</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:bg-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-pramana-cream/50 text-sm font-medium uppercase tracking-wider mb-1">Passes Sold</p>
                                <h3 className="text-3xl font-bold text-pramana-gold font-cinzel">{stats.passesSold}</h3>
                                <p className="text-xs text-pramana-cream/40 mt-1">Gitam: {stats.gitamSold} | Public: {stats.publicSold}</p>
                            </div>
                            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">🎟️</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:bg-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-pramana-cream/50 text-sm font-medium uppercase tracking-wider mb-1">Registered Users</p>
                                <h3 className="text-3xl font-bold text-pramana-gold font-cinzel">{stats.totalUsers}</h3>
                                <p className="text-xs text-pramana-cream/40 mt-1">Gitam: {stats.gitamUsers} | Public: {stats.publicUsers}</p>
                            </div>
                            <span className="p-2 bg-purple-500/10 text-purple-400 rounded-lg">👥</span>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 transition hover:bg-white/10">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-pramana-cream/50 text-sm font-medium uppercase tracking-wider mb-1">Checked In (Total)</p>
                                <h3 className="text-3xl font-bold text-pramana-gold font-cinzel">{stats.checkedIn}</h3>
                            </div>
                            <span className="p-2 bg-orange-500/10 text-orange-400 rounded-lg">📍</span>
                        </div>
                    </div>
                </div>

                {/* Day 1 & Day 2 Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Day 1 Stats</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-pramana-cream/60">Gitamites</span><span className="font-bold">{stats.day1?.gitam || 0}</span></div>
                            <div className="flex justify-between"><span className="text-pramana-cream/60">Non-Gitamites</span><span className="font-bold">{stats.day1?.nonGitam || 0}</span></div>
                            <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-pramana-gold font-bold">Total Entries</span><span className="font-bold text-lg">{stats.day1?.total || 0}</span></div>
                        </div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                        <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Day 2 Stats</h3>
                        <div className="space-y-2 text-sm">
                            <div className="flex justify-between"><span className="text-pramana-cream/60">Gitamites</span><span className="font-bold">{stats.day2?.gitam || 0}</span></div>
                            <div className="flex justify-between"><span className="text-pramana-cream/60">Non-Gitamites</span><span className="font-bold">{stats.day2?.nonGitam || 0}</span></div>
                            <div className="flex justify-between border-t border-white/10 pt-2"><span className="text-pramana-gold font-bold">Total Entries</span><span className="font-bold text-lg">{stats.day2?.total || 0}</span></div>
                        </div>
                    </div>
                </div>

                {/* Placeholders for charts/lists */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 min-h-[300px]">
                        <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Recent Sales</h3>
                        <div className="flex items-center justify-center h-full text-pramana-cream/30 italic">No data available</div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 min-h-[300px]">
                        <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Registration Trends</h3>
                        <div className="flex items-center justify-center h-full text-pramana-cream/30 italic">No data available</div>
                    </div>
                </div>
            </main>
        </div>
    );
}
