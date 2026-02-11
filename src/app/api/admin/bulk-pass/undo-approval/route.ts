import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { requestId } = await req.json();

        if (!requestId) return NextResponse.json({ success: false, message: "Missing Request ID" }, { status: 400 });

        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        // 2. Find Passes needed to be deleted
        const passesRef = adminDb.collection("passes_issued");
        const snapshot = await passesRef.where("bulkRequestId", "==", requestId).get();

        if (snapshot.empty) {
            return NextResponse.json({ success: false, message: "No passes found for this request" }, { status: 404 });
        }

        // 3. Batch Delete & Update
        const batch = adminDb.batch();

        snapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });

        // Reset Request Status to Pending
        const reqRef = adminDb.collection("bulk_pass_requests").doc(requestId);
        batch.update(reqRef, {
            status: 'pending',
            approvedAt: null // Clear approval timestamp
        });

        await batch.commit();

        return NextResponse.json({ success: true, count: snapshot.size });

    } catch (error: any) {
        console.error("Undo Approval Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
