"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, orderBy, doc, updateDoc } from "firebase/firestore";
import { UserProfile } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function ManageAdmins() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [users, setUsers] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState("");

    useEffect(() => {
        if (!authLoading && user?.role !== 'superadmin') {
            router.push("/admin");
            return;
        }

        const fetchUsers = async () => {
            const q = query(collection(db, "users"));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ ...d.data(), uid: d.id })) as UserProfile[];
            setUsers(data);
            setLoading(false);
        };
        fetchUsers();
    }, [user, authLoading, router]);

    const handleRoleUpdate = async (uid: string, newRole: string) => {
        if (newRole === 'superadmin') return alert("Cannot create another Super Admin from here.");
        if (!confirm(`Change role to ${newRole}?`)) return;

        try {
            await updateDoc(doc(db, "users", uid), { role: newRole });
            setUsers(users.map(u => u.uid === uid ? { ...u, role: newRole as any } : u));
        } catch (error) {
            console.error(error);
            alert("Failed to update role");
        }
    };

    const filteredUsers = users.filter(u => {
        const matchesFilter = u.email.toLowerCase().includes(filter.toLowerCase());
        // If searching, search ALL users. If not searching, show ONLY admins.
        if (filter) return matchesFilter;
        return u.role !== 'user';
    });

    const [showAddModal, setShowAddModal] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [foundUser, setFoundUser] = useState<UserProfile | null>(null);

    const checkUser = () => {
        const u = users.find(user => user.email.toLowerCase() === searchTerm.toLowerCase());
        setFoundUser(u || null);
        if (!u) alert("User not found. Ensure they have registered.");
    };

    if (authLoading || loading) return <div className="p-8">Loading...</div>;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex justify-between items-center mb-10 animate-stagger-1">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Manage Admins</h1>
                            <p className="text-pramana-cream/60 mt-2 font-light">Update roles and permissions (Super Admin Only).</p>
                        </div>
                        <button
                            onClick={() => { setShowAddModal(true); setSearchTerm(""); setFoundUser(null); }}
                            className="glass-panel text-pramana-gold border-pramana-gold/30 px-6 py-2 rounded-full font-bold shadow-lg shadow-pramana-gold/10 hover:bg-white/10 transition flex items-center gap-2"
                        >
                            <span>+</span> Add New Admin
                        </button>
                    </header>

                    <div className="glass-panel p-6 rounded-2xl shadow-2xl border border-white/10 flex flex-col gap-6 backdrop-blur-xl animate-stagger-2">
                        <input
                            placeholder="Search admins..."
                            className="w-full md:w-96 bg-black/50 border border-white/10 p-3 rounded-xl focus:outline-none focus:border-pramana-gold text-white transition placeholder:text-white/30"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        />

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">User</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Current Role</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-white/10">
                                    {filteredUsers.map(u => (
                                        <tr key={u.uid} className="hover:bg-white/5 transition">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="h-10 w-10 rounded-full bg-pramana-gold/20 flex items-center justify-center text-pramana-gold font-bold text-sm mr-3 border border-pramana-gold/30">
                                                        {u.displayName?.[0]?.toUpperCase() || 'U'}
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-bold text-white font-cinzel">{u.displayName}</div>
                                                        <div className="text-sm text-pramana-cream/60">{u.email}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-2 py-1 text-xs rounded-full font-bold capitalize border
                                                ${u.role === 'superadmin' ? 'bg-purple-900/40 text-purple-400 border-purple-500/30' :
                                                        u.role === 'admin' ? 'bg-blue-900/40 text-blue-400 border-blue-500/30' :
                                                            u.role === 'view_admin' ? 'bg-yellow-900/40 text-yellow-400 border-yellow-500/30' :
                                                                u.role === 'marketing_admin' ? 'bg-orange-900/40 text-orange-400 border-orange-500/30' :
                                                                    u.role === 'cul_admin' ? 'bg-pink-900/40 text-pink-400 border-pink-500/30' : 'bg-gray-800 text-gray-400 border-gray-600'}`}>
                                                    {u.role.replace('_', ' ')}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                                                {u.role !== 'superadmin' && (
                                                    <>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-green-900/30 text-green-400 hover:bg-green-900/50 border border-green-500/30'}`}>
                                                            Make Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'view_admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'view_admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-yellow-900/30 text-yellow-400 hover:bg-yellow-900/50 border border-yellow-500/30'}`}>
                                                            Make View Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'entry_admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'entry_admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-purple-900/30 text-purple-400 hover:bg-purple-900/50 border border-purple-500/30'}`}>
                                                            Entry Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'marketing_admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'marketing_admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-orange-900/30 text-orange-400 hover:bg-orange-900/50 border border-orange-500/30'}`}>
                                                            Marketing Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'ppass_admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'ppass_admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-cyan-900/30 text-cyan-400 hover:bg-cyan-900/50 border border-cyan-500/30'}`}>
                                                            PPASS Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'cul_admin')}
                                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition ${u.role === 'cul_admin' ? 'bg-white/5 text-gray-500 cursor-not-allowed' : 'bg-pink-900/30 text-pink-400 hover:bg-pink-900/50 border border-pink-500/30'}`}>
                                                            Cultural Admin
                                                        </button>
                                                        <button onClick={() => handleRoleUpdate(u.uid, 'user')}
                                                            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-500/30 transition">
                                                            Revoke
                                                        </button>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {showAddModal && (
                        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                            <div className="bg-zinc-900 border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                                <h2 className="text-xl font-bold mb-4 font-cinzel text-pramana-gold">Add New Admin</h2>
                                <p className="text-pramana-cream/60 text-sm mb-4">Enter the email of a registered user to promote them.</p>

                                <div className="flex gap-2 mb-4">
                                    <input
                                        className="flex-1 bg-black/50 border border-white/10 p-2 rounded-lg text-white focus:outline-none focus:border-pramana-gold"
                                        placeholder="user@example.com"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                    <button onClick={checkUser} className="bg-pramana-gold text-black px-4 rounded-lg font-bold hover:bg-yellow-500 transition">Search</button>
                                </div>

                                {foundUser && (
                                    <div className="bg-white/5 p-4 rounded-lg mb-4 border border-white/10">
                                        <p className="font-bold text-pramana-cream font-cinzel">{foundUser.displayName}</p>
                                        <p className="text-sm text-pramana-cream/60">{foundUser.email}</p>
                                        <p className="text-xs mt-1 text-pramana-gold">Current Role: {foundUser.role}</p>
                                        <div className="flex gap-2 mt-3 flex-wrap">
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'admin'); setShowAddModal(false); }}
                                                className="bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Make Admin
                                            </button>
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'view_admin'); setShowAddModal(false); }}
                                                className="bg-yellow-600/20 text-yellow-400 border border-yellow-500/30 hover:bg-yellow-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Make View Admin
                                            </button>
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'entry_admin'); setShowAddModal(false); }}
                                                className="bg-purple-600/20 text-purple-400 border border-purple-500/30 hover:bg-purple-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Entry Admin
                                            </button>
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'marketing_admin'); setShowAddModal(false); }}
                                                className="bg-orange-600/20 text-orange-400 border border-orange-500/30 hover:bg-orange-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Marketing Admin
                                            </button>
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'ppass_admin'); setShowAddModal(false); }}
                                                className="bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Physical Pass Admin
                                            </button>
                                            <button
                                                onClick={() => { handleRoleUpdate(foundUser.uid, 'cul_admin'); setShowAddModal(false); }}
                                                className="bg-pink-600/20 text-pink-400 border border-pink-500/30 hover:bg-pink-600/30 px-3 py-1 rounded text-sm font-bold transition"
                                            >
                                                Cultural Admin
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="flex justify-end">
                                    <button onClick={() => setShowAddModal(false)} className="text-pramana-cream/50 hover:text-white font-bold transition">Close</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}
