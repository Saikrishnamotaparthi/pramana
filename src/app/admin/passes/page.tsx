"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { PassConfig } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";

export default function PassManagement() {
    const { user } = useAuth();
    const [passes, setPasses] = useState<PassConfig[]>([]);
    const [issuedCounts, setIssuedCounts] = useState<Record<string, number>>({});
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    // Form State
    const [formData, setFormData] = useState<Partial<PassConfig>>({
        type: 'single',
        active: true,
        status: 'available',
        groupSize: 1
    });

    const fetchPasses = async () => {
        setLoading(true);
        try {
            // Fetch Configs
            const snap = await getDocs(collection(db, "passes_config"));
            const data = snap.docs.map(d => ({ ...d.data(), id: d.id })) as PassConfig[];

            // Fetch Issued Passes for Count Validation
            const issuedSnap = await getDocs(collection(db, "passes_issued"));
            const counts: Record<string, number> = {};
            issuedSnap.forEach(doc => {
                const passId = doc.data().passId;
                counts[passId] = (counts[passId] || 0) + 1;
            });

            setPasses(data);
            setIssuedCounts(counts);
        } catch (error) {
            console.error("Error fetching passes:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPasses();
    }, []);

    const handleSave = async () => {
        try {
            if (editingId) {
                // Update existing
                const docRef = doc(db, "passes_config", editingId);
                // Remove id from data if present to avoid overwrite error or data duplication
                const { id, ...updateData } = formData as any;
                await updateDoc(docRef, updateData);
            } else {
                // Create new
                await addDoc(collection(db, "passes_config"), {
                    ...formData,
                    sold: 0
                });
            }

            resetForm();
            fetchPasses();
        } catch (error) {
            console.error("Error saving pass", error);
            alert("Failed to save pass");
        }
    };

    const handleDelete = async (pass: PassConfig) => {
        if (!confirm(`Are you sure you want to PERMANENTLY DELETE "${pass.name}"? This action cannot be undone.`)) return;

        try {
            // Double check safety
            if ((issuedCounts[pass.id] || 0) > 0) {
                alert("Cannot delete: Passes of this type have already been issued.");
                return;
            }

            await deleteDoc(doc(db, "passes_config", pass.id));
            alert("Pass type deleted successfully.");
            fetchPasses();
        } catch (error) {
            console.error("Delete failed", error);
            alert("Failed to delete pass type");
        }
    };

    const handleEdit = (pass: PassConfig) => {
        setFormData(pass);
        setEditingId(pass.id);
        setShowForm(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setShowForm(false);
        setEditingId(null);
        setFormData({ type: 'single', active: true, status: 'available', groupSize: 1, showRemaining: true, category: 'all', paymentLink: '' });
    };

    const toggleActive = async (id: string, current: boolean) => {
        await updateDoc(doc(db, "passes_config", id), { active: !current });
        fetchPasses();
    };

    const updateStatus = async (id: string, status: string) => {
        await updateDoc(doc(db, "passes_config", id), { status });
        fetchPasses();
    };

    const isViewOnly = user?.role === 'view_admin';

    // Helper to render status badge
    const StatusBadge = ({ status }: { status: string }) => {
        let colorClass = 'bg-gray-100 text-gray-800';
        if (status === 'available') colorClass = 'bg-green-100 text-green-800';
        else if (status === 'sold_out') colorClass = 'bg-red-100 text-red-800';
        else if (status === 'coming_soon') colorClass = 'bg-yellow-100 text-yellow-800';

        return (
            <span className={`px-2 py-1 text-xs rounded uppercase font-bold ${colorClass}`}>
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex justify-between items-center mb-10 animate-stagger-1">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Pass Management</h1>
                            <p className="text-pramana-cream/60 mt-2 font-light">Create and control event access types.</p>
                        </div>
                        {!isViewOnly && !showForm && (
                            <button
                                onClick={() => setShowForm(true)}
                                className="bg-pramana-gold text-black px-5 py-2.5 rounded-lg font-bold hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20 flex items-center gap-2"
                            >
                                <span>+</span> Create New Pass
                            </button>
                        )}
                    </header>

                    <div className="flex flex-col xl:flex-row gap-8 animate-stagger-2">
                        {/* Form Section */}
                        {showForm && (
                            <div className="w-full xl:w-1/3 order-1 xl:order-2">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 sticky top-8 animate-fade-in-up backdrop-blur-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold font-cinzel text-pramana-gold">{editingId ? 'Edit Configuration' : 'New Pass Configuration'}</h2>
                                        <button onClick={resetForm} className="text-pramana-cream/50 hover:text-red-400 transition">
                                            ✕
                                        </button>
                                    </div>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Pass Name</label>
                                            <input placeholder="e.g. Early Bird" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                onChange={e => setFormData({ ...formData, name: e.target.value })} value={formData.name || ''} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Price (₹)</label>
                                                <input type="number" placeholder="0" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} value={formData.price || ''} />
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Quantity Limit</label>
                                                <input type="number" placeholder="100" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    onChange={e => setFormData({ ...formData, limit: Number(e.target.value) })} value={formData.limit || ''} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Payment Link</label>
                                            <input placeholder="https://..." className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                onChange={e => setFormData({ ...formData, paymentLink: e.target.value })} value={formData.paymentLink || ''} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Type</label>
                                                <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    onChange={e => setFormData({ ...formData, type: e.target.value as any })} value={formData.type}>
                                                    <option value="single" className="bg-black">Single</option>
                                                    <option value="group" className="bg-black">Group</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Status</label>
                                                <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    onChange={e => setFormData({ ...formData, status: e.target.value as any })} value={formData.status}>
                                                    <option value="available" className="bg-black">Available</option>
                                                    <option value="sold_out" className="bg-black">Sold Out</option>
                                                    <option value="coming_soon" className="bg-black">Coming Soon</option>
                                                </select>
                                            </div>
                                        </div>
                                        {formData.type === 'group' && (
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Group Size</label>
                                                <input type="number" placeholder="Size" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    onChange={e => setFormData({ ...formData, groupSize: Number(e.target.value) })} value={formData.groupSize || ''} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Description</label>
                                            <textarea placeholder="Benefits..." className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition min-h-[100px]"
                                                onChange={e => setFormData({ ...formData, description: e.target.value })} value={formData.description || ''} />
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <input type="checkbox" id="active" className="w-5 h-5 text-pramana-gold rounded focus:ring-pramana-gold bg-black/50 border-white/30"
                                                checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                                            <label htmlFor="active" className="text-sm font-medium text-pramana-cream">Make Active (Visible to users)</label>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <input type="checkbox" id="showRemaining" className="w-5 h-5 text-pramana-gold rounded focus:ring-pramana-gold bg-black/50 border-white/30"
                                                checked={formData.showRemaining || false} onChange={e => setFormData({ ...formData, showRemaining: e.target.checked })} />
                                            <label htmlFor="showRemaining" className="text-sm font-medium text-pramana-cream">Show Remaining Count</label>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Target Audience</label>
                                            <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                onChange={e => setFormData({ ...formData, category: e.target.value as any })} value={formData.category || 'all'}>
                                                <option value="all" className="bg-black">Everyone</option>
                                                <option value="gitam" className="bg-black">Gitamites Only</option>
                                                <option value="non-gitam" className="bg-black">Non-Gitamites Only</option>
                                            </select>
                                        </div>
                                        <button onClick={handleSave} className="w-full bg-pramana-gold text-black py-3 rounded-lg font-bold hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20">
                                            {editingId ? 'Update Configuration' : 'Create Pass'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List Section */}
                        <div className="flex-1 order-2 xl:order-1">
                            {loading ? <div className="text-center py-20 text-pramana-cream/50 italic">Loading passes...</div> : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {passes.length === 0 && <div className="col-span-2 text-center py-12 text-pramana-cream/50 bg-white/5 rounded-2xl border border-dashed border-white/10">No passes found. Create one to get started.</div>}
                                    {passes.map(pass => {
                                        const issueCount = issuedCounts[pass.id] || 0;
                                        return (
                                            <div key={pass.id} className={`bg-white/5 rounded-2xl p-6 shadow-sm border transition hover:bg-white/10 relative overflow-hidden group ${pass.active ? 'border-white/10' : 'border-white/5 opacity-60'}`}>
                                                <div className={`absolute top-0 left-0 w-1 h-full ${pass.active ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                                                <div className="flex justify-between items-start mb-4 pl-2">
                                                    <div>
                                                        <h3 className="text-lg font-bold text-pramana-gold group-hover:text-yellow-400 transition font-cinzel">{pass.name}</h3>
                                                        <p className="text-pramana-cream/60 text-xs mt-1">{pass.description}</p>
                                                    </div>
                                                    <StatusBadge status={pass.status} />
                                                </div>

                                                <div className="pl-2 space-y-2 mb-6">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-pramana-cream/60">Price</span>
                                                        <span className="font-bold text-pramana-cream">₹{pass.price}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-pramana-cream/60">Sold</span>
                                                        <span className="font-bold text-pramana-cream">{pass.sold} <span className="text-pramana-cream/40 font-normal">/ {pass.limit}</span></span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-pramana-cream/60">Issued (Realtime)</span>
                                                        <span className="font-bold text-pramana-cream">{issueCount}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-pramana-cream/60">Type</span>
                                                        <span className="text-pramana-cream capitalize">{pass.type} {pass.type === 'group' && `(${pass.groupSize})`}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-sm">
                                                        <span className="text-pramana-cream/60">Audience</span>
                                                        <span className="font-bold text-pramana-cream capitalize">{pass.category || 'All'}</span>
                                                    </div>
                                                </div>

                                                {!isViewOnly && (
                                                    <div className="pl-2 pt-4 border-t border-white/10">
                                                        <div className="flex gap-2 mb-3">
                                                            <button onClick={() => updateStatus(pass.id, 'available')} className="flex-1 py-1.5 text-xs font-medium rounded bg-green-900/40 text-green-400 hover:bg-green-900/60 border border-green-500/20 transition">Open</button>
                                                            <button onClick={() => updateStatus(pass.id, 'coming_soon')} className="flex-1 py-1.5 text-xs font-medium rounded bg-yellow-900/40 text-yellow-400 hover:bg-yellow-900/60 border border-yellow-500/20 transition">Soon</button>
                                                            <button onClick={() => updateStatus(pass.id, 'sold_out')} className="flex-1 py-1.5 text-xs font-medium rounded bg-red-900/40 text-red-400 hover:bg-red-900/60 border border-red-500/20 transition">Closed</button>
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button onClick={() => handleEdit(pass)} className="flex-1 py-2 text-sm font-semibold rounded-lg border border-white/20 text-pramana-cream hover:bg-white/10 transition">
                                                                Edit
                                                            </button>
                                                            <button onClick={() => toggleActive(pass.id, pass.active)} className={`flex-1 py-2 text-sm font-semibold rounded-lg text-white transition ${pass.active ? 'bg-white/10 hover:bg-white/20' : 'bg-green-600 hover:bg-green-700'}`}>
                                                                {pass.active ? 'Hide' : 'Show'}
                                                            </button>
                                                            {issueCount === 0 && (
                                                                <button onClick={() => handleDelete(pass)} className="flex-1 py-2 text-sm font-semibold rounded-lg bg-red-900/20 text-red-500 border border-red-500/30 hover:bg-red-900/40 transition">
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
