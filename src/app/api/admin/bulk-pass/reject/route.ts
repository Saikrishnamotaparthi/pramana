import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { requestId, reason } = await req.json();

        if (!requestId) return NextResponse.json({ success: false, message: "Missing Request ID" }, { status: 400 });

        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        // 2. Reject Request
        await adminDb.collection("bulk_pass_requests").doc(requestId).update({
            status: 'rejected',
            rejectReason: reason || "No reason provided",
            rejectedAt: FieldValue.serverTimestamp()
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Bulk Reject Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
