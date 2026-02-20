"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, getDocs, updateDoc, doc } from "firebase/firestore";
import { Loader2, ExternalLink, Plus, CheckCircle2, XCircle, ImageIcon } from "lucide-react";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";

interface Stall {
    id: string;
    name: string;
    category: string;
    status: string;
    bookedByUserId?: string;
    bookingId?: string;
}

interface Booking {
    id: string;
    userId: string;
    name: string;
    email: string;
    phone: string;
    stallId: string;
    stallName: string;
    status: string;
    createdAt: any;
}

export default function AdminFoodStallsPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();

    const [stalls, setStalls] = useState<Stall[]>([]);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    const [newStallCategory, setNewStallCategory] = useState<"B" | "C">("B");
    const [newStallName, setNewStallName] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [viewImageObj, setViewImageObj] = useState<{ url: string, name: string } | null>(null);

    useEffect(() => {
        if (!authLoading && (!user || (user.role !== 'admin' && user.role !== 'superadmin' && user.role !== 'food_admin'))) {
            router.replace("/admin");
            return;
        }
    }, [user, authLoading, router]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const stallsSnap = await getDocs(collection(db, "foodStalls"));
            const stallsData = stallsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Stall));
            stallsData.sort((a, b) => a.name.localeCompare(b.name));
            setStalls(stallsData);

            const bookingsSnap = await getDocs(collection(db, "foodStallBookings"));
            const bookingsData = bookingsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            bookingsData.sort((a, b) => {
                const timeA = a.createdAt?.toMillis() || 0;
                const timeB = b.createdAt?.toMillis() || 0;
                return timeB - timeA;
            });
            setBookings(bookingsData);

        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'food_admin')) {
            fetchData();
        }
    }, [user]);

    const handleAddStall = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newStallName.trim()) return;
        setIsAdding(true);

        try {
            const res = await fetch("/api/admin/foodstalls/add", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ category: newStallCategory, name: newStallName })
            });

            if (!res.ok) throw new Error("Failed to add stall");

            setNewStallName("");
            fetchData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setIsAdding(false);
        }
    };

    const handleAction = async (stallId: string, bookingId: string | undefined, action: string) => {
        if (!confirm(`Are you sure you want to ${action.replace("_", " ")}?`)) return;

        setActionLoading(stallId);
        try {
            const res = await fetch("/api/admin/foodstalls/action", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ stallId, bookingId, action })
            });

            if (!res.ok) throw new Error("Action failed");

            fetchData();
        } catch (error: any) {
            alert(error.message);
        } finally {
            setActionLoading(null);
        }
    };

    const viewScreenshot = async (bookingId: string) => {
        try {
            const res = await fetch(`/api/admin/view-foodstall-payment?bookingId=${bookingId}`);
            if (!res.ok) throw new Error("Failed to load screenshot");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setViewImageObj({ url, name: "Screenshot" });
        } catch (error: any) {
            alert(error.message);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "available": return "text-green-500 bg-green-500/10 border-green-500/20";
            case "sold_out": return "text-red-500 bg-red-500/10 border-red-500/20";
            case "hidden": return "text-gray-400 bg-gray-500/10 border-gray-500/20";
            case "pending": return "text-orange-500 bg-orange-500/10 border-orange-500/20";
            case "approved": return "text-green-400 bg-green-900/10 border-green-500/20";
            case "revoked": return "text-red-400 bg-red-900/10 border-red-500/20";
            default: return "text-white bg-white/10 border-white/20";
        }
    };

    if (authLoading || (!user && !authLoading)) {
        return <div className="min-h-screen bg-black" />;
    }

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <AdminSidebar />
            <main className="flex-1 p-6 md:p-12 overflow-y-auto w-full max-w-[100vw] lg:max-w-[calc(100vw-280px)] ml-auto mt-16 lg:mt-0 transition-all duration-300">

                <header className="mb-10">
                    <h1 className="text-3xl font-bold font-cinzel text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white">Food Stalls Management</h1>
                    <p className="text-white/60 mt-2 font-light">Add stalls, review bookings, and manage availability.</p>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
                    {/* ADD STALL CARD */}
                    <div className="bg-white/5 border border-white/10 p-6 rounded-2xl h-fit">
                        <h2 className="text-xl font-cinzel font-bold text-pramana-gold mb-4 flex items-center gap-2">
                            <Plus className="w-5 h-5" /> Add New Stall
                        </h2>
                        <form onSubmit={handleAddStall} className="space-y-4">
                            <div>
                                <label className="text-xs uppercase tracking-widest text-white/50 mb-1 block">Category</label>
                                <select
                                    value={newStallCategory}
                                    onChange={e => setNewStallCategory(e.target.value as "B" | "C")}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                >
                                    <option value="B">Category B (₹25k)</option>
                                    <option value="C">Category C (₹20k)</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-xs uppercase tracking-widest text-white/50 mb-1 block">Stall Name / Number</label>
                                <input
                                    type="text"
                                    required
                                    value={newStallName}
                                    onChange={e => setNewStallName(e.target.value)}
                                    placeholder="e.g. B1, B2, C1"
                                    className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={isAdding}
                                className="w-full bg-pramana-gold text-black font-bold py-3 rounded-lg hover:bg-yellow-500 transition-colors disabled:opacity-50"
                            >
                                {isAdding ? "Adding..." : "Add Stall"}
                            </button>
                        </form>
                    </div>

                    {/* STALLS LIST */}
                    <div className="lg:col-span-2 bg-white/5 border border-white/10 p-6 rounded-2xl">
                        <h2 className="text-xl font-cinzel font-bold text-pramana-gold mb-4 text-center md:text-left shadow-lg uppercase tracking-widest">
                            All Stalls
                        </h2>
                        {loading ? (
                            <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-pramana-gold" /></div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm whitespace-nowrap">
                                    <thead className="text-white/50 border-b border-white/10">
                                        <tr>
                                            <th className="pb-3 px-4 font-normal">Name</th>
                                            <th className="pb-3 px-4 font-normal">Category</th>
                                            <th className="pb-3 px-4 font-normal">Status</th>
                                            <th className="pb-3 px-4 font-normal">Options</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {stalls.map(stall => (
                                            <tr key={stall.id} className="hover:bg-white/5 transition-colors">
                                                <td className="py-3 px-4 font-bold">{stall.name}</td>
                                                <td className="py-3 px-4 text-white/70">Cat {stall.category}</td>
                                                <td className="py-3 px-4">
                                                    <span className={`px-2 py-1 rounded text-xs border uppercase tracking-wider ${getStatusColor(stall.status)}`}>
                                                        {stall.status}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4 flex gap-2 flex-wrap">
                                                    {stall.status === "available" && (
                                                        <button
                                                            disabled={actionLoading === stall.id}
                                                            onClick={() => handleAction(stall.id, undefined, "mark_sold_out")}
                                                            className="text-xs bg-red-900/30 text-red-500 px-3 py-1 rounded hover:bg-red-900/50 transition-colors"
                                                        >
                                                            Mark Sold Out
                                                        </button>
                                                    )}
                                                    {(stall.status === "sold_out" || stall.status === "hidden") && !stall.bookingId && (
                                                        <button
                                                            disabled={actionLoading === stall.id}
                                                            onClick={() => handleAction(stall.id, undefined, "mark_available")}
                                                            className="text-xs bg-green-900/30 text-green-500 px-3 py-1 rounded hover:bg-green-900/50 transition-colors"
                                                        >
                                                            Make Available
                                                        </button>
                                                    )}
                                                    {stall.status !== "hidden" && !stall.bookingId && (
                                                        <button
                                                            disabled={actionLoading === stall.id}
                                                            onClick={() => handleAction(stall.id, undefined, "hide")}
                                                            className="text-xs bg-gray-700/30 text-gray-300 px-3 py-1 rounded hover:bg-gray-700/50 transition-colors"
                                                        >
                                                            Hide
                                                        </button>
                                                    )}
                                                    {!stall.bookingId && (
                                                        <button
                                                            disabled={actionLoading === stall.id}
                                                            onClick={() => handleAction(stall.id, undefined, "delete")}
                                                            className="text-xs border border-red-500/50 text-red-500 px-3 py-1 rounded hover:bg-red-500 hover:text-white transition-colors"
                                                        >
                                                            Delete
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOOKINGS LIST */}
                <div className="bg-white/5 border border-white/10 p-6 rounded-2xl w-full">
                    <h2 className="text-xl font-cinzel font-bold text-pramana-gold mb-6 shadow-lg uppercase tracking-widest">
                        Booking Applications
                    </h2>
                    {loading ? (
                        <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-pramana-gold" /></div>
                    ) : (
                        <div className="overflow-x-auto w-full">
                            <table className="w-full text-left text-sm">
                                <thead className="text-white/50 border-b border-white/10 uppercase tracking-wider text-xs">
                                    <tr>
                                        <th className="pb-3 px-4 font-normal">Applicant</th>
                                        <th className="pb-3 px-4 font-normal">Stall</th>
                                        <th className="pb-3 px-4 font-normal">Date</th>
                                        <th className="pb-3 px-4 font-normal">Status</th>
                                        <th className="pb-3 px-4 font-normal">Payment</th>
                                        <th className="pb-3 px-4 font-normal">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {bookings.map(booking => (
                                        <tr key={booking.id} className="hover:bg-white/5 transition-colors">
                                            <td className="py-4 px-4 min-w-[200px]">
                                                <p className="font-bold text-white">{booking.name}</p>
                                                <p className="text-xs text-white/50">{booking.phone}</p>
                                                <p className="text-xs text-white/50">{booking.email}</p>
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className="font-mono text-pramana-gold bg-pramana-gold/10 px-2 py-1 rounded">
                                                    {booking.stallName}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4 text-xs text-white/50">
                                                {booking.createdAt ? new Date(booking.createdAt.toMillis()).toLocaleString() : 'N/A'}
                                            </td>
                                            <td className="py-4 px-4">
                                                <span className={`px-2 py-1 rounded text-[10px] font-bold border uppercase tracking-widest ${getStatusColor(booking.status)}`}>
                                                    {booking.status}
                                                </span>
                                            </td>
                                            <td className="py-4 px-4">
                                                <button
                                                    onClick={() => viewScreenshot(booking.id)}
                                                    className="flex items-center gap-1.5 text-xs bg-blue-900/30 text-blue-400 px-3 py-1.5 rounded hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                                                >
                                                    <ImageIcon className="w-3 h-3" /> View Proof
                                                </button>
                                            </td>
                                            <td className="py-4 px-4">
                                                <div className="flex flex-col sm:flex-row gap-2">
                                                    {booking.status === "pending" && (
                                                        <>
                                                            <button
                                                                disabled={actionLoading !== null}
                                                                onClick={() => handleAction(booking.stallId, booking.id, "approve")}
                                                                className="flex items-center gap-1 text-xs bg-green-600/20 text-green-500 border border-green-600/50 px-3 py-1.5 rounded hover:bg-green-600 hover:text-white transition-colors whitespace-nowrap"
                                                            >
                                                                <CheckCircle2 className="w-3 h-3" /> Approve
                                                            </button>
                                                            <button
                                                                disabled={actionLoading !== null}
                                                                onClick={() => handleAction(booking.stallId, booking.id, "revoke")}
                                                                className="flex items-center gap-1 text-xs bg-red-600/20 text-red-500 border border-red-600/50 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                                                            >
                                                                <XCircle className="w-3 h-3" /> Revoke
                                                            </button>
                                                        </>
                                                    )}
                                                    {booking.status === "approved" && (
                                                        <button
                                                            disabled={actionLoading !== null}
                                                            onClick={() => handleAction(booking.stallId, booking.id, "revoke")}
                                                            className="flex items-center gap-1 text-xs bg-red-600/20 text-red-500 border border-red-600/50 px-3 py-1.5 rounded hover:bg-red-600 hover:text-white transition-colors whitespace-nowrap"
                                                        >
                                                            <XCircle className="w-3 h-3" /> Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                    {bookings.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={6} className="py-8 text-center text-white/40">No bookings found.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

            </main>

            {/* SCREENSHOT MODAL */}
            {viewImageObj && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={() => { URL.revokeObjectURL(viewImageObj.url); setViewImageObj(null); }}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full" onClick={e => e.stopPropagation()}>
                        <button
                            className="absolute -top-10 right-0 text-white/50 hover:text-white transition-colors"
                            onClick={() => { URL.revokeObjectURL(viewImageObj.url); setViewImageObj(null); }}
                        >
                            Close
                        </button>
                        <img
                            src={viewImageObj.url}
                            alt={viewImageObj.name}
                            className="w-full h-full object-contain shadow-2xl rounded-lg"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
