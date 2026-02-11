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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (error: any) {
            console.error("[View Receipt] Token Verification Failed:", error.message);
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // Optional: Verify Admin Role from DB
        const userSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
        const userData = userSnap.data();
        if (userData?.role !== 'admin' && userData?.role !== 'superadmin') {
            console.error(`[View Receipt] Forbidden access attempt by ${decodedToken.email}`);
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // 2. Lookup Request to get File Path
        const docSnap = await adminDb.collection("bulk_pass_requests").doc(requestId).get();
        if (!docSnap.exists) {
            return NextResponse.json({ error: "Request not found" }, { status: 404 });
        }

        const data = docSnap.data();
        let filePath = data?.screenshotPath;

        if (!filePath) {
            if (data?.screenshotUrl) {
                return NextResponse.redirect(data.screenshotUrl);
            }
            return NextResponse.json({ error: "Receipt file not found" }, { status: 404 });
        }

        // Path Normalization for Linux (conver \ to /)
        if (process.platform !== 'win32') {
            filePath = filePath.replace(/\\/g, '/');
            // If the path was stored as absolute Windows path like A:\... we might need more surgery.
            // But if it's relative or we can strip the drive letter, it helps.
            if (filePath.includes(':')) {
                // Stripping 'A:' or 'C:' etc.
                filePath = filePath.split(':').pop();
                // Ensure it's relative to root or some base if needed.
                // For now just stripping drive letter and hoping for the best.
            }
        }

        // 3. Serve File
        if (!existsSync(filePath)) {
            console.error(`[View Receipt] File missing at: ${filePath}`);
            return NextResponse.json({ error: `File missing on server storage: ${filePath}` }, { status: 404 });
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
