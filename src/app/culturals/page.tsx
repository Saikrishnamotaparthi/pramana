"use client";

import Image from "next/image";
import { motion, Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown, Instagram, Linkedin, Mail, MapPin, Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useState } from "react";

// --- ANIMATION VARIANTS ---

const fadeUp: Variants = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
};

const staggerContainer: Variants = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } }
};

// --- COMPONENTS ---

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => {
    return (
        <div className="mb-16 relative text-center md:text-left">
            <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="flex flex-col gap-2 md:items-start items-center"
            >
                <div className="flex items-center gap-4 justify-center md:justify-start">
                    <div className="h-[1px] w-12 bg-pramana-gold"></div>
                    <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">{subtitle}</span>
                    <div className="h-[1px] w-12 bg-pramana-gold md:hidden"></div>
                </div>
                <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-white leading-tight drop-shadow-lg">
                    {title}
                </h2>
            </motion.div>
        </div>
    );
};

export default function CulturalsPage() {
    const { user, signInWithGoogle, loading } = useAuth();
    const router = useRouter();
    const [isLoggingIn, setIsLoggingIn] = useState(false);

    const handleEntry = async () => {
        if (loading || isLoggingIn) return;
        if (user) {
            router.push("/culturals/dashboard");
        } else {
            setIsLoggingIn(true);
            try {
                await signInWithGoogle();
                router.push("/culturals/dashboard");
            } catch (error) {
                console.error("Login failed", error);
            } finally {
                setIsLoggingIn(false);
            }
        }
    };

    const scrollToContent = () => {
        document.getElementById('content-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    const competitions = [
        {
            id: "natya-rasa",
            title: "Natya Rasa",
            subtitle: "Classical & Semi-Classical Dance",
            description: "Grace, expression, and rhythm converge in this celebration of dance. Unleash the artist within and mesmerize the audience with your classical moves.",
            image: "/culturals/natya-rasa.jpg",
            categories: [
                { name: "Solo", price: "400" },
                { name: "Crew", price: "900" }
            ],
            ruleBookLink: "/culturals/natya-rasa-rulebook.pdf",
        },
        {
            id: "off-the-record",
            title: "Off The Record",
            subtitle: "Battle of Bands",
            description: "Amplify the energy and let the music speak! A battleground for bands to showcase their raw talent and electrifying performances.",
            image: "/culturals/off-the-record.jpg",
            categories: [
                { name: "Solo", price: "200" },
                { name: "Duo/Trio", price: "500" },
                { name: "Band", price: "1500" }
            ],
            ruleBookLink: "/culturals/off-the-record-rulebook.pdf",
        },
        {
            id: "raw-and-real",
            title: "Raw and Real",
            subtitle: "Unfiltered Talent",
            description: "No filters, no edits, just pure talent. Show us what makes you unique in this open platform for raw expression.",
            image: "/culturals/raw-and-real.jpg",
            categories: [
                { name: "Solo", price: "400" },
                { name: "Crew", price: "900" }
            ],
            ruleBookLink: "/culturals/raw-and-real-rulebook.pdf",
        }
    ];

    const coordinators = [
        { name: "Sahithi", role: "Overall Coordinator", phone: "9074907384" },
        { name: "Akshara", role: "Off The Record", phone: "9398278295" },
        { name: "Sindhura", role: "Natya Rasa", phone: "8977900436" },
        { name: "Sahil", role: "Raw and Real", phone: "6268430518" },
    ]

    return (
        <div className="min-h-screen bg-[#050505] text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black overflow-x-hidden">

            {/* --- HEADER --- */}
            <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
                <div className="max-w-7xl mx-auto flex justify-between items-center bg-black/50 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 shadow-2xl shadow-black/50">
                    {/* Left: GITAM Logo */}
                    <Link href="/" className="w-32 h-10 md:w-40 md:h-12 relative opacity-90 hover:opacity-100 transition-opacity">
                        <Image src="/gitam-logo.png" alt="GITAM" fill className="object-contain object-left" sizes="(max-width: 768px) 128px, 160px" priority />
                    </Link>

                    {/* Right: Pramana Logo & Login Button */}
                    <div className="flex items-center gap-4 md:gap-6">
                        {/* Pramana Logo */}
                        <div className="w-24 h-8 md:w-32 md:h-10 relative opacity-90 hover:opacity-100 transition-opacity hidden md:block">
                            <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-right" sizes="(max-width: 768px) 128px, 160px" priority />
                        </div>

                        {/* Login Button */}
                        <button
                            onClick={handleEntry}
                            disabled={isLoggingIn}
                            className="group relative px-5 py-2 md:px-6 md:py-2 bg-pramana-gold text-black rounded-full font-bold font-cinzel text-[10px] md:text-xs uppercase tracking-widest overflow-hidden disabled:opacity-70 disabled:cursor-not-allowed hover:shadow-[0_0_20px_rgba(212,175,55,0.4)] transition-shadow duration-300"
                        >
                            <span className="relative z-10 group-hover:text-white transition-colors duration-300">
                                {isLoggingIn ? "Processing..." : user ? "Dashboard" : "Login"}
                            </span>
                            <div className="absolute inset-0 bg-black/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                        </button>
                    </div>
                </div>
            </header>

            {/* --- HERO SECTION --- */}
            <section className="relative min-h-[90vh] flex flex-col items-center justify-center overflow-hidden pt-20">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0 bg-black">
                    <div className="absolute top-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-pramana-gold/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-[25%_50%_25%] items-center gap-8 md:gap-4">

                    {/* LEFT MASCOT (Desktop Only) */}
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="hidden md:flex justify-end items-center h-full pr-4"
                    >
                        <div className="relative w-full aspect-[3/4] max-w-[280px]">
                            <Image
                                src="/culturals/4.png"
                                alt="Mascot Left"
                                fill
                                className="object-contain drop-shadow-[0_0_50px_rgba(255,215,0,0.2)] hover:scale-105 transition-transform duration-500"
                                priority
                            />
                        </div>
                    </motion.div>

                    {/* CENTER TEXT */}
                    <div className="text-center space-y-6 flex flex-col items-center z-20">
                        {/* MOBILE MASCOT (Visible only on Mobile) */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="md:hidden w-64 h-64 relative mb-4"
                        >
                            <Image
                                src="/culturals/6.png"
                                alt="Mascot Mobile"
                                fill
                                className="object-contain drop-shadow-[0_0_30px_rgba(255,215,0,0.3)]"
                                priority
                            />
                        </motion.div>

                        <div className="flex flex-col items-center">
                            <motion.div
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="bg-white/5 backdrop-blur-md border border-white/10 px-6 py-2 rounded-full mb-6"
                            >
                                <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">PRAMANA '26</span>
                            </motion.div>
                            <motion.h1
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="text-5xl md:text-8xl lg:text-9xl font-cinzel font-bold text-white tracking-tight drop-shadow-2xl"
                            >
                                CULTURALS
                            </motion.h1>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="mt-6 flex items-center justify-center gap-4 text-pramana-gold/80 font-mono text-xs md:text-sm tracking-[0.4em] uppercase w-full"
                            >
                                <span className="h-[1px] w-8 md:w-12 bg-pramana-gold/30"></span>
                                <span className="text-center">Expression • Rhythm • Soul</span>
                                <span className="h-[1px] w-8 md:w-12 bg-pramana-gold/30"></span>
                            </motion.div>
                        </div>

                        <motion.button
                            onClick={scrollToContent}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 1, duration: 1 }}
                            className="mt-12 flex flex-col items-center gap-2 group cursor-pointer"
                        >
                            <span className="text-xs text-white/40 uppercase tracking-widest group-hover:text-pramana-gold transition-colors">Explore Events</span>
                            <ChevronDown className="w-6 h-6 text-pramana-gold animate-bounce opacity-50 group-hover:opacity-100 transition-opacity" />
                        </motion.button>
                    </div>

                    {/* RIGHT MASCOT (Desktop Only) */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1, delay: 0.2 }}
                        className="hidden md:flex justify-start items-center h-full pl-4"
                    >
                        <div className="relative w-full aspect-[3/4] max-w-[280px]">
                            <Image
                                src="/culturals/5.png"
                                alt="Mascot Right"
                                fill
                                className="object-contain drop-shadow-[0_0_50px_rgba(255,215,0,0.2)] hover:scale-105 transition-transform duration-500"
                                priority
                            />
                        </div>
                    </motion.div>

                </div>
            </section>

            {/* --- CONTENT SECTION --- */}
            <div id="content-section" className="relative z-10 bg-[#050505]">

                {/* --- ABOUT SECTION --- */}
                <section className="py-24 px-6 max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="w-full md:w-1/2">
                            <SectionHeading title="The Art of Expression" subtitle="About Culturals" />
                            <p className="text-lg text-pramana-cream/70 leading-relaxed text-center md:text-left">
                                Immerse yourself in a world where tradition meets modernity. The Cultural events at Pramana '26 are designed to bring out the best in every artist. Whether it's the rhythm of dance, the soul of music, or the raw power of unscripted performance, there's a stage waiting for you.
                            </p>
                        </div>
                        <div className="w-full md:w-1/2 relative h-[400px] rounded-2xl overflow-hidden border border-white/10 group shadow-2xl">
                            {/* Use a placeholder or relevant image here if available, currently reusing hero asset or generic */}
                            <div className="absolute inset-0 bg-gradient-to-tr from-purple-900/40 to-pramana-gold/20 mix-blend-overlay z-10"></div>
                            <Image
                                src="/culturals/6.png" // Reusing hero asset as abstract/representative if specific about poster is unavailable or generic
                                alt="Cultural Events"
                                fill
                                className="object-cover object-center opacity-60 transition-transform duration-700 group-hover:scale-105"
                            />
                        </div>
                    </div>
                </section>

                {/* --- COMPETITIONS SECTION --- */}
                <section className="py-24 px-4 md:px-6 bg-[#080808] relative">
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>

                    <div className="max-w-7xl mx-auto relative z-10">
                        <SectionHeading title="The Arena" subtitle="Competitions" />

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {competitions.map((comp, index) => (
                                <motion.div
                                    key={comp.id}
                                    initial={{ opacity: 0, y: 30 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    viewport={{ once: true }}
                                    transition={{ duration: 0.5, delay: index * 0.1 }}
                                    className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden hover:border-pramana-gold/50 transition-all group flex flex-col"
                                >
                                    {/* Image Side */}
                                    <div className="w-full h-64 relative overflow-hidden">
                                        <Image
                                            src={comp.image}
                                            alt={comp.title}
                                            fill
                                            className="object-cover transition-transform duration-700 group-hover:scale-110"
                                        />
                                        <div className="absolute inset-0 bg-gradient-to-t from-[#111] via-transparent to-transparent"></div>
                                        <div className="absolute bottom-4 left-4">
                                            <span className="bg-pramana-gold text-black text-xs font-bold px-3 py-1 rounded-full uppercase tracking-widest shadow-lg">
                                                {comp.subtitle}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Content Side */}
                                    <div className="p-8 flex flex-col flex-grow">
                                        <div className="mb-6 flex-grow">
                                            <h3 className="text-2xl font-cinzel font-bold text-white mb-3 group-hover:text-pramana-gold transition-colors">{comp.title}</h3>
                                            <p className="text-pramana-cream/60 text-sm leading-relaxed">{comp.description}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 mb-6">
                                            {comp.categories.map((cat, idx) => (
                                                <div key={idx} className="bg-black/40 border border-white/5 p-3 rounded-lg text-center backdrop-blur-sm">
                                                    <div className="text-pramana-gold font-bold font-cinzel text-lg">₹{cat.price}</div>
                                                    <div className="text-[10px] text-white/50 uppercase tracking-widest mt-1">{cat.name}</div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-3 mt-auto">
                                            <a
                                                href={comp.ruleBookLink}
                                                target="_blank"
                                                className="flex-1 py-3 border border-white/20 rounded-lg text-white font-cinzel text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all text-center"
                                            >
                                                Rule Book
                                            </a>
                                            <Link
                                                href={`/culturals/register?competition=${comp.id}`}
                                                className="flex-1 py-3 bg-white/10 text-white rounded-lg font-cinzel text-xs font-bold uppercase tracking-widest hover:bg-pramana-gold hover:text-black transition-all flex items-center justify-center gap-2 border border-white/10"
                                            >
                                                Register <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* --- PRIZE POOL SECTION --- */}
                <section className="py-24 px-6 bg-[#050505] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-pramana-gold/30 to-transparent"></div>
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-pramana-gold/10 via-transparent to-transparent opacity-30"></div>

                    <div className="max-w-4xl mx-auto text-center relative z-10">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            whileInView={{ scale: 1, opacity: 1 }}
                            viewport={{ once: true }}
                            className="bg-white/5 backdrop-blur-xl border border-white/10 p-12 rounded-3xl relative overflow-hidden"
                        >
                            <div className="absolute -top-24 -right-24 w-48 h-48 bg-pramana-gold/20 rounded-full blur-3xl"></div>

                            <p className="text-pramana-gold text-sm font-bold uppercase tracking-[0.3em] mb-4">Glory Awaits</p>
                            <h2 className="text-5xl md:text-8xl font-cinzel font-bold text-white mb-6 drop-shadow-2xl">
                                PRIZE POOL
                            </h2>
                            <div className="inline-block bg-gradient-to-r from-transparent via-white/10 to-transparent p-[1px] rounded-full mb-2">
                                <div className="bg-black/50 backdrop-blur-md rounded-full px-8 py-2">
                                    <p className="text-3xl md:text-5xl text-pramana-gold font-bold font-playfair italic">
                                        ₹36,000+
                                    </p>
                                </div>
                            </div>
                            <p className="text-white/40 mt-6 text-sm uppercase tracking-widest">In Cash Prizes to be Won</p>
                        </motion.div>
                    </div>
                </section>

                {/* --- CONTACT SECTION --- */}
                <section className="py-24 px-6 bg-[#080808] border-t border-white/5">
                    <div className="max-w-7xl mx-auto">
                        <SectionHeading title="Get in Touch" subtitle="Coordinators" />

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {coordinators.map((person, idx) => (
                                <motion.div
                                    key={idx}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    viewport={{ once: true }}
                                    className="bg-white/5 backdrop-blur-sm border border-white/10 p-6 rounded-xl hover:bg-white/10 transition-colors group"
                                >
                                    <div className="w-12 h-12 bg-pramana-gold/10 rounded-full flex items-center justify-center text-pramana-gold mb-4 group-hover:scale-110 transition-transform">
                                        <Phone className="w-5 h-5" />
                                    </div>
                                    <h4 className="text-xl font-cinzel font-bold text-white mb-1">{person.name}</h4>
                                    <p className="text-pramana-gold text-xs uppercase tracking-wider mb-4">{person.role}</p>
                                    <a href={`tel:${person.phone}`} className="text-white/60 hover:text-white transition-colors text-sm font-mono flex items-center gap-2">
                                        {person.phone}
                                    </a>
                                </motion.div>
                            ))}
                        </div>
                    </div>
                </section>

            </div>

            {/* --- FOOTER --- */}
            <footer className="py-12 px-6 bg-[#020202] border-t border-white/10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">

                    {/* Logo & Socials */}
                    <div className="flex flex-col items-center md:items-start gap-6">
                        <div className="relative w-40 h-12 opacity-80 hover:opacity-100 transition-opacity">
                            <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-center md:object-left" sizes="160px" />
                        </div>
                        <div className="flex gap-4">
                            {[
                                { Icon: Instagram, link: "https://www.instagram.com/pramana_2026.gitam/" },
                                { Icon: Linkedin, link: "https://www.linkedin.com/company/pramana26/" },
                                { Icon: Mail, link: "mailto:pramana.hyd@gitam.edu" }
                            ].map(({ Icon, link }, i) => (
                                <a key={i} href={link} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/60 hover:bg-pramana-gold hover:text-black hover:scale-110 transition-all">
                                    <Icon className="w-5 h-5" />
                                </a>
                            ))}
                        </div>
                    </div>

                    {/* Address & Contact - Right Aligned on Desktop */}
                    <div className="text-center md:text-right space-y-4">
                        <div className="space-y-2">
                            <p className="flex items-center justify-center md:justify-end gap-2 text-white/80 font-cinzel font-bold">
                                <MapPin className="w-4 h-4 text-pramana-gold" /> GITAM Deemed to be University
                            </p>
                            <p className="text-white/40 text-sm">Rudraram, Patancheru Mandal, Hyderabad</p>
                        </div>
                        <p className="flex items-center justify-center md:justify-end gap-2 text-pramana-gold/80 text-sm font-mono">
                            <Mail className="w-4 h-4" /> pramana.hyd@gitam.edu
                        </p>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto mt-12 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs text-white/20 uppercase tracking-widest gap-4">
                    <p>&copy; 2026 Pramana. All Rights Reserved.</p>
                    <p>Designed with <span className="text-red-500">♥</span> by Tech Team</p>
                </div>
            </footer>

        </div>
    );
}
