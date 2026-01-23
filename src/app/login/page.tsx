"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";
import { motion } from "framer-motion";

function LoginContent() {
    const { user, signInWithGoogle, loading } = useAuth();
    const router = useRouter();
    const searchParams = useSearchParams();
    const redirectUrl = searchParams.get('redirect') || '/dashboard';

    useEffect(() => {
        if (!loading && user) {
            if (!user.isRegistered && redirectUrl !== '/register') {
                router.push('/register');
            } else {
                // Check if user is admin/superadmin and NO specific redirect was given (i.e. it is default /dashboard)
                // OR if they are explicitly trying to go to dashboard (which admins might not want as default)
                if ((user.role === 'admin' || user.role === 'superadmin') && (redirectUrl === '/dashboard' || !searchParams.get('redirect'))) {
                    router.push('/admin');
                } else {
                    router.push(redirectUrl);
                }
            }
        }
    }, [user, loading, router, redirectUrl, searchParams]);

    const handleLogin = async () => {
        try {
            await signInWithGoogle();
            // AuthProvider will handle cookie setting and state update
            // The useEffect above will trigger redirect once user is set
        } catch (error) {
            console.error("Login failed", error);
        }
    };

    if (loading) return null;

    return (
        <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black selection:bg-pramana-gold selection:text-black">
            {/* Background Effects */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pramana-gold/10 rounded-full blur-[120px] animate-pulse"></div>
            </div>

            <div className="relative z-10 p-8 glass-panel rounded-3xl max-w-md w-full text-center border border-white/10">
                <h1 className="text-4xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold via-white to-pramana-gold mb-2">
                    Access Portal
                </h1>
                <p className="text-pramana-cream/60 mb-8 font-playfair">Identify yourself to proceed.</p>

                <button
                    onClick={handleLogin}
                    className="w-full relative group overflow-hidden px-8 py-4 bg-pramana-gold text-black font-bold rounded-xl font-cinzel shadow-[0_0_20px_rgba(184,134,11,0.3)] hover:shadow-[0_0_40px_rgba(184,134,11,0.6)] transition-all duration-300"
                >
                    <span className="relative z-10">LOGIN WITH GOOGLE</span>
                    <div className="absolute inset-0 bg-white/30 transform -skew-x-12 translate-x-[-150%] group-hover:translate-x-[150%] transition-transform duration-700 ease-in-out"></div>
                </button>
            </div>
        </div>
    );
}

export default function LoginPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <LoginContent />
        </Suspense>
    );
}
