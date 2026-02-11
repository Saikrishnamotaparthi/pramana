import * as admin from 'firebase-admin';

if (!admin.apps.length) {
    try {
        let serviceAccountStr = process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string;

        if (serviceAccountStr) {
            console.log(`[Firebase Admin] Raw key length: ${serviceAccountStr.length} `);
            console.log(`[Firebase Admin] First 5 chars: "${serviceAccountStr.substring(0, 5)}"`);

            // Robust cleaning: Find the first '{' and the last '}'
            const start = serviceAccountStr.indexOf('{');
            const end = serviceAccountStr.lastIndexOf('}');

            if (start !== -1 && end !== -1 && end > start) {
                serviceAccountStr = serviceAccountStr.substring(start, end + 1);
            }
        }

        const serviceAccount = JSON.parse(serviceAccountStr);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
    } catch (error: any) {
        console.error('Firebase admin initialization failed:', error.message || "Unknown error");
        // Fallback for build time or if env missing, to prevent crash but will fail at runtime usage
    }
}

let adminDb: FirebaseFirestore.Firestore;
let adminAuth: admin.auth.Auth;

if (admin.apps.length) {
    adminDb = admin.firestore();
    adminAuth = admin.auth();
} else {
    // Return a proxy or object that throws helpful errors when accessed
    // This allows import to succeed (for build) but fail meaningfully at runtime
    const throwInitError = () => {
        throw new Error(
            "Firebase Admin not initialized. Ensure 'FIREBASE_SERVICE_ACCOUNT_KEY' is set in your environment variables."
        );
    };

    adminDb = {
        collection: throwInitError,
        doc: throwInitError,
        // Add other common methods if necessary, or just use a Proxy if supported environment
    } as unknown as FirebaseFirestore.Firestore;

    adminAuth = {
        verifyIdToken: throwInitError,
        getUser: throwInitError,
        listUsers: throwInitError,
    } as unknown as admin.auth.Auth;
}

export { adminDb, adminAuth };
