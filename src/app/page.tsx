"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, useScroll, useTransform, useSpring, useInView, Variants } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ChevronDown, Plus, Minus, Instagram, Linkedin, Mail, MapPin, Calendar, ExternalLink } from "lucide-react";
import { useState, useRef } from "react";

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

const SectionHeading = ({ title, subtitle }: { title: string; subtitle: string }) => {
  return (
    <div className="mb-16 relative">
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true }}
        variants={fadeUp}
        className="flex flex-col gap-2"
      >
        <div className="flex items-center gap-4">
          <div className="h-[1px] w-12 bg-pramana-gold"></div>
          <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">{subtitle}</span>
        </div>
        <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-white leading-tight">
          {title}
        </h2>
      </motion.div>
    </div>
  );
};

export default function LandingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const faqs = [
    { q: "When is Pramana happening?", a: "Pramana is a two-day event scheduled on 27th & 28th February 2026. Event timings will be announced soon." },
    { q: "Are single-day and on-spot tickets available?", a: "Yes. Single-day passes and on-spot tickets are available for both Gitamites and outsiders." },
    { q: "Will there be an Auto Expo this year?", a: "Yes, Pramana will host an Auto Expo this year. The date will be announced soon." },
    { q: "Which artists will be performing at Pramana?", a: "The artist lineup will be announced soon." },
    { q: "Is travel or accommodation provided?", a: "Details regarding travel assistance and accommodation will be announced soon." }
  ];

  const handleEntry = () => {
    if (user) router.push("/tickets");
    else router.push("/login?redirect=/tickets");
  };

  const scrollToInfo = () => {
    document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="relative min-h-screen bg-[#050505] text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black overflow-x-hidden">

      {/* --- HEADER --- */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-6 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-black/50 backdrop-blur-xl border border-white/5 rounded-full px-6 py-3 shadow-2xl shadow-black/50">
          {/* Left: GITAM Logo */}
          <div className="w-32 h-10 md:w-40 md:h-12 relative opacity-90 hover:opacity-100 transition-opacity">
            <Image src="/gitam-logo.png" alt="GITAM" fill className="object-contain object-left" sizes="(max-width: 768px) 128px, 160px" priority />
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-6">
            <div className="hidden md:block w-32 relative h-10 opacity-80">
              <Image src="/student-life-logo.png" alt="Student Life" fill className="object-contain" sizes="128px" />
            </div>
            <Link
              href="/login"
              className="group relative px-6 py-2 bg-pramana-gold text-black rounded-full font-bold font-cinzel text-xs uppercase tracking-widest overflow-hidden"
            >
              <span className="relative z-10 group-hover:text-white transition-colors duration-300">Buy Passes</span>
              <div className="absolute inset-0 bg-white/20 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
            </Link>
          </div>
        </div>
      </header>

      {/* --- HERO SECTION --- */}
      <section className="relative h-screen flex flex-col items-center justify-center overflow-hidden">
        {/* Atmospheric Background */}
        <div className="absolute inset-0 z-0 bg-black">
          <div className="absolute top-[-20%] left-[-10%] w-[70vw] h-[70vw] bg-purple-900/20 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[70vw] h-[70vw] bg-pramana-gold/10 rounded-full blur-[120px] mix-blend-screen animate-pulse-slow delay-1000"></div>
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        </div>

        <div className="relative z-10 text-center space-y-8 transform translate-y-[-5%] px-4 pt-24 md:pt-0">
          {/* Animated Pramana Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="relative w-40 h-40 md:w-56 md:h-56 mx-auto mb-6"
          >
            <div className="absolute inset-0 bg-pramana-gold/20 blur-2xl rounded-full"></div>
            <Image src="/pramana-logo.png" alt="Pramana Logo" fill className="object-contain drop-shadow-[0_0_30px_rgba(212,175,55,0.4)] relative z-10" sizes="(max-width: 768px) 160px, 224px" priority />
          </motion.div>

          {/* Main Title */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="relative"
          >
            <div className="relative flex items-center justify-center">
              {/* Left Mascot */}
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="hidden lg:block absolute left-[-280px] top-1/2 -translate-y-1/2 w-80 h-80 z-10"
              >
                <Image src="/uploads/mascot-left.png" alt="Mascot Left" fill className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]" sizes="(max-width: 1200px) 100vw, 320px" />
              </motion.div>

              <motion.h1
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-5xl md:text-7xl lg:text-8xl font-cinzel font-bold text-white tracking-tight leading-none drop-shadow-2xl relative z-20"
              >
                PRAMANA<span className="text-pramana-gold">'26</span>
              </motion.h1>

              {/* Right Mascot */}
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 1, delay: 0.5 }}
                className="hidden lg:block absolute right-[-280px] top-1/2 -translate-y-1/2 w-80 h-80 z-10"
              >
                <Image src="/uploads/mascot-right.png" alt="Mascot Right" fill className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]" sizes="(max-width: 1200px) 100vw, 320px" />
              </motion.div>
            </div>

            <motion.div variants={fadeUp} className="mt-12 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center gap-4 text-pramana-gold/80 font-mono text-xs tracking-[0.4em] uppercase">
                <span className="h-[1px] w-12 bg-pramana-gold/30"></span>
                Gitam Hyderabad
                <span className="h-[1px] w-12 bg-pramana-gold/30"></span>
              </div>

              <div className="relative p-4">
                <div className="absolute inset-0 bg-pramana-gold/5 blur-xl rounded-full"></div>
                <h2 className="relative flex items-center gap-3 text-3xl md:text-4xl font-cinzel font-bold text-white tracking-widest">
                  FEB <span className="text-pramana-gold">27</span> <span className="text-white/30 text-2xl">•</span> <span className="text-pramana-gold">28</span>
                </h2>
              </div>
            </motion.div>

            {/* Mobile Mascot (Below Date) */}
            <motion.div variants={fadeUp} className="lg:hidden mt-8 relative w-64 h-64 mx-auto">
              <Image src="/uploads/mascot-mobile.png" alt="Mascot Mobile" fill className="object-contain drop-shadow-[0_0_20px_rgba(212,175,55,0.3)]" sizes="(max-width: 768px) 256px, 100vw" priority />
            </motion.div>
          </motion.div>
        </div>

        {/* Cinematic Scroll Indicator */}
        <motion.button
          onClick={scrollToInfo}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1 }}
          className="absolute bottom-12 z-20 flex flex-col items-center gap-2 group cursor-pointer"
        >
          <span className="text-[10px] font-mono tracking-[0.2em] text-pramana-gold/60 uppercase group-hover:text-pramana-gold transition-colors">Scroll to Explore</span>
          <ChevronDown className="w-6 h-6 text-pramana-gold animate-bounce opacity-50 group-hover:opacity-100 transition-opacity" />
        </motion.button>
      </section>

      {/* --- ABOUT SECTION (Cinematic Split) --- */}
      <section id="info-section" className="relative py-24 px-6 bg-black z-10">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row items-center gap-20">

          {/* Visual Side (Left) */}
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="w-full lg:w-1/2 relative group perspective-1000"
          >
            {/* Glow Effect behind image */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-pramana-gold to-purple-900 opacity-20 blur-3xl rounded-none transition-opacity duration-700 group-hover:opacity-30"></div>

            {/* Image Container */}
            <div className="relative aspect-[4/5] overflow-hidden border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)] bg-[#111]">
              <div className="absolute inset-0 bg-white/5 z-20 mix-blend-overlay pointer-events-none"></div>
              <Image
                src="/uploads/about-poster.jpg"
                alt="Pramana Atmosphere"
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-105 opacity-90 hover:opacity-100"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />

              {/* Floating Date Card */}
              <div className="absolute bottom-0 right-0 bg-black/80 backdrop-blur-xl border-t border-l border-white/10 p-8 z-30">
                <div className="flex flex-col gap-1 text-right">
                  <span className="text-pramana-gold text-xs font-bold uppercase tracking-widest">Mark The Dates</span>
                  <span className="text-3xl font-cinzel text-white leading-none">FEB 27-28</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content Side (Right) */}
          <motion.div
            className="w-full lg:w-1/2 space-y-10"
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={staggerContainer}
          >
            <div className="space-y-4">
              <motion.div variants={fadeUp} className="flex items-center gap-4">
                <div className="h-[2px] w-8 bg-pramana-gold"></div>
                <span className="text-pramana-gold text-xs font-bold tracking-[0.2em] uppercase font-cinzel">The Saga Continues</span>
              </motion.div>

              <motion.h2 variants={fadeUp} className="text-4xl lg:text-5xl font-cinzel font-bold text-white leading-[1.1]">
                WHERE <span className="text-transparent bg-clip-text bg-gradient-to-r from-pramana-gold to-white">LEGACY</span><br />
                MEETS <span className="italic font-playfair text-pramana-gold/90">FUTURE</span>
              </motion.h2>
            </div>

            <motion.p variants={fadeUp} className="text-pramana-cream/60 text-lg leading-relaxed font-playfair border-l border-white/10 pl-8">
              Pramana 2026 is the region's grandest youth carnival—a melting pot of culture, technology, and unbridled talent. From heart-pounding pro-nights to mind-bending tech challenges, we are redefining what a student fest can be.
            </motion.p>

            {/* Cyberpunk Stats Row */}
            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-8 py-8 border-y border-white/5">
              {[
                { num: "15K+", label: "Footfall" },
                { num: "50+", label: "Events" }
              ].map((stat, i) => (
                <div key={i} className="group cursor-default">
                  <h4 className="text-3xl font-cinzel text-white font-bold group-hover:text-pramana-gold transition-colors">{stat.num}</h4>
                  <p className="text-[10px] text-pramana-cream/40 uppercase tracking-widest mt-2">{stat.label}</p>
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp}>
              <Link href="/login" className="inline-flex items-center gap-4 group">
                <span className="w-12 h-12 rounded-full border border-pramana-gold/50 flex items-center justify-center group-hover:bg-pramana-gold group-hover:text-black transition-all duration-300">
                  <ArrowRight className="w-5 h-5" />
                </span>
                <span className="font-cinzel text-sm font-bold tracking-widest text-white group-hover:text-pramana-gold transition-colors uppercase">
                  Secure Your Pass
                </span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* --- FEATURING SECTION --- */}
      <section className="py-24 px-6 bg-[#080808]">
        <div className="max-w-7xl mx-auto">
          <SectionHeading title="Experience The Extraordinary" subtitle="Featuring" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { title: "Tech Challenges", cat: "Innovation", img: "/uploads/tech-poster.jpg", desc: "Hackathons, coding battles, and robotics showcases." },
              { title: "Cultural Battles", cat: "Expression", img: "/uploads/cultural-poster.jpg", desc: "Dance, Music, and Drama competitions on the grandest stage." },
              { title: "Pro Nights", cat: "Celebration", img: "/uploads/pro-poster.jpg", desc: "Star-studded performances and DJ nights to end the days high." }
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="group relative h-[450px] overflow-hidden bg-[#111] border border-white/5 hover:border-pramana-gold/30 transition-all duration-500 rounded-sm"
              >
                <div className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-110 opacity-50 group-hover:opacity-70" style={{ backgroundImage: `url('${item.img}')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent"></div>

                <div className="absolute top-6 right-6">
                  <span className="text-[10px] font-mono border border-white/20 px-3 py-1 rounded-full text-white/50 bg-black/50 backdrop-blur-md uppercase">{item.cat}</span>
                </div>

                <div className="absolute bottom-0 left-0 p-10 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                  <h3 className="text-3xl font-cinzel text-white mb-4 group-hover:text-pramana-gold transition-colors">{item.title}</h3>
                  <div className="h-[1px] w-0 bg-pramana-gold group-hover:w-full transition-all duration-700 ease-out mb-4"></div>
                  <p className="text-sm text-pramana-cream/70 leading-relaxed max-w-xs">{item.desc}</p>
                </div>
              </motion.div>
            ))}
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
              <span className="text-pramana-gold text-xs font-bold tracking-[0.3em] uppercase font-cinzel">Strategic Alliance</span>
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
                <h2 className="text-4xl md:text-5xl font-cinzel font-bold text-white tracking-widest group-hover:text-pramana-gold transition-colors duration-500">
                  UNVEILING SOON
                </h2>
                <p className="text-pramana-cream/40 font-playfair italic">
                  Collaborating with industry leaders
                </p>
              </div>
            </div>
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
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-cinzel font-bold text-4xl group-hover:text-white/20 transition-colors">2026</div>
                <div className={`absolute inset-0 bg-cover bg-center opacity-60 hover:opacity-100 transition-all duration-700 scale-100 group-hover:scale-110`} style={{ backgroundImage: `url('/uploads/gallery-${i + 1}.jpg')` }}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            ))}
          </Marquee>
          <div className="h-4"></div>
          <Marquee speed={35} direction="left">
            {[...Array(8)].map((_, i) => (
              <div key={i + 8} className="mx-4 relative w-[320px] h-[200px] bg-[#111] rounded overflow-hidden border border-white/10 group">
                <div className="absolute inset-0 flex items-center justify-center text-white/10 font-cinzel font-bold text-4xl group-hover:text-white/20 transition-colors">VIBES</div>
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
                  <span className={`font-cinzel text-lg font-bold transition-colors ${openFaq === i ? 'text-pramana-gold' : 'text-white'}`}>
                    {faq.q}
                  </span>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${openFaq === i ? 'bg-pramana-gold text-black border-pramana-gold rotate-45' : 'border-white/20 text-white/50 group-hover:border-white/50 group-hover:text-white'}`}>
                    <Plus className="w-4 h-4" />
                  </div>
                </button>
                <div
                  className={`overflow-hidden transition-all duration-500 ease-in-out ${openFaq === i ? 'max-h-40 opacity-100' : 'max-h-0 opacity-0'}`}
                >
                  <p className="p-6 pt-0 text-pramana-cream/60 font-playfair leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER --- */}
      <footer className="pt-24 pb-12 px-6 bg-[#020202] border-t border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
          <div className="col-span-1 md:col-span-2 space-y-6">
            <div className="w-32 relative h-10 opacity-60">
              <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-left" sizes="128px" />
            </div>
            <p className="text-pramana-cream/60 max-w-sm font-playfair leading-relaxed">
              Experience the pulse of Hyderabad at the region's largest student festival. Where innovation meets tradition.
            </p>
            <div className="flex gap-4 pt-4">
              {[
                { Icon: Instagram, link: "https://www.instagram.com/pramana_2026.gitam/" },
                { Icon: Linkedin, link: "https://www.linkedin.com/company/pramana26/" },
                { Icon: Mail, link: "mailto:pramana.hyd@gitam.edu" }
              ].map(({ Icon, link }, i) => (
                <a key={i} href={link} target={link.startsWith('http') ? "_blank" : undefined} rel={link.startsWith('http') ? "noopener noreferrer" : undefined} className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:bg-pramana-gold hover:border-pramana-gold hover:text-black transition-all duration-300">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-cinzel text-white font-bold mb-6 text-sm uppercase tracking-widest">Navigate</h4>
            <ul className="space-y-4 text-sm text-pramana-cream/50 font-mono">
              {['Buy Passes', 'Login', 'Schedule', 'Sponsors'].map((item) => (
                <li key={item}><a href="#" className="hover:text-pramana-gold transition-colors">{item}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-cinzel text-white font-bold mb-6 text-sm uppercase tracking-widest">Visit Us</h4>
            <ul className="space-y-4 text-sm text-pramana-cream/50 font-playfair">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-1 text-pramana-gold" />
                <span>GITAM Deemed to be University,<br />Hyderabad Campus, Telangana</span>
              </li>
              <li className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-1 text-pramana-gold" />
                <span>pramana.hyd@gitam.edu</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-pramana-cream/30 font-mono uppercase tracking-widest">
          <div>© 2026 PRAMANA. All rights reserved.</div>
          <div className="flex gap-6">
            <a href="#" className="hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-white transition-colors">Terms</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
