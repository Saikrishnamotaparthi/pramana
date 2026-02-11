import { NextRequest, NextResponse } from "next/server";
import { adminDb as db } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { mkdir, writeFile } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();


        const passId = formData.get("passConfigId") as string; // Matching client key
        const memberEmailsString = formData.get("memberEmails") as string;
        const screenshotFile = formData.get("screenshot") as File | null;
        const mainUserEmailRaw = formData.get("mainUserEmail") as string;

        // Validation
        if (!mainUserEmailRaw || !passId || !memberEmailsString || !screenshotFile) {
            return NextResponse.json({ success: false, message: "Missing required fields" }, { status: 400 });
        }

        const memberEmailsRaw = JSON.parse(memberEmailsString);
        if (!Array.isArray(memberEmailsRaw)) {
            return NextResponse.json({ success: false, message: "Invalid emails list" }, { status: 400 });
        }

        // Normalize emails
        const memberEmails = memberEmailsRaw.map((e: any) => String(e).toLowerCase().trim());
        const mainUserEmail = mainUserEmailRaw.toLowerCase().trim();

        // 1. Verify Offer Validity
        const configRef = db.collection("bulk_pass_configs").doc(passId);
        const configSnap = await configRef.get();

        if (!configSnap.exists) {
            return NextResponse.json({ success: false, message: "Invalid Offer" }, { status: 400 });
        }

        const config = configSnap.data();
        if (config?.status !== 'active') {
            return NextResponse.json({ success: false, message: "Offer is no longer active" }, { status: 400 });
        }

        // 2. Handle File Upload (Secure Local Storage)
        const bytes = await screenshotFile.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Create directory (ensure it's relative)
        const uploadRelPath = join("secure_uploads", "bulk_receipts");
        const uploadDir = join(process.cwd(), uploadRelPath);
        if (!existsSync(uploadDir)) {
            await mkdir(uploadDir, { recursive: true });
        }

        // Save file
        // Sanitize email for filename
        const safeEmail = mainUserEmail.replace(/[^a-zA-Z0-9]/g, "_");
        const fileName = `${safeEmail}_${Date.now()}_receipt.jpg`;
        const filePath = join(uploadDir, fileName);
        const relativeFilePath = join(uploadRelPath, fileName);

        await writeFile(filePath, buffer);

        // 3. Create Request in "bulk_pass_requests"
        // ...
        const allEmails = memberEmails;

        const requestData = {
            mainUserEmail,
            passConfigId: passId,
            memberEmails: allEmails,
            screenshotPath: relativeFilePath,
            status: 'pending',
            submittedAt: FieldValue.serverTimestamp()
        };

        await db.collection("bulk_pass_requests").add(requestData);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Bulk Submit Error:", error);
        return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
