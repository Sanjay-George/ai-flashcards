import mongoose, { Schema, Document } from 'mongoose';

export interface ILexeme {
    term: string;
    meaning: string;
    POS: string;
    // Spaced Repetition fields (per lexeme)
    easeFactor: number;      // Easiness factor (starts at 2.5)
    interval: number;        // Days until next review
    repetitions: number;     // Number of consecutive correct answers
    nextReviewDate: Date;    // When the lexeme is due for review
    lastReviewed?: Date;
}

export interface IDeck extends Document {
    title: string;
    tags: string[];
    language?: string;  // Language being learned (e.g., 'de', 'es', 'fr')
    userId: string;     // Firebase user ID (owner)
    isPublic: boolean;  // Whether deck is publicly visible
    lexemes: ILexeme[];
    createdAt: Date;
    updatedAt: Date;
}

const LexemeSchema = new Schema<ILexeme>({
    term: { type: String, required: true },
    meaning: { type: String, required: true },
    POS: { type: String, required: true },
    // SRS fields with defaults
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now },
    lastReviewed: { type: Date }
});

const DeckSchema = new Schema<IDeck>({
    title: { type: String, required: true },
    tags: [{ type: String }],
    language: { type: String },  // Optional language code
    userId: { type: String, required: true, index: true },  // Firebase user ID
    isPublic: { type: Boolean, default: false },  // Private by default
    lexemes: [LexemeSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

DeckSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const Deck = mongoose.model<IDeck>('Deck', DeckSchema);
