import { Suspense } from "react";
import RegistrationForm from "@/components/RegistrationForm";

export default function RegisterPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-pramana-black bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-gray-900 via-black to-black p-4 text-pramana-cream font-playfair selection:bg-pramana-gold selection:text-black">
            <Suspense fallback={<div className="text-pramana-gold animate-pulse">Loading...</div>}>
                <RegistrationForm />
            </Suspense>
        </div>
    );
}
