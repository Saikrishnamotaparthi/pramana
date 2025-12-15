"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Coupon } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import AdminSidebar from "@/components/AdminSidebar";

export default function CouponManagement() {
    const { user } = useAuth();
    const [coupons, setCoupons] = useState<Coupon[]>([]);
    const [passConfigs, setPassConfigs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [categoryFilter, setCategoryFilter] = useState<'gitam' | 'non-gitam' | 'both'>('both');

    const [formData, setFormData] = useState<Partial<Coupon>>({
        discountType: 'amount',
        active: true,
        applicableTo: ['all'],
        value: 0,
        limit: 100
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Coupons
            const couponsSnap = await getDocs(collection(db, "coupons"));
            const couponData = couponsSnap.docs.map(d => ({ ...d.data(), id: d.id })) as any[];
            setCoupons(couponData);

            // Fetch Passes
            const passesSnap = await getDocs(collection(db, "passes_config"));
            const passData = passesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            setPassConfigs(passData);
        } catch (error) {
            console.error("Error fetching data", error);
        }
        setLoading(false);
    };

    useEffect(() => { fetchData(); }, []);

    // Reset category filter when form opens/edits
    useEffect(() => {
        if (!showForm) {
            setCategoryFilter('both');
        }
    }, [showForm]);

    const handleSave = async () => {
        try {
            if (!formData.code || !formData.value) return alert("Code and Value are required");

            const payload = {
                ...formData,
                // Ensure applicableTo is array
                applicableTo: Array.isArray(formData.applicableTo) ? formData.applicableTo : [formData.applicableTo || 'all'],
                used: formData.used || 0
            };

            if (editingId) {
                await updateDoc(doc(db, "coupons", editingId), payload);
            } else {
                await addDoc(collection(db, "coupons"), payload);
            }

            setShowForm(false);
            setEditingId(null);
            setFormData({ discountType: 'amount', active: true, applicableTo: ['all'], value: 0, limit: 100 });
            fetchData();
        } catch (error) {
            console.error("Error saving coupon", error);
            alert("Error saving coupon");
        }
    };

    const handleEdit = (coupon: any) => {
        setFormData({
            code: coupon.code,
            discountType: coupon.discountType,
            value: coupon.value,
            limit: coupon.limit,
            active: coupon.active,
            applicableTo: Array.isArray(coupon.applicableTo) ? coupon.applicableTo : [coupon.applicableTo]
        });
        setEditingId(coupon.id);
        setShowForm(true);
    };

    const handleDelete = async (id: string) => {
        if (user?.role === 'view_admin') return;
        if (confirm("Are you sure?")) {
            await deleteDoc(doc(db, "coupons", id));
            fetchData();
        }
    };

    const toggleApplicable = (item: string) => {
        const current = Array.isArray(formData.applicableTo) ? [...formData.applicableTo] : [];
        if (item === 'all') {
            if (current.includes('all')) return setFormData({ ...formData, applicableTo: [] });
            else return setFormData({ ...formData, applicableTo: ['all'] });
        }

        if (current.includes(item)) {
            setFormData({ ...formData, applicableTo: current.filter(i => i !== item) });
        } else {
            // Remove 'all' if user starts selecting specific items
            const newArr = [...current.filter(i => i !== 'all'), item];
            setFormData({ ...formData, applicableTo: newArr });
        }
    };

    const isViewOnly = user?.role === 'view_admin';

    // Helper to check if checked
    const isChecked = (item: string) => {
        const arr = Array.isArray(formData.applicableTo) ? formData.applicableTo : [];
        return arr.includes(item);
    };

    // Filter logic for checkboxes
    const filteredPasses = passConfigs.filter(p => {
        // Strict filtering based on user request "we have three cat only..."
        if (categoryFilter === 'gitam') return p.category === 'gitam';
        if (categoryFilter === 'non-gitam') return p.category === 'non-gitam';
        if (categoryFilter === 'both') return p.category === 'all' || !p.category; // Assuming 'all' or missing is 'both'
        return false;
    });

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <AdminSidebar />
            <main className="flex-1 p-8 overflow-y-auto max-h-screen bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black">
                <header className="flex justify-between items-center mb-8">
                    <div>
                        <h1 className="text-3xl font-cinzel font-bold text-pramana-gold">Coupon Management</h1>
                        <p className="text-pramana-cream/60 mt-1">Manage discounts and promo codes.</p>
                    </div>
                    {!isViewOnly && (
                        <button
                            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ discountType: 'amount', active: true, applicableTo: ['all'], value: 0, limit: 100 }); }}
                            className={`px-5 py-2.5 rounded-lg font-bold transition shadow-lg flex items-center gap-2 ${showForm ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-pramana-gold text-black hover:bg-yellow-500 shadow-yellow-900/20'}`}
                        >
                            {showForm ? "Cancel" : "Create Coupon"}
                        </button>
                    )}
                </header>

                <div className="flex flex-col xl:flex-row gap-8">
                    {/* Form */}
                    {!isViewOnly && showForm && (
                        <div className="w-full xl:w-1/3 order-1 xl:order-2">
                            <div className="bg-white/5 p-6 rounded-2xl border border-white/10 sticky top-8 animate-fade-in-up backdrop-blur-sm">
                                <h3 className="text-xl font-bold text-pramana-gold font-cinzel mb-6">{editingId ? "Edit Coupon" : "New Coupon"}</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-sm font-medium text-pramana-cream block mb-1">Coupon Code</label>
                                        <input placeholder="e.g. SAVE50" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition uppercase"
                                            value={formData.code || ""}
                                            onChange={e => setFormData({ ...formData, code: e.target.value.toUpperCase() })} />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Type</label>
                                            <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                onChange={e => setFormData({ ...formData, discountType: e.target.value as any })} value={formData.discountType}>
                                                <option value="amount" className="bg-black">Amount (₹)</option>
                                                <option value="percentage" className="bg-black">Percent (%)</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Value</label>
                                            <input type="number" placeholder="0" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                value={formData.value || ""}
                                                onChange={e => setFormData({ ...formData, value: Number(e.target.value) })} />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-pramana-cream block mb-1">Filter Passes By Category</label>
                                        <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition mb-3"
                                            onChange={e => setCategoryFilter(e.target.value as any)} value={categoryFilter}>
                                            <option value="both" className="bg-black">Applicable To Both</option>
                                            <option value="gitam" className="bg-black">Gitamite Only</option>
                                            <option value="non-gitam" className="bg-black">Non-Gitamite Only</option>
                                        </select>

                                        <label className="text-sm font-medium text-pramana-cream block mb-2">Applicable To (Select Specific Passes)</label>
                                        <div className="border border-white/10 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2 bg-black/30">

                                            {/* Broad Scope Options based on Filter - Contextual */}
                                            {(categoryFilter === 'both') && (
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                                    <input type="checkbox" checked={isChecked('all')} onChange={() => toggleApplicable('all')} className="w-4 h-4 text-pramana-gold rounded bg-black/50 border-white/30" />
                                                    <span className="font-bold text-pramana-cream">Everything (All Passes)</span>
                                                </label>
                                            )}

                                            {(categoryFilter === 'gitam') && (
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                                    <input type="checkbox" checked={isChecked('gitam')} onChange={() => toggleApplicable('gitam')} className="w-4 h-4 text-pramana-gold rounded bg-black/50 border-white/30" />
                                                    <span className="font-bold text-blue-400">All Gitam Categories</span>
                                                </label>
                                            )}

                                            {(categoryFilter === 'non-gitam') && (
                                                <label className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                                    <input type="checkbox" checked={isChecked('non-gitam')} onChange={() => toggleApplicable('non-gitam')} className="w-4 h-4 text-pramana-gold rounded bg-black/50 border-white/30" />
                                                    <span className="font-bold text-purple-400">All Non-Gitam Categories</span>
                                                </label>
                                            )}

                                            <div className="h-px bg-white/10 my-1"></div>

                                            {filteredPasses.map(pass => (
                                                <label key={pass.id} className="flex items-center gap-2 cursor-pointer hover:bg-white/5 p-1 rounded">
                                                    <input type="checkbox" checked={isChecked(pass.id)} onChange={() => toggleApplicable(pass.id)} className="w-4 h-4 text-pramana-gold rounded bg-black/50 border-white/30" />
                                                    <span className="text-sm text-pramana-cream/80">{pass.name}</span>
                                                </label>
                                            ))}

                                            {filteredPasses.length === 0 && <p className="text-xs text-pramana-cream/40 p-2">No specific passes found for this category.</p>}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-medium text-pramana-cream block mb-1">Usage Limit</label>
                                        <input type="number" placeholder="100" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                            value={formData.limit || ""}
                                            onChange={e => setFormData({ ...formData, limit: Number(e.target.value) })} />
                                    </div>

                                    <button onClick={handleSave} className="w-full bg-green-600/80 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition shadow-lg shadow-green-900/20 mt-2">
                                        {editingId ? "Update Coupon" : "Save Coupon"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Table */}
                    <div className="flex-1 order-2 xl:order-1">
                        <div className="bg-white/5 rounded-2xl shadow-sm border border-white/10 overflow-hidden backdrop-blur-sm">
                            <table className="min-w-full divide-y divide-white/10">
                                <thead className="bg-white/5">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Code</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Discount</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Applicable For</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Usage</th>
                                        <th className="px-6 py-4 text-left text-xs font-bold text-pramana-cream/50 uppercase tracking-wider font-cinzel">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-transparent divide-y divide-white/10">
                                    {coupons.length === 0 && (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-12 text-center text-pramana-cream/30 italic">No coupons active.</td>
                                        </tr>
                                    )}
                                    {coupons.map((c: any) => {
                                        const appArr = Array.isArray(c.applicableTo) ? c.applicableTo : [c.applicableTo];
                                        const firstCouple = appArr.slice(0, 2).map((id: string) => {
                                            if (id === 'all') return 'All';
                                            if (id === 'gitam') return 'Gitam';
                                            if (id === 'non-gitam') return 'Non-Gitam';
                                            const p = passConfigs.find(pc => pc.id === id);
                                            return p ? p.name : id;
                                        });
                                        const extra = appArr.length > 2 ? `+${appArr.length - 2}` : '';

                                        return (
                                            <tr key={c.id} className="hover:bg-white/5 transition">
                                                <td className="px-6 py-4 whitespace-nowrap font-mono font-bold text-pramana-gold text-lg">{c.code}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-pramana-cream font-medium">
                                                    {c.discountType === 'amount' ? `₹${c.value}` : `${c.value}%`}
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap">
                                                    <div className="flex flex-wrap gap-1 max-w-[200px]">
                                                        {firstCouple.map((label: string, i: number) => (
                                                            <span key={i} className="px-2 py-1 text-xs rounded-full font-bold bg-white/10 text-pramana-cream/80 truncate max-w-[100px] inline-block border border-white/5">
                                                                {label}
                                                            </span>
                                                        ))}
                                                        {extra && <span className="px-2 py-1 text-xs rounded-full font-bold bg-white/10 text-pramana-cream/80 border border-white/5">{extra}</span>}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap text-pramana-cream/80">
                                                    <span className="font-bold text-pramana-cream">{c.used}</span> <span className="text-pramana-cream/40">/ {c.limit}</span>
                                                </td>
                                                <td className="px-6 py-4 whitespace-nowrap flex gap-2">
                                                    {!isViewOnly && (
                                                        <>
                                                            <button onClick={() => handleEdit(c)} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 p-2 rounded-lg transition font-bold text-sm">
                                                                Edit
                                                            </button>
                                                            <button onClick={() => handleDelete(c.id)} className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition">
                                                                🗑️
                                                            </button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
