"use client";

import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";
import { usePathname } from "next/navigation";

export default function Navbar() {
    const { user, signInWithGoogle, logout, loading } = useAuth();
    const pathname = usePathname();

    // Hide Navbar on Landing Page
    if (pathname === "/") return null;

    return (
        <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md px-6 py-4 sticky top-0 z-50">
            <div className="mx-auto flex max-w-7xl items-center justify-between">
                <div className="flex items-center gap-8">
                    <Link href="/dashboard" className="text-xl font-cinzel font-bold tracking-widest text-pramana-gold">
                        PRAMANA26
                    </Link>
                    <div className="hidden md:flex gap-8">
                        {user && (
                            <Link href="/dashboard" className="text-sm font-medium text-pramana-cream/80 hover:text-pramana-gold transition">
                                Dashboard
                            </Link>
                        )}
                        <Link href="/tickets" className="text-sm font-medium text-pramana-cream/80 hover:text-pramana-gold transition">
                            Buy Output
                        </Link>
                        {user && (user.role === 'admin' || user.role === 'superadmin' || user.role === 'view_admin') && (
                            <Link href="/admin" className="text-sm font-medium text-pramana-cream/80 hover:text-pramana-gold transition">
                                Admin Portal
                            </Link>
                        )}
                    </div>
                </div>

                <div>
                    {loading ? (
                        <span className="text-sm text-pramana-cream/50">Loading...</span>
                    ) : user ? (
                        <div className="flex items-center gap-4">
                            <div className="text-right hidden sm:block">
                                <p className="text-sm font-playfair text-pramana-gold">{user.displayName}</p>
                                {user.isGitamite && <span className="text-[10px] uppercase font-bold text-black bg-pramana-gold px-1 rounded">Gitamite</span>}
                            </div>
                            <button
                                onClick={async () => {
                                    await logout();
                                    // Force redirect to home after logout
                                    window.location.href = "/";
                                }}
                                className="rounded border border-pramana-gold/30 px-4 py-2 text-sm font-medium text-pramana-cream hover:bg-pramana-gold/10 transition-colors"
                            >
                                Logout
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => signInWithGoogle()}
                            className="rounded bg-pramana-gold px-6 py-2 text-sm font-bold text-black hover:bg-yellow-600 transition-all shadow-lg shadow-pramana-gold/20"
                        >
                            Login
                        </button>
                    )}
                </div>
            </div>
        </nav>
    );
}
