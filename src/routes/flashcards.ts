import { Router } from 'express';
import type { Request, Response } from 'express';
import { Flashcard } from '../models/Flashcard.js';
import type { IFlashcard } from '../types/index.js';

const router = Router();

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
router.get('/deck/:deckId', async (req: Request, res: Response) => {
    try {
        const flashcards = await Flashcard.find({ deckId: req.params.deckId });
        res.json(flashcards);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get flashcards due for review (spaced repetition)
router.get('/deck/:deckId/due', async (req: Request, res: Response) => {
    try {
        const deckId = req.params.deckId;
        const limit = parseInt(req.query.limit as string || '10');
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

            res.json([...dueCards, ...fillCards]);
            return;
        }

        res.json(dueCards);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Get single flashcard
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const flashcard = await Flashcard.findById(req.params.id);
        if (!flashcard) {
            res.status(404).json({ error: 'Flashcard not found' });
            return;
        }
        res.json(flashcard);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Create flashcards (bulk)
router.post('/bulk', async (req: Request, res: Response) => {
    try {
        const body = req.body as { flashcards: Partial<IFlashcard>[] };
        const flashcards = await Flashcard.insertMany(body.flashcards);
        res.status(201).json(flashcards);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Rate flashcard (with SRS calculation)
router.post('/:id/rate', async (req: Request, res: Response) => {
    try {
        const body = req.body as { rating: number };
        const flashcard = await Flashcard.findById(req.params.id);

        if (!flashcard) {
            res.status(404).json({ error: 'Flashcard not found' });
            return;
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

        res.json(flashcard);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Delete flashcard
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const flashcard = await Flashcard.findByIdAndDelete(req.params.id);
        if (!flashcard) {
            res.status(404).json({ error: 'Flashcard not found' });
            return;
        }
        res.json({ message: 'Flashcard deleted successfully' });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
