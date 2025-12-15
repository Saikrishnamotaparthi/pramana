"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
    { href: "/admin", label: "Dashboard", icon: "📊" },
    { href: "/admin/passes", label: "Passes", icon: "🎟️" },
    { href: "/admin/coupons", label: "Coupons", icon: "🏷️" },
    { href: "/admin/registration", label: "Registration Forms", icon: "📋" },
    { href: "/admin/users", label: "User Management", icon: "👥" },
    { href: "/admin/manage-admins", label: "Admins", icon: "🛡️" },
    { href: "/issue-pass", label: "Issue Physical Pass", icon: "🖨️" },
    { href: "/admin/settings", label: "Settings", icon: "⚙️" },
    { href: "/tickets", label: "View Public Page", icon: "🌐" },
];

export default function AdminSidebar() {
    const pathname = usePathname();

    return (
        <aside className="w-64 bg-black/40 backdrop-blur-xl border-r border-white/10 text-pramana-cream min-h-screen flex flex-col">
            <div className="p-6 border-b border-white/10">
                <h1 className="text-2xl font-cinzel font-bold tracking-tight text-white">Admin<span className="text-pramana-gold">Portal</span></h1>
            </div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {links.map((link) => {
                    const isActive = pathname === link.href;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 font-playfair
                                ${isActive
                                    ? "bg-pramana-gold text-black shadow-lg shadow-pramana-gold/20"
                                    : "text-pramana-cream/60 hover:text-pramana-cream hover:bg-white/5"}`}
                        >
                            <span className="text-xl">{link.icon}</span>
                            {link.label}
                        </Link>
                    )
                })}
            </nav>
            <div className="p-4 border-t border-white/10">
                <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <p className="text-xs text-pramana-cream/50">Logged in as</p>
                    <p className="text-sm font-bold text-pramana-gold truncate">Admin</p>
                </div>
            </div>
        </aside>
    );
}
