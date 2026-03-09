"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Image from "next/image";

export default function LoginPage() {
    const router = useRouter();
    const { user, signInWithGoogle, loading } = useAuth();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    useEffect(() => {
        if (!loading && user) {
            const adminRoles = ['superadmin', 'admin', 'view_admin', 'marketing_admin', 'cul_admin', 'food_admin'];
            if (adminRoles.includes(user.role)) {
                router.replace("/admin");
            } else if (user.role === 'ppass_admin') {
                router.replace("/issue-pass");
            } else if (user.role === 'entry_admin') {
                router.replace("/entry");
            } else {
                router.replace("/dashboard");
            }
        }
    }, [user, loading, router]);

    const handleLogin = async () => {
        setIsLoggingIn(true);
        try {
            await signInWithGoogle();
        } catch (error) {
            console.error("Login failed", error);
            setIsLoggingIn(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-pramana-gold">
                Loading...
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pramana-gold/10 via-black to-black opacity-60"></div>

            <div className="relative z-10 flex flex-col items-center gap-8 backdrop-blur-xl bg-black/40 p-12 rounded-2xl border border-white/10 shadow-2xl">
                <div className="w-64 h-20 relative">
                    <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain" priority />
                </div>

                <h1 className="text-2xl font-primary text-pramana-cream tracking-widest uppercase">Portal Login</h1>

                <button
                    onClick={handleLogin}
                    disabled={isLoggingIn}
                    className="group relative px-8 py-3 bg-pramana-gold text-black rounded-lg font-bold font-primary text-sm uppercase tracking-widest overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-pramana-gold/20 transition-all"
                >
                    <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                        {isLoggingIn ? "Authenticating..." : "Login with Google"}
                    </span>
                    <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                </button>
            </div>
        </div>
    );
}
