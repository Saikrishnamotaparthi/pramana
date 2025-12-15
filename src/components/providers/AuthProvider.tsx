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
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (!loading && user) {
            if (user.role === 'superadmin' && !pathname.startsWith('/admin')) {
                // Determine if we should redirect. If they are just landing on home page, maybe let them be?
                // User requirement: "automatically go to admin page"
                // Let's force it for now if they are on root or register
                if (pathname === "/" || pathname === "/register") {
                    router.push("/admin");
                }
            } else if (user.role === 'entry_admin') {
                // FORCE Redirect for Entry Admin
                if (!pathname.startsWith('/entry')) {
                    router.push("/entry");
                }
            } else if (!user.isRegistered && pathname !== "/register") {
                router.push("/register");
            }
            // Redirect registered users away from register page?
            if (user.isRegistered && pathname === "/register") {
                router.push("/");
            }
        }
    }, [user, loading, pathname, router]);


    const signInWithGoogle = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
        } catch (error) {
            console.error("Error signing in with Google", error);
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
