import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function isGitamEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    // Domains considered as Gitam students/staff
    const gitamDomains = ["@gitam.edu", "@gitam.in", "@student.gitam.edu", "@kspp.edu.in"];
    return gitamDomains.some((domain) => email.endsWith(domain));
}
