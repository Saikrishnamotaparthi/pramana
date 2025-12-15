import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: Request) {
    try {
        const { qrCode } = await req.json();

        if (!qrCode) {
            return NextResponse.json({ success: false, message: "QR Code is required" }, { status: 400 });
        }

        const passesRef = adminDb.collection("passes_issued");
        const snapshot = await passesRef.where("qrCode", "==", qrCode).get(); // Check booking QR

        if (snapshot.empty) {
            // Also check if they scanned a Physical QR? But usually they scan booking QR.
            // Let's stick to booking QR for now.
            return NextResponse.json({ success: false, message: "Booking not found" }, { status: 404 });
        }

        const passDoc = snapshot.docs[0];
        const data = passDoc.data();

        // Fetch User details for category (though we might not need it if not stored elsewhere, but let's try)
        // Actually payment status is implicitly PAID if pass exists in passes_issued? 
        // Not necessarily, admin manual issue is paid. Online is paid.
        // We usually don't store "unpaid" in passes_issued unless it's pending? 
        // Assuming passes_issued means VALID pass.

        // Fetch user profile to get category (Gitam/Non-Gitam)
        let category = "Unknown";
        if (data.issuedToEmail) {
            const userSnap = await adminDb.collection("users").where("email", "==", data.issuedToEmail).get();
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                category = userData.isGitamite ? "Gitam" : "Non-Gitam";
            }
        }

        return NextResponse.json({
            success: true,
            pass: {
                id: passDoc.id,
                passName: data.passName,
                email: data.issuedToEmail,
                bookingId: data.bookingId,
                physicalQr: data.physicalQr || null,
                issuedPhysical: !!data.issuedPhysical,
                category: category
            }
        });

    } catch (error) {
        console.error("Lookup error:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
