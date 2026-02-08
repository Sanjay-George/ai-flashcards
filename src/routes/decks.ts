import { Router } from 'express';
import type { Response, NextFunction } from 'express';
import { Deck } from '../models/Deck.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import type { AuthUser, AuthRequest } from '../middleware/auth.js';
import type { IDeck } from '../types/index.js';
import type { HydratedDocument } from 'mongoose';
import chalk from 'chalk';
import { ownerOnly, ownerOrPublic } from '../middleware/access.js';

const router = Router();

// Get all decks (user's own + public decks)
router.get('/', optionalAuthMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser | null;
        let query: any;
        if (user) {
            // Authenticated: show user's decks + public decks
            query = {
                $or: [
                    { userId: user.uid },
                    { isPublic: true }
                ]
            };
        } else {
            // Not authenticated: show only public decks
            query = { isPublic: true };
        }

        console.info(chalk.blue('Fetching decks for user: ' + (user?.email || 'Guest')));

        const decks = await Deck.find(query).sort({ updatedAt: -1 });
        res.json(decks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get user's own decks only
router.get('/my', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const decks = await Deck.find({ userId: user.uid }).sort({ updatedAt: -1 });
        res.json(decks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get public decks (browse)
router.get('/public', async (_req: AuthRequest, res: Response) => {
    try {
        const decks = await Deck.find({ isPublic: true }).sort({ updatedAt: -1 });
        res.json(decks);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single deck (must be owner or deck must be public)
router.get('/:id', optionalAuthMiddleware, ownerOrPublic, async (req: AuthRequest, res: Response) => {
    try {
        const deck = (req as any).deck;
        res.json(deck);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create deck (authenticated only)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const body = req.body as Partial<IDeck>;

        const deck = new Deck({
            ...body,
            userId: user.uid,
            isPublic: body.isPublic ?? false
        });
        await deck.save();

        res.status(201).json(deck);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Clone a public deck (authenticated only)
router.post('/:id/clone', authMiddleware, ownerOrPublic, async (req: AuthRequest, res: Response) => {
    try {
        const user = req.user as AuthUser;
        const originalDeck = (req as any).deck as HydratedDocument<IDeck>;

        // Create a copy with fresh SRS data
        const clonedLexemes = originalDeck.lexemes.map((lexeme: any) => ({
            term: lexeme.term,
            meaning: lexeme.meaning,
            POS: lexeme.POS,
            easeFactor: 2.5,
            interval: 0,
            repetitions: 0,
            nextReviewDate: new Date()
        }));

        const clonedDeck = new Deck({
            title: `${originalDeck.title} (Copy)`,
            tags: originalDeck.tags,
            language: originalDeck.language,
            userId: user.uid,
            isPublic: false,  // Clones are private by default
            lexemes: clonedLexemes
        });

        await clonedDeck.save();
        res.status(201).json(clonedDeck);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Update deck (owner only)
router.put('/:id', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        const body = req.body as Partial<IDeck>;

        // Don't allow changing userId
        delete body.userId;

        const updatedDeck = await Deck.findByIdAndUpdate(
            req.params.id,
            body,
            { new: true }
        );

        res.json(updatedDeck);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete deck (owner only)
router.delete('/:id', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        await Deck.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deck deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Remove lexeme from deck (owner only)
router.delete('/:id/lexemes/:term', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        const deck = (req as any).deck as HydratedDocument<IDeck>;
        const term = decodeURIComponent(req.params.term as string);

        // Filter out the lexeme with matching term
        const updatedLexemes = deck.lexemes.filter((lexeme: any) => lexeme.term !== term);

        if (updatedLexemes.length === deck.lexemes.length) {
            res.status(404).json({ error: 'Lexeme not found in deck' });
            return;
        }

        deck.lexemes = updatedLexemes;
        await deck.save();

        res.json(deck);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get lexemes due for review (owner only - SRS is personal)
router.get('/:id/lexemes/due', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        const deck = (req as any).deck as HydratedDocument<IDeck>;
        const limit = parseInt(req.query.limit as string || '10');
        const now = new Date();

        // Sort lexemes by due date and priority
        const sortedLexemes = [...deck.lexemes].sort((a: any, b: any) => {
            const aDate = new Date(a.nextReviewDate || 0);
            const bDate = new Date(b.nextReviewDate || 0);
            const aDue = aDate <= now;
            const bDue = bDate <= now;

            // Due cards come first
            if (aDue && !bDue) return -1;
            if (!aDue && bDue) return 1;

            // Among due cards, sort by date (oldest first)
            if (aDue && bDue) {
                return aDate.getTime() - bDate.getTime();
            }

            // Among not-due cards, prioritize by repetitions (lowest first = hardest)
            return (a.repetitions || 0) - (b.repetitions || 0);
        });

        res.json(sortedLexemes.slice(0, limit));
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Rate a lexeme (owner only)
router.post('/:id/lexemes/:term/rate', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        const deck = (req as any).deck as HydratedDocument<IDeck>;
        const term = decodeURIComponent(req.params.term as string);
        const body = req.body as { rating: number };

        const lexemeIndex = deck.lexemes.findIndex((l: any) => l.term === term);
        if (lexemeIndex === -1) {
            res.status(404).json({ error: 'Lexeme not found' });
            return;
        }

        const lexeme = deck.lexemes[lexemeIndex] as any;

        // Calculate new SRS values
        const srs = calculateSRS(
            body.rating,
            lexeme.easeFactor || 2.5,
            lexeme.interval || 0,
            lexeme.repetitions || 0
        );

        // Update lexeme with SRS data
        deck.lexemes[lexemeIndex] = {
            ...lexeme.toObject(),
            easeFactor: srs.easeFactor,
            interval: srs.interval,
            repetitions: srs.repetitions,
            nextReviewDate: srs.nextReviewDate,
            lastReviewed: new Date()
        };

        await deck.save();

        res.json(deck.lexemes[lexemeIndex]);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

/**
 * SM-2 Spaced Repetition Algorithm
 * Rating scale: 1-5 (1 = complete failure, 5 = perfect)
 */
function calculateSRS(
    rating: number,
    currentEaseFactor: number,
    currentInterval: number,
    currentRepetitions: number
): { easeFactor: number; interval: number; repetitions: number; nextReviewDate: Date } {
    // Map 1-5 rating to SM-2 quality (0-5): 1->0, 2->1, 3->3, 4->4, 5->5
    const qualityMap: Record<number, number> = { 1: 0, 2: 1, 3: 3, 4: 4, 5: 5 };
    const quality = qualityMap[rating] ?? 3;

    let easeFactor = currentEaseFactor;
    let interval = currentInterval;
    let repetitions = currentRepetitions;

    // If quality < 3, reset repetitions (card was failed)
    if (quality < 3) {
        repetitions = 0;
        interval = 1; // Review again tomorrow
    } else {
        // Card was successful
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(currentInterval * easeFactor);
        }
        repetitions += 1;
    }

    // Update ease factor (minimum 1.3)
    easeFactor = Math.max(
        1.3,
        easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    );

    // Calculate next review date
    const nextReviewDate = new Date();
    nextReviewDate.setDate(nextReviewDate.getDate() + interval);

    return { easeFactor, interval, repetitions, nextReviewDate };
}

export default router;
