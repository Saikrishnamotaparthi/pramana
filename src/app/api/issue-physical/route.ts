import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { qrCode, action, passDocId } = await req.json(); // action: 'issue' | 'reissue'

        const passesRef = adminDb.collection("passes_issued");
        let passDoc;

        if (passDocId) {
            passDoc = await passesRef.doc(passDocId).get();
        } else {
            // Fallback scan
            const snapshot = await passesRef.where("qrCode", "==", qrCode).get();
            if (!snapshot.empty) passDoc = snapshot.docs[0];
        }

        if (!passDoc || !passDoc.exists) {
            return NextResponse.json({ success: false, message: "Pass not found" }, { status: 404 });
        }

        const data = passDoc.data()!;

        // Check if already issued and not reissuing
        if (data.physicalQr && action !== 'reissue') {
            return NextResponse.json({
                success: false,
                message: "Physical Pass already issued. Use Reissue to invalidate old one.",
                alreadyIssued: true
            });
        }

        // Generate Physical QR
        const physicalQr = `PHY-${data.bookingId}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

        await passesRef.doc(passDoc.id).update({
            physicalQr,
            issuedPhysical: true,
            issuedAt: new Date().toISOString(),
            reissued: action === 'reissue' ? true : false,
            previousPhysicalQr: action === 'reissue' ? data.physicalQr : null // Log old QR
        });

        return NextResponse.json({ success: true, physicalQr, passName: data.passName, email: data.issuedToEmail });

    } catch (error) {
        console.error("Error issuing physical pass:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
