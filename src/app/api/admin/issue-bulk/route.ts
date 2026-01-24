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

        // 3. Setup Processing Stats & Batch
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

        // 4. Iterate through Emails
        for (let i = 0; i < emails.length; i++) {
            const rawEmail = emails[i];
            if (!rawEmail || typeof rawEmail !== 'string') continue;

            const email = rawEmail.trim().toLowerCase();
            if (!email) continue;

            processedCount++;

            try {
                let isUnregisteredUser = false;

                // --- A. User Account Handling (Auto-Registration) ---
                // Check if user exists to ensure they appear in User Management
                const userQuery = await adminDb.collection("users").where("email", "==", email).limit(1).get();

                if (userQuery.empty) {
                    // Create Shadow/Placeholder User
                    isUnregisteredUser = true;
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
                        registrationData: {} // Empty map to prevent errors
                    });

                    batchOpCount++;
                    usersCreatedCount++;
                } else {
                    const userData = userQuery.docs[0].data();
                    // Check if existing user is actually a shadow/unregistered account
                    if (userData.shadowAccount || userData.displayName === "Not Registered Yet") {
                        isUnregisteredUser = true;
                    }
                }

                // --- B. Pass Issuance Handling (Duplicate Check) ---
                // Check if THIS specific pass type is already issued to this email
                const existingPassQuery = await adminDb.collection("passes_issued")
                    .where("issuedToEmail", "==", email)
                    .where("passId", "==", passId)
                    .limit(1)
                    .get();

                if (!existingPassQuery.empty) {
                    // Pass already exists for this user -> SKIP
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
                        isPhysicalIssued: false
                    });

                    batchOpCount++;
                    issuedCount++;

                    if (isUnregisteredUser) {
                        issuedToUnregistered++;
                    } else {
                        issuedToRegistered++;
                    }
                }

                // --- C. Batch Management ---
                // Firestone Batch limit is 500 operations. We do max 2 operations per loop.
                // Committing every 400 is safe.
                if (batchOpCount >= 400) {
                    await batch.commit();
                    batch = adminDb.batch(); // Start new batch
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

        // 6. Update Pass Sold Count (Only for NEWLY issued passes)
        if (issuedCount > 0) {
            await passRef.update({
                sold: FieldValue.increment(issuedCount)
            });
        }

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
