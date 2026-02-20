"use client";

import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";
import Link from "next/link";
import { ArrowLeft, Clock, CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";

interface Booking {
    id: string;
    stallName: string;
    stallId: string;
    status: string;
    createdAt: any;
    name: string;
    phone: string;
}

export default function FoodStallDashboard() {
    const { user, loading } = useAuth();
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        if (!user || loading) return;

        const fetchData = async () => {
            try {
                const q = query(
                    collection(db, "foodStallBookings"),
                    where("userId", "==", user.uid)
                );

                const snap = await getDocs(q);
                const data: Booking[] = [];
                snap.forEach(doc => {
                    data.push({ id: doc.id, ...doc.data() } as Booking);
                });

                // Sort by creation date descending
                data.sort((a, b) => {
                    const timeA = a.createdAt?.toMillis() || 0;
                    const timeB = b.createdAt?.toMillis() || 0;
                    return timeB - timeA;
                });

                setBookings(data);
            } catch (error) {
                console.error("Error fetching bookings:", error);
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [user, loading]);

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="animate-spin h-12 w-12 border-4 border-pramana-gold border-t-transparent rounded-full"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-[#050505] flex items-center justify-center">
                <div className="text-center text-white/60">
                    <p className="mb-4">You must be logged in to view your dashboard.</p>
                    <Link href="/foodstalls" className="text-pramana-gold hover:underline">Return to Food Stalls</Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] text-pramana-cream selection:bg-pramana-gold selection:text-black pt-24 px-6">

            <header className="fixed top-0 left-0 right-0 z-40 px-6 py-4 bg-black border-b border-white/5">
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/foodstalls" className="bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                            <ArrowLeft className="w-5 h-5 text-white" />
                        </Link>
                        <h1 className="text-xl md:text-2xl font-cinzel font-bold text-pramana-gold tracking-widest uppercase">
                            Your Dashboard
                        </h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="hidden md:block text-right">
                            <p className="text-sm font-bold text-white">{user.displayName}</p>
                            <p className="text-xs text-white/50">{user.email}</p>
                        </div>
                        {user.photoURL && (
                            <Image
                                src={user.photoURL}
                                alt="Profile"
                                width={40}
                                height={40}
                                className="rounded-full border-2 border-pramana-gold/50"
                            />
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto py-12">
                <div className="mb-10">
                    <h2 className="text-3xl font-cinzel font-bold text-white mb-2">My Bookings</h2>
                    <p className="text-white/60">Track the status of your food stall applications.</p>
                </div>

                {bookings.length === 0 ? (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center text-white/50">
                        <p className="text-xl mb-4">You haven't booked any stalls yet.</p>
                        <Link href="/foodstalls" className="bg-pramana-gold text-black px-6 py-3 rounded-full font-bold text-sm tracking-widest hover:bg-yellow-500 uppercase font-cinzel transition-colors">
                            Browse Stalls
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {bookings.map((booking) => (
                            <div key={booking.id} className="bg-white/5 border border-white/10 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:border-white/20 transition-colors">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-4">
                                        <h3 className="text-2xl font-cinzel font-bold text-white">Stall: {booking.stallName}</h3>
                                        <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-1.5 border
                                            ${booking.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' : ''}
                                            ${booking.status === 'approved' ? 'bg-green-500/10 text-green-400 border-green-500/20' : ''}
                                            ${booking.status === 'revoked' ? 'bg-red-500/10 text-red-400 border-red-500/20' : ''}
                                        `}>
                                            {booking.status === 'pending' && <Clock className="w-3 h-3" />}
                                            {booking.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                                            {booking.status === 'revoked' && <XCircle className="w-3 h-3" />}
                                            {booking.status}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-white/60">
                                        <p><strong className="text-white/80">Applicant:</strong> {booking.name}</p>
                                        <p><strong className="text-white/80">Phone:</strong> {booking.phone}</p>
                                        <p><strong className="text-white/80">Booking ID:</strong> {booking.id}</p>
                                        <p><strong className="text-white/80">Date:</strong> {booking.createdAt ? new Date(booking.createdAt.toMillis()).toLocaleDateString() : 'N/A'}</p>
                                    </div>
                                </div>

                                {booking.status === 'pending' && (
                                    <div className="text-sm bg-black/40 border border-white/5 px-4 py-3 rounded-lg text-white/60 max-w-[200px]">
                                        Your payment is under review. Please allow 24-48 hours.
                                    </div>
                                )}
                                {booking.status === 'revoked' && (
                                    <div className="text-sm bg-red-900/10 border border-red-500/20 px-4 py-3 rounded-lg text-red-200/80 max-w-[200px]">
                                        Your payment could not be verified. This stall is now available to others.
                                    </div>
                                )}
                                {booking.status === 'approved' && (
                                    <div className="text-sm bg-green-900/10 border border-green-500/20 px-4 py-3 rounded-lg text-green-200/80 max-w-[200px]">
                                        Payment verified! Your stall is confirmed for Pramana '26.
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
