import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET() {
    try {
        console.log("Starting Duplicate Cleanup...");
        const usersSnap = await adminDb.collection("users").get();
        const users = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const emailGroups: Record<string, any[]> = {};

        // Group by email
        users.forEach((user: any) => {
            const email = user.email?.toLowerCase().trim();
            if (!email) return;
            if (!emailGroups[email]) emailGroups[email] = [];
            emailGroups[email].push(user);
        });

        const deletedIds: string[] = [];
        const errors: string[] = [];
        const batchSize = 400;
        let batch = adminDb.batch();
        let opCount = 0;

        for (const email in emailGroups) {
            const group = emailGroups[email];
            if (group.length > 1) {
                // Find shadow accounts
                const shadows = group.filter(u => u.shadowAccount === true || u.displayName === "Not Registered Yet");
                const registered = group.filter(u => !u.shadowAccount && u.displayName !== "Not Registered Yet");

                // Only delete SHADOWS if there is at least one REGISTERED account
                // OR if there are multiple shadows (keep one? No, if typically we want to merge, but here we just want to remove the pure duplicates)
                // Logic: If we have a "real" user, delete all "shadow" users for this email.

                if (registered.length > 0 && shadows.length > 0) {
                    for (const shadow of shadows) {
                        const ref = adminDb.collection("users").doc(shadow.id);
                        batch.delete(ref);
                        deletedIds.push(`${shadow.email} (Shadow ID: ${shadow.id})`);
                        opCount++;

                        if (opCount >= batchSize) {
                            await batch.commit();
                            batch = adminDb.batch();
                            opCount = 0;
                        }
                    }
                }
            }
        }

        if (opCount > 0) {
            await batch.commit();
        }

        return NextResponse.json({
            success: true,
            deletedCount: deletedIds.length,
            deletedUsers: deletedIds,
            message: "Cleanup complete"
        });

    } catch (error: any) {
        console.error("Cleanup Error", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
