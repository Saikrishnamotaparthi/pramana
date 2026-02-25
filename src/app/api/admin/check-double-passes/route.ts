import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
    try {
        console.log("Checking for double passes...");

        // Fetch all issued passes
        const passesSnap = await adminDb.collection("passes_issued").get();
        const passes = passesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const userPasses: Record<string, any[]> = {};

        // Group by email
        passes.forEach((pass: any) => {
            const email = pass.issuedToEmail?.toLowerCase().trim();
            if (!email) return;

            if (!userPasses[email]) {
                userPasses[email] = [];
            }
            userPasses[email].push({
                passId: pass.passId,
                passName: pass.passName,
                bookingId: pass.bookingId,
                status: pass.status,
                docId: pass.id,
                purchaseDate: pass.purchaseDate,
                purchasedBy: pass.purchasedBy
            });
        });

        const doublePasses: any[] = [];
        let totalDuplicates = 0;
        const deletedIds: string[] = [];

        const batchSize = 400;
        let batch = adminDb.batch();
        let opCount = 0;

        // Find users with more than 1 pass of the SAME TYPE
        for (const email in userPasses) {
            const group = userPasses[email];
            if (group.length > 1) {
                // Check if they have multiple of the exact same pass type
                const passesByType: Record<string, any[]> = {};
                for (const p of group) {
                    if (!passesByType[p.passId]) passesByType[p.passId] = [];
                    passesByType[p.passId].push(p);
                }

                for (const passId in passesByType) {
                    const sameTypePasses = passesByType[passId];
                    if (sameTypePasses.length > 1) {
                        // Keep the one purchased by the user if it exists, otherwise admin ones, or just the first one
                        sameTypePasses.sort((a, b) => {
                            if (a.purchasedBy === 'user' && b.purchasedBy !== 'user') return -1;
                            if (b.purchasedBy === 'user' && a.purchasedBy !== 'user') return 1;
                            // Otherwise sort by purchase date
                            return new Date(a.purchaseDate).getTime() - new Date(b.purchaseDate).getTime();
                        });

                        const keepPass = sameTypePasses[0];
                        const duplicatesToDelete = sameTypePasses.slice(1); // Delete everything after the first one

                        if (duplicatesToDelete.length > 0) {
                            doublePasses.push({
                                email,
                                passName: keepPass.passName,
                                keep: keepPass,
                                deleted: duplicatesToDelete
                            });

                            for (const duplicate of duplicatesToDelete) {
                                const ref = adminDb.collection("passes_issued").doc(duplicate.docId);
                                batch.delete(ref);
                                deletedIds.push(`${email} (Pass ID: ${duplicate.docId})`);
                                opCount++;
                                totalDuplicates++;

                                if (opCount >= batchSize) {
                                    await batch.commit();
                                    batch = adminDb.batch();
                                    opCount = 0;
                                }
                            }
                        }
                    }
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        // Sort to show users with the highest number of passes first
        doublePasses.sort((a, b) => b.deleted.length - a.deleted.length);

        return NextResponse.json({
            success: true,
            totalUsersWithMultiplePasses: doublePasses.length,
            totalDuplicatePassesDeleted: totalDuplicates,
            usersProcessed: doublePasses
        });

    } catch (error: any) {
        console.error("Check Double Passes Error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
