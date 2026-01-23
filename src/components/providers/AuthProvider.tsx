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
                document.cookie = "auth_status=true; path=/; max-age=86400; SameSite=Strict";
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

                    if (dbUser.role === 'superadmin' && !pathname.startsWith('/admin') && pathname !== '/entry') {
                        router.push("/admin");
                    } else if (!dbUser.isRegistered && pathname !== "/register") {
                        router.push("/register");
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
                    if (isSuperAdmin) {
                        router.push("/admin");
                    } else if (pathname !== "/register") {
                        router.push("/register");
                    }
                }
            } else {
                // User is signed out
                document.cookie = "auth_status=; path=/; max-age=0; SameSite=Strict";
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading && user) {
            // Keep cookie fresh
            document.cookie = "auth_status=true; path=/; max-age=86400; SameSite=Strict";

            // 1. Unregistered Users -> Restriction
            if (!user.isRegistered && pathname !== "/register") {
                router.replace("/register");
                return;
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
            } else if (user.role === 'superadmin' || user.role === 'admin') {
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
