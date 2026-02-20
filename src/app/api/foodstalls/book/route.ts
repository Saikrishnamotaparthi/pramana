import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();

        const userId = formData.get("userId") as string;
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const phone = formData.get("phone") as string;
        const stallId = formData.get("stallId") as string;
        const stallName = formData.get("stallName") as string;
        const paymentScreenshot = formData.get("paymentScreenshot") as File | null;

        if (!userId || !name || !email || !phone || !stallId || !paymentScreenshot) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // We run a Firestore transaction to ensure the stall doesn't get booked twice concurrently.
        return await adminDb.runTransaction(async (t) => {
            const stallRef = adminDb.collection("foodStalls").doc(stallId);
            const stallDoc = await t.get(stallRef);

            if (!stallDoc.exists) {
                throw new Error("Stall does not exist");
            }

            const stallData = stallDoc.data()!;
            if (stallData.status !== "available") {
                throw new Error("Stall is no longer available");
            }

            // Save File to secure_uploads
            const bytes = await paymentScreenshot.arrayBuffer();
            const buffer = Buffer.from(bytes);

            const uploadDir = join(process.cwd(), "secure_uploads", "foodstalls");
            if (!existsSync(uploadDir)) {
                await mkdir(uploadDir, { recursive: true });
            }

            const fileName = `${userId}_${stallId}_${Date.now()}.jpg`;
            const filePath = join(uploadDir, fileName);
            await writeFile(filePath, buffer);

            // Create Booking document
            const bookingRef = adminDb.collection("foodStallBookings").doc();
            t.set(bookingRef, {
                userId,
                name,
                email,
                phone,
                stallId,
                stallName,
                screenshotPath: filePath,
                status: "pending", // pending admin approval
                createdAt: FieldValue.serverTimestamp(),
            });

            // Update Stall Status to pending
            t.update(stallRef, {
                status: "pending",
                bookedByUserId: userId,
                bookingId: bookingRef.id,
                updatedAt: FieldValue.serverTimestamp()
            });

            return { bookingId: bookingRef.id };
        }).then((result) => {
            return NextResponse.json({ success: true, bookingId: result.bookingId });
        });

    } catch (error: any) {
        console.error("Food Stall Booking API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
