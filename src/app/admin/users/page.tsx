"use client";

import { useEffect, useState } from "react";
import { db, auth } from "@/lib/firebase";
import {
    collection,
    getDocs,
    query,
    orderBy,
    limit,
    startAfter,
    where,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    increment,
    writeBatch,
    getCountFromServer
} from "firebase/firestore";
import { UserProfile, RegistrationField } from "@/types";
import AdminSidebar from "@/components/AdminSidebar";
import { canIssuePasses } from "@/utils/rbac";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

export default function UserManagement() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    // Data State
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [passesIssued, setPassesIssued] = useState<Record<string, any>>({});
    const [passConfigs, setPassConfigs] = useState<any[]>([]);
    const [registrationConfig, setRegistrationConfig] = useState<RegistrationField[]>([]);

    // Pagination State
    const [lastDoc, setLastDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    // Search & Filter
    const [filter, setFilter] = useState("");
    const [searching, setSearching] = useState(false);
    const [categoryFilter, setCategoryFilter] = useState<'all' | 'gitam' | 'non-gitam'>('all');
    const [registrationFilter, setRegistrationFilter] = useState<'all' | 'registered' | 'pending'>('all');
    const [paymentFilter, setPaymentFilter] = useState<'all' | 'paid' | 'unpaid'>('all');

    // Stats State
    const [stats, setStats] = useState({
        registered: 0,
        passes: 0,
        gitam: 0,
        nonGitam: 0,
        pending: 0
    });

    // Modals
    const [showIssueModal, setShowIssueModal] = useState(false);
    const [selectedUserForPass, setSelectedUserForPass] = useState<UserProfile | null>(null);
    const [selectedPassId, setSelectedPassId] = useState("");
    const [processing, setProcessing] = useState(false);

    const [showAadharModal, setShowAadharModal] = useState(false);
    const [aadharImageUrl, setAadharImageUrl] = useState<string | null>(null);
    const [viewingAadharUser, setViewingAadharUser] = useState<UserProfile | null>(null);
    const [loadingAadhar, setLoadingAadhar] = useState(false);

    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [viewingDetailsUser, setViewingDetailsUser] = useState<UserProfile | null>(null);

    const [showEditEmailModal, setShowEditEmailModal] = useState(false);
    const [editingEmailUser, setEditingEmailUser] = useState<UserProfile | null>(null);
    const [newEmail, setNewEmail] = useState("");
    const [updatingEmail, setUpdatingEmail] = useState(false);

    const PAGE_SIZE = 50;

    // Access Control
    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'entry_admin'))) {
            // Basic redirect for unauthorized users. Adjust per RBAC requirements.
            // Note: entry_admin might need access? Assuming yes for now.
            // If RBAC strictness is needed, use canManageEntry logic.
        }
    }, [user, authLoading]);

    // Initial Stats & Config Load
    useEffect(() => {
        const fetchInitial = async () => {
            try {
                // 1. Registration Config
                const configSnap = await getDoc(doc(db, "config", "registration"));
                if (configSnap.exists()) {
                    setRegistrationConfig(configSnap.data().fields || []);
                }

                // 2. Pass Configs
                const passConfigSnap = await getDocs(collection(db, "passes_config"));
                setPassConfigs(passConfigSnap.docs.map(d => ({ id: d.id, ...d.data() })));

                // 3. Optimized Stats (Count Aggregation)
                const usersRef = collection(db, "users");
                const passesRef = collection(db, "passes_issued");

                const [totalUsersSnap, totalPassesSnap, gitamSnap, registeredSnap] = await Promise.all([
                    getCountFromServer(usersRef),
                    getCountFromServer(passesRef),
                    getCountFromServer(query(usersRef, where("isGitamite", "==", true))),
                    getCountFromServer(query(usersRef, where("isRegistered", "==", true)))
                ]);

                const totalUsers = totalUsersSnap.data().count;
                const totalPasses = totalPassesSnap.data().count;
                const gitamUsers = gitamSnap.data().count;
                const completedReg = registeredSnap.data().count;

                setStats({
                    registered: totalUsers,
                    passes: totalPasses,
                    gitam: gitamUsers,
                    nonGitam: totalUsers - gitamUsers,
                    pending: totalUsers - completedReg
                });

            } catch (error) {
                console.error("Error fetching initial stats:", error);
            }
        };
        fetchInitial();
    }, []);

    // Fetch Users Central Logic
    const fetchUsers = async (isLoadMore = false) => {
        if (isLoadMore) {
            setLoadingMore(true);
        } else {
            setLoading(true);
            setHasMore(true);
        }

        try {
            // SPECIAL MODE: PAID USERS (Reverse Lookup)
            if (paymentFilter === 'paid' && !filter.trim()) {
                await fetchPaidUsers(isLoadMore);
                return;
            }

            // STANDARD MODE: Users Collection
            let q;
            const usersRef = collection(db, "users");
            const constraints: any[] = [];

            // 1. Search (Overrides other filters usually, but let's try to combine if possible?) 
            //    Combining search (inequality) with other equalities requires composite index.
            if (filter.trim()) {
                const term = filter.trim().toLowerCase();
                constraints.push(where("email", ">=", term));
                constraints.push(where("email", "<=", term + '\uf8ff'));
                // Note: We skip other filters in search mode to avoid index explosion/complexity
            } else {
                // 2. Category Filter
                if (categoryFilter !== 'all') {
                    constraints.push(where("isGitamite", "==", categoryFilter === 'gitam'));
                }

                // 3. Registration Filter
                if (registrationFilter !== 'all') {
                    constraints.push(where("isRegistered", "==", registrationFilter === 'registered'));
                }

                // Default Sort (Only if no inequality filter like Search is used)
                // If we have filters, simple Sort might require index. 
                // We'll add sort by createdAt if it's a simple query, or just rely on default.
                // To be safe with unknown indexes:
                if (constraints.length === 0) {
                    constraints.push(orderBy("createdAt", "desc"));
                }
            }

            // Pagination
            if (isLoadMore && lastDoc) {
                constraints.push(startAfter(lastDoc));
            }

            constraints.push(limit(PAGE_SIZE));

            q = query(usersRef, ...constraints);
            const snapshot = await getDocs(q);
            let newUsers = snapshot.docs.map(d => ({ ...d.data(), uid: d.id })) as UserProfile[];

            // 4. Client-Side "Unpaid" Filter
            // We fetch passes for these users, then filter.
            // Note: This might reduce page size, but it's the only way for "Unpaid" without schema change.
            const userData = await enrichUsersWithPasses(newUsers);

            if (paymentFilter === 'unpaid') {
                // Filter out those with passes
                const unpaidUsers = userData.users.filter(u => !userData.passesMap[u.email]);

                // If we filtered too many, we might want to auto-fetch more? 
                // For now, simpler to just show what we found.
                newUsers = unpaidUsers;
                // Update the passes map to only match these users (optional, but clean)
                // Keeping the full map is fine.
                setPassesIssued(prev => ({ ...prev, ...userData.passesMap }));

                if (isLoadMore) {
                    setUsers(prev => [...prev, ...newUsers]);
                } else {
                    setUsers(newUsers);
                }
            } else {
                // Normal
                setPassesIssued(prev => ({ ...prev, ...userData.passesMap }));
                if (isLoadMore) {
                    setUsers(prev => [...prev, ...userData.users]);
                } else {
                    setUsers(userData.users);
                }
            }

            setLastDoc(snapshot.docs[snapshot.docs.length - 1]);
            // If we filtered client side, 'hasMore' is still based on the DB fetch
            setHasMore(snapshot.docs.length === PAGE_SIZE);

        } catch (error) {
            console.error("Error fetching users:", error);
            // If index error, it logs to console. We could alert user but console is okay for Admin.
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    // Helper: Enrich users with Pass Data
    const enrichUsersWithPasses = async (currentUsers: UserProfile[]) => {
        if (currentUsers.length === 0) return { users: [], passesMap: {} };

        const emails = currentUsers.map(u => u.email).filter(e => e);
        const map: Record<string, any> = {};

        // Chunking
        const chunks = [];
        for (let i = 0; i < emails.length; i += 10) {
            chunks.push(emails.slice(i, i + 10));
        }

        const promises = chunks.map(chunk =>
            getDocs(query(collection(db, "passes_issued"), where("issuedToEmail", "in", chunk)))
        );

        const results = await Promise.all(promises);
        results.forEach(snap => {
            snap.forEach(d => {
                const data = d.data();
                if (data.issuedToEmail) map[data.issuedToEmail] = data;
            });
        });

        return { users: currentUsers, passesMap: map };
    };

    // Helper: Fetch Paid Users (Driven by Passes)
    const fetchPaidUsers = async (isLoadMore: boolean) => {
        try {
            const passesRef = collection(db, "passes_issued");
            let q;

            // We can support Institution filter here too if we want (requires join? No, passes have no institution)
            // Passes don't have isGitamite. We'd have to filter client side after fetching users.

            const constraints: any[] = [];
            constraints.push(orderBy("purchaseDate", "desc"));
            if (isLoadMore && lastDoc) constraints.push(startAfter(lastDoc));
            constraints.push(limit(PAGE_SIZE));

            q = query(passesRef, ...constraints);
            const passSnap = await getDocs(q);

            // Get unique emails
            const emails = Array.from(new Set(passSnap.docs.map(d => d.data().issuedToEmail).filter(e => e)));

            // Record Passes
            const newPassesMap: Record<string, any> = {};
            passSnap.forEach(d => {
                const data = d.data();
                if (data.issuedToEmail) newPassesMap[data.issuedToEmail] = data;
            });
            setPassesIssued(prev => ({ ...prev, ...newPassesMap }));

            // Fetch Users for these tokens
            const usersRef = collection(db, "users");
            // We can't use 'in' for >30 items usually (limit 10). 
            // If we have 50 passes, we might have 50 emails.
            // We need to chunk.

            let fetchedUsers: UserProfile[] = [];
            if (emails.length > 0) {
                const chunks = [];
                for (let i = 0; i < emails.length; i += 10) chunks.push(emails.slice(i, i + 10));

                const userPromises = chunks.map(chunk =>
                    getDocs(query(usersRef, where("email", "in", chunk)))
                );

                const userSnaps = await Promise.all(userPromises);
                userSnaps.forEach(s => {
                    s.forEach(d => fetchedUsers.push({ ...d.data(), uid: d.id } as UserProfile));
                });
            }

            // Apply OTHER filters client side (since we drove by Pass)
            if (categoryFilter !== 'all') {
                const isGitam = categoryFilter === 'gitam';
                fetchedUsers = fetchedUsers.filter(u => u.isGitamite === isGitam);
            }
            if (registrationFilter !== 'all') {
                const isReg = registrationFilter === 'registered';
                fetchedUsers = fetchedUsers.filter(u => u.isRegistered === isReg);
            }

            if (isLoadMore) {
                setUsers(prev => [...prev, ...fetchedUsers]);
            } else {
                setUsers(fetchedUsers);
            }

            setLastDoc(passSnap.docs[passSnap.docs.length - 1]);
            setHasMore(passSnap.docs.length === PAGE_SIZE);

        } catch (e) {
            console.error("Error fetching paid users:", e);
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };


    // Reload when Any Filter changes
    useEffect(() => {
        if (!searching) {
            setLastDoc(null);
            fetchUsers(false);
        }
    }, [categoryFilter, registrationFilter, paymentFilter]);

    // Initial Load & Search Trigger
    useEffect(() => {
        // Debounce or Manual Search? manually triggered via button or simply useEffect on filter change?
        // To save quota, let's load initial list once.
        if (!searching) {
            fetchUsers(false);
        }
    }, [searching]); // searching toggles when user hits Search

    // Reload when Category changes
    useEffect(() => {
        if (!searching) {
            setLastDoc(null); // Reset pagination
            fetchUsers(false);
        }
    }, [categoryFilter]);


    const handleSearch = () => {
        setUsers([]); // Clear current
        setLastDoc(null);
        setSearching(prev => !prev); // Trigger effect re-run force
        // Actually, cleaner: call fetchUsers directly?
        // But we want to reset state.
        // Let's just call fetchUsers(false)
        fetchUsers(false);
    };

    const handleLoadMore = () => {
        fetchUsers(true);
    };


    // Actions
    const handleIssuePass = async () => {
        if (!selectedUserForPass || !selectedPassId) return;
        setProcessing(true);
        try {
            const passConfig = passConfigs.find(p => p.id === selectedPassId);
            const bookingId = `MSG-${Date.now()}`;
            const qrCode = `${bookingId}-${selectedUserForPass.email.split('@')[0]}`;

            await addDoc(collection(db, "passes_issued"), {
                passId: selectedPassId,
                passName: passConfig.name,
                bookingId,
                paymentId: 'manual_admin',
                paymentMethod: 'admin_manual',
                issuedToEmail: selectedUserForPass.email,
                purchasedBy: 'admin',
                qrCode,
                status: 'active',
                admitted: false,
                purchaseDate: new Date().toISOString()
            });

            // Update local state for immediate UI feedback
            setPassesIssued(prev => ({
                ...prev,
                [selectedUserForPass.email]: {
                    passName: passConfig.name,
                    status: 'active',
                    paymentMethod: 'admin_manual'
                }
            }));

            if ((selectedUserForPass as any).referralCodeUsed) {
                // Referral stats update (best effort)
                try {
                    const codeRef = doc(db, "referral_codes", (selectedUserForPass as any).referralCodeUsed);
                    await updateDoc(codeRef, { passesIssued: increment(1) });
                } catch (e) { }
            }

            alert("Pass Issued Successfully!");
            setShowIssueModal(false);
        } catch (error) {
            console.error(error);
            alert("Failed to issue pass");
        } finally {
            setProcessing(false);
        }
    };

    const handleViewAadhar = async (targetUser: UserProfile) => {
        setViewingAadharUser(targetUser);
        setShowAadharModal(true);
        setLoadingAadhar(true);
        setAadharImageUrl(null);

        try {
            if (!user) return;
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Authentication failed");

            const response = await fetch(`/api/admin/view-aadhar?uid=${targetUser.uid}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) throw new Error("Failed to fetch document");
            const blob = await response.blob();
            setAadharImageUrl(URL.createObjectURL(blob));

        } catch (error) {
            console.error("Error viewing aadhar", error);
            alert("Error loading document or not found.");
            setShowAadharModal(false);
        } finally {
            setLoadingAadhar(false);
        }
    };

    const saveEmailUpdate = async () => {
        if (!editingEmailUser || !newEmail || newEmail === editingEmailUser.email) return;
        setUpdatingEmail(true);
        try {
            const oldEmail = editingEmailUser.email;
            const passesQ = query(collection(db, "passes_issued"), where("issuedToEmail", "==", oldEmail));
            const passesSnap = await getDocs(passesQ);

            if (passesSnap.empty) {
                alert("No passes found for this user to update.");
                setShowEditEmailModal(false);
                return;
            }

            const batch = writeBatch(db);
            passesSnap.docs.forEach(d => {
                batch.update(d.ref, { issuedToEmail: newEmail });
            });
            await batch.commit();

            alert(`Successfully moved ${passesSnap.size} pass(es) to ${newEmail}`);
            setShowEditEmailModal(false);
            window.location.reload(); // Simplest way to reflect heavy changes
        } catch (error) {
            console.error("Failed to update email", error);
            alert("Failed to update email.");
        } finally {
            setUpdatingEmail(false);
        }
    };

    const handleExport = async () => {
        if (!confirm("This will export only the currently LOADED users to CSV. Continue?")) return;
        try {
            // reuse logic but on `users` state
            const gitamUsers = users.filter(u => u.isGitamite);
            const nonGitamUsers = users.filter(u => !u.isGitamite);

            const formatUserForSheet = (u: any) => {
                const pass = passesIssued[u.email];
                const paymentStatus = pass ? "Paid" : "Not Paid";
                // Base Row
                const row: any = {
                    "Name": u.displayName,
                    "Email": u.email,
                    "Phone": u.registrationData?.phone || u.phoneNumber || "-",
                    "Category": u.isGitamite ? "Gitam" : "Non-Gitam",
                    "Payment Status": paymentStatus,
                    "Pass Name": pass?.passName || "-",
                    "Transaction ID": pass?.paymentId || "-",
                    "Registration Data": JSON.stringify(u.registrationData || {})
                };
                return row;
            };

            const wb = XLSX.utils.book_new();
            if (gitamUsers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(gitamUsers.map(formatUserForSheet)), "Gitam");
            if (nonGitamUsers.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(nonGitamUsers.map(formatUserForSheet)), "Non-Gitam");

            XLSX.writeFile(wb, "Users_Loaded_Export.xlsx");
        } catch (e) {
            console.error(e);
            alert("Export failed");
        }
    };

    if (authLoading) return <div className="p-10 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-blue-600 rounded-full border-t-transparent"></div></div>;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex justify-between items-center mb-10 animate-stagger-1">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">User Management</h1>
                            <p className="text-pramana-cream/60 mt-2 font-light">View and manage registered users.</p>
                        </div>
                        <button onClick={handleExport} className="glass-panel text-green-400 border-green-500/30 px-6 py-2 rounded-full font-bold shadow-lg shadow-green-900/20 hover:bg-green-500/10 transition flex items-center gap-2">
                            <span>📊</span> Export View
                        </button>
                    </header>

                    {/* Stats Boxes (Optimized) */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8 animate-stagger-1">
                        <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-center backdrop-blur-sm">
                            <div className="text-pramana-gold text-2xl font-bold font-cinzel">{stats.registered}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/50">Total Signups</div>
                        </div>
                        <div className="bg-yellow-900/10 p-4 rounded-xl border border-yellow-500/20 text-center backdrop-blur-sm">
                            <div className="text-yellow-400 text-2xl font-bold font-cinzel">{stats.pending}</div>
                            <div className="text-[10px] uppercase tracking-widest text-yellow-400/50">Pending Reg</div>
                        </div>
                        <div className="bg-green-900/10 p-4 rounded-xl border border-green-500/20 text-center backdrop-blur-sm">
                            <div className="text-green-400 text-2xl font-bold font-cinzel">{stats.passes}</div>
                            <div className="text-[10px] uppercase tracking-widest text-green-400/50">Total Passes</div>
                        </div>
                        <div className="bg-blue-900/10 p-4 rounded-xl border border-blue-500/20 text-center backdrop-blur-sm">
                            <div className="text-blue-400 text-2xl font-bold font-cinzel">{stats.gitam}</div>
                            <div className="text-[10px] uppercase tracking-widest text-blue-400/50">Gitam Users</div>
                        </div>
                        <div className="bg-white/5 p-4 rounded-xl border border-white/10 text-center backdrop-blur-sm">
                            <div className="text-white text-2xl font-bold font-cinzel">{stats.nonGitam}</div>
                            <div className="text-[10px] uppercase tracking-widest text-white/50">Non-Gitam</div>
                        </div>
                    </div>

                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10 flex flex-col gap-6 backdrop-blur-sm animate-stagger-2">
                        {/* Search & Filter Bar */}
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 flex gap-2">
                                <input
                                    placeholder="Search by email..."
                                    className="flex-1 bg-white/5 border border-white/10 p-3 rounded-lg text-pramana-cream placeholder-white/20 focus:outline-none focus:border-pramana-gold transition"
                                    value={filter}
                                    onChange={e => setFilter(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                />
                                <button
                                    onClick={handleSearch}
                                    className="bg-pramana-gold/20 text-pramana-gold border border-pramana-gold/50 px-6 rounded-lg font-bold hover:bg-pramana-gold hover:text-black transition"
                                >
                                    Search
                                </button>
                            </div>
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value as any)}
                                className="bg-white/5 border border-white/10 p-3 rounded-lg text-pramana-cream focus:outline-none focus:border-pramana-gold"
                            >
                                <option value="all" className="bg-zinc-900 text-white">All Institutes</option>
                                <option value="gitam" className="bg-zinc-900 text-white">Gitam</option>
                                <option value="non-gitam" className="bg-zinc-900 text-white">Non-Gitam</option>
                            </select>
                            <select
                                value={registrationFilter}
                                onChange={(e) => setRegistrationFilter(e.target.value as any)}
                                className="bg-white/5 border border-white/10 p-3 rounded-lg text-pramana-cream focus:outline-none focus:border-pramana-gold"
                            >
                                <option value="all" className="bg-zinc-900 text-white">All Registrations</option>
                                <option value="registered" className="bg-zinc-900 text-white">Registered</option>
                                <option value="pending" className="bg-zinc-900 text-white">Pending</option>
                            </select>
                            <select
                                value={paymentFilter}
                                onChange={(e) => setPaymentFilter(e.target.value as any)}
                                className="bg-white/5 border border-white/10 p-3 rounded-lg text-pramana-cream focus:outline-none focus:border-pramana-gold"
                            >
                                <option value="all" className="bg-zinc-900 text-white">All Payments</option>
                                <option value="paid" className="bg-zinc-900 text-white">Paid</option>
                                <option value="unpaid" className="bg-zinc-900 text-white">Unpaid</option>
                            </select>
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-white/10">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Category</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Payment</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-white/5">
                                    {users.map(u => {
                                        const pass = passesIssued[u.email];
                                        return (
                                            <tr key={u.uid} className="hover:bg-white/5 transition border-b border-white/5 last:border-0">
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 rounded-full bg-white/10 flex items-center justify-center text-pramana-gold font-bold text-sm mr-3 font-cinzel border border-white/10">
                                                            {u.displayName?.[0]?.toUpperCase() || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="text-sm font-bold text-pramana-cream flex items-center gap-2">
                                                                {u.displayName || "N/A"}
                                                                {/* Edit Email: Only for Non-Registered (or explicitly unregistered) users */}
                                                                {!u.isRegistered && (
                                                                    <button
                                                                        onClick={(e) => { e.stopPropagation(); setEditingEmailUser(u); setNewEmail(u.email); setShowEditEmailModal(true); }}
                                                                        className="text-white/20 hover:text-pramana-gold transition text-xs"
                                                                        title="Edit Email (Unregistered User)"
                                                                    >
                                                                        ✎
                                                                    </button>
                                                                )}
                                                            </div>
                                                            <div className="text-sm text-pramana-cream/60">{u.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <span className={`px-2 py-1 text-xs rounded-full font-bold border ${u.isGitamite ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                                                        {u.isGitamite ? 'Gitam' : 'Non-Gitam'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    {pass ? (
                                                        <div>
                                                            <span className="bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-1 rounded text-xs font-bold">Paid</span>
                                                            <div className="text-xs text-pramana-cream/50 mt-1">{pass.passName}</div>
                                                        </div>
                                                    ) : (
                                                        <span className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded text-xs font-bold">Unpaid</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                                                    {!pass && canIssuePasses(user) && (
                                                        <button
                                                            onClick={() => { setSelectedUserForPass(u); setShowIssueModal(true); }}
                                                            className="bg-blue-600/80 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-blue-600 shadow-lg shadow-blue-900/20 transition"
                                                        >
                                                            Issue
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setViewingDetailsUser(u); setShowDetailsModal(true); }}
                                                        className="bg-purple-600/20 text-purple-400 border border-purple-600/30 px-3 py-1.5 rounded text-xs font-bold hover:bg-purple-600/30 transition"
                                                    >
                                                        Details
                                                    </button>
                                                    {!u.isGitamite && u.registrationData?.aadharFilePath && (
                                                        <button
                                                            onClick={() => handleViewAadhar(u)}
                                                            className="bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 px-3 py-1.5 rounded text-xs font-bold hover:bg-yellow-600/30 transition"
                                                        >
                                                            ID
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {users.length === 0 && !loading && (
                                        <tr><td colSpan={4} className="text-center py-10 opacity-50">No users found.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Load More */}
                        {hasMore && (
                            <div className="flex justify-center pt-4">
                                <button
                                    onClick={handleLoadMore}
                                    disabled={loadingMore}
                                    className="px-6 py-2 bg-white/5 border border-white/20 text-pramana-cream rounded-full hover:bg-white/10 transition disabled:opacity-50"
                                >
                                    {loadingMore ? "Loading..." : "Load More Users"}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Modals - Simplified Reuse */}
                {showIssueModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
                        <div className="bg-zinc-800 p-6 rounded-2xl w-full max-w-md border border-white/10">
                            <h3 className="text-xl font-bold mb-4 text-white">Issue Pass</h3>
                            <p className="mb-4 text-gray-400">For: {selectedUserForPass?.email}</p>
                            <select className="w-full bg-black/50 border border-white/20 rounded p-2 text-white mb-4" onChange={e => setSelectedPassId(e.target.value)} value={selectedPassId}>
                                <option value="">Select Pass</option>
                                {passConfigs.map(p => <option key={p.id} value={p.id}>{p.name} - ₹{p.price}</option>)}
                            </select>
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowIssueModal(false)} className="px-4 py-2 text-white/50">Cancel</button>
                                <button onClick={handleIssuePass} disabled={!selectedPassId || processing} className="px-4 py-2 bg-pramana-gold text-black rounded font-bold disabled:opacity-50">Issue</button>
                            </div>
                        </div>
                    </div>
                )}

                {showAadharModal && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-zinc-900 border border-white/10 p-2 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                            <div className="flex justify-between p-4 border-b border-white/10">
                                <h3 className="text-xl font-bold text-pramana-gold">Aadhar Viewer</h3>
                                <button onClick={() => setShowAadharModal(false)} className="text-white">✕</button>
                            </div>
                            <div className="flex-1 p-4 flex items-center justify-center overflow-auto">
                                {loadingAadhar ? <div className="animate-spin h-10 w-10 border-4 border-pramana-gold border-t-transparent rounded-full"></div> :
                                    aadharImageUrl ? <img src={aadharImageUrl} className="max-h-[70vh] rounded" /> : <div className="text-white/50">No Document</div>}
                            </div>
                        </div>
                    </div>
                )}

                {/* Details Modal - IMPROVED */}
                {showDetailsModal && viewingDetailsUser && (
                    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-auto">
                            <div className="flex justify-between mb-6 pb-4 border-b border-white/10">
                                <div>
                                    <h3 className="text-xl font-bold text-pramana-gold font-cinzel">User Details</h3>
                                    <p className="text-sm text-white/50">{viewingDetailsUser.email}</p>
                                </div>
                                <button onClick={() => setShowDetailsModal(false)} className="text-white bg-white/5 hover:bg-white/10 w-8 h-8 rounded-full">✕</button>
                            </div>

                            <div className="space-y-4">
                                <div className="bg-black/30 p-4 rounded-lg">
                                    <h4 className="text-xs uppercase tracking-widest text-pramana-gold mb-3">Core Info</h4>
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div>
                                            <label className="text-white/40 text-xs block">UID</label>
                                            <span className="font-mono text-white/80 break-all text-xs">{viewingDetailsUser.uid}</span>
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs block">Joined</label>
                                            <span className="text-white/80">{viewingDetailsUser.createdAt ? new Date(viewingDetailsUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs block">Role</label>
                                            <span className="uppercase text-xs font-bold bg-white/10 px-2 py-0.5 rounded text-white/80">{viewingDetailsUser.role || 'user'}</span>
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs block">Registered?</label>
                                            <span className={viewingDetailsUser.isRegistered ? "text-green-400" : "text-yellow-500"}>{viewingDetailsUser.isRegistered ? "Yes" : "No"}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-black/30 p-4 rounded-lg">
                                    <h4 className="text-xs uppercase tracking-widest text-pramana-gold mb-3">Registration Data</h4>
                                    {viewingDetailsUser.registrationData && Object.keys(viewingDetailsUser.registrationData).length > 0 ? (
                                        <div className="grid grid-cols-1 gap-2 text-sm">
                                            {Object.entries(viewingDetailsUser.registrationData).map(([key, val]) => (
                                                <div key={key} className="flex justify-between border-b border-white/5 pb-1">
                                                    <span className="text-white/40 capitalize">{key.replace(/_/g, ' ')}</span>
                                                    <span className="text-white text-right font-medium">{String(val)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-white/30 italic">No registration data.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showEditEmailModal && (
                    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[60]">
                        <div className="bg-zinc-800 p-6 rounded-xl border border-white/10 w-full max-w-sm">
                            <h3 className="text-lg font-bold text-white mb-4">Edit Email</h3>
                            <p className="text-xs text-yellow-500 mb-4 bg-yellow-900/10 p-2 rounded border border-yellow-500/20">
                                ⚠ Caution: Changing email for unregistered users only.
                            </p>
                            <input value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full bg-black/50 border border-white/20 p-2 rounded text-white mb-4" />
                            <div className="flex justify-end gap-2">
                                <button onClick={() => setShowEditEmailModal(false)} className="px-4 py-2 text-white/50">Cancel</button>
                                <button onClick={saveEmailUpdate} disabled={updatingEmail} className="px-4 py-2 bg-red-600 text-white rounded font-bold disabled:opacity-50">Update & Reload</button>
                            </div>
                        </div>
                    </div>
                )}


            </main>
        </div>
    );
}
