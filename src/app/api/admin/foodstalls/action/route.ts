import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

// Actions: 'approve', 'revoke', 'mark_sold_out', 'mark_available', 'hide', 'delete'
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { stallId, bookingId, action } = body;

        if (!stallId || !action) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        await adminDb.runTransaction(async (t) => {
            const stallRef = adminDb.collection("foodStalls").doc(stallId);
            const stallDoc = await t.get(stallRef);

            if (!stallDoc.exists) {
                throw new Error("Stall not found");
            }

            if (action === "approve") {
                if (!bookingId) throw new Error("Booking ID required for approval");
                const bookingRef = adminDb.collection("foodStallBookings").doc(bookingId);

                t.update(bookingRef, { status: "approved", updatedAt: FieldValue.serverTimestamp() });
                t.update(stallRef, { status: "sold_out", updatedAt: FieldValue.serverTimestamp() });

            } else if (action === "revoke") {
                if (!bookingId) throw new Error("Booking ID required for revocation");
                const bookingRef = adminDb.collection("foodStallBookings").doc(bookingId);

                t.update(bookingRef, { status: "revoked", updatedAt: FieldValue.serverTimestamp() });
                t.update(stallRef, {
                    status: "available",
                    bookedByUserId: FieldValue.delete(),
                    bookingId: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp()
                });

            } else if (action === "mark_sold_out") {
                t.update(stallRef, { status: "sold_out", updatedAt: FieldValue.serverTimestamp() });

            } else if (action === "mark_available") {
                t.update(stallRef, {
                    status: "available",
                    bookedByUserId: FieldValue.delete(),
                    bookingId: FieldValue.delete(),
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else if (action === "hide") {
                t.update(stallRef, {
                    status: "hidden",
                    updatedAt: FieldValue.serverTimestamp()
                });
            } else if (action === "delete") {
                t.delete(stallRef);
            } else {
                throw new Error("Invalid action");
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Food Stall Action API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
