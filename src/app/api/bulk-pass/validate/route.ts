import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

export async function POST(req: NextRequest) {
    try {
        const { emails } = await req.json();

        if (!Array.isArray(emails) || emails.length === 0) {
            return NextResponse.json({ success: false, message: "Invalid input" }, { status: 400 });
        }

        const results: Record<string, { status: 'valid' | 'invalid' | 'registered' | 'has_pass', name?: string, message?: string }> = {};

        // Process in parallel (or limit concurrency if needed)
        await Promise.all(emails.map(async (email) => {
            if (!email || typeof email !== 'string' || !email.includes('@')) {
                results[email] = { status: 'invalid', message: 'Invalid Email' };
                return;
            }

            // 1. Check if User Exists
            const usersSnap = await adminDb.collection("users").where("email", "==", email).limit(1).get();
            let name = "Unregistered User";
            let status: 'valid' | 'registered' = 'valid';

            if (!usersSnap.empty) {
                const uData = usersSnap.docs[0].data();
                name = uData.displayName || "Registered User";
                status = 'registered';
            }

            // 2. Check if User Has Pass
            const passesSnap = await adminDb.collection("passes_issued")
                .where("issuedToEmail", "==", email)
                .where("status", "==", "active")
                .limit(1)
                .get();

            if (!passesSnap.empty) {
                results[email] = { status: 'has_pass', name, message: 'User already has a pass!' };
            } else {
                results[email] = {
                    status,
                    name,
                    message: status === 'registered' ? `Verified: ${name}` : 'User not registered (Pass will still be issued)'
                };
            }
        }));

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        console.error("Validation Error:", error);
        return NextResponse.json({ success: false, message: "Server validation failed" }, { status: 500 });
    }
}
