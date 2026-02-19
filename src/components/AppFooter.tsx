'use client';

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Instagram, Linkedin, Mail, MapPin } from 'lucide-react';

const AppFooter = () => {
    return (
        <footer className="pt-24 pb-12 px-6 bg-[#020202] border-t border-white/5">
            <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
                <div className="col-span-1 md:col-span-2 space-y-6">
                    <div className="w-32 relative h-10 opacity-60">
                        <Image src="/pramana-logo.png" alt="Pramana" fill className="object-contain object-left" sizes="128px" />
                    </div>
                    <p className="text-pramana-cream/60 max-w-sm font-tertiary leading-relaxed">
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
                    <h4 className="font-primary text-white font-bold mb-6 text-sm uppercase tracking-widest">Navigate</h4>
                    <ul className="space-y-4 text-sm text-pramana-cream/50 font-mono">
                        <li>
                            <Link href="/tickets" className="hover:text-pramana-gold transition-colors text-left">
                                Buy Passes
                            </Link>
                        </li>
                        <li>
                            <Link href="/login" className="hover:text-pramana-gold transition-colors text-left">
                                Login
                            </Link>
                        </li>
                        <li>
                            <Link href="/schedule" className="hover:text-pramana-gold transition-colors text-left">
                                Schedule
                            </Link>
                        </li>
                        <li>
                            <Link href="/sponsors" className="hover:text-pramana-gold transition-colors text-left">
                                Sponsors
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="font-primary text-white font-bold mb-6 text-sm uppercase tracking-widest">Visit Us</h4>
                    <ul className="space-y-4 text-sm text-pramana-cream/50 font-tertiary">
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
                    <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
                    <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
                </div>
            </div>
        </footer>
    );
};

export default AppFooter;
