"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring, useInView, Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown, Plus, Minus, Instagram, Linkedin, Mail, MapPin, Calendar, ExternalLink } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, query, where } from "firebase/firestore";
import { PassConfig, BulkPassConfig } from "@/types";
import SectionHeading from "@/components/SectionHeading";
import AppFooter from "@/components/AppFooter";
import LandingHeader from "@/components/LandingHeader";

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

const Marquee = ({ children, direction = "left", speed = 20 }: { children: React.ReactNode; direction?: "left" | "right"; speed?: number }) => {
  return (
    <div className="overflow-hidden flex whitespace-nowrap mask-gradient relative">
      <motion.div
        className="flex gap-8 items-center"
        animate={{ x: direction === "left" ? "-50%" : "0%" }}
        initial={{ x: direction === "left" ? "0%" : "-50%" }}
        transition={{ repeat: Infinity, ease: "linear", duration: speed }}
      >
        {children}
        {children}
      </motion.div>
    </div>
  );
};



export default function LandingPage() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [livePasses, setLivePasses] = useState<(PassConfig | BulkPassConfig)[]>([]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-Scroll Logic
  useEffect(() => {
    const interval = setInterval(() => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const cardWidth = (container.firstElementChild as HTMLElement)?.offsetWidth || 300;
        const gap = 24; // gap-6 is 24px
        const scrollAmount = cardWidth + gap;
        const { scrollLeft, scrollWidth, clientWidth } = container;

        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          container.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
        }
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [livePasses]);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const cardWidth = (container.firstElementChild as HTMLElement)?.offsetWidth || 300;
      const gap = 24;
      const scrollAmount = direction === 'left' ? -(cardWidth + gap) : (cardWidth + gap);
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    const fetchLivePasses = async () => {
      try {
        // Fetch Standard Passes
        const qStandard = query(collection(db, "passes_config"), where("showOnLanding", "==", true), where("active", "==", true));
        const snapStandard = await getDocs(qStandard);
        const standard = snapStandard.docs.map(d => ({ ...d.data(), id: d.id, isBulk: false } as unknown as PassConfig));

        // Fetch Bulk Passes
        const qBulk = query(collection(db, "bulk_pass_configs"), where("showOnLanding", "==", true), where("status", "==", "active"));
        const snapBulk = await getDocs(qBulk);
        const bulk = snapBulk.docs.map(d => ({ ...d.data(), id: d.id, isBulk: true } as unknown as BulkPassConfig));

        setLivePasses([...standard, ...bulk]);
      } catch (error) {
        console.error("Error fetching live passes:", error);
      }
    };

    fetchLivePasses();
  }, []);

  const faqs = [
    { q: "When is Pramana happening?", a: "Pramana is a two-day event scheduled on 27th & 28th February 2026. Event timings will be announced soon." },
    { q: "Are single-day and on-spot tickets available?", a: "Yes. Single-day passes and on-spot tickets are available for both Gitamites and outsiders." },
    { q: "Will there be an Auto Expo this year?", a: "Yes, Pramana will host an Auto Expo this year. The date will be announced soon." },
    { q: "Which artists will be performing at Pramana?", a: "The artist lineup will be announced soon." },
    { q: "Is travel or accommodation provided?", a: "Details regarding travel assistance and accommodation will be announced soon." }
  ];

  const handleEntry = async () => {
    if (loading || isLoggingIn) return; // Prevent double clicks or conflicts
    if (user) {
      router.push("/tickets");
    } else {
      setIsLoggingIn(true);
      try {
        await signInWithGoogle();
        router.push("/tickets");
      } catch (error) {
        console.error("Login failed", error);
      } finally {
        setIsLoggingIn(false);
      }
    }
  };

  const scrollToInfo = () => {
    document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-pramana-cream selection:bg-pramana-gold selection:text-black overflow-x-hidden">

      {/* --- HEADER --- */}
      {/* --- HEADER --- */}
      <LandingHeader />

      {/* --- HERO SECTION --- */}
      {/* --- HERO SECTION --- */}
      <section className="relative h-screen w-full overflow-hidden">
        {/* Desktop Hero Image */}
        <div className="absolute inset-0 hidden md:block">
          <Image
            src="/desk_hero1.png"
            alt="Hero Background Desktop"
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>

        {/* Mobile Hero Image */}
        <div className="absolute inset-0 block md:hidden">
          <Image
            src="/mob_hero1.png"
            alt="Hero Background Mobile"
            fill
            className="object-cover"
            priority
            quality={100}
          />
        </div>

        {/* Overlay Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center text-center px-4 pt-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="space-y-6"
          >
            {/* Title & Mascots Container - Flex Layout for Desktop */}
            <div className="flex flex-col lg:flex-row items-center justify-center w-full max-w-[95vw] lg:max-w-7xl mx-auto gap-0">

              {/* Left Mascot - Desktop */}
              <motion.div
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="hidden lg:block relative w-48 h-48 xl:w-72 xl:h-72 flex-shrink-0 z-0 -mr-4 lg:-mr-8"
              >
                <Image src="/uploads/mascot-left1.png" alt="Mascot Left" fill className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]" sizes="(max-width: 1200px) 192px, 288px" />
              </motion.div>

              {/* Center Content: Title & Date */}
              <div className="relative z-10 flex flex-col items-center justify-center text-center mx-auto">
                <div className="relative z-20 -mb-2 lg:-mb-4">
                  <Image
                    src="/pramana-text.png"
                    alt="PRAMANA '26"
                    width={1200}
                    height={400}
                    className="w-[85vw] max-w-[1000px] h-auto object-contain drop-shadow-2xl mx-auto"
                    priority
                  />
                </div>

                {/* Decorative Line */}
                <div className="h-[1px] w-24 bg-gradient-to-r from-transparent via-pramana-gold to-transparent my-3 lg:my-5 opacity-70"></div>

                {/* Date & Location */}
                <div className="flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3 font-primary text-xl md:text-2xl text-white tracking-widest">
                    <span>FEB</span>
                    <span className="text-pramana-gold font-bold text-2xl md:text-3xl">27</span>
                    <span className="text-white/30">•</span>
                    <span className="text-pramana-gold font-bold text-2xl md:text-3xl">28</span>
                  </div>

                  <div className="flex items-center gap-2 text-pramana-cream/60 font-secondary italic text-sm md:text-base tracking-wider mt-1 px-4 text-center">
                    <MapPin className="w-3 h-3 text-pramana-gold hidden md:inline-block" />
                    <span>GITAM(Deemed to be)University, Hyderabad</span>
                  </div>
                </div>
              </div>

              {/* Right Mascot - Desktop */}
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="hidden lg:block relative w-48 h-48 xl:w-72 xl:h-72 flex-shrink-0 z-0 -ml-4 lg:-ml-8"
              >
                <Image src="/uploads/mascot-right1.png" alt="Mascot Right" fill className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.2)]" sizes="(max-width: 1200px) 192px, 288px" />
              </motion.div>
            </div>

            {/* Mobile Mascot (Below Date) */}
            <motion.div variants={fadeUp} className="lg:hidden mt-12 relative w-86 h-80 mx-auto z-10">
              <Image src="/uploads/mascot-mobile1.png" alt="Mascot Mobile" fill className="object-contain drop-shadow-[0_0_15px_rgba(212,175,55,0.2)]" sizes="(max-width: 768px) 288px, 100vw" priority />
            </motion.div>
          </motion.div>
        </div>

        {/* Cinematic Scroll Indicator */}
        <motion.button
          onClick={scrollToInfo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/70 uppercase group-hover:text-pramana-gold transition-colors shadow-black drop-shadow-md">Scroll to Explore</span>
          <ChevronDown className="w-6 h-6 text-pramana-gold animate-bounce opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </motion.button>
      </section>

      {/* --- ARTIST LINEUP SECTION ("THE SPOTLIGHT" - SLEEK ASSEMBLE) --- */}
      <section id="info-section" className="relative py-16 px-4 md:px-6 bg-[#0a0a0a] z-10 overflow-hidden">

        {/* Ambient Background */}
        <div className="absolute top-0 left-0 w-full h-[300px] bg-gradient-to-b from-black to-transparent z-0"></div>
        <div className="absolute bottom-0 w-full h-[300px] bg-gradient-to-t from-black to-transparent z-0"></div>

        <div className="max-w-[1400px] mx-auto relative z-10 space-y-20 md:space-y-24">
          <SectionHeading title="Where Legends Take The Stage" subtitle="The Lineup" />

          {/* DAY 0: The Grand Opening */}
          <div className="relative group/day0">
            {/* Background Watermark */}
            <h3 className="absolute -top-10 -right-4 text-[80px] md:text-[150px] font-primary font-bold text-white/[0.03] select-none leading-none z-0 pointer-events-none text-right">
              DAY 0
            </h3>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-start">
              {/* Date Tag */}
              <div className="md:col-span-12 flex items-center justify-end gap-3 mb-2 pr-1">
                <span className="text-white/50 text-xs uppercase tracking-widest font-mono">February</span>
                <span className="text-pramana-gold font-primary text-3xl">26</span>
              </div>

              {/* Auto Expo Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="md:col-start-3 md:col-span-8 h-[300px] md:h-[400px] relative group overflow-hidden rounded-sm cursor-pointer"
              >
                <Image
                  src="/uploads/gallery-9.jpg"
                  alt="Auto Expo"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>

                <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                  <div className="overflow-hidden">
                    <h4 className="text-3xl md:text-5xl font-primary text-white mb-2 transform translate-y-0 transition-transform duration-500">
                      Auto Expo
                    </h4>
                  </div>
                  <p className="text-pramana-gold text-base md:text-lg font-secondary italic tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                    The Grand Opening
                  </p>
                </div>

                {/* Gold Border Highlight */}
                <div className="absolute inset-0 border border-pramana-gold/0 group-hover:border-pramana-gold/50 transition-colors duration-500 pointer-events-none"></div>
              </motion.div>
            </div>
          </div>

          {/* DAY 1: Asymmetrical "Headliner" Layout */}
          <div className="relative group/day1">
            {/* Background Watermark */}
            <h3 className="absolute -top-10 -left-4 text-[80px] md:text-[150px] font-primary font-bold text-white/[0.03] select-none leading-none z-0 pointer-events-none">
              DAY 1
            </h3>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-5 items-start">
              {/* Date Tag */}
              <div className="md:col-span-12 flex items-center gap-3 mb-2 pl-1">
                <span className="text-pramana-gold font-primary text-3xl">27</span>
                <span className="text-white/50 text-xs uppercase tracking-widest font-mono">February</span>
              </div>

              {/* HEADLINER: The Deccan Project */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="md:col-span-8 h-[300px] md:h-[450px] relative group overflow-hidden rounded-sm cursor-pointer"
              >
                <Image
                  src="/uploads/artist-deccan-project.jpg"
                  alt="The Deccan Project"
                  fill
                  className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent opacity-80 group-hover:opacity-60 transition-opacity duration-500"></div>

                <div className="absolute bottom-0 left-0 p-6 md:p-10 w-full">
                  <div className="overflow-hidden">
                    <h4 className="text-3xl md:text-5xl font-primary text-white mb-2 transform translate-y-0 transition-transform duration-500">
                      The Deccan Project
                    </h4>
                  </div>
                  <p className="text-pramana-gold text-base md:text-lg font-secondary italic tracking-wider opacity-80 group-hover:opacity-100 transition-opacity">
                    The Headliner Band
                  </p>
                </div>

                {/* Gold Border Highlight */}
                <div className="absolute inset-0 border border-pramana-gold/0 group-hover:border-pramana-gold/50 transition-colors duration-500 pointer-events-none"></div>
              </motion.div>

              {/* SUPPORTING ARTISTS: Stacked on Desktop */}
              <div className="md:col-span-4 flex flex-col gap-4 md:gap-5 w-full h-auto md:h-full mt-4 md:mt-0">

                {/* Geetha Madhuri */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.1 }}
                  className="relative h-[200px] md:h-auto md:flex-1 w-full group overflow-hidden rounded-sm cursor-pointer"
                >
                  <Image
                    src="/uploads/artist-geetha-madhuri.jpg"
                    alt="Geetha Madhuri"
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 group-hover:opacity-70 transition-opacity"></div>

                  <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                    <h4 className="text-xl md:text-2xl font-primary text-white">Geetha Madhuri</h4>
                    <p className="text-pramana-gold/70 text-[10px] md:text-xs font-bold tracking-widest uppercase mt-1">Playback Singer</p>
                  </div>
                </motion.div>

                {/* DJ NANDZY */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="relative h-[200px] md:h-auto md:flex-1 w-full group overflow-hidden rounded-sm cursor-pointer"
                >
                  <Image
                    src="/uploads/artist-dj-nandzy2.jpg"
                    alt="DJ NANDZY"
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-90 group-hover:opacity-70 transition-opacity"></div>

                  <div className="absolute bottom-4 left-4 md:bottom-6 md:left-6">
                    <h4 className="text-xl md:text-2xl font-primary text-white">DJ NANDZY</h4>
                    <p className="text-pramana-gold/70 text-[10px] md:text-xs font-bold tracking-widest uppercase mt-1">Live SET</p>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

          {/* DAY 2: Symmetrical "Power Duo" Layout */}
          <div className="relative group/day2 pt-4 md:pt-10">
            {/* Background Watermark Right */}
            <h3 className="absolute -top-6 -right-4 text-[80px] md:text-[150px] font-primary font-bold text-white/[0.03] select-none leading-none z-0 pointer-events-none text-right">
              DAY 2
            </h3>

            <div className="relative z-10">
              <div className="flex items-center justify-end gap-3 mb-4 pr-1">
                <span className="text-white/50 text-xs uppercase tracking-widest font-mono">February</span>
                <span className="text-pramana-gold font-primary text-3xl">28</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                {/* Kasyap */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  className="h-[350px] md:h-[450px] relative group overflow-hidden rounded-sm cursor-pointer"
                >
                  <Image
                    src="/uploads/artist-kasyap1.jpg"
                    alt="Kasyap"
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                    <h4 className="text-3xl md:text-4xl font-primary text-white mb-2">Kasyap</h4>
                    <p className="text-pramana-gold font-secondary italic text-base md:text-lg opacity-80">
                      The Musical Sensation
                    </p>
                  </div>

                  {/* Vertical Text Decoration */}
                  <div className="absolute top-6 right-6 writing-mode-vertical text-white/20 font-mono text-[10px] tracking-[0.3em] uppercase hidden md:block">
                    Live In Concert
                  </div>
                </motion.div>

                {/* DJ Swattrex */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 }}
                  className="h-[350px] md:h-[450px] relative group overflow-hidden rounded-sm cursor-pointer mt-0 md:mt-12"
                >
                  <Image
                    src="/uploads/artist-dj-swattrex.jpg"
                    alt="DJ Swattrex"
                    fill
                    className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity"></div>

                  <div className="absolute bottom-0 left-0 p-6 md:p-8 w-full">
                    <h4 className="text-3xl md:text-4xl font-primary text-white mb-2">DJ Swattrex</h4>
                    <p className="text-pramana-gold font-secondary italic text-base md:text-lg opacity-80">
                      EDM Powerhouse
                    </p>
                  </div>

                  {/* Vertical Text Decoration */}
                  <div className="absolute top-6 right-6 writing-mode-vertical text-white/20 font-mono text-[10px] tracking-[0.3em] uppercase hidden md:block">
                    Official DJ
                  </div>
                </motion.div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* --- LIVE PASSES SECTION --- */}
      {livePasses.length > 0 && (
        <section className="py-24 px-6 bg-[#080808]">
          <div className="max-w-7xl mx-auto">
            <SectionHeading title="Secure Your Spot" subtitle="Live Passes" />

            <div className="relative group/passes">
              {/* Navigation Buttons */}
              <button onClick={() => scroll('left')} className="absolute -left-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/80 backdrop-blur-md border border-pramana-gold/30 rounded-full flex items-center justify-center text-pramana-gold opacity-0 group-hover/passes:opacity-100 transition-all hover:bg-pramana-gold hover:text-black hidden md:flex hover:scale-110">
                <ArrowRight className="w-5 h-5 rotate-180" />
              </button>
              <button onClick={() => scroll('right')} className="absolute -right-4 top-1/2 -translate-y-1/2 z-20 w-12 h-12 bg-black/80 backdrop-blur-md border border-pramana-gold/30 rounded-full flex items-center justify-center text-pramana-gold opacity-0 group-hover/passes:opacity-100 transition-all hover:bg-pramana-gold hover:text-black hidden md:flex hover:scale-110">
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Mascot Decoration - Peeking Overlay */}
              <div className="absolute -bottom-10 -right-10 z-10 w-48 h-48 md:-bottom-20 md:-right-20 md:w-[500px] md:h-[500px] pointer-events-none">
                <Image src="/royal_mascot_v5.png" alt="Mascot" fill className="object-contain drop-shadow-2xl" />
              </div>

              <div
                ref={scrollContainerRef}
                className="flex items-stretch overflow-x-auto gap-6 pb-8 snap-x snap-mandatory -mx-6 px-6 md:mx-0 md:px-0 md:w-fit md:mx-auto md:max-w-7xl [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']"
              >
                {livePasses.map((pass, i) => (
                  <motion.div
                    key={pass.id}
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="group relative min-w-[260px] w-[80vw] max-w-[300px] md:w-[320px] md:min-w-[320px] snap-center flex-shrink-0 bg-black/40 backdrop-blur-md border border-white/10 group-hover:border-pramana-gold/50 rounded-xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-[0_10px_40px_rgba(184,134,11,0.2)] flex flex-col"
                  >
                    {/* Header */}
                    <div className="bg-white/5 p-6 border-b border-white/10 relative overflow-hidden group-hover:bg-white/10 transition-colors duration-500">
                      <div className="absolute top-0 right-0 w-24 h-24 border border-pramana-gold/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-3">
                          <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${(pass as any).isBulk
                            ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                            : 'bg-pramana-gold/10 text-pramana-gold border-pramana-gold/20'
                            }`}>
                            {(pass as any).isBulk ? 'Group Bundle' : 'Standard Pass'}
                          </span>
                          {(pass as any).isBulk && (pass as any).costPrice > pass.price && (
                            <span className="text-[10px] font-bold text-green-400 bg-green-900/20 px-2 py-1 rounded border border-green-500/20">
                              {Math.round((((pass as any).costPrice - pass.price) / (pass as any).costPrice) * 100)}% OFF
                            </span>
                          )}
                        </div>

                        {/* Title & Price */}
                        <div className="mb-6">
                          <h3 className="text-xl font-cinzel font-bold text-white leading-tight mb-2">{pass.name}</h3>
                          <div className="flex items-baseline gap-2">
                            <span className="text-lg font-bold text-pramana-cream">₹{pass.price}</span>
                            {(pass as any).isBulk && (pass as any).costPrice > pass.price && (
                              <span className="text-sm text-white/30 line-through">₹{(pass as any).costPrice}</span>
                            )}
                          </div>
                        </div>

                        {/* Description */}
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-6 flex flex-col flex-1 bg-transparent relative">
                      {/* Decorative gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20 pointer-events-none"></div>
                      {/* Description */}
                      <div className="mb-8 flex-1">
                        <p className="text-pramana-cream/60 font-tertiary leading-relaxed text-sm line-clamp-4">
                          {(pass as PassConfig).description || ((pass as any).isBulk ? `Group access for ${(pass as any).memberCount} members. Perfect for squads.` : "Access to all event zones and pro-shows.")}
                        </p>
                      </div>

                      {/* Action Area */}
                      <div className="mt-auto pt-6 border-t border-white/5">
                        <button
                          onClick={handleEntry}
                          className="w-full py-3 border border-pramana-gold text-pramana-gold font-bold uppercase tracking-widest text-xs rounded hover:bg-pramana-gold hover:text-black transition-colors flex items-center justify-center gap-2"
                        >
                          <span>Buy Now</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            <div className="mt-16 text-center">
              <button onClick={handleEntry} className="inline-flex flex-col items-center gap-2 group">
                <span className="text-5xl font-primary font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white group-hover:scale-105 transition-transform">Get Your Passes</span>
                <span className="text-pramana-cream/50 font-tertiary italic group-hover:text-pramana-gold transition-colors">Hurry up! Grab them before they sell out.</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* --- ELITE COMPETITIONS SECTION --- */}
      <section className="py-24 px-6 bg-[#050505] relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-900/10 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-pramana-gold/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-7xl mx-auto relative z-10">
          <SectionHeading title="Unleash Your Potential" subtitle="Elite Competitions" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mt-16">

            {/* Cultural Battles Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative h-[400px] rounded-2xl overflow-hidden border border-white/10 bg-white/5 hover:border-pramana-gold/50 transition-all duration-500"
            >
              {/* Background Image / Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>
              <div className="absolute inset-0 bg-[url('/uploads/cultural-poster.jpg')] bg-cover bg-center opacity-50 group-hover:scale-110 transition-transform duration-700"></div>

              {/* Hover Glow */}
              <div className="absolute inset-0 bg-pramana-gold/0 group-hover:bg-pramana-gold/10 transition-colors duration-500 z-10"></div>

              {/* Content */}
              <div className="absolute inset-0 p-8 flex flex-col justify-end z-20">
                <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-3xl font-primary font-bold text-white mb-2">Cultural Battles</h3>
                  <p className="text-pramana-cream/70 font-tertiary text-sm mb-6 line-clamp-3 group-hover:text-white transition-colors">
                    Dance, Music, Drama, and more. Step into the spotlight and compete with the best.
                  </p>

                  <Link href="/culturals" className="inline-flex items-center gap-3 text-pramana-gold font-bold uppercase tracking-widest text-xs group-hover:text-white transition-colors">
                    <span>View Details</span>
                    <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>
              </div>
            </motion.div>

            {/* Placeholder for future competitions */}
            {/* <div className="h-[400px] flex items-center justify-center border border-white/5 rounded-2xl bg-white/[0.02]">
              <span className="text-white/20 font-mono uppercase tracking-widest text-xs">Coming Soon</span>
            </div> */}

          </div>

        </div>
      </section>

      {/* --- THREE DAYS. THREE VIBES. SECTION (Static Grid) --- */}
      <section className="py-24 px-6 relative overflow-hidden">
        {/* Background Elements */}
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-pramana-gold/5 via-black to-black -z-10"></div>

        <div className="max-w-7xl mx-auto">
          <SectionHeading title="Experience The Magic" subtitle="Three Days. Three Vibes." />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
            {/* Day 0: Motorsports */}
            <div className="relative h-[320px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              {/* Background Image/Gradient */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>
              <div className="absolute inset-0 bg-[url('/noise.png')] opacity-20 mix-blend-overlay"></div>

              {/* Mascot */}
              <div className="absolute bottom-0 right-[-50px] w-[300px] h-[300px] md:w-[450px] md:h-[450px] z-10">
                <Image src="/day0_mascot.png" alt="Motorsports Mascot" fill className="object-contain drop-shadow-2xl" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 mb-4 rounded-full bg-pramana-gold/20 border border-pramana-gold/30 backdrop-blur-md">
                    <span className="text-pramana-gold text-xs font-bold tracking-widest uppercase">Day 0 • Feb 26</span>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-2 leading-tight">Motorsports</h3>

                </div>
              </div>
            </div>

            {/* Day 1: Glam/Gala */}
            <div className="relative h-[320px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>

              {/* Mascot */}
              <div className="absolute bottom-0 right-[-50px] w-[300px] h-[300px] md:w-[450px] md:h-[450px] z-10">
                <Image src="/day1_mascot.png" alt="Glam Mascot" fill className="object-contain drop-shadow-2xl" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 mb-4 rounded-full bg-purple-500/20 border border-purple-500/30 backdrop-blur-md">
                    <span className="text-purple-300 text-xs font-bold tracking-widest uppercase">Day 1 • Feb 27</span>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-2 leading-tight">Glam & Gala</h3>

                </div>
              </div>
            </div>

            {/* Day 2: Main Character Energy */}
            <div className="relative h-[320px] md:h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-white/5">
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/60 to-black z-10"></div>

              {/* Mascot */}
              <div className="absolute bottom-0 right-[-50px] w-[300px] h-[300px] md:w-[450px] md:h-[450px] z-10">
                <Image src="/day2_mascot.png" alt="Main Character Mascot" fill className="object-contain drop-shadow-2xl" />
              </div>

              {/* Content */}
              <div className="absolute bottom-0 left-0 w-full p-8 z-20 flex flex-col justify-end h-full">
                <div className="mb-4">
                  <div className="inline-block px-3 py-1 mb-4 rounded-full bg-red-500/20 border border-red-500/30 backdrop-blur-md">
                    <span className="text-red-300 text-xs font-bold tracking-widest uppercase">Day 2 • Feb 28</span>
                  </div>
                  <h3 className="text-3xl md:text-5xl font-cinzel font-bold text-white mb-2 leading-tight">Main Character</h3>

                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- PARTNERS SLIDER (Premium Reveal) --- */}
      <section className="py-24 bg-black relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[20vw] bg-pramana-gold/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-10"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-pramana-gold/50"></div>
              <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-primary">Strategic Alliance</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-pramana-gold/50"></div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="relative p-[1px] rounded-2xl bg-gradient-to-b from-white/10 to-transparent overflow-hidden"
          >
            <div className="absolute inset-0 bg-white/5 backdrop-blur-md"></div>

            <div className="relative bg-[#050505]/90 rounded-2xl px-12 py-20 flex flex-col items-center justify-center gap-6 group hover:bg-black/80 transition-colors duration-500">
              <div className="w-16 h-16 rounded-full border border-white/10 flex items-center justify-center bg-white/5 group-hover:border-pramana-gold/50 group-hover:bg-pramana-gold/10 transition-all duration-500">
                <div className="w-2 h-2 rounded-full bg-pramana-gold animate-pulse"></div>
              </div>

              <div className="space-y-2">
                <h2 className="text-4xl md:text-5xl font-primary font-bold text-white tracking-widest group-hover:text-pramana-gold transition-colors duration-500">
                  UNVEILING SOON
                </h2>
                <p className="text-pramana-cream/40 font-secondary italic">
                  Collaborating with industry leaders
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- PEOPLE BEHIND BACKSTAGE (Redesigned) --- */}
      <section className="py-32 bg-black relative overflow-hidden flex flex-col items-center justify-center min-h-[60vh]">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pramana-gold/5 rounded-full blur-[150px] animate-pulse"></div>

        {/* Floating Particles/Orbs */}
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-pramana-gold/20 rounded-full blur-sm animate-bounce duration-[3s]"></div>
        <div className="absolute bottom-1/3 right-1/4 w-3 h-3 bg-pramana-gold/10 rounded-full blur-md animate-bounce duration-[5s]"></div>

        <div className="max-w-7xl mx-auto text-center relative z-10 px-6">

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="mb-8"
          >
            <span className="text-pramana-gold/80 font-mono text-sm tracking-[0.3em] uppercase mb-4 block">
              The Unseen Forces
            </span>
            <h2 className="text-5xl md:text-8xl font-primary font-bold text-transparent bg-clip-text bg-gradient-to-b from-white via-white/80 to-white/20 tracking-tighter mb-6 relative">
              ARCHITECTS <br className="md:hidden" />
              <span className="text-pramana-gold font-serif italic">OF</span> CHAOS
            </h2>
            <p className="max-w-xl mx-auto text-white/40 font-tertiary text-lg leading-relaxed">
              Orchestrating the grand spectacle from the shadows.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Link href="/team" className="group relative inline-flex items-center gap-4 px-8 py-4 bg-white/5 border border-white/10 rounded-full overflow-hidden hover:border-pramana-gold/50 hover:bg-white/10 transition-all duration-500">
              <span className="relative z-10 text-white font-bold tracking-widest uppercase text-sm group-hover:text-pramana-gold transition-colors">
                Reveal The Team
              </span>
              <div className="w-8 h-8 rounded-full bg-pramana-gold/20 flex items-center justify-center group-hover:bg-pramana-gold group-hover:text-black transition-all duration-500">
                <ArrowRight className="w-4 h-4 -rotate-45 group-hover:rotate-0 transition-transform duration-500" />
              </div>
            </Link>
          </motion.div>

        </div>
      </section>

      {/* --- GALLERY SLIDER --- */}
      <section className="py-24 bg-[#050505] overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 mb-12">
          <SectionHeading title="Moments In Time" subtitle="Gallery" />
        </div>

        <div className="rotate-1 scale-105 transform opacity-80 hover:opacity-100 transition-opacity duration-700">
          <Marquee speed={30} direction="right">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="mx-4 relative w-[320px] h-[200px] bg-[#111] rounded overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-primary font-bold text-4xl group-hover:text-white/20 transition-colors">2026</div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110`} style={{ backgroundImage: `url('/uploads/gallery-${i + 1}.jpg')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </Marquee>
          <div className="h-4"></div>
          <Marquee speed={35} direction="left">
            {[...Array(8)].map((_, i) => (
              <div key={i + 8} className="mx-4 relative w-[320px] h-[200px] bg-[#111] rounded overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-primary font-bold text-4xl group-hover:text-white/20 transition-colors">VIBES</div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110`} style={{ backgroundImage: `url('/uploads/gallery-${i + 8}.jpg')` }}></div>
              </div>
            ))}
          </Marquee>
        </div>
      </section>

      {/* --- FAQ SECTION (Coming Soon) --- */}
      <section className="py-32 px-6 bg-black">
        <div className="max-w-4xl mx-auto text-center">
          <SectionHeading title="Frequently Asked Questions" subtitle="Support" />

          <div className="grid grid-cols-1 gap-4 text-left">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="group border border-white/10 rounded-lg bg-white/5 overflow-hidden transition-all duration-300 hover:border-pramana-gold/30"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full p-6 flex items-center justify-between gap-4 text-left"
                >
                  <span className={`font-primary text-lg font-bold transition-colors ${openFaq === i ? 'text-pramana-gold' : 'text-white'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${openFaq === i ? 'bg-pramana-gold text-black border-pramana-gold rotate-45' : 'border-white/20 text-white/50 group-hover:border-white/50 group-hover:text-white'}`}>
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="p-6 pt-0 text-pramana-cream/60 font-tertiary leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}

      <AppFooter />

    </div>
  );
}
