"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Bus, MapPin, Sparkles } from "lucide-react";
import { usePathname } from "next/navigation";

const ScrollingTransportBar = () => {
    const [mounted, setMounted] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setMounted(true);
    }, []);

    // Only show on Home and User Dashboard
    const allowedPaths = ["/", "/dashboard"];
    const isAllowed = allowedPaths.includes(pathname);

    if (!mounted || !isAllowed) return null;

    const items = Array(12).fill(null);
    const marqueeText = "Transport need during pramana... click here to submit";

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "circOut" }}
                className="fixed bottom-0 left-0 right-0 z-[100] group w-full"
            >
                {/* Full-width Low-profile Bar */}
                <div className="relative overflow-hidden bg-black/80 backdrop-blur-xl border-t border-pramana-gold/20 py-3.5 md:py-2 shadow-[0_-5px_20px_rgba(0,0,0,0.5)] group-hover:bg-black transition-colors duration-500">

                    {/* Animated Gradient Beam */}
                    <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-pramana-gold/50 to-transparent opacity-30 cursor-pointer" />

                    <Link href="/transport" className="block outline-none">
                        <motion.div
                            className="flex whitespace-nowrap items-center"
                            animate={{ x: [0, -2000] }}
                            transition={{
                                repeat: Infinity,
                                duration: 35,
                                ease: "linear"
                            }}
                        >
                            {items.map((_, i) => (
                                <div key={i} className="flex items-center gap-4 md:gap-8 px-6 md:px-12">
                                    <div className="flex items-center gap-2">
                                        <motion.div
                                            animate={{ scale: [1, 1.1, 1] }}
                                            transition={{ repeat: Infinity, duration: 2, delay: i * 0.5 }}
                                        >
                                            <Bus className="w-3 h-3 md:w-4 md:h-4 text-pramana-gold" />
                                        </motion.div>
                                        <span className="text-sm md:text-xl">🚌</span>
                                    </div>

                                    <span className="text-pramana-gold font-primary text-xs md:text-sm tracking-[0.2em] uppercase font-bold neon-text-gold">
                                        {marqueeText}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        <MapPin className="w-3 h-3 md:w-4 md:h-4 text-pramana-gold/60" />
                                        <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-pramana-gold animate-pulse" />
                                    </div>

                                    {/* Decorative Dot */}
                                    <div className="w-1.5 h-1.5 rounded-full bg-pramana-gold/30" />
                                </div>
                            ))}
                        </motion.div>
                    </Link>

                    {/* Subtle Overlay Glow */}
                    <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-pramana-gold/10 via-transparent to-pramana-gold/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default ScrollingTransportBar;
