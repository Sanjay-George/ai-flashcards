import type { Context, Next } from 'hono';
import admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    // Option 1: Use service account JSON file path from env
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

    // Option 2: Use individual env vars
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
        const serviceAccount = require(serviceAccountPath);
        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
    } else if (projectId) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.FIREBASE_PROJECT_ID,
                clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
            })
        });
    } else {
        console.warn('⚠️ Firebase not configured - auth will be disabled');
    }
}

export interface AuthUser {
    uid: string;
    email?: string;
    name?: string;
}

/**
 * Auth middleware - verifies Firebase ID token
 * Adds user info to context for use in route handlers
 */
export const authMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized - No token provided' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        if (!admin.apps.length) {
            return c.json({ error: 'Unauthorized - Firebase not configured' }, 401);
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        const user: AuthUser = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };

        c.set('user', user);
        await next();
    } catch (error: any) {
        console.error('Auth error:', error.message);
        return c.json({ error: 'Unauthorized - Invalid token' }, 401);
    }
};

/**
 * Optional auth middleware - allows unauthenticated requests
 * but adds user info if token is provided
 */
export const optionalAuthMiddleware = async (c: Context, next: Next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader?.startsWith('Bearer ')) {
        c.set('user', null);
        await next();
        return;
    }

    const token = authHeader.substring(7);

    try {
        if (!admin.apps.length) {
            c.set('user', { uid: 'dev-user', email: 'dev@test.com' });
            await next();
            return;
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        c.set('user', {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        });
    } catch (error) {
        c.set('user', null);
    }

    await next();
};

export { admin };
