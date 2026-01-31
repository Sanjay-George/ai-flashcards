import { Hono } from 'hono';
import { Deck } from '../models/Deck';
import type { IDeck, APIError, APISuccessMessage } from '../types/index';

const app = new Hono();

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

export default app;
