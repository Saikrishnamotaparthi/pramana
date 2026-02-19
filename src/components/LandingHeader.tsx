'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

const LandingHeader = () => {
    const { user, signInWithGoogle, loading } = useAuth();
    const router = useRouter();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleEntry = async () => {
        if (loading || isLoggingIn) return; // Prevent double clicks or conflicts
        if (user) {
            router.push("/tickets");
        } else {
            setIsLoggingIn(true);
            try {
                await signInWithGoogle();
                router.push("/tickets");
            } catch (error) {
                console.error("Login failed", error);
            } finally {
                setIsLoggingIn(false);
            }
        }
    };

    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
            <div className="max-w-7xl mx-auto flex justify-between items-center bg-black/50 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 shadow-2xl shadow-black/50">
                {/* Left: GITAM Logo */}
                <div className="w-32 h-10 md:w-40 h-12 relative opacity-90 hover:opacity-100 transition-opacity">
                    <Image src="/gitam-logo.png" alt="GITAM" fill className="object-contain object-left" sizes="(max-width: 768px) 128px, 160px" priority />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-6">
                    <div className="hidden md:block w-32 relative h-10 opacity-80">
                        <Image src="/student-life-logo.png" alt="Student Life" fill className="object-contain" sizes="128px" />
                    </div>
                    <button
                        onClick={handleEntry}
                        disabled={isLoggingIn}
                        className="group relative px-6 py-2 bg-pramana-gold text-black rounded-full font-bold font-primary text-xs uppercase tracking-widest overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                        <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                            {isLoggingIn ? "Processing..." : "Buy Passes"}
                        </span>
                        <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                    </button>
                </div>
            </div>
        </header>
    );
};

export default LandingHeader;
