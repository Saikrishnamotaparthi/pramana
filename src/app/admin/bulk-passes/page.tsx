"use client";

import { useEffect, useState } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { useAuth } from "@/hooks/useAuth";
import { db, auth } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, query, orderBy, where, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

// Types
interface BulkPassConfig {
    id?: string;
    name: string;
    memberCount: number;
    price: number; // Selling Price
    costPrice: number; // For discount calc
    paymentLink: string;
    status: 'active' | 'inactive' | 'coming_soon';
    features?: string[];
}

interface BulkPassRequest {
    id: string;
    mainUserEmail: string;
    memberEmails: string[];
    passConfigId: string;
    screenshotUrl?: string; // Legacy
    screenshotPath?: string; // New Secure Path
    status: 'pending' | 'approved' | 'rejected';
    submittedAt: any;
    transactionId?: string;
    rejectReason?: string;
    configName?: string;
    price?: number;
}

export default function AdminBulkPassesPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<'settings' | 'requests'>('requests');
    const [configs, setConfigs] = useState<BulkPassConfig[]>([]);
    const [requests, setRequests] = useState<BulkPassRequest[]>([]);

    // Modal & Form States
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [editingConfig, setEditingConfig] = useState<BulkPassConfig | null>(null);
    const [formData, setFormData] = useState<Partial<BulkPassConfig>>({
        name: "", memberCount: 4, price: 0, costPrice: 0, paymentLink: "", status: 'active'
    });

    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectReason, setRejectReason] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<BulkPassRequest | null>(null);
    const [processing, setProcessing] = useState(false);

    // Receipt Modal
    const [receiptModalOpen, setReceiptModalOpen] = useState(false);
    const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
    const [receiptLoading, setReceiptLoading] = useState(false);

    // Edit Emails State
    const [editedEmailsModalOpen, setEditedEmailsModalOpen] = useState(false);
    const [editedEmails, setEditedEmails] = useState<string[]>([]);

    // Initial Fetch
    useEffect(() => {
        if (!loading) {
            if (!user || user.role !== 'admin' && user.role !== 'superadmin') {
                router.push('/admin');
                return;
            }
            fetchConfigs();
            fetchRequests();
        }
    }, [user, loading, router]);

    const fetchConfigs = async () => {
        const q = query(collection(db, "bulk_pass_configs"), orderBy("name"));
        const snap = await getDocs(q);
        const loadedConfigs = snap.docs.map(d => ({ id: d.id, ...d.data() } as BulkPassConfig));
        setConfigs(loadedConfigs);
        return loadedConfigs;
    };

    const fetchRequests = async () => {
        // Ensure configs are loaded first for mapping
        const loadedConfigs = await fetchConfigs();

        const q = query(collection(db, "bulk_pass_requests"), orderBy("submittedAt", "desc"));
        const snap = await getDocs(q);

        const reqs = snap.docs.map(d => ({ id: d.id, ...d.data() } as BulkPassRequest));

        // Hydrate with config names
        const hydrated = reqs.map(r => {
            const cfg = loadedConfigs.find(c => c.id === r.passConfigId);
            return { ...r, configName: cfg?.name || "Unknown Pass", price: cfg?.price };
        });

        setRequests(hydrated);
    };

    // --- Config Handlers ---

    const handleSaveConfig = async () => {
        try {
            if (editingConfig) {
                await updateDoc(doc(db, "bulk_pass_configs", editingConfig.id!), formData);
            } else {
                await addDoc(collection(db, "bulk_pass_configs"), {
                    ...formData,
                    createdAt: serverTimestamp()
                });
            }
            setIsConfigModalOpen(false);
            setEditingConfig(null);
            fetchConfigs();
            resetForm();
        } catch (error) {
            console.error(error);
            alert("Error saving configuration");
        }
    };

    const handleEditConfig = (config: BulkPassConfig) => {
        setEditingConfig(config);
        setFormData(config);
        setIsConfigModalOpen(true);
    };

    const resetForm = () => {
        setFormData({ name: "", memberCount: 4, price: 0, costPrice: 0, paymentLink: "", status: 'active' });
    };

    // --- Request Handlers ---

    const handleApprove = async (req: BulkPassRequest) => {
        if (!confirm(`Approve request for ${req.mainUserEmail} + ${req.memberEmails.length} members? This will issue passes.`)) return;

        setProcessing(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/admin/bulk-pass/approve", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ requestId: req.id })
            });
            const data = await res.json();
            if (data.success) {
                alert("Request Approved & Passes Issued!");
                fetchRequests();
            } else {
                alert("Error: " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Approval Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleViewReceipt = async (requestId: string) => {
        setReceiptModalOpen(true);
        setReceiptLoading(true);
        setReceiptUrl(null);

        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch(`/api/admin/view-bulk-receipt?requestId=${requestId}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (!res.ok) throw new Error("Failed to load receipt");

            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            setReceiptUrl(url);
        } catch (error) {
            console.error(error);
            alert("Error loading receipt");
            setReceiptModalOpen(false);
        } finally {
            setReceiptLoading(false);
        }
    };

    const handleReject = async () => {
        if (!selectedRequest || !rejectReason) return;

        setProcessing(true);
        try {
            const token = await auth.currentUser?.getIdToken();
            if (!token) throw new Error("Not authenticated");

            const res = await fetch("/api/admin/bulk-pass/reject", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ requestId: selectedRequest.id, reason: rejectReason })
            });
            const data = await res.json();
            if (data.success) {
                alert("Request Rejected.");
                setRejectModalOpen(false);
                fetchRequests();
            } else {
                alert("Error: " + data.message);
            }
        } catch (e) {
            console.error(e);
            alert("Rejection Failed");
        } finally {
            setProcessing(false);
        }
    };

    const handleEditMembers = (req: BulkPassRequest) => {
        setSelectedRequest(req);
        // Filter out main user from the editable list to prevent duplication
        const membersOnly = (req.memberEmails || []).filter(e => e !== req.mainUserEmail);
        setEditedEmails(membersOnly);
        setEditedEmailsModalOpen(true);
    };

    const handleSaveMembers = async () => {
        if (!selectedRequest) return;
        setProcessing(true);
        try {
            // Direct Firestore update since admin has rights
            await updateDoc(doc(db, "bulk_pass_requests", selectedRequest.id), {
                memberEmails: editedEmails
            });
            alert("Group members updated successfully.");
            setEditedEmailsModalOpen(false);
            fetchRequests();
        } catch (error) {
            console.error("Error updating members:", error);
            alert("Failed to update members.");
        } finally {
            setProcessing(false);
        }
    };

    // Helper: Discount Calculation
    const getDiscount = (sp: number, cp: number) => {
        if (!cp || cp <= sp) return 0;
        return Math.round(((cp - sp) / cp) * 100);
    };

    if (loading) return null;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />

            <main className="admin-page-container">
                <div className="admin-content-wrapper">

                    <header className="flex justify-between items-center mb-10 animate-stagger-1">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Bulk Pass Management</h1>
                            <p className="text-pramana-cream/60 mt-2">Manage bulk offers and approve user requests.</p>
                        </div>

                        <div className="flex gap-4 p-1 bg-white/5 rounded-full border border-white/10">
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'requests' ? 'bg-pramana-gold text-black shadow-lg' : 'text-pramana-cream/50 hover:text-white'}`}
                            >
                                Requests
                            </button>
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`px-6 py-2 rounded-full font-bold transition-all ${activeTab === 'settings' ? 'bg-pramana-gold text-black shadow-lg' : 'text-pramana-cream/50 hover:text-white'}`}
                            >
                                Settings
                            </button>
                        </div>
                    </header>

                    {activeTab === 'settings' && (
                        <div className="animate-stagger-2">
                            <div className="flex justify-end mb-6">
                                <button
                                    onClick={() => { resetForm(); setIsConfigModalOpen(true); }}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition"
                                >
                                    + Create New Bulk Offer
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {configs.map(config => (
                                    <div key={config.id} className="glass-panel p-6 rounded-2xl border border-white/10 hover:border-pramana-gold/30 transition group">
                                        <div className="flex justify-between items-start mb-4">
                                            <h3 className="text-2xl font-cinzel font-bold text-white group-hover:text-pramana-gold transition">{config.name}</h3>
                                            <span className={`px-2 py-1 rounded text-xs uppercase font-bold ${(config as any).status === 'active' ? 'bg-green-500/20 text-green-400' :
                                                (config as any).status === 'closed' ? 'bg-red-500/20 text-red-400' :
                                                    (config as any).status === 'coming_soon' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {(config as any).status.replace('_', ' ')}
                                            </span>
                                        </div>

                                        <div className="space-y-2 mb-6 text-sm text-pramana-cream/70">
                                            <p className="flex justify-between"><span>Members:</span> <span className="font-bold text-white">{config.memberCount}</span></p>
                                            <p className="flex justify-between"><span>Price:</span> <span className="font-bold text-pramana-gold">₹{config.price}</span></p>
                                            <p className="flex justify-between"><span>Value (CP):</span> <span className="line-through text-white/40">₹{config.costPrice}</span></p>
                                            <p className="flex justify-between"><span>Discount:</span> <span className="text-green-400 font-bold">{getDiscount(config.price, config.costPrice)}% OFF</span></p>
                                        </div>

                                        <button
                                            onClick={() => handleEditConfig(config)}
                                            className="w-full py-2 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition text-sm font-bold uppercase tracking-wider"
                                        >
                                            Edit Configuration
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="animate-stagger-2">
                            {/* Analytics Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-pramana-gold/10 rounded-full blur-2xl group-hover:bg-pramana-gold/20 transition"></div>
                                    <h3 className="text-sm font-bold text-pramana-cream/60 uppercase tracking-widest mb-1">Bundles Issued</h3>
                                    <p className="text-4xl font-cinzel font-bold text-white group-hover:text-pramana-gold transition">
                                        {requests.filter(r => r.status === 'approved').length}
                                    </p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/10 rounded-full blur-2xl group-hover:bg-green-500/20 transition"></div>
                                    <h3 className="text-sm font-bold text-pramana-cream/60 uppercase tracking-widest mb-1">Total Passes</h3>
                                    <p className="text-4xl font-cinzel font-bold text-white group-hover:text-green-400 transition">
                                        {requests.filter(r => r.status === 'approved').reduce((acc, r) => acc + (r.memberEmails?.length || 0), 0)}
                                    </p>
                                </div>
                                <div className="glass-panel p-6 rounded-2xl border border-white/10 relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-20 h-20 bg-yellow-500/10 rounded-full blur-2xl group-hover:bg-yellow-500/20 transition"></div>
                                    <h3 className="text-sm font-bold text-pramana-cream/60 uppercase tracking-widest mb-1">Pending Approval</h3>
                                    <p className="text-4xl font-cinzel font-bold text-white group-hover:text-yellow-400 transition">
                                        {requests.filter(r => r.status === 'pending').length}
                                    </p>
                                </div>
                            </div>

                            {requests.length === 0 ? (
                                <div className="text-center py-20 text-pramana-cream/30 italic">No pending requests found.</div>
                            ) : (
                                <div className="space-y-4">
                                    {requests.map(req => (
                                        <div key={req.id} className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="text-xl font-bold text-white">{req.configName || "Bulk Pass"}</h3>
                                                    <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' :
                                                        req.status === 'approved' ? 'bg-green-500/10 text-green-500 border-green-500/20' :
                                                            'bg-red-500/10 text-red-500 border-red-500/20'
                                                        }`}>
                                                        {req.status}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-pramana-cream/60">Submitted by: <span className="text-white font-bold">{req.mainUserEmail}</span> • {new Date(req.submittedAt?.toDate()).toLocaleString()}</p>

                                                <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/5 inline-block min-w-[300px]">
                                                    <p className="text-xs uppercase tracking-widest text-pramana-cream/40 mb-2">Group Members ({req.memberEmails.length})</p>
                                                    <div className="space-y-1 max-h-32 overflow-y-auto pr-2">
                                                        {req.memberEmails.filter(e => e !== req.mainUserEmail).map((email, i) => (
                                                            <div key={i} className="text-xs flex items-center gap-2">
                                                                <span className="w-4 h-4 rounded-full bg-white/10 flex items-center justify-center text-[8px]">{i + 1}</span>
                                                                <span className="text-pramana-cream/80">{email}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-3 min-w-[200px]">
                                                <button
                                                    onClick={() => handleViewReceipt(req.id)}
                                                    className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-600/30 rounded-lg text-sm font-bold text-center hover:bg-blue-600/30 transition flex items-center justify-center gap-2"
                                                >
                                                    <span>📷</span> View Secure Proof
                                                </button>

                                                {req.status === 'pending' && (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleApprove(req)}
                                                            disabled={processing}
                                                            className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition shadow-lg shadow-green-900/20"
                                                        >
                                                            Approve
                                                        </button>
                                                        <button
                                                            onClick={() => handleEditMembers(req)}
                                                            disabled={processing}
                                                            className="px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/30 rounded-lg font-bold text-sm hover:bg-blue-600/20 transition"
                                                            title="Edit Members"
                                                        >
                                                            ✎
                                                        </button>
                                                        <button
                                                            onClick={() => { setSelectedRequest(req); setRejectModalOpen(true); }}
                                                            disabled={processing}
                                                            className="flex-1 px-4 py-2 bg-red-600/10 text-red-400 border border-red-600/30 rounded-lg font-bold text-sm hover:bg-red-600/20 transition"
                                                        >
                                                            Reject
                                                        </button>
                                                    </div>
                                                )}

                                                {req.status === 'approved' && (
                                                    <button
                                                        onClick={async () => {
                                                            if (!confirm("Are you sure? This will DELETE all issued passes for this group and reset the request to Pending.")) return;
                                                            setProcessing(true);
                                                            try {
                                                                const token = await auth.currentUser?.getIdToken();
                                                                const res = await fetch("/api/admin/bulk-pass/undo-approval", {
                                                                    method: "POST",
                                                                    headers: {
                                                                        "Content-Type": "application/json",
                                                                        "Authorization": `Bearer ${token}`
                                                                    },
                                                                    body: JSON.stringify({ requestId: req.id })
                                                                });
                                                                if ((await res.json()).success) {
                                                                    alert("Approval Undone. Passes Deleted.");
                                                                    fetchRequests();
                                                                } else {
                                                                    alert("Failed to undo.");
                                                                }
                                                            } catch (e) { console.error(e); }
                                                            finally { setProcessing(false); }
                                                        }}
                                                        className="mt-2 w-full px-4 py-2 bg-yellow-600/20 text-yellow-500 border border-yellow-600/30 rounded-lg text-sm font-bold hover:bg-yellow-600/30 transition flex items-center justify-center gap-2"
                                                    >
                                                        <span>↺</span> Undo Approval
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </main>

            {/* Config Modal */}
            {isConfigModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-8 relative">
                        <button onClick={() => setIsConfigModalOpen(false)} className="absolute top-4 right-4 text-white/40 hover:text-white">✕</button>
                        <h2 className="text-2xl font-cinzel font-bold text-white mb-6">{editingConfig ? 'Edit Config' : 'New Bulk Offer'}</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Offer Name</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                    value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Squad Pack Platinum"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Selling Price (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                        value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Cost Price (₹)</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                        value={formData.costPrice} onChange={e => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Member Count</label>
                                    <input
                                        type="number"
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                        value={formData.memberCount} onChange={e => setFormData({ ...formData, memberCount: Number(e.target.value) })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Status</label>
                                    <select
                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                        value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="active">Active</option>
                                        <option value="inactive">Inactive</option>
                                        <option value="coming_soon">Coming Soon</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs uppercase tracking-widest text-pramana-cream/50 mb-1">Payment Link</label>
                                <input
                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                    value={formData.paymentLink} onChange={e => setFormData({ ...formData, paymentLink: e.target.value })}
                                    placeholder="https://pages.razorpay.com/..."
                                />
                            </div>
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button onClick={() => setIsConfigModalOpen(false)} className="px-6 py-2 rounded-lg font-bold text-white/60 hover:text-white transition">Cancel</button>
                            <button onClick={handleSaveConfig} className="px-8 py-2 bg-pramana-gold text-black rounded-lg font-bold hover:bg-yellow-500 transition shadow-lg shadow-pramana-gold/20">Save</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Reject Modal */}
            {rejectModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-red-500/30 rounded-2xl w-full max-w-md p-8">
                        <h2 className="text-xl font-cinzel font-bold text-red-500 mb-4">Reject Request</h2>
                        <p className="text-white/60 mb-4 text-sm">Please provide a reason for rejection. This will be visible to the admin logs.</p>
                        <textarea
                            className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-red-500/50 min-h-[100px]"
                            placeholder="Reason for rejection..."
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                        ></textarea>
                        <div className="mt-6 flex justify-end gap-3">
                            <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-white/60 hover:text-white transition">Cancel</button>
                            <button onClick={handleReject} className="px-6 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 transition">Confirm Rejection</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Receipt Modal */}
            {receiptModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4" onClick={() => setReceiptModalOpen(false)}>
                    <div className="relative max-w-4xl max-h-[90vh] w-full flex flex-col items-center" onClick={e => e.stopPropagation()}>
                        <button
                            onClick={() => setReceiptModalOpen(false)}
                            className="absolute -top-12 right-0 text-white/60 hover:text-white text-xl p-2"
                        >
                            ✕ Close
                        </button>

                        {receiptLoading ? (
                            <div className="text-pramana-gold animate-pulse flex flex-col items-center gap-4">
                                <div className="h-12 w-12 border-4 border-pramana-gold border-t-transparent rounded-full animate-spin"></div>
                                <span>Decrypting Secure Proof...</span>
                            </div>
                        ) : receiptUrl ? (
                            <img
                                src={receiptUrl}
                                alt="Payment Proof"
                                className="max-w-full max-h-[85vh] object-contain rounded-lg border border-white/20 shadow-2xl"
                            />
                        ) : (
                            <div className="text-red-400">Failed to load receipt</div>
                        )}
                    </div>
                </div>
            )}

            {/* Email Edit Modal */}
            {editedEmailsModalOpen && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#111] border border-white/10 rounded-2xl w-full max-w-lg p-8">
                        <h2 className="text-xl font-cinzel font-bold text-white mb-4">Edit Group Members</h2>
                        <p className="text-white/60 mb-6 text-sm">Update email addresses for this request before approving.</p>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto mb-6 pr-2">
                            {/* Main User (Source) - Read Only */}
                            <div className="flex gap-2 opacity-50">
                                <span className="w-8 h-8 rounded-full bg-pramana-gold/20 flex items-center justify-center text-xs font-bold text-pramana-gold shrink-0">Main</span>
                                <input
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white/60 focus:outline-none cursor-not-allowed"
                                    value={selectedRequest.mainUserEmail}
                                    disabled
                                    title="Source Email (Cannot be edited)"
                                />
                            </div>

                            {/* Members - Editable */}
                            {editedEmails.map((email, i) => (
                                <div key={i} className="flex gap-2">
                                    <input
                                        className="flex-1 bg-white/5 border border-white/10 rounded-lg p-3 text-white focus:outline-none focus:border-pramana-gold"
                                        value={email}
                                        onChange={e => {
                                            const newEmails = [...editedEmails];
                                            newEmails[i] = e.target.value;
                                            setEditedEmails(newEmails);
                                        }}
                                        placeholder="Enter email address"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setEditedEmailsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-white/60 hover:text-white transition">Cancel</button>
                            <button onClick={handleSaveMembers} className="px-6 py-2 bg-pramana-gold text-black rounded-lg font-bold hover:bg-yellow-500 transition">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
