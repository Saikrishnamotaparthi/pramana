import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { uid, registrationData, referralCode } = body;

        if (!uid || !registrationData) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const userRef = adminDb.collection("users").doc(uid);

        if (referralCode) {
            const codeRef = adminDb.collection("referral_codes").doc(referralCode);

            // Use transaction for atomic increment + update
            await adminDb.runTransaction(async (t) => {
                const codeDoc = await t.get(codeRef);
                if (!codeDoc.exists) {
                    throw new Error("Invalid Referral Code");
                }

                // Increment registrations
                t.update(codeRef, { registrations: FieldValue.increment(1) });

                // Update user
                t.update(userRef, {
                    registrationData,
                    isRegistered: true,
                    referralCodeUsed: referralCode
                });
            });
        } else {
            // Simple update
            await userRef.update({
                registrationData,
                isRegistered: true
            });
        }

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Registration API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
