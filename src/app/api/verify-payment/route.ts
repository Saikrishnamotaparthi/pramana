import { NextResponse } from "next/server";
import crypto from "crypto";
import { adminDb } from "@/lib/firebase-admin"; // Use Admin SDK
// import { sendPassEmail } from "@/lib/email";
import { FieldValue } from "firebase-admin/firestore";

// Mock verification function if keys missing
const verifySignature = (orderId: string, paymentId: string, sig: string) => {
    if (process.env.RAZORPAY_KEY_SECRET === "PLACEHOLDER_KEY_SECRET") return true;
    const hmac = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!);
    hmac.update(orderId + "|" + paymentId);
    const generated_signature = hmac.digest("hex");
    return generated_signature === sig;
};

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, passId, userId, userEmail, userName, groupMembers } = body;

        const isValid = verifySignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
        if (!isValid) return NextResponse.json({ success: false, message: "Invalid Signature" }, { status: 400 });

        if (!adminDb) {
            console.error("Firebase Admin not initialized");
            return NextResponse.json({ success: false, message: "Server Configuration Error" }, { status: 500 });
        }

        // 1. Get Pass Details
        const passRef = adminDb.collection("passes_config").doc(passId);
        const passSnap = await passRef.get();
        if (!passSnap.exists) return NextResponse.json({ success: false, message: "Pass not found" }, { status: 404 });

        const passData = passSnap.data()!;

        // 2. Generate Unique QR Data (Booking ID)
        const bookingId = `BK-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

        // 3. Issue Pass(es)
        const members: string[] = groupMembers || [userEmail];
        const issuedPasses = [];

        const batch = adminDb.batch();

        for (const email of members) {
            const memberQr = `${bookingId}-${email.split('@')[0]}`;
            const passRecord = {
                passId,
                passName: passData.name,
                bookingId,
                paymentId: razorpay_payment_id,
                issuedToEmail: email,
                purchasedBy: userId,
                qrCode: memberQr,
                status: 'active',
                admitted: false,
                purchaseDate: new Date().toISOString()
            };

            const newPassRef = adminDb.collection("passes_issued").doc();
            batch.set(newPassRef, passRecord);

            // Send Email (Async, don't block too long but we want to ensure it works?)
            // Ideally use a queue. For now await.
            // Email sending removed
            // try {
            //     await sendPassEmail(email, email.split('@')[0], passData.name, memberQr, bookingId);
            // } catch (emailErr) {
            //     console.error("Failed to send email to", email, emailErr);
            // }

            issuedPasses.push(passRecord);
        }

        // 4. Update Sold Count
        batch.update(passRef, {
            sold: FieldValue.increment(1)
        });

        await batch.commit();

        return NextResponse.json({ success: true, bookingId });
    } catch (error) {
        console.error("Verification Error", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
