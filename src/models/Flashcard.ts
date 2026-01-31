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
    createdAt: { type: Date, default: Date.now }
});

export const Flashcard = mongoose.model<IFlashcard>('Flashcard', FlashcardSchema);
