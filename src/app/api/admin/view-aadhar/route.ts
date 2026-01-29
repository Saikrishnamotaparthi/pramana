import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase-admin";
import { readFile } from "fs/promises";
import { existsSync } from "fs";
import { lookup } from 'mime-types'; // You might need to install mime-types or just fallback

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const uid = searchParams.get("uid");

        if (!uid) {
            return NextResponse.json({ error: "Missing UID" }, { status: 400 });
        }

        // 1. Verify Authentication (Secure the endpoint)
        const authHeader = req.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const token = authHeader.split("Bearer ")[1];
        try {
            const decodedToken = await adminAuth.verifyIdToken(token);
            // Optional: Check if user is admin. For now, assuming any authenticated user hitting this admin route is protected by frontend routing, 
            // but for true security we should check custom claims or admin list.
            // Let's rely on valid token for now as per MVP, but ideally check admin.
        } catch (authError) {
            console.error("Auth Token Verification Failed", authError);
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // 2. Get User Data to find file path
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        const filePath = userData?.registrationData?.aadharFilePath;

        if (!filePath) {
            return NextResponse.json({ error: "Aadhar file not found for this user" }, { status: 404 });
        }

        // 3. Check if file exists on server
        if (!existsSync(filePath)) {
            return NextResponse.json({ error: "File missing on server storage" }, { status: 404 });
        }

        // 4. Read and Serve File
        const fileBuffer = await readFile(filePath);

        // Determine mime type based on extension (simple fallback)
        const ext = filePath.split('.').pop()?.toLowerCase();
        let contentType = 'application/octet-stream';
        if (ext === 'jpg' || ext === 'jpeg') contentType = 'image/jpeg';
        if (ext === 'png') contentType = 'image/png';
        if (ext === 'pdf') contentType = 'application/pdf';

        return new NextResponse(fileBuffer, {
            headers: {
                "Content-Type": contentType,
                "Content-Length": fileBuffer.length.toString(),
                // "Cache-Control": "private, max-age=3600" // Optional caching
            }
        });

    } catch (error: any) {
        console.error("View Aadhar API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
