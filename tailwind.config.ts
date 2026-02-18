import type { Config } from "tailwindcss";

const config: Config = {
    content: [
        "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
        "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                pramana: {
                    gold: "#B8860B",
                    black: "#1A1A1A",
                    cream: "#F5F5DC",
                    maroon: "#800020",
                    item: "#CD7F32",
                },
            },
            fontFamily: {
                primary: ["var(--font-arinza)", "serif"],
                secondary: ["var(--font-higuen)", "serif"],
                tertiary: ["var(--font-garamond)", "serif"],
                // Aliases for migration
                cinzel: ["var(--font-arinza)", "serif"],
                playfair: ["var(--font-higuen)", "serif"],
                garamond: ["var(--font-garamond)", "serif"],
            },
            backgroundImage: {
                "gradient-radial": "radial-gradient(var(--tw-gradient-stops))",
            },
            animation: {
                'fade-in': 'fadeIn 0.5s ease-out',
                'slide-up': 'slideUp 0.5s ease-out',
            },
            keyframes: {
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideUp: {
                    '0%': { transform: 'translateY(20px)', opacity: '0' },
                    '100%': { transform: 'translateY(0)', opacity: '1' },
                }
            }
        },
    },
    plugins: [],
};
export default config;
