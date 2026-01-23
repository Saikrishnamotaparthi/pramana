export interface UserProfile {
    uid: string;
    email: string;
    displayName: string | null;
    photoURL: string | null;
    isGitamite: boolean;
    role: 'user' | 'admin' | 'superadmin' | 'view_admin' | 'entry_admin';
    isRegistered: boolean; // True if they have completed the post-login registration
    registrationData?: any; // To hold dynamic form data
    createdAt?: number;
}

export interface AuthContextType {
    user: UserProfile | null;
    loading: boolean;
    signInWithGoogle: () => Promise<any>;
    logout: () => Promise<void>;
}

export interface RegistrationField {
    id: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'email';
    required: boolean;
    options?: string[];
    category: 'all' | 'gitam' | 'non-gitam';
}

export interface PassConfig {
    id: string;
    name: string;
    price: number;
    type: 'single' | 'group';
    groupSize?: number;
    limit: number;
    sold: number;
    description: string;
    active: boolean;
    status: 'available' | 'sold_out' | 'coming_soon';
    showRemaining?: boolean;
    category?: 'all' | 'gitam' | 'non-gitam';
    paymentLink?: string;
}

export interface Coupon {
    code: string;
    discountType: 'amount' | 'percentage';
    value: number;
    applicableTo: 'all' | 'gitam' | 'non-gitam' | string[]; // 'all', 'gitam', 'non-gitam' or array of pass IDs
    passCategoryId?: string; // If null, applies to all
    limit: number;
    used: number;
    active: boolean;
}

