"use client";

import { useState, useEffect } from "react";
import AdminSidebar from "@/components/AdminSidebar";
import { db } from "@/lib/firebase";
import { collection, getDocs } from "firebase/firestore";
import * as XLSX from "xlsx";
import { PassConfig } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { canAccessBulkIssue } from "@/utils/rbac";
import { useRouter } from "next/navigation";

export default function BulkIssuePage() {
    const [passes, setPasses] = useState<PassConfig[]>([]);
    const [selectedPass, setSelectedPass] = useState("");
    const [file, setFile] = useState<File | null>(null);
    const [emails, setEmails] = useState<string[]>([]);
    const [processing, setProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    const [stats, setStats] = useState<any>(null);
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (!loading && !canAccessBulkIssue(user)) {
            alert("Access Denied: View Admins cannot perform bulk actions.");
            router.replace("/admin");
        }
    }, [user, loading, router]);

    useEffect(() => {
        const fetchPasses = async () => {
            const snap = await getDocs(collection(db, "passes_config"));
            setPasses(snap.docs.map(d => ({ id: d.id, ...d.data() } as PassConfig)));
        };
        fetchPasses();
    }, []);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f) {
            setFile(f);
            const reader = new FileReader();
            reader.onload = (evt) => {
                const bstr = evt.target?.result;
                const wb = XLSX.read(bstr, { type: "binary" });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];

                // Assuming Email is first column or finding column named 'Email'
                let emailIdx = 0;
                // Simple heuristic: First row usually header
                if (data[0]) {
                    const header = data[0].map((h: any) => String(h).toLowerCase());
                    const idx = header.indexOf('email');
                    if (idx !== -1) emailIdx = idx;
                }

                // Extract
                const foundEmails: string[] = [];
                // Start from row 1 (index 1) to skip header
                for (let i = 1; i < data.length; i++) {
                    const row = data[i];
                    if (row[emailIdx]) foundEmails.push(String(row[emailIdx]).trim());
                }
                setEmails(foundEmails.filter(e => e && e.includes('@')));
                setStats(null); // Reset stats on new file
                setLogs([]);
            };
            reader.readAsBinaryString(f);
        }
    };

    const handleIssue = async () => {
        if (!selectedPass || emails.length === 0) return;
        if (!confirm(`Are you sure you want to issue ${emails.length} passes?`)) return;

        setProcessing(true);
        setLogs(prev => [...prev, `Starting bulk issue for ${emails.length} emails...`]);
        setStats(null);

        const BATCH_SIZE = 50;
        const chunks = [];
        for (let i = 0; i < emails.length; i += BATCH_SIZE) {
            chunks.push(emails.slice(i, i + BATCH_SIZE));
        }

        let totalProcessed = 0;
        let cumulativeStats = {
            processed: 0,
            issued: 0,
            usersCreated: 0,
            duplicatesSkipped: 0,
            issuedToRegistered: 0,
            issuedToUnregistered: 0
        };

        try {
            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                const batchNum = i + 1;
                setLogs(prev => [...prev, `Processing batch ${batchNum}/${chunks.length} (${chunk.length} emails)...`]);

                try {
                    const res = await fetch("/api/admin/issue-bulk", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ passId: selectedPass, emails: chunk })
                    });
                    const result = await res.json();

                    if (result.success) {
                        // Aggregate Stats
                        cumulativeStats.processed += result.stats.processed || 0;
                        cumulativeStats.issued += result.stats.issued || 0;
                        cumulativeStats.usersCreated += result.stats.usersCreated || 0;
                        cumulativeStats.duplicatesSkipped += result.stats.duplicatesSkipped || 0;
                        cumulativeStats.issuedToRegistered += result.stats.issuedToRegistered || 0;
                        cumulativeStats.issuedToUnregistered += result.stats.issuedToUnregistered || 0;

                        setStats({ ...cumulativeStats }); // Update UI with running total

                        if (result.errors?.length) {
                            setLogs(prev => [...prev, ...result.errors]);
                        }
                    } else {
                        setLogs(prev => [...prev, `Batch ${batchNum} Failed: ${result.message}`]);
                    }
                } catch (batchError: any) {
                    setLogs(prev => [...prev, `Batch ${batchNum} Error: ${batchError.message}`]);
                }
            }

            setLogs(prev => [...prev, `Bulk Issue Complete. Total Processed: ${cumulativeStats.processed}`]);
            alert("Bulk Issue Complete");

        } catch (error: any) {
            setLogs(prev => [...prev, `Fatal Error: ${error.message}`]);
        } finally {
            setProcessing(false);
        }
    };

    const downloadTemplate = () => {
        const ws = XLSX.utils.aoa_to_sheet([["Email"], ["user@example.com"]]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "bulk_issue_template.xlsx");
    };

    if (loading || !canAccessBulkIssue(user)) return null;

    return (
        <div className="flex min-h-screen bg-pramana-black text-pramana-cream font-playfair">
            <AdminSidebar />
            <main className="admin-page-container">
                <div className="admin-content-wrapper">
                    <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white neon-text-gold mb-12 animate-stagger-1">Bulk Issue Passes</h1>

                    <div className="glass-panel p-8 rounded-2xl max-w-3xl mx-auto shadow-2xl shadow-black/50 animate-stagger-2">
                        <div className="mb-8 group">
                            <label className="block mb-2 font-bold text-pramana-gold uppercase tracking-widest text-xs group-hover:text-white transition">1. Select Pass Type</label>
                            <select
                                className="w-full bg-black/40 border border-white/10 p-4 rounded-xl text-white focus:outline-none focus:border-pramana-gold/50 focus:shadow-[0_0_15px_rgba(184,134,11,0.1)] transition-all"
                                onChange={(e) => setSelectedPass(e.target.value)}
                                value={selectedPass}
                            >
                                <option value="" className="bg-black text-gray-500">-- Select Pass --</option>
                                {passes.map(p => {
                                    const isSoldOut = p.limit > 0 && (p.sold || 0) >= p.limit;
                                    return (
                                        <option key={p.id} value={p.id} disabled={isSoldOut} className={isSoldOut ? "text-gray-500 bg-gray-900" : "bg-black text-white"}>
                                            {p.name} (₹{p.price}) {isSoldOut ? '(SOLD OUT)' : ''}
                                        </option>
                                    );
                                })}
                            </select>
                        </div>

                        <div className="mb-6">
                            <label className="block mb-2 font-bold">2. Prepare Data</label>
                            <button onClick={downloadTemplate} className="text-pramana-gold underline text-sm hover:text-yellow-400">Download Excel Template</button>
                        </div>

                        <div className="mb-6">
                            <label className="block mb-2 font-bold">3. Upload Excel</label>
                            <input type="file" accept=".xlsx, .xls, .csv" onChange={handleFileUpload} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-pramana-gold file:text-black hover:file:bg-yellow-500" />
                            {emails.length > 0 && <p className="mt-2 text-green-400 text-sm">{emails.length} valid emails found.</p>}
                        </div>

                        <button
                            onClick={handleIssue}
                            disabled={processing || !selectedPass || emails.length === 0}
                            className="w-full bg-pramana-gold text-black font-bold py-3 rounded-lg hover:bg-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            {processing ? "Processing..." : "Issue Passes"}
                        </button>

                        {/* Statistics Box */}
                        {stats && (
                            <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 animate-stagger-3">
                                <div className="bg-black/40 p-4 rounded-xl border border-white/10 text-center">
                                    <div className="text-pramana-gold text-2xl font-bold font-cinzel">{stats.issued}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-white/50">Total Issued</div>
                                </div>
                                <div className="bg-green-900/20 p-4 rounded-xl border border-green-500/20 text-center">
                                    <div className="text-green-400 text-2xl font-bold font-cinzel">{stats.issuedToRegistered}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-green-400/50">Registered Users</div>
                                </div>
                                <div className="bg-yellow-900/20 p-4 rounded-xl border border-yellow-500/20 text-center">
                                    <div className="text-yellow-400 text-2xl font-bold font-cinzel">{stats.issuedToUnregistered}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-yellow-400/50">Unregistered</div>
                                </div>
                                <div className="bg-red-900/20 p-4 rounded-xl border border-red-500/20 text-center">
                                    <div className="text-red-400 text-2xl font-bold font-cinzel">{stats.duplicatesSkipped}</div>
                                    <div className="text-[10px] uppercase tracking-widest text-red-400/50">Duplicates (Skipped)</div>
                                </div>
                            </div>
                        )}

                        {logs.length > 0 && (
                            <div className="mt-8 p-4 bg-black/50 rounded border border-white/10 h-48 overflow-auto font-mono text-xs">
                                {logs.map((l, i) => <div key={i} className="mb-1">{l}</div>)}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
