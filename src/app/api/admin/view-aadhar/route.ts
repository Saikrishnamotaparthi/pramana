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
        let decodedToken;
        try {
            decodedToken = await adminAuth.verifyIdToken(token);
        } catch (authError) {
            console.error("[View Aadhar] Token Verification Failed", authError);
            return NextResponse.json({ error: "Unauthorized: Invalid Token" }, { status: 401 });
        }

        // Verify Admin Role
        const callerSnap = await adminDb.collection("users").doc(decodedToken.uid).get();
        const callerData = callerSnap.data();
        if (callerData?.role !== 'admin' && callerData?.role !== 'superadmin') {
            console.error(`[View Aadhar] Forbidden access attempt by ${decodedToken.email}`);
            return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
        }

        // 2. Get User Data to find file path
        const userDoc = await adminDb.collection("users").doc(uid).get();
        if (!userDoc.exists) {
            return NextResponse.json({ error: "User not found" }, { status: 404 });
        }

        const userData = userDoc.data();
        let filePath = userData?.registrationData?.aadharFilePath;

        if (!filePath) {
            return NextResponse.json({ error: "Aadhar file not found for this user" }, { status: 404 });
        }

        // 3. Check if file exists on server, fallback to dynamic path reconstruction
        if (!existsSync(filePath)) {
            const fileName = filePath.split(/[/\\]/).pop();
            const fallbackPath = require('path').join(process.cwd(), "secure_uploads", "aadhar", fileName || "");

            if (fileName && existsSync(fallbackPath)) {
                filePath = fallbackPath;
            } else {
                console.error(`[View Aadhar] File missing at both direct and fallback paths: ${filePath}`);
                return NextResponse.json({ error: `File missing on server storage.` }, { status: 404 });
            }
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
