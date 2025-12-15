import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";

export async function POST(req: Request) {
    try {
        const { amount, currency = "INR", receipt } = await req.json();

        const options = {
            amount: amount * 100, // Razorpay expects amount in paise
            currency,
            receipt,
        };

        const order = await razorpay.orders.create(options);
        return NextResponse.json(order);
    } catch (error) {
        console.error("Error creating order:", error);
        return NextResponse.json({ error: "Error creating order" }, { status: 500 });
    }
}
