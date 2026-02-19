'use client';

import React from 'react';
import LandingHeader from '@/components/LandingHeader';
import AppFooter from '@/components/AppFooter';
import Image from 'next/image';
import { motion } from 'framer-motion';

// --- CONFIGURATION: EDIT TEAM MEMBERS HERE ---
// To add a member: Add an object { name: "Name", role: "Role", image: "/path/to/image.jpg" }
// To change an image: Upload the file to public/uploads/ and update the 'image' path below.

const teamData = [
    {
        category: "Leadership Panel",
        members: [
            { name: "Adepu Suraj", image: "/team/1.jpg" },
            { name: "Pradyumna", image: "/team/2.jpg" },
            { name: "Sharan", image: "/team/3.jpg" },
            { name: "Praneeth", image: "/team/4.jpg" },
        ]
    },
    {
        category: "Technology",
        members: [
            { name: "Sai Krishna", image: "/team/5.1.jpg" },
            { name: "Teja", image: "/team/6.jpg" },
        ]
    },
    {
        category: "Sponsorship",
        members: [
            { name: "Siddharth Goud", image: "/team/7.jpg" },
            { name: "Arvind", image: "/team/8.jpg" },
        ]
    },
    {
        category: "Finance",
        members: [
            { name: "Anshul Rai", image: "/team/9.jpg" },
        ]
    },
    {
        category: "Food & Stalls",
        members: [
            { name: "Riteesh Reddy", image: "/team/10.jpg" },
            { name: "Rahul Reddy", image: "/team/11.jpg" },
            { name: "Rahul", image: "/team/12.jpg" },
        ]
    },
    {
        category: "Culturals",
        members: [
            { name: "Sahithi cholleti", image: "/team/13.jpg" },
        ]
    },
    {
        category: "Production",
        members: [
            { name: "Jashwanth Thota", image: "/team/14.jpg" },
        ]
    },
    {
        category: "Backstage Operations",
        members: [
            { name: "Ridhima Mamgain", image: "/team/15.jpg" },
            { name: "Sanjana", image: "/team/16.jpeg" },
        ]
    },
    {
        category: "Marketing",
        members: [
            { name: "Varshith Reddy", image: "/team/17.jpeg" },
            { name: "Nihal Agarwal", image: "/team/18.1.png" },
        ]
    },
    {
        category: "Artist Management",
        members: [
            { name: "Fareed", image: "/team/19.jpg" },
            { name: "Sharaa Shaaz", image: "/team/20.jpg" },
        ]
    },
    {
        category: "Hospitality",
        members: [
            { name: "Rishitha", image: "/team/21.jpg" },
        ]
    },
    {
        category: "Media",
        members: [
            { name: "Rohan Sai", image: "/team/22.jpg" },
        ]
    },
    {
        category: "Safety & Security",
        members: [
            { name: "Vishal", image: "/team/23.png" },
            { name: "Kamal", image: "/team/24.png" },
        ]
    },

    {
        category: "Crowd Control",
        members: [
            { name: "Sravan", image: "/team/25.jpeg" },
            { name: "Manikanta", image: "/team/26.jpg" },
        ]
    },
    {
        category: "Operations",
        members: [
            { name: "Bhanu teja", image: "/team/27.jpg" },
            { name: "Sharmistha", image: "/team/28.jpeg" },
        ]
    },
    {
        category: "Emergency Response",
        members: [
            { name: "Bollapally koushik", image: "/team/29.jpeg" },
        ]
    },
    {
        category: "Sustainability",
        members: [
            { name: "Moksha chowdary", image: "/team/30.jpg" },
        ]
    },
    {
        category: "Documentation",
        members: [
            { name: "Sathvik", image: "/team/31.jpg" },
            { name: "Diya Goyal", image: "/team/32.jpg" },
            { name: "Justin Joy", image: "/team/33.jpg" },
        ]
    },
    {
        category: "Graphic Design",
        members: [
            { name: "Shreya Kondur", image: "/team/34.jpg" },
            { name: "Nitish", image: "/team/35.jpg" },
        ]
    },
    {
        category: "Liaisoning",
        members: [
            { name: "Arshiya", image: "/team/36.jpg" },
        ]
    },
];

// --- END CONFIGURATION ---

export default function TeamPage() {
    return (
        <main className="bg-[#050505] min-h-screen text-pramana-cream selection:bg-pramana-gold selection:text-black">
            <LandingHeader />

            {/* Background Noise & Gradient */}
            <div className="fixed inset-0 pointer-events-none z-0">
                <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay"></div>
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-pramana-gold/5 rounded-full blur-[100px] animate-pulse"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>
            </div>

            {/* Hero Section */}
            <section className="relative pt-40 pb-20 px-6 overflow-hidden z-10">
                <div className="max-w-7xl mx-auto text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                    >
                        <h2 className="text-pramana-gold font-bold tracking-[0.5em] uppercase text-sm mb-4">
                            The Engine Room
                        </h2>
                        <h1 className="text-5xl md:text-7xl font-primary font-bold text-white mb-6 tracking-wide">
                            Architects of <span className="text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-yellow-600">Chaos</span>
                        </h1>
                        <p className="text-white/60 max-w-2xl mx-auto font-tertiary text-lg leading-relaxed">
                            The unseen forces working in the shadows to orchestrate the grand spectacle of Pramana '26.
                        </p>
                    </motion.div>
                </div>
            </section>

            {/* Team Sections */}
            <div className="max-w-7xl mx-auto px-6 pb-32 space-y-32 relative z-10">
                {teamData.map((team, categoryIndex) => (
                    <section key={categoryIndex} className="relative">
                        {/* Section Header */}
                        {/* Section Header */}
                        <div className="flex flex-col items-center justify-center gap-4 mb-12 border-b border-white/10 pb-8 relative">
                            {/* Decorative Centered Line */}
                            <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-pramana-gold/50 to-transparent mb-2"></div>

                            <h2 className="text-3xl md:text-4xl font-primary text-white uppercase tracking-wider text-center">
                                {team.category === "Leadership Panel"
                                    ? team.category
                                    : team.members.length > 1
                                        ? `Heads of ${team.category}`
                                        : `Head of ${team.category}`}
                            </h2>

                        </div>

                        {/* Centered Layout */}
                        <div className="flex flex-wrap justify-center gap-4 md:gap-8">
                            {team.members.map((member, memberIndex) => (
                                <motion.div
                                    key={memberIndex}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true, margin: "-50px" }}
                                    transition={{ duration: 0.5, delay: memberIndex * 0.1 }}
                                    className="group relative w-[calc(50%-0.5rem)] sm:w-[calc(50%-1rem)] md:w-[calc(33.33%-1.5rem)] lg:w-[calc(25%-1.5rem)] max-w-[300px]"
                                >
                                    {/* Card */}
                                    <div className="relative aspect-[3/4] overflow-hidden rounded-sm border border-white/10 bg-white/5 backdrop-blur-sm transition-all duration-500 group-hover:border-pramana-gold/50 group-hover:shadow-[0_0_30px_-5px_rgba(212,175,55,0.15)]">

                                        {/* Image */}
                                        <div className="absolute inset-0 bg-[#0a0a0a] flex items-center justify-center">
                                            <Image
                                                src={member.image}
                                                alt={member.name}
                                                fill
                                                className="object-cover opacity-70 grayscale transition-all duration-700 group-hover:opacity-100 group-hover:grayscale-0 group-hover:scale-105"
                                                priority={categoryIndex === 0} // Load leadership images first
                                            />
                                            {/* Fallback pattern if image fails/is placeholder */}
                                            <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>
                                        </div>

                                        {/* Overlay Gradient */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 group-hover:opacity-60 transition-opacity duration-500"></div>

                                        {/* Tech Lines Decoration */}
                                        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>
                                        <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pramana-gold/50 to-transparent transform scale-x-0 group-hover:scale-x-100 transition-transform duration-700"></div>

                                        {/* Content */}
                                        <div className="absolute bottom-0 left-0 w-full p-6 transform translate-y-2 group-hover:translate-y-0 transition-transform duration-500">
                                            <div className="overflow-hidden mb-1">
                                                <h3 className="text-xl font-primary text-white leading-tight group-hover:text-pramana-gold transition-colors duration-300">
                                                    {member.name}
                                                </h3>
                                            </div>

                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </section>
                ))}
            </div>

            <AppFooter />
        </main>
    );
}
