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
      <section className="relative h-screen w-full overflow-hidden bg-black">
        {/* Desktop Hero Image */}
        <div className="absolute inset-0 hidden md:block">
          <Image
            src="/hero_desk1.png"
            alt="Hero Desktop"
            fill
            priority
            quality={100}
            unoptimized
            className="object-cover"
          />
        </div>

        {/* Mobile Hero Image */}
        <div className="absolute inset-0 block md:hidden">
          <Image
            src="/hero_mob.png"
            alt="Hero Mobile"
            fill
            priority
            quality={100}
            unoptimized
            className="object-cover"
          />
        </div>

        {/* Cinematic Scroll Indicator */}
        <motion.button
          onClick={() => {
            document.getElementById('alliance-section')?.scrollIntoView({ behavior: 'smooth' });
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-28 md:bottom-12 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/70 uppercase group-hover:text-pramana-gold transition-colors shadow-black drop-shadow-md">Scroll to Explore</span>
          <ChevronDown className="w-6 h-6 text-pramana-gold animate-bounce opacity-80 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
        </motion.button>
      </section>



      {/* --- SHOW MAKERS SECTION (Redesigned) --- */}
      <section className="py-24 bg-[#050505] relative overflow-hidden flex flex-col items-center justify-center">
        {/* Animated Background Layers */}
        <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.05] mix-blend-overlay"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-pramana-gold/5 rounded-full blur-[150px] animate-pulse"></div>

        <div className="w-full relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 px-6"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-pramana-gold/50"></div>
              <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-primary">Thank You</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-pramana-gold/50"></div>
            </div>
            <h2 className="text-3xl md:text-5xl font-primary font-bold text-white tracking-widest uppercase mb-4">
              Show Makers
            </h2>
            <p className="max-w-xl mx-auto text-white/40 font-tertiary text-lg">
              For making us memorable.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full overflow-hidden relative"
          >
            {/* Left and Right Fade Masks */}
            <div className="absolute top-0 left-0 w-12 md:w-32 h-full bg-gradient-to-r from-[#050505] to-transparent z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-12 md:w-32 h-full bg-gradient-to-l from-[#050505] to-transparent z-20 pointer-events-none"></div>

            {/* Combined Day 1 & Day 2 Marquee */}
            <div className="mb-8">
              <Marquee speed={45} direction="left">
                {Array(4).fill([
                  { name: "Deccan Project", img: "/uploads/artist-deccan-project.jpg", date: "Feb 27", day: "Day 1" },
                  { name: "Geetha Madhuri", img: "/uploads/artist-geetha-madhuri.jpg", date: "Feb 27", day: "Day 1" },
                  { name: "DJ Nandzy", img: "/uploads/artist-dj-nandzy.jpeg", date: "Feb 27", day: "Day 1" },
                  { name: "Kasyap", img: "/uploads/artist-kasyap.JPG", date: "Feb 28", day: "Day 2" },
                  { name: "Nawabgang", img: "/uploads/nawabgang.png", date: "Feb 28", day: "Day 2" },
                  { name: "DJ Swattrex", img: "/uploads/artist-dj-swattrex.jpg", date: "Feb 28", day: "Day 2" }
                ]).flat().map((artist, idx) => (
                  <div key={`artist-${idx}`} className="relative w-64 h-80 mx-4 rounded-2xl overflow-hidden border border-white/10 group cursor-pointer">
                    <div className="absolute top-4 left-4 z-20 px-3 py-1 bg-black/50 backdrop-blur-md rounded-full border border-white/10">
                      <span className="text-[10px] font-bold text-pramana-gold tracking-widest uppercase">{artist.day} &bull; {artist.date}</span>
                    </div>
                    <Image
                      src={artist.img}
                      alt={artist.name}
                      fill
                      sizes="256px"
                      quality={100}
                      unoptimized
                      priority
                      className="object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="absolute bottom-0 left-0 w-full p-6 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 text-left">
                      <h3 className="text-xl md:text-2xl font-primary font-bold text-white drop-shadow-lg">{artist.name}</h3>
                    </div>
                  </div>
                ))}
              </Marquee>
            </div>
          </motion.div>
        </div>
      </section>

      {/* --- PARTNERS SLIDER (Premium Reveal) --- */}
      <section id="alliance-section" className="py-24 bg-black relative overflow-hidden">
        {/* Subtle Background Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[20vw] bg-pramana-gold/5 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mb-16 px-6"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-pramana-gold/50"></div>
              <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-primary">Thank You</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-pramana-gold/50"></div>
            </div>
            <h2 className="text-3xl md:text-5xl font-primary font-bold text-white tracking-widest uppercase">
              Our Esteemed Partners
            </h2>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="w-full overflow-hidden relative"
          >
            {/* Left and Right Fade Masks for better Marquee look */}
            <div className="absolute top-0 left-0 w-24 md:w-48 h-full bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-24 md:w-48 h-full bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

            <Marquee speed={40}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                <div key={num} className="relative w-48 h-32 md:w-64 md:h-40 mx-4 grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 flex items-center justify-center bg-white/5 rounded-2xl border border-white/10 hover:border-pramana-gold/40 hover:bg-white/10 group cursor-pointer">
                  <Image
                    src={`/sponsers/0${num}.png`}
                    alt={`Partner 0${num}`}
                    fill
                    className="object-contain p-6 md:p-8 drop-shadow-xl group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              ))}
            </Marquee>
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

          {/* Team Marquee */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full overflow-hidden relative mb-12"
          >
            {/* Left and Right Fade Masks */}
            <div className="absolute top-0 left-0 w-12 md:w-32 h-full bg-gradient-to-r from-black to-transparent z-20 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-12 md:w-32 h-full bg-gradient-to-l from-black to-transparent z-20 pointer-events-none"></div>

            <Marquee speed={50} direction="left">
              {[
                { name: "Adepu Suraj", image: "/team/1.JPG", role: "Leadership Panel" },
                { name: "Praneeth", image: "/team/4.JPG", role: "Leadership Panel" },
                { name: "Pradyumna", image: "/team/2.JPG", role: "Leadership Panel" },
                { name: "Sharan", image: "/team/3.JPG", role: "Leadership Panel" },
                { name: "Sai Krishna", image: "/team/5.1.JPG", role: "Tech" },
                { name: "Teja", image: "/team/6.JPG", role: "Tech" },
                { name: "Siddharth Goud", image: "/team/7.JPG", role: "Sponsorship" },
                { name: "Arvind", image: "/team/8.JPG", role: "Sponsorship" },
                { name: "Anshul Rai", image: "/team/9.JPG", role: "Finance" },
                { name: "Riteesh Reddy", image: "/team/10.JPG", role: "Food & Stalls" },
                { name: "Ram", image: "/team/11.JPG", role: "Food & Stalls" },
                { name: "Rahul", image: "/team/12.JPG", role: "Food & Stalls" },
                { name: "Sahithi cholleti", image: "/team/13.JPG", role: "Culturals" },
                { name: "Jashwanth Thota", image: "/team/14.JPG", role: "Production" },
                { name: "Ridhima Mamgain", image: "/team/15.JPG", role: "Backstage Operations" },
                { name: "Sanjana", image: "/team/16.jpeg", role: "Backstage Operations" },
                { name: "Varshith Reddy", image: "/team/17.jpeg", role: "Marketing" },
                { name: "Nihal Agarwal", image: "/team/18.1.png", role: "Marketing" },
                { name: "Fareed", image: "/team/19.JPG", role: "Artist Management" },
                { name: "Sharaa Shaaz", image: "/team/20.JPG", role: "Artist Management" },
                { name: "Rishitha", image: "/team/21.JPG", role: "Hospitality" },
                { name: "Rohan Sai", image: "/team/22.JPG", role: "Media" },
                { name: "Vishal", image: "/team/23.png", role: "Safety & Security" },
                { name: "Kamal", image: "/team/24.png", role: "Safety & Security" },
                { name: "Sravan", image: "/team/25.jpeg", role: "Crowd Control" },
                { name: "Manikanta", image: "/team/26.JPG", role: "Crowd Control" },
                { name: "Bhanu teja", image: "/team/27.JPG", role: "Operations" },
                { name: "Sharmishta", image: "/team/28.1.jpeg", role: "Operations" },
                { name: "Bollapally koushik", image: "/team/29.jpeg", role: "Emergency Response" },
                { name: "Moksha chowdary", image: "/team/30.JPG", role: "Sustainability" },
                { name: "Sathvik", image: "/team/31.JPG", role: "Documentation" },
                { name: "Diya Goyal", image: "/team/32.JPG", role: "Documentation" },
                { name: "Justin Joy", image: "/team/33.JPG", role: "Documentation" },
                { name: "Shreya Kondur", image: "/team/34.JPG", role: "Graphic Design" },
                { name: "Nitish", image: "/team/35.JPG", role: "Graphic Design" },
                { name: "Arshiya", image: "/team/36.JPG", role: "Liaisoning" }
              ].map((member, idx) => (
                <div key={`team-${idx}`} className="relative w-48 h-64 md:w-56 md:h-72 mx-4 rounded-xl overflow-hidden border border-white/10 group cursor-pointer bg-white/5">
                  <Image
                    src={member.image}
                    alt={member.name}
                    fill
                    sizes="224px"
                    quality={100}
                    unoptimized
                    className="object-cover transition-transform duration-700 group-hover:scale-110 grayscale hover:grayscale-0"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent opacity-90 group-hover:opacity-100 transition-opacity duration-500"></div>
                  <div className="absolute bottom-0 left-0 w-full p-4 md:p-5 translate-y-2 group-hover:translate-y-0 transition-transform duration-500 text-left">
                    <p className="text-pramana-gold text-[10px] md:text-xs font-bold uppercase tracking-widest mb-1 opacity-80 group-hover:opacity-100">{member.role}</p>
                    <h3 className="text-lg md:text-xl font-primary font-bold text-white drop-shadow-md">{member.name}</h3>
                  </div>
                </div>
              ))}
            </Marquee>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link href="/team" className="group relative inline-flex items-center gap-4 px-8 py-4 bg-white/5 border border-white/10 rounded-full overflow-hidden hover:border-pramana-gold/50 hover:bg-white/10 transition-all duration-500">
              <span className="relative z-10 text-white font-bold tracking-widest uppercase text-sm group-hover:text-pramana-gold transition-colors">
                Explore Full Team
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
        <div className="w-full relative z-10 text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="px-6"
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-pramana-gold/50"></div>
              <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-primary">Gallery</span>
              <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-pramana-gold/50"></div>
            </div>
            <h2 className="text-4xl md:text-6xl font-primary font-bold text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60 tracking-widest uppercase mb-4 drop-shadow-lg">
              Through The Lens
            </h2>
            <p className="max-w-xl mx-auto text-white/40 font-tertiary text-lg">
              Witness the chaos, the art, and the history.
            </p>
          </motion.div>
        </div>

        <div className="rotate-1 scale-105 transform opacity-80 hover:opacity-100 transition-opacity duration-700">
          <Marquee speed={30} direction="right">
            {[
              "DSC00024.JPG", "DSC00142.JPG", "DSC00762.JPG", "DSC05197.JPG",
              "DSC07917.jpg", "DSCF2115.JPG", "DSCF2203.JPG", "DSCF2802.JPG",
              "DSCF3193.JPG", "DSCF3335.JPG", "DSCF3507.JPG", "DSCF3859.JPG", "DSCF3902.JPG"
            ].map((imgName, i) => (
              <div key={i} className="mx-4 relative w-[320px] h-[200px] bg-[#111] rounded overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-primary font-bold text-4xl group-hover:text-white/20 transition-colors">2026</div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110`} style={{ backgroundImage: `url('/Gallery/${imgName}')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </Marquee>
          <div className="h-4"></div>
          <Marquee speed={35} direction="left">
            {[
              "DSCF3955.JPG", "DSCF4601.JPG", "DSC_0961.JPG", "DSC_7371.JPG",
              "DSC_7595.JPG", "DSC_9550.JPG", "DSC_9985.JPG", "IMG_2670.CR3",
              "IMG_6656.JPG", "gallery-1.JPG", "gallery-2.JPG", "gallery-3.JPG", "gallery-4.JPG"
            ].map((imgName, i) => (
              <div key={i + 13} className="mx-4 relative w-[320px] h-[200px] bg-[#111] rounded overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-primary font-bold text-4xl group-hover:text-white/20 transition-colors">VIBES</div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110`} style={{ backgroundImage: `url('/Gallery/${imgName}')` }}></div>
              </div>
            ))}
          </Marquee>
        </div>
      </section>



      {/* --- FOOTER --- */}

      <AppFooter />

    </div>
  );
}
