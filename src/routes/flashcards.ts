import { Hono } from 'hono';
import { Flashcard } from '../models/Flashcard';
import type { IFlashcard, APIError, APISuccessMessage } from '../types/index';

const app = new Hono();

/**
 * SM-2 Spaced Repetition Algorithm
 * Rating scale: 1-5 (1 = complete failure, 5 = perfect)
 * Maps our 1-5 rating to SM-2's 0-5 quality scale
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

// Get flashcards for a deck
app.get('/deck/:deckId', async (c) => {
    try {
        const flashcards = await Flashcard.find({ deckId: c.req.param('deckId') });
        return c.json(flashcards);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get flashcards due for review (spaced repetition)
app.get('/deck/:deckId/due', async (c) => {
    try {
        const deckId = c.req.param('deckId');
        const limit = parseInt(c.req.query('limit') || '10');
        const now = new Date();

        // Get cards that are due (nextReviewDate <= now), sorted by due date
        const dueCards = await Flashcard.find({
            deckId,
            nextReviewDate: { $lte: now }
        })
            .sort({ nextReviewDate: 1 })
            .limit(limit);

        // If not enough due cards, also get some new/low-rep cards
        if (dueCards.length < limit) {
            const remaining = limit - dueCards.length;
            const dueIds = dueCards.map(c => c._id);

            // Get cards with lowest repetitions (hardest/newest)
            const fillCards = await Flashcard.find({
                deckId,
                _id: { $nin: dueIds }
            })
                .sort({ repetitions: 1, easeFactor: 1 })
                .limit(remaining);

            return c.json([...dueCards, ...fillCards]);
        }

        return c.json(dueCards);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Get single flashcard
app.get('/:id', async (c) => {
    try {
        const flashcard = await Flashcard.findById(c.req.param('id'));
        if (!flashcard) {
            return c.json({ error: 'Flashcard not found' }, 404);
        }
        return c.json(flashcard);
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

// Create flashcards (bulk)
app.post('/bulk', async (c) => {
    try {
        const body = await c.req.json<{ flashcards: Partial<IFlashcard>[] }>();
        const flashcards = await Flashcard.insertMany(body.flashcards);
        return c.json(flashcards, 201);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Rate flashcard (with SRS calculation)
app.post('/:id/rate', async (c) => {
    try {
        const body = await c.req.json<{ rating: number }>();
        const flashcard = await Flashcard.findById(c.req.param('id'));

        if (!flashcard) {
            return c.json({ error: 'Flashcard not found' }, 404);
        }

        // Store rating history
        flashcard.ratings.push(body.rating);
        flashcard.lastReviewed = new Date();

        // Calculate new SRS values
        const srs = calculateSRS(
            body.rating,
            flashcard.easeFactor,
            flashcard.interval,
            flashcard.repetitions
        );

        flashcard.easeFactor = srs.easeFactor;
        flashcard.interval = srs.interval;
        flashcard.repetitions = srs.repetitions;
        flashcard.nextReviewDate = srs.nextReviewDate;

        await flashcard.save();

        return c.json(flashcard);
    } catch (error: any) {
        return c.json({ error: error.message }, 400);
    }
});

// Delete flashcard
app.delete('/:id', async (c) => {
    try {
        const flashcard = await Flashcard.findByIdAndDelete(c.req.param('id'));
        if (!flashcard) {
            return c.json({ error: 'Flashcard not found' }, 404);
        }
        return c.json({ message: 'Flashcard deleted successfully' });
    } catch (error: any) {
        return c.json({ error: error.message }, 500);
    }
});

export default app;
