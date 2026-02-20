import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase-admin";

// Use directly from Admin Dashboard to add stalls (Client components could do it too, but we can do a simple API)
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { category, name } = body;

        if (!category || !name) {
            return NextResponse.json({ error: "Missing required fields: category, name" }, { status: 400 });
        }

        if (category !== "B" && category !== "C") {
            return NextResponse.json({ error: "Invalid category. Only B and C can be added interactively." }, { status: 400 });
        }

        const stallRef = adminDb.collection("foodStalls").doc();
        await stallRef.set({
            id: stallRef.id,
            category,
            name,
            status: "available",
            createdAt: new Date().toISOString()
        });

        return NextResponse.json({ success: true, id: stallRef.id });
    } catch (error: any) {
        console.error("Add Food Stall API Error:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
