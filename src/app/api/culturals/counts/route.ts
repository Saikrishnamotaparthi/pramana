
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const competitionId = searchParams.get("competitionId");

        if (!competitionId) {
            return NextResponse.json({ error: "competitionId is required" }, { status: 400 });
        }

        // Use collectionGroup to query all registrations for this competition
        // This runs with admin privileges, bypassing client-side rules
        const snapshot = await adminDb.collectionGroup("registrations")
            .where("competitionId", "==", competitionId)
            .select("category") // Optimization: Only fetch the category field
            .get();

        const counts: Record<string, number> = {};

        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.status === "deleted") return; // Skip deleted registrations
            // if (!data.createdAt) return; // REVERTED: Include legacy records even if date is missing

            const cat = data.category;
            if (cat) {
                counts[cat] = (counts[cat] || 0) + 1;
            }
        });

        return NextResponse.json(counts);

    } catch (error: any) {
        console.error("Error fetching counts:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
