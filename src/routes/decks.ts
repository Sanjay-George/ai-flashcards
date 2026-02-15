import { Router } from 'express';
import type { Response } from 'express';
import { Deck } from '../models/Deck.js';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth.js';
import type { AuthUser, AuthRequest } from '../middleware/auth.js';
import type { IDeck } from '../types/index.js';
import type { HydratedDocument } from 'mongoose';
import chalk from 'chalk';
import { ownerOnly, ownerOrPublic } from '../middleware/access.js';
import { calculateSRS, getDueLexemes } from '../utils/lexemes.js';

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
// Rule-based selection:
// 1. Priority: First-time words (never seen, repetitions === 0) - shuffled for variety
// 2. Priority: Due for review (nextReviewDate <= now) - sorted by date, easeFactor, repetitions
// 3. Fallback: Random selection from remaining lexemes
router.get('/:id/lexemes/due', authMiddleware, ownerOnly, async (req: AuthRequest, res: Response) => {
    try {
        const deck = (req as any).deck as HydratedDocument<IDeck>;
        const limit = parseInt(req.query.limit as string || '10');
        const selectedLexemes = getDueLexemes(deck.lexemes, limit);
        res.json(selectedLexemes.slice(0, limit));
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



export default router;
