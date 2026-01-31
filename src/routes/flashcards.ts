import { Hono } from 'hono';
import { Flashcard } from '../models/Flashcard';
import type { IFlashcard, APIError, APISuccessMessage } from '../types/index';

const app = new Hono();

// Get flashcards for a deck
app.get('/deck/:deckId', async (c) => {
    try {
        const flashcards = await Flashcard.find({ deckId: c.req.param('deckId') });
        return c.json(flashcards);
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

// Rate flashcard
app.post('/:id/rate', async (c) => {
    try {
        const body = await c.req.json<{ rating: number }>();
        const flashcard = await Flashcard.findById(c.req.param('id'));

        if (!flashcard) {
            return c.json({ error: 'Flashcard not found' }, 404);
        }

        flashcard.ratings.push(body.rating);
        flashcard.lastReviewed = new Date();
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
