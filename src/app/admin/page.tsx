"use client";

import * as XLSX from 'xlsx';

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";
import { canManageEntry } from "@/utils/rbac";

export default function AdminDashboard() {
    const { user, loading } = useAuth();
    const router = useRouter();

    const [activeDay, setActiveDay] = useState<'none' | 'day1' | 'day2'>('none');
    const [qrVisible, setQrVisible] = useState<boolean>(false);
    const [statsLoaded, setStatsLoaded] = useState(false); // New state to track if stats are loaded
    const [statsLoading, setStatsLoading] = useState(false); // New state for loading spinner
    const [stats, setStats] = useState<{
        revenue: number;
        passesSold: number;
        gitamSold: number;
        publicSold: number;
        checkedIn: number;
        totalUsers: number;
        gitamUsers: number;
        publicUsers: number;
        day1: { gitam: number; nonGitam: number; total: number };
        day2: { gitam: number; nonGitam: number; total: number };
        recentSales: any[];
        dailyTrends: { date: string; count: number; label: string }[];
        maxTrend: number;
    }>({
        revenue: 0,
        passesSold: 0,
        gitamSold: 0,
        publicSold: 0,
        checkedIn: 0,
        totalUsers: 0,
        gitamUsers: 0,
        publicUsers: 0,
        day1: { gitam: 0, nonGitam: 0, total: 0 },
        day2: { gitam: 0, nonGitam: 0, total: 0 },
        recentSales: [],
        dailyTrends: [],
        maxTrend: 1
    });

    useEffect(() => {
        if (!loading && (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'view_admin' && user.role !== 'marketing_admin' && user.role !== 'ppass_admin' && user.role !== 'cul_admin'))) {
            router.push("/");
            return;
        }

        if (user?.role === 'ppass_admin') {
            router.replace("/issue-pass");
            return;
        }

        if (user?.role === 'cul_admin') {
            router.replace("/admin/culturals");
            return;
        }

        if (user?.role === 'food_admin') {
            router.replace("/admin/foodstalls");
            return;
        }

        // Only fetch config initially (lightweight)
        const fetchConfig = async () => {
            if (user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'view_admin' || user.role === 'marketing_admin')) {
                const { doc, getDoc } = await import("firebase/firestore");
                const { db } = await import("@/lib/firebase");
                const configRef = doc(db, "config", "entry");
                const configSnap = await getDoc(configRef);
                if (configSnap.exists()) {
                    setActiveDay((configSnap.data().activeDay as 'none' | 'day1' | 'day2') || 'none');
                    setQrVisible(configSnap.data().showQR || false);
                }
            }
        }
        fetchConfig();

    }, [user, loading, router]);

    const loadStatistics = async () => {
        if (statsLoaded || statsLoading) return;
        setStatsLoading(true);

        const { collection, getDocs, getCountFromServer, query, where, orderBy, limit } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");

        // Helper for Recent Sales
        const parseDate = (val: any) => {
            if (!val) return null;
            if (val.toDate) return val.toDate();
            const d = new Date(val);
            return isNaN(d.getTime()) ? null : d;
        };

        try {
            // 1. Total Users & Gitam Users
            const usersRef = collection(db, "users");
            const usersSnap = await getCountFromServer(usersRef);
            const totalUsers = usersSnap.data().count;

            const gitamUsersSnap = await getCountFromServer(query(usersRef, where("isGitamite", "==", true)));
            const gitamUsers = gitamUsersSnap.data().count;
            const publicUsers = totalUsers - gitamUsers;

            // 2. Fetch ALL Active Passes for Accurate Stats
            // We need to iterate to check EMAIL DOMAIN for strict categorization
            const passesRef = collection(db, "passes_issued");
            const activePassesQuery = query(passesRef, where("status", "==", "active"));

            // We also need revenue, which traditionally comes from config * sold. 
            // But active passes give us exact count. We can multiply by price from config.

            const [activePassesSnap, passesConfigSnap] = await Promise.all([
                getDocs(activePassesQuery),
                getDocs(collection(db, "passes_config"))
            ]);

            // Map Pass Prices
            const priceMap: Record<string, number> = {};
            passesConfigSnap.forEach(d => {
                const data = d.data();
                priceMap[d.id] = data.price || 0;
            });

            let revenue = 0;
            let passesSold = 0;
            let gitamSold = 0;
            let publicSold = 0;
            let checkedIn = 0; // Total admitted

            // Granular Day Stats
            const d1Stats = { gitam: 0, nonGitam: 0, total: 0 };
            const d2Stats = { gitam: 0, nonGitam: 0, total: 0 };

            activePassesSnap.forEach(doc => {
                const data = doc.data();

                // SKIP Excluded Passes (e.g. Admin Issued)
                if (data.excludeFromStats) return;

                passesSold++;

                // Revenue
                if (data.passId && priceMap[data.passId]) {
                    revenue += priceMap[data.passId];
                }

                // Categorize by Domain
                const email = (data.issuedToEmail || "").toLowerCase();
                const isGitam = email.endsWith('@gitam.edu') || email.endsWith('@gitam.in') || email.endsWith('@student.gitam.edu');

                if (isGitam) {
                    gitamSold++;
                } else {
                    publicSold++;
                }

                // Total Checked In (Admitted flag - reliable?)
                if (data.admitted) checkedIn++;

                // Granular Attendance
                if (data.entryLogs && Array.isArray(data.entryLogs)) {
                    if (data.entryLogs.includes('day1')) {
                        d1Stats.total++;
                        if (isGitam) d1Stats.gitam++; else d1Stats.nonGitam++;
                    }
                    if (data.entryLogs.includes('day2')) {
                        d2Stats.total++;
                        if (isGitam) d2Stats.gitam++; else d2Stats.nonGitam++;
                    }
                }
            });

            // 4. Recent Sales (Limit 10 active check client side to avoid index)
            const recentSnap = await getDocs(query(passesRef, orderBy("purchaseDate", "desc"), limit(10)));
            const recentSales = recentSnap.docs
                .map(d => d.data())
                .filter(d => d.status === 'active' && !d.excludeFromStats)
                .slice(0, 5)
                .map(data => ({
                    ...data,
                    timeAgo: getTimeAgo(parseDate(data.purchaseDate) || new Date())
                }));

            setStats({
                revenue,
                passesSold,
                gitamSold,
                publicSold,
                checkedIn,
                totalUsers,
                gitamUsers,
                publicUsers,
                day1: d1Stats,
                day2: d2Stats,
                recentSales,
                dailyTrends: [], // Disabled
                maxTrend: 1
            });
            setStatsLoaded(true);
        } catch (error) {
            console.error("Error fetching admin stats:", error);
            alert("Failed to load statistics.");
        } finally {
            setStatsLoading(false);
        }
    };


    // Helper for relative time
    function getTimeAgo(date: Date) {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        let interval = seconds / 31536000;
        if (interval > 1) return Math.floor(interval) + " years ago";
        interval = seconds / 2592000;
        if (interval > 1) return Math.floor(interval) + " months ago";
        interval = seconds / 86400;
        if (interval > 1) return Math.floor(interval) + " days ago";
        interval = seconds / 3600;
        if (interval > 1) return Math.floor(interval) + " hours ago";
        interval = seconds / 60;
        if (interval > 1) return Math.floor(interval) + " mins ago";
        return Math.floor(seconds) + " seconds ago";
    }

    const updateActiveDay = async (day: 'none' | 'day1' | 'day2') => {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        if (confirm(`Set Active Day to ${day}?`)) {
            await setDoc(doc(db, "config", "entry"), { activeDay: day }, { merge: true });
            setActiveDay(day);
        }
    };



    const updateQrVisibility = async (visible: boolean) => {
        const { doc, setDoc } = await import("firebase/firestore");
        const { db } = await import("@/lib/firebase");
        if (confirm(`Set QR Visibility to ${visible ? 'VISIBLE' : 'HIDDEN'}?`)) {
            await setDoc(doc(db, "config", "entry"), { showQR: visible }, { merge: true });
            setQrVisible(visible);
        }
    };

    const handleExport = async () => {
        // ... (Export Logic Unchanged) ...
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
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />

            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 md:mb-12 animate-stagger-1">
                        <div>
                            <h2 className="text-2xl md:text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Dashboard Overview</h2>
                            <p className="text-pramana-cream/60 mt-1 md:mt-2 font-light tracking-wide text-xs md:text-base">Real-time statistics and updates.</p>
                        </div>
                        <div className="flex gap-4">
                            {!statsLoaded && (
                                <button
                                    onClick={loadStatistics}
                                    disabled={statsLoading}
                                    className="glass-panel text-white bg-blue-600/20 border-blue-600/50 px-6 py-2 rounded-full font-bold shadow-lg hover:bg-blue-600/40 transition-all duration-300 flex items-center justify-center gap-2"
                                >
                                    {statsLoading ? "Loading..." : "Load Statistics"}
                                </button>
                            )}
                            <button
                                onClick={handleExport}
                                className="glass-panel text-pramana-gold px-6 py-2 rounded-full font-bold shadow-lg shadow-pramana-gold/10 hover:bg-white/10 transition-all duration-300 flex items-center justify-center gap-2 border-pramana-gold/20"
                            >
                                <span className="text-lg">📂</span> Export CSV
                            </button>
                        </div>
                    </header>

                    {/* Active Day Control */}
                    {canManageEntry(user) && (
                        <div className="bg-white/5 p-6 rounded-2xl border border-white/10 mb-8 backdrop-blur-sm animate-stagger-2">
                            <h3 className="text-lg font-bold mb-4 font-cinzel text-pramana-cream">Entry Control</h3>
                            <div className="flex flex-wrap gap-3 md:gap-4">
                                <button onClick={() => updateActiveDay('none')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition text-sm md:text-base ${activeDay === 'none' ? 'bg-red-600/80 text-white shadow-lg shadow-red-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Close Entry</button>
                                <button onClick={() => updateActiveDay('day1')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition text-sm md:text-base ${activeDay === 'day1' ? 'bg-green-600/80 text-white shadow-lg shadow-green-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Day 1 Active</button>
                                <button onClick={() => updateActiveDay('day2')} className={`flex-1 md:flex-none px-4 py-2 rounded-lg font-bold transition text-sm md:text-base ${activeDay === 'day2' ? 'bg-blue-600/80 text-white shadow-lg shadow-blue-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>Day 2 Active</button>
                            </div>
                            <p className="text-sm text-pramana-cream/40 mt-2">Current Active Mode: <span className="font-bold uppercase text-pramana-gold">{activeDay}</span></p>

                            <hr className="border-white/10 my-4" />

                            <h3 className="text-lg font-bold mb-4 font-cinzel text-pramana-cream">QR Code Visibility</h3>
                            <div className="flex gap-4">
                                <button onClick={() => updateQrVisibility(true)} className={`px-4 py-2 rounded-lg font-bold transition ${qrVisible ? 'bg-green-600/80 text-white shadow-lg shadow-green-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>
                                    Show QRs
                                </button>
                                <button onClick={() => updateQrVisibility(false)} className={`px-4 py-2 rounded-lg font-bold transition ${!qrVisible ? 'bg-red-600/80 text-white shadow-lg shadow-red-900/50' : 'bg-white/5 text-pramana-cream/50 hover:bg-white/10'}`}>
                                    Hide QRs
                                </button>
                            </div>
                            <p className="text-sm text-pramana-cream/40 mt-2">Status: <span className={`font-bold uppercase ${qrVisible ? 'text-green-400' : 'text-red-400'}`}>{qrVisible ? 'VISIBLE' : 'HIDDEN'}</span></p>
                        </div>
                    )}

                    {!statsLoaded ? (
                        <div className="flex flex-col items-center justify-center p-12 bg-white/5 border border-white/10 rounded-2xl animate-fade-in text-center">
                            <h3 className="text-2xl font-cinzel font-bold text-white mb-2">Statistics Hidden</h3>
                            <p className="text-pramana-cream/60 mb-6">Click "Load Statistics" to view real-time data.</p>
                        </div>
                    ) : (
                        <>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-8 animate-stagger-3">
                                <div className="glass-panel p-4 md:p-6 rounded-2xl glass-panel-hover group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-pramana-gold transition">Total Revenue</p>
                                            <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">₹{stats.revenue.toLocaleString()}</h3>
                                        </div>
                                        <span className="p-3 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.1)]">💰</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl glass-panel-hover group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-pramana-gold transition">Passes Sold</p>
                                            <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">{stats.passesSold}</h3>
                                            <p className="text-xs text-pramana-cream/40 mt-1 font-mono">Gitam: {stats.gitamSold} <span className="text-white/20">|</span> Public: {stats.publicSold}</p>
                                        </div>
                                        <span className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]">🎟️</span>
                                    </div>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl glass-panel-hover group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <p className="text-pramana-cream/50 text-xs font-bold uppercase tracking-widest mb-2 group-hover:text-pramana-gold transition">Registered Users</p>
                                            <h3 className="text-3xl font-bold text-white font-cinzel group-hover:drop-shadow-[0_0_8px_rgba(255,255,255,0.3)] transition">{stats.totalUsers}</h3>
                                            <p className="text-xs text-pramana-cream/40 mt-1 font-mono">Gitam: {stats.gitamUsers} <span className="text-white/20">|</span> Public: {stats.publicUsers}</p>
                                        </div>
                                        <span className="p-3 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.1)]">👥</span>
                                    </div>
                                </div>

                            </div>

                            {/* Day 1 & Day 2 Stats */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 animate-stagger-4">
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

                            {/* Real Data Charts */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                                {/* Recent Sales List */}
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 min-h-[300px]">
                                    <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Recent Sales</h3>
                                    <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
                                        {stats.recentSales.length > 0 ? (
                                            <table className="w-full text-left text-sm">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-pramana-cream/50 text-xs uppercase tracking-widest">
                                                        <th className="pb-3 px-2">User</th>
                                                        <th className="pb-3 px-2">Pass</th>
                                                        <th className="pb-3 px-2 text-right">Time</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {stats.recentSales.map((sale, i) => (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="py-3 px-2">
                                                                <div className="font-bold text-white">{sale.userName || sale.issuedToEmail?.split('@')[0]}</div>
                                                                <div className="text-[10px] text-pramana-cream/40">{sale.issuedToEmail}</div>
                                                            </td>
                                                            <td className="py-3 px-2">
                                                                <span className="px-2 py-1 bg-pramana-gold/10 text-pramana-gold rounded text-[10px] font-bold border border-pramana-gold/20">
                                                                    {sale.passName}
                                                                </span>
                                                            </td>
                                                            <td className="py-3 px-2 text-right text-pramana-cream/60 font-mono text-xs">
                                                                {sale.timeAgo}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        ) : (
                                            <div className="flex items-center justify-center h-48 text-pramana-cream/30 italic">No recent sales</div>
                                        )}
                                    </div>
                                </div>

                                {/* Registration Trends Chart */}
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 min-h-[300px] flex flex-col">
                                    <h3 className="text-lg font-bold text-pramana-gold font-cinzel mb-4">Registration Trends (Last 7 Days)</h3>
                                    <div className="flex-1 flex items-end justify-between gap-2 pt-8 px-2">
                                        {stats.dailyTrends.map((day, i) => {
                                            const heightPercent = stats.maxTrend > 0
                                                ? Math.max(5, (day.count / stats.maxTrend) * 100)
                                                : 5;

                                            return (
                                                <div key={i} className="flex flex-col items-center justify-end w-full group relative">
                                                    {/* Tooltip */}
                                                    <div className="absolute -top-10 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-white/20">
                                                        {day.count} Sales
                                                    </div>

                                                    {/* Bar */}
                                                    <div
                                                        className="w-full bg-gradient-to-t from-pramana-gold/20 to-pramana-gold/60 rounded-t-sm hover:from-pramana-gold/40 hover:to-pramana-gold transition-all duration-300 relative overflow-hidden"
                                                        style={{ height: `${heightPercent}%` }}
                                                    >
                                                        <div className="absolute inset-0 bg-white/10 translate-y-full hover:translate-y-0 transition-transform"></div>
                                                    </div>

                                                    {/* Label */}
                                                    <div className="mt-3 text-[10px] text-pramana-cream/50 uppercase tracking-widest text-center">{day.label}</div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </main>
        </div>
    );
}
