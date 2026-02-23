"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Ticket,
    ClipboardList,
    Users,
    Shield,
    Printer,
    Globe,
    LogOut,
    Menu,
    X,
    ScanLine,
    Music,
    Bus
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { canAccessBulkIssue, canManageAdmins, isMarketingAdmin, isPpassAdmin, isCulturalAdmin, isFoodAdmin } from "@/utils/rbac";

const links = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/passes", label: "Passes", icon: Ticket },
    // Coupons removed
    { href: "/admin/bulk-issue", label: "Bulk Issue", icon: Printer },
    { href: "/admin/registration", label: "Registration Forms", icon: ClipboardList },
    { href: "/admin/referrals", label: "Referrals", icon: Users },
    { href: "/admin/users", label: "User Management", icon: Users },
    { href: "/admin/manage-admins", label: "Admins", icon: Shield },
    { href: "/admin/scan-pass", label: "Scan Pass", icon: ScanLine },
    { href: "/admin/culturals", label: "Cultural Events", icon: Music },
    { href: "/admin/foodstalls", label: "Food Stalls", icon: ClipboardList },
    { href: "/admin/transport", label: "Transport", icon: Bus },
    { href: "/issue-pass", label: "Physical Issue", icon: Printer },
    { href: "/admin/bulk-passes", label: "Bulk Passes", icon: Users },
    { href: "/admin/settings", label: "Settings", icon: ClipboardList },

];

export default function AdminSidebar() {
    const pathname = usePathname();
    const { logout, user } = useAuth();
    const [collapsed, setCollapsed] = useState(false);
    const [mobileOpen, setMobileOpen] = useState(false);

    return (
        <>
            {/* Mobile Toggle */}
            <button
                className="md:hidden fixed top-4 left-4 z-50 p-2 bg-black/50 backdrop-blur border border-white/20 rounded-lg text-pramana-gold"
                onClick={() => setMobileOpen(!mobileOpen)}
            >
                {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar Container */}
            <aside
                className={`
                    fixed md:relative z-40 h-screen transition-all duration-300 ease-in-out
                    ${mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
                    ${collapsed ? "w-20" : "w-72"}
                    bg-black/40 backdrop-blur-2xl border-r border-white/5 shadow-[0_0_50px_rgba(0,0,0,0.5)]
                    flex flex-col
                `}
            >
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between relative overflow-hidden group">
                    {/* Background Glow */}
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-pramana-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition duration-500"></div>

                    {!collapsed && (
                        <div className="relative z-10">
                            <h1 className="text-2xl font-cinzel font-bold tracking-tight text-white neon-text-gold">
                                Admin<span className="text-pramana-gold">Portal</span>
                            </h1>
                            <p className="text-[10px] uppercase tracking-[0.2em] text-pramana-cream/40 px-0.5">Control Center</p>
                        </div>
                    )}

                    <button
                        onClick={() => setCollapsed(!collapsed)}
                        className="p-1.5 rounded-lg text-pramana-cream/40 hover:text-pramana-gold hover:bg-white/5 transition hidden md:block"
                    >
                        {collapsed ? <Menu size={20} /> : <div className="w-1 h-8 rounded-full bg-white/10 group-hover:bg-pramana-gold/50 transition-all"></div>}
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-3 space-y-2 overflow-y-auto scrollbar-hide">
                    {links.filter(link => {
                        // Cultural Admin Restrictions - ONLY Culturals
                        if (isCulturalAdmin(user)) {
                            return link.href === '/admin/culturals';
                        }

                        // Food Admin Restrictions - ONLY Foodstalls
                        if (isFoodAdmin(user)) {
                            return link.href === '/admin/foodstalls';
                        }

                        // PPASS Admin Restrictions
                        if (isPpassAdmin(user)) {
                            return link.href === '/issue-pass';
                        }

                        // Marketing Admin Restrictions
                        if (isMarketingAdmin(user)) {
                            return ['/admin', '/admin/referrals', '/tickets'].includes(link.href);
                        }

                        if (link.href === '/admin/bulk-issue') return canAccessBulkIssue(user);
                        if (link.href === '/admin/bulk-passes') return user?.role === 'admin' || user?.role === 'superadmin';
                        if (link.href === '/admin/manage-admins') return canManageAdmins(user);
                        return true;
                    }).map((link) => {
                        const isActive = pathname === link.href;
                        const Icon = link.icon;

                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`
                                    relative flex items-center gap-4 px-3 py-3.5 rounded-xl transition-all duration-300 group
                                    ${isActive
                                        ? "bg-gradient-to-r from-pramana-gold/20 to-transparent border border-white/10"
                                        : "hover:bg-white/5 border border-transparent hover:border-white/5"}
                                `}
                                title={collapsed ? link.label : ""}
                            >
                                {/* Active Indicator Bar */}
                                {isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-pramana-gold rounded-r-full shadow-[0_0_10px_#B8860B]"></div>
                                )}

                                <div className={`relative z-10 ${isActive ? "text-pramana-gold" : "text-pramana-cream/50 group-hover:text-pramana-cream"}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2 : 1.5} />
                                </div>

                                {!collapsed && (
                                    <span className={`relative z-10 font-medium ${isActive ? "text-white tracking-wide" : "text-pramana-cream/70"}`}>
                                        {link.label}
                                    </span>
                                )}

                                {isActive && !collapsed && (
                                    <div className="absolute right-3 w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_5px_#22c55e]"></div>
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-white/5 bg-black/20">
                    <div className={`
                        flex items-center gap-3 p-3 rounded-xl border border-white/5 bg-white/5
                        hover:border-pramana-gold/30 transition-colors cursor-pointer group
                    `}>
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pramana-gold to-yellow-800 flex items-center justify-center text-black font-bold text-lg shadow-lg">
                            {user?.displayName ? user.displayName[0].toUpperCase() : "A"}
                        </div>

                        {!collapsed && (
                            <div className="flex-1 overflow-hidden">
                                <p className="text-sm font-bold text-pramana-cream truncate group-hover:text-white transition">{user?.displayName || "Admin"}</p>
                                <p className="text-xs text-pramana-cream/40 truncate">{user?.email}</p>
                            </div>
                        )}

                        {!collapsed && (
                            <button
                                onClick={logout}
                                className="p-2 text-pramana-cream/40 hover:text-red-400 transition"
                                title="Logout"
                            >
                                <LogOut size={18} />
                            </button>
                        )}
                    </div>
                </div>
            </aside>

            {/* Mobile Overlay */}
            {mobileOpen && (
                <div
                    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-30 md:hidden animate-in fade-in"
                    onClick={() => setMobileOpen(false)}
                ></div>
            )}
        </>
    );
}
