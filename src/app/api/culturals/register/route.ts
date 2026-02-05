import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const userId = formData.get("userId") as string;
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const college = formData.get("college") as string;
        const competitionId = formData.get("competitionId") as string;
        const category = formData.get("category") as string;
        const teamName = formData.get("teamName") as string | null;
        const paymentScreenshot = formData.get("paymentScreenshot") as File | null;

        if (!userId || !name || !email || !competitionId || !paymentScreenshot) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Handle File Upload (Local Storage)
        const bytes = await paymentScreenshot.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create directory if it doesn't exist
        // Using "cultural_payments" to keep it separate from "aadhar"
        const uploadDir = join(process.cwd(), "secure_uploads", "cultural_payments");
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Save file with unique name
        const fileName = `${userId}_${Date.now()}_${paymentScreenshot.name.replace(/\s+/g, '_')}`;
        const filePath = join(uploadDir, fileName);
        await writeFile(filePath, buffer);

        // 2. Save to Firestore
        // A. Save User Profile (collection: culturals document: userId)
        // This keeps cultural user profiles separate from main users if requested, 
        // or just acts as a parent doc.
        const userProfileRef = adminDb.collection("culturals").doc(userId);
        await userProfileRef.set({
            userId,
            name,
            email,
            phone,
            college,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });

        // B. Save Registration (subcollection: registrations)
        const docRef = await userProfileRef.collection("registrations").add({
            userId, // Redundant but useful for collectionGroup queries
            name,
            email,
            phone,
            college,
            competitionId,
            category,
            teamName: teamName || null,
            paymentScreenshotPath: filePath,
            paymentScreenshotName: fileName,
            createdAt: FieldValue.serverTimestamp(),
            status: "pending",
        });

        return NextResponse.json({ success: true, id: docRef.id });

    } catch (error: any) {
        console.error("Cultural Registration API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
