import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const uid = formData.get("uid") as string;
        const registrationDataString = formData.get("registrationData") as string;
        const referralCode = formData.get("referralCode") as string | null;
        const aadharFile = formData.get("aadharFile") as File | null;

        if (!uid || !registrationDataString) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const registrationData = JSON.parse(registrationDataString);
        const userRef = adminDb.collection("users").doc(uid);

        // Handle File Upload
        if (aadharFile) {
            const bytes = await aadharFile.arrayBuffer();
            const buffer = Buffer.from(bytes);

            // Create directory if it doesn't exist
            const uploadDir = join(process.cwd(), "secure_uploads", "aadhar");
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            // Save file
            const fileName = `${uid}_front_${Date.now()}.jpg`;
            const filePath = join(uploadDir, fileName);
            await writeFile(filePath, buffer);

            // You might want to save the path or filename in user data too, but not explicitly requested.
            // But let's add it to registrationData for reference if needed later, or just logging.
            // keeping it simple as per request "store every thing" implies just storing the file.
            // We can optionally add a reference in the DB.
            registrationData.aadharFilePath = filePath;
        }

        if (referralCode) {
            const codeRef = adminDb.collection("referral_codes").doc(referralCode);

            // Use transaction for atomic increment + update
            await adminDb.runTransaction(async (t) => {
                const codeDoc = await t.get(codeRef);
                if (!codeDoc.exists) {
                    throw new Error("Invalid Referral Code");
                }

                // Increment registrations
                t.update(codeRef, { registrations: FieldValue.increment(1) });

                // Update user
                t.update(userRef, {
                    registrationData,
                    isRegistered: true,
                    referralCodeUsed: referralCode
                });
            });
        } else {
            // Simple update
            await userRef.update({
                registrationData,
                isRegistered: true
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Registration API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
