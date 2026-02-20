import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const bookingId = searchParams.get('bookingId');

        if (!bookingId) {
            return new NextResponse("Missing booking ID", { status: 400 });
        }

        // 1. Get Booking Doc
        const bookingRef = adminDb.collection("foodStallBookings").doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
            return new NextResponse("Booking not found", { status: 404 });
        }

        const data = bookingDoc.data();
        const screenshotPath = data?.screenshotPath;

        if (!screenshotPath || !existsSync(screenshotPath)) {
            return new NextResponse("Screenshot not found on server", { status: 404 });
        }

        // 2. Serve Image
        const buffer = await readFile(screenshotPath);

        return new NextResponse(buffer, {
            status: 200,
            headers: {
                "Content-Type": "image/jpeg",
                "Cache-Control": "public, max-age=3600"
            }
        });

    } catch (error: any) {
        console.error("View Food Stall Screenshot API Error:", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}
