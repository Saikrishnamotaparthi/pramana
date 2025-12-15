import type { Metadata } from "next";
import { Cinzel, Playfair_Display, EB_Garamond } from "next/font/google"; // Removed Inter
import "./globals.css";
import { AuthProvider } from "@/components/providers/AuthProvider";
import Navbar from "@/components/Navbar";

const cinzel = Cinzel({
  subsets: ["latin"],
  variable: "--font-cinzel",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

const garamond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-garamond",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PRAMANA26 - The Ultimate Event",
  description: "Secure ticketing and entry management system",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${cinzel.variable} ${playfair.variable} ${garamond.variable} font-playfair bg-pramana-black text-pramana-cream antialiased selection:bg-pramana-gold selection:text-black`}>
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
