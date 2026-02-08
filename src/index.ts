import { Hono } from 'hono';
import { cors } from 'hono/cors';
import mongoose from 'mongoose';
import deckRoutes from './routes/decks';
import flashcardRoutes from './routes/flashcards';
import progressRoutes from './routes/progress';

const app = new Hono();

// Middleware
app.use('/*', cors());

// MongoDB connection
const MONGODB_URI = `mongodb://${encodeURIComponent(process.env.MONGO_USER as string)}:${encodeURIComponent(process.env.MONGO_PASSWORD as string)}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${encodeURIComponent(process.env.MONGO_DB as string)}?authSource=admin` || 'mongodb://localhost:27017/flashcards_ai';

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
});

// Routes - AI routes removed, frontend calls AI service directly
app.route('/api/decks', deckRoutes);
app.route('/api/flashcards', flashcardRoutes);
app.route('/api/progress', progressRoutes);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

const PORT = process.env.PORT || 9051;

const port = Number(PORT);
if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${PORT}`);
}

(globalThis as any).Bun.serve({
    fetch: app.fetch,
    port
});

console.log(`🚀 Server running on http://localhost:${port}`);
