import type { AuthUser, AuthRequest } from '../middleware/auth.js';
import type { Response, NextFunction } from 'express';
import { Deck } from '../models/Deck.js';
/**
 * Middleware: Load deck and verify user can access it (owner or public)
 */
export async function ownerOrPublic(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user as AuthUser | null;
    const deck = await Deck.findById(req.params.id);

    if (!deck) {
        res.status(404).json({ error: 'Deck not found' });
        return;
    }

    // Check access: must be owner or deck must be public
    if (!deck.isPublic && deck.userId !== user?.uid) {
        res.status(403).json({ error: 'Access denied' });
        return;
    }

    (req as any).deck = deck;
    next();
}


/**
 * Middleware: Load deck and verify user is owner
 */
export async function ownerOnly(req: AuthRequest, res: Response, next: NextFunction) {
    const user = req.user as AuthUser;
    const deck = await Deck.findById(req.params.id);

    if (!deck) {
        res.status(404).json({ error: 'Deck not found' });
        return;
    }

    // Only owner can access
    if (deck.userId !== user.uid) {
        res.status(403).json({ error: 'Only the owner can access this resource' });
        return;
    }

    (req as any).deck = deck;
    next();
}