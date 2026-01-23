"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { RegistrationField } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import AdminSidebar from "@/components/AdminSidebar";

export default function RegistrationConfig() {
    const { user } = useAuth();
    const [fields, setFields] = useState<RegistrationField[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'all' | 'gitam' | 'non-gitam'>('all');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const [newField, setNewField] = useState<Partial<RegistrationField>>({
        id: "",
        label: "",
        type: 'text',
        required: true,
        category: 'all',
        options: []
    });
    const [optionsInput, setOptionsInput] = useState("");

    const isViewOnly = user?.role === 'view_admin';

    const DEFAULT_FIELDS: RegistrationField[] = [
        { id: 'fullName', label: 'Full Name', type: 'text', required: true, category: 'all' },
        { id: 'phone', label: 'Phone Number', type: 'text', required: true, category: 'all' },
        { id: 'branch', label: 'Branch/Department', type: 'text', required: true, category: 'gitam' },
        { id: 'rollNumber', label: 'Roll Number', type: 'text', required: true, category: 'gitam' },
        { id: 'college', label: 'College/Organization', type: 'text', required: true, category: 'non-gitam' },
    ];

    const fetchConfig = async () => {
        setLoading(true);
        const docRef = doc(db, "config", "registration");
        const snap = await getDoc(docRef);
        if (snap.exists()) {
            setFields(snap.data().fields || []);
        } else {
            // First time load: Seed defaults
            if (!isViewOnly) {
                await setDoc(docRef, { fields: DEFAULT_FIELDS });
                setFields(DEFAULT_FIELDS);
            } else {
                setFields([]);
            }
        }
        setLoading(false);
    };

    useEffect(() => { fetchConfig(); }, []);

    const saveConfig = async (updatedFields: RegistrationField[]) => {
        await setDoc(doc(db, "config", "registration"), { fields: updatedFields });
        setFields(updatedFields);
    };

    const handleSaveField = () => {
        if (isViewOnly) return;
        if (!newField.id || !newField.label) return alert("ID and Label required");

        const fieldData: RegistrationField = {
            id: newField.id!,
            label: newField.label!,
            type: newField.type as any,
            required: newField.required!,
            category: newField.category as any,
            options: newField.type === 'select' ? optionsInput.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        };

        if (editingId) {
            // Update existing
            const updated = fields.map(f => f.id === editingId ? { ...fieldData, id: editingId } : f); // Keep ID from editingId to be safe, but actually user might change ID... usually ID shouldn't change but here we allowed it in input. If ID changes, it's like a new field and old data might be lost. Let's allow ID change but warn? For now assume replacement.
            // Actually if they change ID, it might break existing data mapping.
            // Let's assume they can change it.
            saveConfig(updated);
        } else {
            // Add new
            saveConfig([...fields, fieldData]);
        }

        resetForm();
    };

    const handleEdit = (field: RegistrationField) => {
        setNewField(field);
        setOptionsInput(field.options ? field.options.join(', ') : "");
        setEditingId(field.id);
        setShowCreateForm(true);
        // Scroll to top?
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const resetForm = () => {
        setNewField({ id: "", label: "", type: 'text', required: true, category: 'all', options: [] });
        setOptionsInput("");
        setEditingId(null);
        setShowCreateForm(false);
    };

    const removeField = (id: string) => {
        if (isViewOnly) return;
        if (confirm("Are you sure you want to remove this field?")) {
            saveConfig(fields.filter(f => f.id !== id));
        }
    };

    // Filter Logic
    // 'all' tab -> Shows ALL configured fields (inventory view)
    // 'gitam' tab -> Shows what Gitam users see (category == 'all' OR 'gitam')
    // 'non-gitam' tab -> Shows what Non-Gitam users see (category == 'all' OR 'non-gitam')
    const filteredFields = fields.filter(f => {
        if (activeTab === 'all') return true;
        if (activeTab === 'gitam') return f.category === 'all' || f.category === 'gitam';
        if (activeTab === 'non-gitam') return f.category === 'all' || f.category === 'non-gitam';
        return true;
    });

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <header className="flex justify-between items-center mb-10 animate-stagger-1">
                        <div>
                            <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold">Registration Fields</h1>
                            <p className="text-pramana-cream/60 mt-2 font-light">Customize the user registration form.</p>
                        </div>
                        {!showCreateForm && !isViewOnly && (
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="glass-panel text-pramana-gold border-pramana-gold/30 px-6 py-2 rounded-full font-bold shadow-lg shadow-pramana-gold/10 hover:bg-white/10 transition flex items-center gap-2"
                            >
                                <span>+</span> Add Field
                            </button>
                        )}
                    </header>

                    <div className="flex flex-col xl:flex-row gap-8 animate-stagger-2">
                        {/* Form */}
                        {showCreateForm && !isViewOnly && (
                            <div className="w-full xl:w-1/3 order-1 xl:order-2">
                                <div className="bg-white/5 p-6 rounded-2xl border border-white/10 sticky top-8 animate-fade-in-up backdrop-blur-sm">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-xl font-bold font-cinzel text-pramana-gold">{editingId ? 'Edit Field' : 'New Field'}</h2>
                                        <button onClick={resetForm} className="text-pramana-cream/50 hover:text-red-400 transition">✕</button>
                                    </div>
                                    <div className="space-y-4">
                                        {editingId && (
                                            <div className="bg-yellow-900/30 text-yellow-400 border border-yellow-500/30 text-xs p-2 rounded">
                                                Warning: Changing ID of an existing field may cause data loss for existing users.
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Field ID (Unique)</label>
                                            <input placeholder="e.g. phone_number" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                value={newField.id}
                                                onChange={e => setNewField({ ...newField, id: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Label</label>
                                            <input placeholder="e.g. Phone Number" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                value={newField.label} onChange={e => setNewField({ ...newField, label: e.target.value })} />
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Type</label>
                                            <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                value={newField.type} onChange={e => setNewField({ ...newField, type: e.target.value as any })}>
                                                <option value="text" className="bg-black">Text</option>
                                                <option value="number" className="bg-black">Number</option>
                                                <option value="email" className="bg-black">Email</option>
                                                <option value="select" className="bg-black">Select</option>
                                            </select>
                                        </div>
                                        {newField.type === 'select' && (
                                            <div>
                                                <label className="text-sm font-medium text-pramana-cream block mb-1">Options (comma separated)</label>
                                                <input placeholder="Option 1, Option 2" className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                    value={optionsInput} onChange={e => setOptionsInput(e.target.value)} />
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-sm font-medium text-pramana-cream block mb-1">Category</label>
                                            <select className="w-full bg-black/50 border border-white/10 p-3 rounded-lg text-white focus:outline-none focus:border-pramana-gold transition"
                                                value={newField.category} onChange={e => setNewField({ ...newField, category: e.target.value as any })}>
                                                <option value="all" className="bg-black">All Users</option>
                                                <option value="gitam" className="bg-black">Gitam Only</option>
                                                <option value="non-gitam" className="bg-black">Non-Gitam Only</option>
                                            </select>
                                        </div>
                                        <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5">
                                            <input type="checkbox" id="req" checked={newField.required} onChange={e => setNewField({ ...newField, required: e.target.checked })}
                                                className="w-5 h-5 text-pramana-gold rounded focus:ring-pramana-gold bg-black/50 border-white/30" />
                                            <label htmlFor="req" className="text-sm font-medium text-pramana-cream">Required Field</label>
                                        </div>
                                        <button onClick={handleSaveField} className="w-full bg-pramana-gold text-black py-3 rounded-lg font-bold hover:bg-yellow-500 transition shadow-lg shadow-yellow-900/20">
                                            {editingId ? 'Update Field' : 'Save Field'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* List */}
                        <div className="flex-1 order-2 xl:order-1">
                            <div className="flex gap-4 mb-6 border-b border-white/10">
                                {['all', 'gitam', 'non-gitam'].map(tab => (
                                    <button key={tab}
                                        onClick={() => setActiveTab(tab as any)}
                                        className={`pb-3 px-2 text-sm font-medium capitalize transition border-b-2 ${activeTab === tab ? 'border-pramana-gold text-pramana-gold font-bold' : 'border-transparent text-pramana-cream/50 hover:text-white'}`}
                                    >
                                        {tab.replace('-', ' ')} fields
                                    </button>
                                ))}
                            </div>

                            <div className="space-y-4">
                                {filteredFields.length === 0 && <div className="text-center py-12 text-pramana-cream/30 bg-white/5 rounded-2xl border border-dashed border-white/10 italic">No fields configured for this category.</div>}
                                {filteredFields.map((field, i) => (
                                    <div key={i} className="bg-white/5 p-5 rounded-xl shadow-sm border border-white/10 flex justify-between items-center group hover:bg-white/10 hover:border-pramana-gold/30 transition backdrop-blur-sm">
                                        <div>
                                            <h3 className="font-bold text-pramana-cream font-cinzel tracking-wide">{field.label}</h3>
                                            <div className="flex items-center gap-2 mt-1">
                                                <code className="text-xs bg-black/40 px-1.5 py-0.5 rounded text-pramana-gold/70 border border-white/10 font-mono">{field.id}</code>
                                                <span className="text-xs text-pramana-cream/40 capitalize">• {field.type} {field.required ? '• Required' : ''}</span>
                                            </div>
                                        </div>
                                        {!isViewOnly && (
                                            <div className="flex gap-2 opacity-80 group-hover:opacity-100 transition">
                                                <button onClick={() => handleEdit(field)} className="px-3 py-1.5 text-sm font-bold text-blue-400 bg-blue-500/10 hover:bg-blue-500/20 rounded-lg transition border border-blue-500/20">
                                                    Edit
                                                </button>
                                                <button onClick={() => removeField(field.id)} className="px-3 py-1.5 text-sm font-bold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-lg transition border border-red-500/20">
                                                    Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
