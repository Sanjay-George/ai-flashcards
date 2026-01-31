import { Hono } from 'hono';
import { Deck } from '../models/Deck';
import type { IDeck, APIError, APISuccessMessage, ILexeme } from '../types/index';

const app = new Hono();

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

// Get all decks
app.get('/', async (c) => {
    try {
        const decks = await Deck.find().sort({ updatedAt: -1 });
        return c.json(decks);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get single deck
app.get('/:id', async (c) => {
    try {
        const deck = await Deck.findById(c.req.param('id'));
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }
        return c.json(deck);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Create deck
app.post('/', async (c) => {
    try {
        const body = await c.req.json<Partial<IDeck>>();
        const deck = new Deck(body);
        await deck.save();
        return c.json(deck, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Update deck
app.put('/:id', async (c) => {
    try {
        const body = await c.req.json<Partial<IDeck>>();
        const deck = await Deck.findByIdAndUpdate(
            c.req.param('id'),
            body,
            { new: true }
        );
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }
        return c.json(deck);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Delete deck
app.delete('/:id', async (c) => {
    try {
        const deck = await Deck.findByIdAndDelete(c.req.param('id'));
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }
        return c.json({ message: 'Deck deleted successfully' });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Remove lexeme from deck
app.delete('/:id/lexemes/:term', async (c) => {
    try {
        const deckId = c.req.param('id');
        const term = decodeURIComponent(c.req.param('term'));

        const deck = await Deck.findById(deckId);
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }

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

// Get lexemes due for review (SRS)
app.get('/:id/lexemes/due', async (c) => {
    try {
        const deckId = c.req.param('id');
        const limit = parseInt(c.req.query('limit') || '10');
        const now = new Date();

        const deck = await Deck.findById(deckId);
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }

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

// Rate a lexeme (update SRS data)
app.post('/:id/lexemes/:term/rate', async (c) => {
    try {
        const deckId = c.req.param('id');
        const term = decodeURIComponent(c.req.param('term'));
        const body = await c.req.json<{ rating: number }>();

        const deck = await Deck.findById(deckId);
        if (!deck) {
            return c.json({ error: 'Deck not found' }, 404);
        }

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
