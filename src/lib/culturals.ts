import { db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface CulturalRegistrationData {
    name: string;
    email: string;
    phone: string;
    dob: string;
    college: string;
    competitionId: string;
    category: string;
    teamSize?: string;
    teamName?: string;
    paymentScreenshotUrl?: string;
    userId: string;
}

export const saveCulturalRegistration = async (data: CulturalRegistrationData, file: File) => {
    try {
        console.log("Starting cultural registration (Server-Side)...", data);

        const formData = new FormData();
        formData.append("userId", data.userId);
        formData.append("name", data.name);
        formData.append("email", data.email);
        formData.append("phone", data.phone);
        formData.append("dob", data.dob);
        formData.append("college", data.college);
        formData.append("competitionId", data.competitionId);
        formData.append("category", data.category);
        if (data.teamName) formData.append("teamName", data.teamName);
        formData.append("paymentScreenshot", file);

        const response = await fetch("/api/culturals/register", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || "Server registration failed");
        }

        console.log("Registration successful, ID:", result.id);
        return { success: true, id: result.id };
    } catch (error: any) {
        console.error("Error saving cultural registration:", error);
        throw new Error(error.message || "Unknown error occurred during registration");
    }
};

export const getUserRegistrations = async (userId: string) => {
    try {
        const CACHE_KEY = `cultural_registrations_${userId}`;
        const cachedData = sessionStorage.getItem(CACHE_KEY);

        if (cachedData) {
            console.log("Serving registrations from cache");
            return JSON.parse(cachedData) as any[]; // Using any[] for the registration structure
        }

        console.log("Fetching registrations from Firestore");
        // Lazy load imports to avoid circular deps or client/server issues if this file is used in mixed contexts
        // But since this is likely client-side due to sessionStorage, standard imports are fine.
        // Re-importing specific functions needed for this scope just to be safe if moved or lazy loaded,
        // but since we are in the same file as imports, we can use top-level imports.
        const { collection, query, getDocs, orderBy } = await import("firebase/firestore");

        const q = query(
            collection(db, "culturals", userId, "registrations"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        sessionStorage.setItem(CACHE_KEY, JSON.stringify(data));
        return data;

    } catch (error) {
        console.error("Error fetching user registrations:", error);
        throw error;
    }
};

export const invalidateUserRegistrationsCache = (userId: string) => {
    try {
        const CACHE_KEY = `cultural_registrations_${userId}`;
        sessionStorage.removeItem(CACHE_KEY);
        console.log("Invalidated registration cache for", userId);
    } catch (error) {
        console.error("Error invalidating cache:", error);
    }
};
