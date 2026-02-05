import { db, storage } from "./firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

export interface CulturalRegistrationData {
    name: string;
    email: string;
    phone: string;
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
