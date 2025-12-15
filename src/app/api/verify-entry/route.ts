import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { qrCode } = await req.json();

        const passesRef = adminDb.collection("passes_issued");

        // 1. Check Main Booking QR
        let snapshot = await passesRef.where("qrCode", "==", qrCode).get();

        // 2. If not found, check Physical QR
        if (snapshot.empty) {
            snapshot = await passesRef.where("physicalQr", "==", qrCode).get();
        }

        if (snapshot.empty) {
            // Optional: Check if it was a revoked QR (manually checking if needed, or just return invalid)
            return NextResponse.json({ success: false, message: "Invalid or Revoked QR" }, { status: 404 });
        }

        // Check Active Day
        const configDoc = await adminDb.collection("config").doc("entry").get();
        const activeDay = configDoc.exists ? configDoc.data()?.activeDay : 'none';

        if (!activeDay || activeDay === 'none') {
            return NextResponse.json({ success: false, message: "Entry is currently closed.", status: 'CLOSED' });
        }

        const passDoc = snapshot.docs[0];
        const data = passDoc.data();

        const entryLogs = data.entryLogs || [];

        // Check Previous Entry for THIS day
        if (entryLogs.includes(activeDay)) {
            return NextResponse.json({ success: false, message: `Already Entered for ${activeDay.toUpperCase()}`, status: 'ALREADY_ENTERED' });
        }

        // Mark Entry
        await passesRef.doc(passDoc.id).update({
            entryLogs: [...entryLogs, activeDay],
            admitted: true,
            lastEntryAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, message: "Entry Approved", passName: data.passName, user: data.issuedToEmail });

    } catch (error) {
        console.error("Verify Error:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
