import mongoose, { Schema, Document } from 'mongoose';

export interface IPattern {
    name: string;
    pos: string;
    prompt: string;
}

export interface IFlashcard extends Document {
    deckId: mongoose.Types.ObjectId;
    lexemeId: string;
    question: string;
    answer: string;
    pattern?: IPattern;
    mode: 'simple' | 'master';
    ratings: number[];
    lastReviewed?: Date;
    createdAt: Date;
    // Spaced Repetition fields (SM-2 algorithm)
    easeFactor: number;      // Easiness factor (starts at 2.5)
    interval: number;        // Days until next review
    repetitions: number;     // Number of consecutive correct answers
    nextReviewDate: Date;    // When the card is due for review
}

const PatternSchema = new Schema<IPattern>({
    name: { type: String, required: true },
    pos: { type: String, required: true },
    prompt: { type: String, required: true }
});

const FlashcardSchema = new Schema<IFlashcard>({
    deckId: { type: Schema.Types.ObjectId, ref: 'Deck', required: true },
    lexemeId: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, required: true },
    pattern: PatternSchema,
    mode: { type: String, enum: ['simple', 'master'], required: true },
    ratings: [{ type: Number }],
    lastReviewed: { type: Date },
    createdAt: { type: Date, default: Date.now },
    // SRS fields with defaults
    easeFactor: { type: Number, default: 2.5 },
    interval: { type: Number, default: 0 },
    repetitions: { type: Number, default: 0 },
    nextReviewDate: { type: Date, default: Date.now }
});

export const Flashcard = mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
