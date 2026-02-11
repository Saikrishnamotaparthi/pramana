import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { readFile } from "fs/promises";
import { existsSync } from "fs";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const requestId = searchParams.get("requestId");

        if (!requestId) {
            return NextResponse.json({ error: "Missing Request ID" }, { status: 400 });
        }

        // 1. Verify Authentication
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            await adminAuth.verifyIdToken(token);
        } catch {
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // 2. Lookup Request to get File Path
        const docSnap = await adminDb.collection("bulk_pass_requests").doc(requestId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const data = docSnap.data();
        const filePath = data?.screenshotPath;

        if (!filePath) {
            // Fallback: If legacy request using URL (shouldn't happen for new ones), or error
            if (data?.screenshotUrl) {
                // Return redirect to URL? Or error.
                return NextResponse.redirect(data.screenshotUrl);
            }
            return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
        }

        // 3. Serve File
        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "File missing on server storage" }, { status: 404 });
        }

        const fileBuffer = await readFile(filePath);
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'pdf') contentType = 'application/pdf';

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
                "Cache-Control": "private, max-age=3600"
            }
        });

    } catch (error: any) {
        console.error("View Receipt API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
