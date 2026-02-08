import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import deckRoutes from './routes/decks.js';
import flashcardRoutes from './routes/flashcards.js';
import progressRoutes from './routes/progress.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const MONGODB_URI = `mongodb://${encodeURIComponent(process.env.MONGO_USER as string)}:${encodeURIComponent(process.env.MONGO_PASSWORD as string)}@${process.env.MONGO_HOST}:${process.env.MONGO_PORT}/${encodeURIComponent(process.env.MONGO_DB as string)}?authSource=admin` || 'mongodb://localhost:27017/flashcards_ai';

mongoose.connect(MONGODB_URI).then(() => {
    console.log('✅ Connected to MongoDB');
}).catch((err) => {
    console.error('❌ MongoDB connection error:', err);
});

// Routes - AI routes removed, frontend calls AI service directly
app.use('/api/decks', deckRoutes);
app.use('/api/flashcards', flashcardRoutes);
app.use('/api/progress', progressRoutes);

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 9051;

const port = Number(PORT);
if (Number.isNaN(port)) {
    throw new Error(`Invalid PORT value: ${PORT}`);
}

app.listen(port, () => {
    console.log(`🚀 Server running on http://localhost:${port}`);
});

// handle unhandled promise rejections
process.on('unhandledRejection', (err: any) => {
    console.error('Unhandled Rejection', err);
    process.exit(1);
});

// handle uncaught exceptions
process.on('uncaughtException', (err: any) => {
    console.error('Uncaught Exception', err);
    process.exit(1);
});