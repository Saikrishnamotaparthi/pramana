"use client";

import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { motion } from "framer-motion";

export default function Home() {
  const { user, signInWithGoogle, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user && !loading) {
      if (user.role === 'admin' || user.role === 'superadmin') {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [user, loading, router]);

  const handleEntry = () => {
    if (user) {
      router.push("/tickets");
    } else {
      signInWithGoogle();
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-black selection:bg-pramana-gold selection:text-black">

      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pramana-gold/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pramana-maroon/20 rounded-full blur-[120px] animate-pulse delay-1000"></div>
      </div>

      <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-8"
        >
          <Image
            src="/logo.png"
            alt="PRAMANA26 Logo"
            width={180}
            height={180}
            className="mx-auto drop-shadow-2xl"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.8 }}
          className="text-6xl md:text-8xl font-cinzel font-bold text-transparent bg-clip-text bg-gradient-to-r from-pramana-cream via-pramana-gold to-pramana-cream drop-shadow-sm mb-6"
        >
          PRAMANA26
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6, duration: 0.8 }}
          className="text-xl md:text-2xl text-pramana-cream/80 font-playfair tracking-wide mb-12"
        >
          The Ultimate Experience Awaits
        </motion.p>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          onClick={handleEntry}
          className="group relative px-12 py-4 bg-transparent overflow-hidden rounded-full border border-pramana-gold/50 text-pramana-gold font-cinzel font-bold text-xl tracking-widest shadow-2xl hover:shadow-[0_0_40px_rgba(184,134,11,0.4)] transition-all duration-300"
        >
          <span className="relative z-10 group-hover:text-black transition-colors duration-300">BUY PASSES</span>
          <div className="absolute inset-0 bg-pramana-gold transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300 origin-left"></div>
        </motion.button>
      </div>

      {/* Glass Footer */}
      <footer className="absolute bottom-0 w-full p-6 text-center text-pramana-cream/30 text-xs font-mono tracking-widest">
        DESIGNED FOR EXCELLENCE • © 2026 PRAMANA
      </footer>
    </div>
  );
}
