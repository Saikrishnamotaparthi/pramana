import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const regId = searchParams.get("regId");

        if (!regId) {
            return NextResponse.json({ error: "Missing Registration ID" }, { status: 400 });
        }

        // 1. Verify Authentication (Admin Only)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
            // In a stricter system, checking admin role claims here is recommended
        } catch (authError) {
            console.error("Auth Token Verification Failed", authError);
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // 2. Get Registration Data
        const docSnap = await adminDb.collection("cultural_registrations").doc(regId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: "Registration not found" }, { status: 404 });
        }

        const data = docSnap.data();
        const filePath = data?.paymentScreenshotPath;

        if (!filePath) {
            return NextResponse.json({ error: "File path not found in record" }, { status: 404 });
        }

        // 3. Serve File
        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "File missing on server storage" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);

        // Simple mime type detection
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'pdf') contentType = 'application/pdf';

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
            }
        });

    } catch (error: any) {
        console.error("View Payment API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
