"use client";

import React, { createContext, useEffect, useState } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, User } from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserProfile, AuthContextType } from "@/types";
import { isGitamEmail } from "@/lib/utils";

import { useRouter, usePathname } from "next/navigation";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // User is signed in
                document.cookie = "auth_status=true; path=/; max-age=86400; SameSite=Lax";
                const userRef = doc(db, "users", firebaseUser.uid);
                const userSnap = await getDoc(userRef);

                if (userSnap.exists()) {
                    // User exists in DB
                    const dbUser = { ...userSnap.data() } as UserProfile;

                    // Fix for Super Admin if they are stuck or rule changes
                    if (firebaseUser.email === "skmotaparthi@gmail.com") {
                        let changed = false;
                        if (dbUser.role !== 'superadmin') { dbUser.role = 'superadmin'; changed = true; }
                        if (!dbUser.isRegistered) { dbUser.isRegistered = true; changed = true; }

                        if (changed) {
                            await setDoc(userRef, { role: 'superadmin', isRegistered: true }, { merge: true });
                        }
                    }

                    setUser(dbUser);

                    const adminRoles = ['superadmin', 'admin', 'view_admin', 'marketing_admin', 'cul_admin', 'food_admin'];
                    if (adminRoles.includes(dbUser.role) && !pathname.startsWith('/admin') && pathname !== '/entry' && pathname !== '/issue-pass') {
                        router.push("/admin");
                    } else if (dbUser.role === 'entry_admin' && !pathname.startsWith('/entry')) {
                        router.push("/entry");
                    } else if (dbUser.role === 'ppass_admin' && !pathname.startsWith('/issue-pass')) {
                        router.push("/issue-pass");
                    } else if (!dbUser.isRegistered) {
                        const allowedPaths = ['/register', '/foodstalls'];
                        const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
                        if (!isAllowed) {
                            router.push(pathname !== "/" ? `/register?returnUrl=${encodeURIComponent(pathname)}` : "/register");
                        }
                    }
                } else {
                    // New user
                    const isGitam = isGitamEmail(firebaseUser.email);
                    const isSuperAdmin = firebaseUser.email === "skmotaparthi@gmail.com";
                    const role = isSuperAdmin ? 'superadmin' : 'user';

                    const newUser: UserProfile = {
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        isGitamite: isGitam,
                        role,
                        isRegistered: isSuperAdmin, // Auto register super admin
                        createdAt: Date.now(),
                    };

                    await setDoc(userRef, newUser);
                    setUser(newUser);
                    const adminRoles = ['superadmin', 'admin', 'view_admin', 'marketing_admin', 'cul_admin', 'food_admin'];
                    if (adminRoles.includes(newUser.role)) {
                        router.push("/admin");
                    } else if (newUser.role === 'entry_admin') {
                        router.push("/entry");
                    } else if (newUser.role === 'ppass_admin') {
                        router.push("/issue-pass");
                    } else {
                        const allowedPaths = ['/register', '/foodstalls'];
                        const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
                        if (!isAllowed) {
                            router.push(pathname !== "/" ? `/register?returnUrl=${encodeURIComponent(pathname)}` : "/register");
                        }
                    }
                }
            } else {
                // User is signed out
                document.cookie = "auth_status=; path=/; max-age=0; SameSite=Lax";
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading && user) {
            // Keep cookie fresh
            document.cookie = "auth_status=true; path=/; max-age=86400; SameSite=Lax";

            // 1. Unregistered Users -> Restriction
            if (!user.isRegistered) {
                const allowedPaths = ['/register', '/foodstalls'];
                const isAllowed = allowedPaths.some(p => pathname === p || pathname.startsWith(`${p}/`));
                if (!isAllowed) {
                    router.replace(pathname !== "/" ? `/register?returnUrl=${encodeURIComponent(pathname)}` : "/register");
                    return;
                }
            }

            // 2. Registered Users trying to access Register -> Restriction
            if (user.isRegistered && pathname === "/register") {
                router.replace("/");
                return;
            }

            // 3. Role-Based Access Control
            if (user.role === 'user') {
                // Regular Users cannot access Admin or Entry portals
                if (pathname.startsWith('/admin') || pathname.startsWith('/entry')) {
                    router.replace("/dashboard");
                }
            } else if (user.role === 'entry_admin') {
                // Entry Admin is locked to Entry Portal
                if (!pathname.startsWith('/entry')) {
                    router.replace("/entry");
                }
            } else if (user.role === 'ppass_admin') {
                // Physical Pass Admin is locked to Issue Pass Page
                if (!pathname.startsWith('/issue-pass')) {
                    router.replace("/issue-pass");
                }
            } else if (user.role === 'superadmin' || user.role === 'admin' || user.role === 'view_admin' || user.role === 'marketing_admin' || user.role === 'cul_admin' || user.role === 'food_admin') {
                // Admins Logic
                // If landing on root, guide to admin. Otherwise allow freedom.
                if (pathname === "/") {
                    router.replace("/admin");
                }
            }
        }
    }, [user, loading, pathname, router]);


    const signInWithGoogle = async () => {
        try {
            return await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
            throw error;
        }
    };

    const logout = async () => {
        try {
            await signOut(auth);
        } catch (error) {
            console.error("Error signing out", error);
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, logout }}>
            {children}
        </AuthContext.Provider>
    );
}
