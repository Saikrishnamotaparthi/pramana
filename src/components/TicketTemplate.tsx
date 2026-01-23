/* eslint-disable @next/next/no-img-element */
import React, { forwardRef } from "react";
import Image from "next/image";

interface TicketProps {
    user: {
        displayName?: string | null;
        email?: string | null;
    };
    qrCodeUrl: string;
    bannerUrl?: string | null;
}

const TicketTemplate = forwardRef<HTMLDivElement, TicketProps>(({ user, qrCodeUrl, bannerUrl }, ref) => {
    return (
        <div
            ref={ref}
            className="w-[450px] bg-[#050505] text-[#d4af37] font-serif border border-[rgba(212,175,55,0.3)] relative overflow-hidden flex flex-col items-center pb-8"
            style={{ fontFamily: "'Times New Roman', serif" }} // Fallback to ensure serif look
        >
            {/* 1. Header Banner */}
            <div className="w-full relative h-[140px] border-b-2 border-[#d4af37] mb-6">
                {/* Using standard img tag for reliable html2canvas capture without Next.js optimization issues during convert */}
                {bannerUrl && (
                    <img
                        src={bannerUrl}
                        alt="Pramana Header"
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        loading="eager"
                    />
                )}
            </div>

            <div className="w-full px-8 text-center">
                {/* 2. Greeting */}
                <h2 className="text-xl font-bold text-[#fceeb5] mb-4 uppercase tracking-wide" style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}>
                    Hello/Namaste, {user.displayName || "Guest"}
                </h2>

                {/* 3. Success Message */}
                <p className="text-xs text-[rgba(255,255,255,0.9)] mb-4 leading-relaxed font-sans">
                    You have successfully secured your spot for the ultimate pre-fest experience.
                </p>
                <p className="text-xs font-bold text-white mb-6">
                    You are now officially part of the countdown to our flagship fest.
                </p>

                {/* Divider */}
                <div className="w-full h-[1px] bg-[rgba(212,175,55,0.4)] mb-6"></div>

                {/* 4. Essentials */}
                <div className="mb-8">
                    <h3 className="text-[#d4af37] font-bold uppercase tracking-[0.2em] text-sm mb-4 flex items-center justify-center gap-2">
                        <span>—</span> ESSENTIALS <span>—</span>
                    </h3>
                    <div className="space-y-1 text-sm text-[rgba(255,255,255,0.9)] font-sans">
                        <p>Valid Physical College ID</p>
                        <p>Dress Code: Preferably Theme Specific (Filmy Fusion)</p>
                        <p>Gates Close at 04:30 PM</p>
                    </div>
                </div>

                {/* Divider */}
                <div className="w-full h-[1px] bg-[rgba(212,175,55,0.4)] mb-8"></div>

                {/* 5. QR Code Section */}
                <div className="mb-8">
                    <h3 className="text-[#d4af37] font-bold uppercase tracking-widest text-lg mb-4">ENTRY QR</h3>
                    <div className="inline-block p-2 border-2 border-[#d4af37] rounded-lg bg-black">
                        {qrCodeUrl ? (
                            <img src={qrCodeUrl} alt="QR Code" className="w-40 h-40 object-contain" />
                        ) : (
                            <div className="w-40 h-40 bg-gray-900 flex items-center justify-center text-[rgba(212,175,55,0.5)] text-xs text-center p-2">
                                QR Loading...
                            </div>
                        )}
                    </div>
                </div>

                {/* 6. Button Aesthetic (Visual Only) */}
                <div className="bg-[#d4af37] text-black font-bold uppercase text-xs py-3 px-8 rounded-full mb-10 tracking-widest shadow-[0_0_15px_rgba(212,175,55,0.4)]">
                    View Detailed Instructions
                </div>

                {/* 7. Footer Note */}
                <div className="border border-[rgba(212,175,55,0.3)] p-3 mb-10 bg-[rgba(212,175,55,0.05)]">
                    <p className="text-[9px] uppercase text-[#d4af37] tracking-wider font-bold">
                        Note: Transportation details will be shared shortly
                        <br />(For Gitamites Only).
                    </p>
                </div>

                {/* 8. Bottom Branding */}
                <div className="mt-auto pt-4 border-t border-[rgba(212,175,55,0.2)] w-full">
                    <h4 className="text-[#d4af37] font-bold text-sm tracking-widest mb-1">TEAM PRAMANA26</h4>
                    <p className="text-[8px] text-[rgba(255,255,255,0.4)] uppercase tracking-widest">GITAM Deemed to be University</p>
                </div>
            </div>
        </div>
    );
});

TicketTemplate.displayName = "TicketTemplate";

export default TicketTemplate;
