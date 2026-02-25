import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    try {
        const { passId, emails } = await req.json();

        // 1. Validation
        if (!passId || !emails || !Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid Request: No emails provided" }, { status: 400 });
        }

        if (!adminDb) {
            console.error("Firebase Admin DB not initialized");
            return NextResponse.json({ success: false, message: "Server Configuration Error" }, { status: 500 });
        }

        // 2. Get Pass Configuration
        const passRef = adminDb.collection("passes_config").doc(passId);
        const passSnap = await passRef.get();
        if (!passSnap.exists) {
            return NextResponse.json({ success: false, message: "Pass Type not found" }, { status: 404 });
        }
        const passData = passSnap.data()!;

        // 3. Capacity Check (REMOVED)
        // Admins can over-issue passes via bulk

        // 4. Setup Processing Stats & Batch
        let processedCount = 0;
        let issuedCount = 0;
        let usersCreatedCount = 0;
        let duplicateCount = 0;
        let issuedToRegistered = 0;
        let issuedToUnregistered = 0;

        const errors: string[] = [];

        const bookingIdBase = `BLK-${Date.now()}`;
        let batch = adminDb.batch();
        let batchOpCount = 0; // Tracks number of writes in current batch

        const referralUpdates: Record<string, number> = {};

        // Deduplicate the emails array first to prevent same-batch duplicate passes
        const uniqueEmails = [...new Set(emails.map(e => typeof e === 'string' ? e.trim().toLowerCase() : '').filter(Boolean))];

        // 4. Iterate through Emails
        for (let i = 0; i < uniqueEmails.length; i++) {
            const email = uniqueEmails[i];

            processedCount++;

            try {
                let isUnregisteredUser = false;
                let userReferralCode: string | null = null;

                // --- A. User Account Handling (Auto-Registration) ---
                // Check if user exists to ensure they appear in User Management
                const userQuery = await adminDb.collection("users").where("email", "==", email).limit(1).get();

                if (userQuery.empty) {
                    // Create Shadow/Placeholder User
                    isUnregisteredUser = true;
                    // ... (creation logic same as before)
                    const isGitam = email.endsWith('gitam.edu') || email.endsWith('gitam.in');
                    const newUserRef = adminDb.collection("users").doc();

                    batch.set(newUserRef, {
                        displayName: "Not Registered Yet",
                        email: email,
                        isGitamite: isGitam,
                        role: 'user',
                        createdAt: FieldValue.serverTimestamp(),
                        shadowAccount: true,
                        autoCreated: true,
                        registrationData: {}
                    });

                    batchOpCount++;
                    usersCreatedCount++;
                } else {
                    const userData = userQuery.docs[0].data();
                    if (userData.shadowAccount || userData.displayName === "Not Registered Yet") {
                        isUnregisteredUser = true;
                    }
                    if (userData.referralCodeUsed) {
                        userReferralCode = userData.referralCodeUsed;
                    }
                }

                // --- B. Pass Issuance Handling (Duplicate Check) ---
                const existingPassQuery = await adminDb.collection("passes_issued")
                    .where("issuedToEmail", "==", email)
                    .where("passId", "==", passId) // Ensure they don't have THIS specific pass already
                    .limit(1)
                    .get();

                if (!existingPassQuery.empty) {
                    duplicateCount++;
                } else {
                    // Issue New Pass
                    const uniqueSuffix = Math.random().toString(36).substring(2, 7).toUpperCase();
                    const bookingId = `${bookingIdBase}-${i}-${uniqueSuffix}`;
                    const qrCode = `${bookingId}-${email.split('@')[0]}`;

                    const newPassRef = adminDb.collection("passes_issued").doc();

                    batch.set(newPassRef, {
                        passId: passId,
                        passName: passData.name,
                        price: passData.price || 0,
                        bookingId: bookingId,
                        paymentId: 'MANUAL_ISSUE_BULK',
                        paymentMethod: 'admin_bulk',
                        issuedToEmail: email,
                        purchasedBy: 'admin',
                        qrCode: qrCode,
                        status: 'active',
                        admitted: false,
                        purchaseDate: new Date().toISOString(),
                        isPhysicalIssued: false,
                        excludeFromStats: true
                    });

                    batchOpCount++;
                    issuedCount++;

                    // TRACK REFERRAL
                    if (userReferralCode) {
                        referralUpdates[userReferralCode] = (referralUpdates[userReferralCode] || 0) + 1;
                    }

                    if (isUnregisteredUser) {
                        issuedToUnregistered++;
                    } else {
                        issuedToRegistered++;
                    }
                }

                // --- C. Batch Management ---
                if (batchOpCount >= 400) {
                    await batch.commit();
                    batch = adminDb.batch();
                    batchOpCount = 0;
                }

            } catch (err: any) {
                console.error(`Error processing email ${email}:`, err);
                errors.push(`${email}: ${err.message}`);
            }
        }

        // 5. Final Commit (for remaining ops)
        if (batchOpCount > 0) {
            await batch.commit();
        }

        // 6. Update Referral Counts (Outside loop to prevent same-doc-in-batch error)
        const referralCodes = Object.keys(referralUpdates);
        if (referralCodes.length > 0) {
            const referralBatch = adminDb.batch();
            referralCodes.forEach(code => {
                const ref = adminDb.collection("referral_codes").doc(code);
                referralBatch.update(ref, {
                    passesIssued: FieldValue.increment(referralUpdates[code])
                });
            });
            await referralBatch.commit();
        }

        // 6. Update Pass Sold Count (Only for NEWLY issued passes)
        // SKIP incrementing capacity sold counter for ALREADY excluded passes
        // if (issuedCount > 0) {
        //     await passRef.update({
        //         sold: FieldValue.increment(issuedCount)
        //     });
        // }

        return NextResponse.json({
            success: true,
            stats: {
                processed: processedCount,
                issued: issuedCount,
                usersCreated: usersCreatedCount,
                duplicatesSkipped: duplicateCount,
                issuedToRegistered: issuedToRegistered,
                issuedToUnregistered: issuedToUnregistered
            },
            message: `Processed: ${processedCount} | Issued: ${issuedCount}`,
            errors: errors
        });

    } catch (error: any) {
        console.error("Bulk Issue Fatal Error", error);
        return NextResponse.json({ success: false, message: error.message || "Internal Server Error" }, { status: 500 });
    }
}
