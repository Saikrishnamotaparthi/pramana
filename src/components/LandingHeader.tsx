'use client';

import React from 'react';
import Image from 'next/image';

const LandingHeader = () => {
    return (
        <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300 pointer-events-none">
            <div className="max-w-7xl mx-auto flex justify-between items-center bg-black/50 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 shadow-2xl shadow-black/50 relative pointer-events-auto">
                {/* Left: GITAM Logo */}
                <div className="w-32 h-10 md:w-40 md:h-12 relative opacity-90 hover:opacity-100 transition-opacity flex-shrink-0 z-10">
                    <Image src="/gitam-logo.png" alt="GITAM" fill className="object-contain object-left" sizes="(max-width: 768px) 128px, 160px" priority />
                </div>

                {/* Center: Pramana Logo (Desktop Only) */}
                <div className="hidden md:block absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-12 opacity-90 hover:opacity-100 transition-opacity z-10">
                    <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain" priority />
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-6 z-10 flex-shrink-0">
                    <div className="hidden md:block w-32 relative h-10 opacity-80">
                        <Image src="/student-life-logo.png" alt="Student Life" fill className="object-contain object-right" sizes="128px" />
                    </div>
                    {/* Mobile: Pramana Logo in place of Buy Passes */}
                    <div className="block md:hidden w-28 relative h-8 opacity-90">
                        <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-right" sizes="112px" priority />
                    </div>
                </div>
            </div>
        </header>
    );
};

export default LandingHeader;
