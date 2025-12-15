"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import Script from "next/script";
import { PassConfig, Coupon } from "@/types";

function CheckoutContent() {
    const searchParams = useSearchParams();
    const passId = searchParams.get("passId");
    const router = useRouter();
    const { user, loading } = useAuth();

    const [pass, setPass] = useState<PassConfig | null>(null);
    const [feeConfig, setFeeConfig] = useState({ gitam: 0, public: 0 });
    const [userProfile, setUserProfile] = useState<any>(null);
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState<Coupon | null>(null);
    const [processing, setProcessing] = useState(false);
    const [verifying, setVerifying] = useState(true);

    // Group Logic
    const [groupEmails, setGroupEmails] = useState<string[]>([]);

    useEffect(() => {
        if (!loading) {
            if (!user) {
                router.push("/login?redirect=/checkout?passId=" + passId);
                return;
            }

            const init = async () => {
                try {
                    // 1. Fetch Pass
                    if (!passId) throw new Error("No Pass ID");
                    const passSnap = await getDoc(doc(db, "passes_config", passId));
                    if (!passSnap.exists()) throw new Error("Pass not found");
                    const passData = { id: passSnap.id, ...passSnap.data() } as PassConfig;
                    setPass(passData);

                    // Initialize Group Emails if needed
                    if (passData.type === 'group') {
                        setGroupEmails(Array(passData.groupSize || 1).fill(""));
                    }

                    // 2. Fetch User Profile (Category)
                    const userSnap = await getDoc(doc(db, "users", user.uid));
                    const uData = userSnap.exists() ? userSnap.data() : {};
                    setUserProfile(uData);

                    // 3. Fetch Fees
                    const feeSnap = await getDoc(doc(db, "config", "fees"));
                    if (feeSnap.exists()) {
                        const f = feeSnap.data();
                        setFeeConfig({ gitam: f.platformFeeGitam || 0, public: f.platformFeePublic || 0 });
                    }
                } catch (error) {
                    console.error(error);
                    alert("Error loading checkout details");
                    router.push("/tickets");
                } finally {
                    setVerifying(false);
                }
            };
            init();
        }
    }, [loading, user, passId, router]);

    const applyCoupon = async () => {
        if (!couponCode) return;
        setProcessing(true);
        try {
            const q = query(collection(db, "coupons"), where("code", "==", couponCode.toUpperCase()), where("active", "==", true));
            const snap = await getDocs(q);

            if (snap.empty) {
                alert("Invalid Coupon");
                setAppliedCoupon(null);
                setProcessing(false);
                return;
            }

            const coupon = snap.docs[0].data() as Coupon;

            // Validate Logic (Limit, Category, Pass Scope)
            if (coupon.limit > 0 && coupon.used >= coupon.limit) throw new Error("Coupon limit reached");

            // Scope
            const applicableArr = Array.isArray(coupon.applicableTo) ? coupon.applicableTo : [coupon.applicableTo];
            const isGitam = userProfile?.isGitamite;

            // Category Check
            if (applicableArr.includes('gitam') && !isGitam) throw new Error("Coupon for Gitamites only");
            if (applicableArr.includes('non-gitam') && isGitam) throw new Error("Coupon for Non-Gitamites only");

            // Pass Scope Check
            const isBroad = applicableArr.includes('all') || applicableArr.includes('gitam') || applicableArr.includes('non-gitam');
            const isSpecific = pass && applicableArr.includes(pass.id);
            if (!isBroad && !isSpecific) throw new Error("Coupon not valid for this pass");

            setAppliedCoupon(coupon);
            alert("Coupon Applied!");
        } catch (err: any) {
            alert(err.message || "Failed to apply coupon");
            setAppliedCoupon(null);
        } finally {
            setProcessing(false);
        }
    };

    if (loading || verifying || !pass || !user) return <div className="min-h-screen flex items-center justify-center">Loading Checkout...</div>;

    // Calculation
    const isGitamite = userProfile?.isGitamite;

    // Validate Pass Category
    if (pass.category === 'gitam' && !isGitamite) {
        return <div className="p-10 text-center text-red-600 font-bold">This pass is exclusive for Gitamites. <br /><button onClick={() => router.push('/tickets')} className="underline mt-4">Go Back</button></div>;
    }
    if (pass.category === 'non-gitam' && isGitamite) {
        return <div className="p-10 text-center text-red-600 font-bold">This pass is restricted to Non-Gitamites. <br /><button onClick={() => router.push('/tickets')} className="underline mt-4">Go Back</button></div>;
    }

    const platformFee = isGitamite ? feeConfig.gitam : feeConfig.public;
    const basePrice = pass.price;

    let discount = 0;
    if (appliedCoupon) {
        if (appliedCoupon.discountType === 'amount') discount = appliedCoupon.value;
        else discount = (basePrice * appliedCoupon.value) / 100; // Discount usually applies to Base Price
    }

    // Ensure discount doesn't exceed base price (or total check)
    // Discount normally applies to the Ticket Price, not the Platform Fee.
    const discountedPrice = Math.max(0, basePrice - discount);
    const finalTotal = discountedPrice + platformFee;

    const handlePayment = async () => {
        setProcessing(true);
        try {
            // Group Validation
            if (pass.type === 'group' && groupEmails.some(e => !e.trim())) {
                alert("Please enter all group member emails");
                setProcessing(false);
                return;
            }

            // Create Order
            const res = await fetch("/api/create-order", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ amount: finalTotal, receipt: pass.id }), // sending Total logic
            });
            const order = await res.json();
            if (!order.id) throw new Error("Order creation failed");

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: order.amount,
                currency: order.currency,
                name: "Event Payment",
                description: `${pass.name} (w/ Fee)`,
                order_id: order.id,
                prefill: { name: user.displayName, email: user.email },
                theme: { color: "#2563EB" },
                handler: async function (response: any) {
                    const verifyRes = await fetch("/api/verify-payment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            razorpay_order_id: response.razorpay_order_id,
                            razorpay_payment_id: response.razorpay_payment_id,
                            razorpay_signature: response.razorpay_signature,
                            passId: pass.id,
                            userId: user.uid,
                            userEmail: user.email,
                            userName: user.displayName,
                            groupMembers: pass.type === 'group' ? groupEmails : undefined
                        }),
                    });
                    const result = await verifyRes.json();
                    if (result.success) {
                        alert("Payment Successful!");
                        router.push("/dashboard");
                    } else {
                        alert("Payment Verification Failed");
                    }
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (error) {
            console.error(error);
            alert("Payment failed initialization");
        } finally {
            setProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-pramana-black bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black py-12 px-4 font-playfair selection:bg-pramana-gold selection:text-black">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" />

            <div className="max-w-4xl mx-auto">
                <div className="text-center mb-12 animate-fade-in-up">
                    <h1 className="text-4xl md:text-5xl font-bold font-cinzel text-pramana-gold mb-2">Secure Your Access</h1>
                    <p className="text-pramana-cream/60">Complete your purchase for <span className="text-pramana-cream font-bold">{pass.name}</span></p>
                </div>

                <div className="grid gap-8 lg:grid-cols-3">
                    {/* Left: Check Summary */}
                    <div className="lg:col-span-2 space-y-8 animate-fade-in-up delay-100">

                        {/* Pass Details Card */}
                        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-xl">
                            <h2 className="text-2xl font-bold font-cinzel text-pramana-gold mb-6 border-b border-white/10 pb-4">Pass Details</h2>
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <p className="text-xl font-bold text-pramana-cream">{pass.name}</p>
                                    <p className="text-pramana-cream/60 text-sm mt-1">{pass.description}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-2xl font-bold text-pramana-gold font-cinzel">₹{basePrice}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-xs bg-pramana-gold/20 text-pramana-gold border border-pramana-gold/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">{pass.category || "General"}</span>
                                {pass.type === 'group' && <span className="text-xs bg-pramana-maroon/20 text-pramana-maroon border border-pramana-maroon/30 px-3 py-1 rounded-full font-bold uppercase tracking-wider">Group of {pass.groupSize}</span>}
                            </div>
                        </div>

                        {/* Group Members Input */}
                        {pass.type === 'group' && (
                            <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-xl">
                                <h3 className="text-xl font-bold font-cinzel text-pramana-gold mb-6">Group Members</h3>
                                <div className="space-y-4">
                                    {groupEmails.map((email, idx) => (
                                        <div key={idx} className="group">
                                            <label className="text-xs uppercase tracking-wider font-bold text-pramana-cream/40 mb-1 block">Member {idx + 1} Email</label>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => {
                                                    const newEmails = [...groupEmails];
                                                    newEmails[idx] = e.target.value;
                                                    setGroupEmails(newEmails);
                                                }}
                                                placeholder={`member${idx + 1}@example.com`}
                                                className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-pramana-gold focus:ring-1 focus:ring-pramana-gold transition-all"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right: Payment Summary */}
                    <div className="lg:col-span-1 space-y-8 animate-fade-in-up delay-200">
                        <div className="bg-white/5 backdrop-blur-md rounded-3xl border border-white/10 p-8 shadow-2xl sticky top-8">
                            <h3 className="text-xl font-bold font-cinzel text-pramana-cream mb-6">Summary</h3>

                            {/* Coupon Section */}
                            <div className="mb-6">
                                <label className="text-xs uppercase tracking-wider font-bold text-pramana-cream/40 mb-2 block">Discount Code</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={couponCode}
                                        onChange={(e) => setCouponCode(e.target.value)}
                                        placeholder="CODE2024"
                                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-white/20 focus:outline-none focus:border-pramana-gold font-mono uppercase"
                                    />
                                    <button
                                        onClick={applyCoupon}
                                        disabled={processing || !couponCode}
                                        className="bg-white/10 hover:bg-white/20 text-pramana-gold font-bold px-4 rounded-xl border border-white/5 transition disabled:opacity-50"
                                    >
                                        Apply
                                    </button>
                                </div>
                                {appliedCoupon && (
                                    <div className="mt-2 text-green-400 text-sm flex items-center gap-1">
                                        <span>✓ Code <strong>{appliedCoupon.code}</strong> applied!</span>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-3 pt-6 border-t border-white/10 mb-8">
                                <div className="flex justify-between text-pramana-cream/60">
                                    <span>Subtotal</span>
                                    <span>₹{basePrice}</span>
                                </div>
                                {platformFee > 0 && (
                                    <div className="flex justify-between text-pramana-cream/60">
                                        <span>Platform Fee</span>
                                        <span>₹{platformFee}</span>
                                    </div>
                                )}
                                {discount > 0 && (
                                    <div className="flex justify-between text-green-400">
                                        <span>Discount</span>
                                        <span>- ₹{discount}</span>
                                    </div>
                                )}
                                <div className="flex justify-between text-xl font-bold text-pramana-gold pt-4 border-t border-white/10 font-cinzel">
                                    <span>Total</span>
                                    <span>₹{finalTotal}</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePayment}
                                disabled={processing}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-pramana-gold to-yellow-600 text-black font-cinzel font-bold text-lg tracking-widest shadow-lg hover:shadow-pramana-gold/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {processing ? "PROCESSING..." : `PAY SECURELY`}
                            </button>

                            <div className="mt-6 flex items-center justify-center gap-2 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                                <div className="h-6 w-auto bg-white/10 px-2 rounded">Razorpay</div>
                                <div className="h-6 w-auto bg-white/10 px-2 rounded">UPI</div>
                                <div className="h-6 w-auto bg-white/10 px-2 rounded">Cards</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function CheckoutPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
            <CheckoutContent />
        </Suspense>
    );
}
