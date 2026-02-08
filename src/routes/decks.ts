import { Hono } from 'hono';
import { Deck } from '../models/Deck';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import type { AuthUser } from '../middleware/auth';
import type { IDeck } from '../types/index';
import type { HydratedDocument } from 'mongoose';

type Variables = {
    user: AuthUser | null;
    deck?: HydratedDocument<IDeck>;
};

const app = new Hono<{ Variables: Variables }>();

/**
 * Middleware: Load deck and verify user can access it (owner or public)
 */
async function ownerOrPublic(c: any, next: any) {
    const user = c.get('user') as AuthUser | null;
    const deck = await Deck.findById(c.req.param('id'));

    if (!deck) {
        return c.json({ error: 'Deck not found' }, 404);
    }

    // Check access: must be owner or deck must be public
    if (!deck.isPublic && deck.userId !== user?.uid) {
        return c.json({ error: 'Access denied' }, 403);
    }

    c.set('deck', deck);
    await next();
}

/**
 * Middleware: Load deck and verify user is the owner
 */
async function ownerOnly(c: any, next: any) {
    const user = c.get('user') as AuthUser;
    const deck = await Deck.findById(c.req.param('id'));

    if (!deck) {
        return c.json({ error: 'Deck not found' }, 404);
    }

    // Only owner can access
    if (deck.userId !== user.uid) {
        return c.json({ error: 'Only the owner can access this resource' }, 403);
    }

    c.set('deck', deck);
    await next();
}

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

// Get all decks (user's own + public decks)
app.get('/', optionalAuthMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser | null;

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

        const decks = await Deck.find(query).sort({ updatedAt: -1 });
        return c.json(decks);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get user's own decks only
app.get('/my', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const decks = await Deck.find({ userId: user.uid }).sort({ updatedAt: -1 });
        return c.json(decks);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get public decks (browse)
app.get('/public', async (c) => {
    try {
        const decks = await Deck.find({ isPublic: true }).sort({ updatedAt: -1 });
        return c.json(decks);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get single deck (must be owner or deck must be public)
app.get('/:id', optionalAuthMiddleware, ownerOrPublic, async (c) => {
    try {
        const deck = c.get('deck');
        return c.json(deck);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Create deck (authenticated only)
app.post('/', authMiddleware, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const body = await c.req.json<Partial<IDeck>>();

        const deck = new Deck({
            ...body,
            userId: user.uid,
            isPublic: body.isPublic ?? false
        });
        await deck.save();

        return c.json(deck, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Clone a public deck (authenticated only)
app.post('/:id/clone', authMiddleware, ownerOrPublic, async (c) => {
    try {
        const user = c.get('user') as AuthUser;
        const originalDeck = c.get('deck') as HydratedDocument<IDeck>;

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
        return c.json(clonedDeck, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Update deck (owner only)
app.put('/:id', authMiddleware, ownerOnly, async (c) => {
    try {
        const body = await c.req.json<Partial<IDeck>>();

        // Don't allow changing userId
        delete body.userId;

        const updatedDeck = await Deck.findByIdAndUpdate(
            c.req.param('id'),
            body,
            { new: true }
        );

        return c.json(updatedDeck);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Delete deck (owner only)
app.delete('/:id', authMiddleware, ownerOnly, async (c) => {
    try {
        await Deck.findByIdAndDelete(c.req.param('id'));
        return c.json({ message: 'Deck deleted successfully' });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Remove lexeme from deck (owner only)
app.delete('/:id/lexemes/:term', authMiddleware, ownerOnly, async (c) => {
    try {
        const deck = c.get('deck') as HydratedDocument<IDeck>;
        const term = decodeURIComponent(c.req.param('term'));

        // Filter out the lexeme with matching term
        const updatedLexemes = deck.lexemes.filter((lexeme: any) => lexeme.term !== term);

        if (updatedLexemes.length === deck.lexemes.length) {
            return c.json({ error: 'Lexeme not found in deck' }, 404);
        }

        deck.lexemes = updatedLexemes;
        await deck.save();

        return c.json(deck);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get lexemes due for review (owner only - SRS is personal)
app.get('/:id/lexemes/due', authMiddleware, ownerOnly, async (c) => {
    try {
        const deck = c.get('deck') as HydratedDocument<IDeck>;
        const limit = parseInt(c.req.query('limit') || '10');
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

        return c.json(sortedLexemes.slice(0, limit));
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Rate a lexeme (owner only)
app.post('/:id/lexemes/:term/rate', authMiddleware, ownerOnly, async (c) => {
    try {
        const deck = c.get('deck') as HydratedDocument<IDeck>;
        const term = decodeURIComponent(c.req.param('term'));
        const body = await c.req.json<{ rating: number }>();

        const lexemeIndex = deck.lexemes.findIndex((l: any) => l.term === term);
        if (lexemeIndex === -1) {
            return c.json({ error: 'Lexeme not found' }, 404);
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

        return c.json(deck.lexemes[lexemeIndex]);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

export default app;
