import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { sendCulturalApprovalEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
    try {
        const { regId, userName, userEmail, competitionName, category, userId } = await req.json();

        if (!regId || !userEmail || !userId) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. Verify Authentication (Admin Only)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
        } catch (authError) {
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // 2. Update Firestore Status
        // Correct path: culturals/{userId}/registrations/{regId}
        await adminDb.collection("culturals").doc(userId).collection("registrations").doc(regId).update({
            status: "approved"
        });

        // 3. Send Email
        // We do this asynchronously without awaiting if we want faster response, 
        // but for safety we await to confirm everything worked.
        await sendCulturalApprovalEmail(userEmail, userName, competitionName, category);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Approval API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
