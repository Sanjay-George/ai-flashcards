import type { Request, Response, NextFunction } from 'express';
import admin from 'firebase-admin';
import { createRequire } from 'module';
import dotenv from 'dotenv';

dotenv.config();


// Initialize Firebase Admin SDK
if (!admin.apps.length) {
    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    const projectId = process.env.FIREBASE_PROJECT_ID;

    if (serviceAccountPath) {
        const require = createRequire(import.meta.url);
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

// Extend Express Request to carry user info
export interface AuthRequest extends Request {
    user?: AuthUser | null;
}

/**
 * Auth middleware - verifies Firebase ID token
 * Adds user info to request for use in route handlers
 */
export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Unauthorized - No token provided' });
        return;
    }

    const token = authHeader.substring(7);

    try {
        if (!admin.apps.length) {
            res.status(401).json({ error: 'Unauthorized - Firebase not configured' });
            return;
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };

        next();
    } catch (error: unknown) {
        const message = (error as Error).message;
        console.error('Auth error:', message);
        res.status(401).json({ error: 'Unauthorized - Invalid token' });
    }
};

/**
 * Optional auth middleware - allows unauthenticated requests
 * but adds user info if token is provided
 */
export const optionalAuthMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
        req.user = null;
        next();
        return;
    }

    const token = authHeader.substring(7);

    try {
        if (!admin.apps.length) {
            req.user = { uid: 'dev-user', email: 'dev@test.com' };
            next();
            return;
        }

        const decodedToken = await admin.auth().verifyIdToken(token);

        req.user = {
            uid: decodedToken.uid,
            email: decodedToken.email,
            name: decodedToken.name
        };
    } catch (error) {
        console.warn('Optional auth failed:', (error as Error).message);
        req.user = null;
    }

    next();
};

export { admin };
