'use client';

import React from 'react';
import { motion } from 'framer-motion';

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
        <div className="mb-16 relative">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={{
                    hidden: { opacity: 0, y: 30 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
                }}
                className="flex flex-col gap-2"
            >
                <div className="flex items-center gap-4">
                    <div className="h-[1px] w-12 bg-pramana-gold"></div>
                    <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-primary">{subtitle}</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-primary font-bold text-white leading-tight">
                    {title}
                </h2>
            </motion.div>
        </div>
    );
};

export default SectionHeading;
