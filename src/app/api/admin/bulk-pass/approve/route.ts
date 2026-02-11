import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const { requestId } = await req.json();

        if (!requestId) return NextResponse.json({ success: false, message: "Missing Request ID" }, { status: 400 });

        // 1. Verify Verification
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const token = authHeader.split("Bearer ")[1];
        await adminAuth.verifyIdToken(token);

        // 2. Fetch Request
        const reqRef = adminDb.collection("bulk_pass_requests").doc(requestId);
        const reqSnap = await reqRef.get();

        if (!reqSnap.exists) {
            return NextResponse.json({ success: false, message: "Request not found" }, { status: 404 });
        }

        const requestData = reqSnap.data() as any;
        if (requestData.status !== 'pending') {
            return NextResponse.json({ success: false, message: "Request already processed" }, { status: 400 });
        }

        // 3. Fetch Config
        const configRef = adminDb.collection("bulk_pass_configs").doc(requestData.passConfigId);
        const configSnap = await configRef.get();
        if (!configSnap.exists) {
            return NextResponse.json({ success: false, message: "Config not found" }, { status: 404 });
        }
        const config = configSnap.data() as any;

        // 4. Issue Passes (Transaction)
        await adminDb.runTransaction(async (t) => {
            const freshReq = await t.get(reqRef);
            if (freshReq.data()?.status !== 'pending') throw new Error("Request state changed");

            // Update Request
            t.update(reqRef, {
                status: 'approved',
                approvedAt: FieldValue.serverTimestamp()
            });

            // Issue Passes
            // Emails are already normalized in submit, but we normalize again to be safe
            const emails = (requestData.memberEmails || []).map((e: string) => e.toLowerCase().trim());

            // Add main user if not in list? (Submit logic adds main user to memberEmails)
            // If strictly relying on memberEmails:

            for (const email of emails) {
                const newPassRef = adminDb.collection("passes_issued").doc();
                t.set(newPassRef, {
                    passId: requestData.passConfigId,
                    name: config.name,
                    price: config.price / emails.length, // Split or full?
                    issuedToEmail: email,
                    purchaseDate: FieldValue.serverTimestamp(),
                    status: 'active',
                    paymentId: 'BULK_MANUAL',
                    bulkRequestId: requestId,
                    admitted: false,
                    qrCode: newPassRef.id // Simple QR
                });
            }
        });

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Bulk Approve Error:", error);
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}
