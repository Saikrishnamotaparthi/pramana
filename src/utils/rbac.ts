import { UserProfile } from "@/types";

export const isViewAdmin = (user: UserProfile | null) => {
    return user?.role === 'view_admin';
};

export const isMarketingAdmin = (user: UserProfile | null) => {
    return user?.role === 'marketing_admin';
};

export const isPpassAdmin = (user: UserProfile | null) => {
    return user?.role === 'ppass_admin';
};

export const canIssuePasses = (user: UserProfile | null) => {
    if (!user) return false;
    // View Admin and Marketing Admin cannot issue passes
    // Ppass Admin CAN issue passes
    if (isPpassAdmin(user)) return true;
    return !isViewAdmin(user) && !isMarketingAdmin(user);
};

export const canAccessBulkIssue = (user: UserProfile | null) => {
    if (!user) return false;
    return !isViewAdmin(user) && !isMarketingAdmin(user);
};

export const canManageAdmins = (user: UserProfile | null) => {
    return user?.role === 'superadmin';
};

export const canManageEntry = (user: UserProfile | null) => {
    return user?.role === 'superadmin' || user?.role === 'admin';
};
