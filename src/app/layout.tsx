import type { Metadata } from "next";
import { EB_Garamond } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";

// Primary Font
const arinza = localFont({
  src: "../../public/fonts/Arinza Ligature.otf",
  variable: "--font-arinza",
  display: "swap",
});

// Secondary Font
const higuen = localFont({
  src: "../../public/fonts/higuen.ttf",
  variable: "--font-higuen",
  display: "swap",
});

// Tertiary Font
const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRAMANA26 - The Ultimate Event",
  description: "Pramana'26 is the Annual Techno-Cultural Fest of GITAM Hyderabad. Experience the biggest college fest in Hyderabad with technology, culture, and entertainment.",
  verification: {
    google: "f72Uf8FCj_W1lOrReUDKXzKcUOv1ZYKSTyvg4FVUto",
  },
  keywords: [
    "pramana", "pramana26", "gitam", "gitam hyderabad", "fest", "student", "event",
    "techno cultural fest", "biggest college fest in hyderabad", "best fest in hyderabad",
    "tech", "cultural", "entertainment", "music", "dance", "workshops", "hackathon",
    "telangana", "hyderabad events"
  ],
  authors: [{ name: "Gitam University" }],
  openGraph: {
    title: "PRAMANA26 - The Ultimate Event",
    description: "Secure ticketing and entry management system for Pramana 2026",
    url: "https://pramana.gitam.edu", // Replace with actual URL if different
    siteName: "Pramana26",
    locale: "en_US",
    type: "website",
  },

};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${arinza.variable} ${higuen.variable} ${garamond.variable} font-tertiary bg-pramana-black text-pramana-cream antialiased selection:bg-pramana-gold selection:text-black`}>
        <AuthProvider>
          <Navbar />
          <main className="min-h-screen bg-pramana-black bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-gray-900 via-black to-black text-pramana-cream">
            {children}
          </main>
        </AuthProvider>
      </body>
    </html>
  );
}
