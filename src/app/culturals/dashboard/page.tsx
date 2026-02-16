"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { getUserRegistrations, CulturalRegistrationData } from "@/lib/culturals"; // Ensure correct imports
// Removed unused firebase imports that are now handled in the lib
import { Loader2, CheckCircle, AlertCircle, Clock, Music, Mic, Users, Trophy, MessageCircle } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";

interface CulturalRegistration extends CulturalRegistrationData {
    id: string;
    createdAt: any;
    status: "pending" | "approved" | "rejected"; // Ensure status is part of the type if it comes from backend
    whatsappLink?: string;
}

// Update competitions object to include images and rulebook
const competitions = {
    "natya-rasa": {
        title: "Natya Rasa",
        image: "/culturals/natya-rasa.jpg", // User to upload
        description: "Dance Competition",
        categories: ["Solo", "Crew"],
        ruleBook: "/culturals/natya-rasa-rulebook.pdf" // User to upload
    },
    "off-the-record": {
        title: "Off The Record",
        image: "/culturals/off-the-record.jpg", // User to upload
        description: "Battle of Bands",
        categories: ["Solo", "Duo/Trio", "Band"],
        ruleBook: "/culturals/off-the-record-rulebook.pdf" // User to upload
    },
    "raw-and-real": {
        title: "Raw and Real",
        image: "/culturals/raw-and-real.jpg", // User to upload
        description: "Unfiltered Talent",
        categories: ["Solo", "Crew"],
        ruleBook: "/culturals/raw-and-real-rulebook.pdf" // User to upload
    }
};

export default function CulturalDashboard() {
    const { user, loading: authLoading } = useAuth();
    const [registrations, setRegistrations] = useState<CulturalRegistration[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user) return;

        const fetchRegistrations = async () => {
            try {
                const data = await getUserRegistrations(user.uid);
                setRegistrations(data as CulturalRegistration[]);
            } catch (error) {
                console.error("Error fetching registrations:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRegistrations();
    }, [user]);

    if (authLoading || loading) {
        return <div className="min-h-screen bg-[#050505] flex items-center justify-center"><Loader2 className="animate-spin text-pramana-gold w-8 h-8" /></div>;
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-white p-4">
                <h1 className="text-2xl font-cinzel mb-4">Please Sign In</h1>
                <p className="text-gray-400">You need to be logged in to access the dashboard.</p>
            </div>
        );
    }

    const getRegistrationStatus = (compId: string, category: string) => {
        const reg = registrations.find(r => r.competitionId === compId && r.category === category);
        return reg ? reg.status : null;
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white pt-24 pb-12 px-4 md:px-8 font-playfair">
            <div className="max-w-6xl mx-auto space-y-12">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-8">
                    <div>
                        <h1 className="text-4xl md:text-5xl font-cinzel font-bold text-pramana-gold mb-2">My Culturals</h1>
                        <p className="text-gray-400">Manage your event registrations and track status</p>
                    </div>
                    <div className="flex items-center gap-3 bg-white/5 px-4 py-2 rounded-full border border-white/10">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-mono text-gray-300">{user.displayName}</span>
                    </div>
                </div>

                {/* Status Overview */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-[#111] p-6 rounded-xl border border-white/10">
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Total Entries</h3>
                        <p className="text-3xl font-bold text-white">{registrations.length}</p>
                    </div>
                    <div className="bg-[#111] p-6 rounded-xl border border-white/10">
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Approved</h3>
                        <p className="text-3xl font-bold text-green-500">{registrations.filter(r => r.status === 'approved').length}</p>
                    </div>
                    <div className="bg-[#111] p-6 rounded-xl border border-white/10">
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-2">Pending</h3>
                        <p className="text-3xl font-bold text-yellow-500">{registrations.filter(r => r.status === 'pending').length}</p>
                    </div>
                </div>

                {/* Competitions Grid */}
                <div>
                    <h2 className="text-2xl font-cinzel font-bold text-white mb-6 flex items-center gap-3">
                        <Trophy className="text-pramana-gold" /> Available Competitions
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Object.entries(competitions).map(([key, comp]) => {
                            return (
                                <motion.div
                                    key={key}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-pramana-gold/30 transition-all group flex flex-col"
                                >
                                    {/* Image Section */}
                                    <div className="relative h-48 w-full overflow-hidden">
                                        {/* Use a simple img tag or Next Image but ensure path is correct */}
                                        <div className="absolute inset-0 bg-gray-800 animate-pulse" /> {/* Placeholder while loading */}
                                        <img
                                            src={comp.image}
                                            alt={comp.title}
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                            onError={(e) => {
                                                (e.target as HTMLImageElement).src = `https://placehold.co/600x400/111/gold?text=${comp.title.replace(/ /g, '+')}`;
                                            }}
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent" />

                                        <div className="absolute bottom-4 left-4 right-4 flex justify-between items-end">
                                            <div>
                                                <h3 className="text-xl font-bold font-cinzel text-white text-shadow-lg">{comp.title}</h3>
                                                <p className="text-xs text-pramana-cream/80">{comp.description}</p>
                                            </div>
                                            {/* Show badge if registered for any category in this comp */}
                                            {registrations.some(r => r.competitionId === key) && (
                                                <span className="bg-blue-500/80 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-lg backdrop-blur-sm">
                                                    PARTICIPATING
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-6 space-y-6 flex-1 flex flex-col">
                                        <div className="space-y-3 flex-1">
                                            {comp.categories.map(cat => {
                                                const status = getRegistrationStatus(key, cat);
                                                return (
                                                    <div key={cat} className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                                                        <span className="text-sm font-medium text-gray-300">{cat}</span>

                                                        {status === 'approved' ? (
                                                            <div className="flex flex-col items-end gap-2">
                                                                <div className="flex items-center gap-2 text-green-500 text-xs font-bold uppercase">
                                                                    <CheckCircle className="w-4 h-4" /> Approved
                                                                </div>
                                                                {(() => {
                                                                    const reg = registrations.find(r => r.competitionId === key && r.category === cat);
                                                                    if (reg?.whatsappLink) {
                                                                        return (
                                                                            <a
                                                                                href={reg.whatsappLink}
                                                                                target="_blank"
                                                                                rel="noopener noreferrer"
                                                                                className="flex items-center gap-1.5 text-[10px] bg-green-500/10 text-green-400 hover:bg-green-500/20 px-2 py-1.5 rounded border border-green-500/20 transition-all font-medium group/btn"
                                                                            >
                                                                                <MessageCircle className="w-3 h-3 group-hover/btn:scale-110 transition-transform" />
                                                                                Join WhatsApp Group
                                                                            </a>
                                                                        );
                                                                    }
                                                                    return null;
                                                                })()}
                                                            </div>
                                                        ) : status === 'pending' ? (
                                                            <div className="flex items-center gap-2 text-yellow-500 text-xs font-bold uppercase">
                                                                <Clock className="w-4 h-4" /> Pending
                                                            </div>
                                                        ) : status === 'rejected' ? (
                                                            <div className="flex items-center gap-2 text-red-500 text-xs font-bold uppercase">
                                                                <AlertCircle className="w-4 h-4" /> Rejected
                                                            </div>
                                                        ) : (
                                                            <Link
                                                                href={`/culturals/register?competition=${key}`}
                                                                className="text-xs bg-white/10 hover:bg-pramana-gold hover:text-black px-3 py-1.5 rounded transition-colors font-bold uppercase tracking-wider"
                                                            >
                                                                Register
                                                            </Link>
                                                        )}
                                                    </div>
                                                )
                                            })}
                                        </div>

                                        <div className="pt-4 border-t border-white/10">
                                            <a
                                                href={comp.ruleBook}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="block w-full text-center py-2 border border-white/20 rounded-lg text-xs font-cinzel font-bold text-pramana-cream/60 hover:text-white hover:border-white hover:bg-white/5 transition-all uppercase tracking-widest"
                                            >
                                                Download Rule Book
                                            </a>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>

            </div>
        </div>
    );
}
