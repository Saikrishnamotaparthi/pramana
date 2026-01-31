import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { Filter } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const { qrCode } = await req.json();

        if (!qrCode) {
            return NextResponse.json({ success: false, message: "QR Code is required" }, { status: 400 });
        }

        const passesRef = adminDb.collection("passes_issued");

        console.log(`[Lookup] Searching for QR: "${qrCode}"`);

        // Check Booking QR, Physical QR, OR Booking ID (for bulk issues)
        // Check Booking QR, Physical QR, OR Booking ID, OR Email
        const { email } = await req.json().catch(() => ({})); // Handle if email passed in body directly or just reuse qrCode prop if unified? 
        // Plan said: "Update POST handler to accept email in addition to qrCode."
        // Let's assume the client might send { qrCode: "..." } where "..." could be an email, OR { email: "..." }.
        // Given the unified input, let's treat `qrCode` as a generic `query` input in the API, or check if it looks like an email.

        let queryVal = qrCode;
        // If queryVal is email, we search issuedToEmail.
        // But to be safe, let's just add issuedToEmail to the OR filter if queryVal contains '@'.

        const filters = [
            Filter.where("qrCode", "==", queryVal),
            Filter.where("physicalQr", "==", queryVal),
            Filter.where("bookingId", "==", queryVal)
        ];

        if (queryVal && queryVal.includes('@')) {
            filters.push(Filter.where("issuedToEmail", "==", queryVal));
        }

        const snapshot = await passesRef.where(Filter.or(...filters)).get();

        console.log(`[Lookup] Found ${snapshot.size} documents for QR: "${qrCode}"`);

        if (snapshot.empty) {
            // Also check if they scanned a Physical QR? But usually they scan booking QR.
            // Let's stick to booking QR for now.
            return NextResponse.json({ success: false, message: `Booking not found. Scanned: ${qrCode}` }, { status: 404 });
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
        let userDetails: any = null;

        if (data.issuedToEmail) {
            const userSnap = await adminDb.collection("users").where("email", "==", data.issuedToEmail).get();
            if (!userSnap.empty) {
                const userData = userSnap.docs[0].data();
                category = userData.isGitamite ? "Gitam" : "Non-Gitam";
                userDetails = {
                    uid: userSnap.docs[0].id,
                    displayName: userData.displayName,
                    role: userData.role,
                    isGitamite: userData.isGitamite,
                    registrationData: userData.registrationData || null,
                    photoURL: userData.photoURL
                };
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
                entryLogs: data.entryLogs || [],
                category: category,
                user: userDetails
            }
        });

    } catch (error) {
        console.error("Lookup error:", error);
        return NextResponse.json({ success: false, message: "Server Error" }, { status: 500 });
    }
}
