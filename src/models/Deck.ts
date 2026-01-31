import mongoose, { Schema, Document } from 'mongoose';

export interface ILexeme {
    term: string;
    meaning: string;
    POS: string;
    mastery?: number;
}

export interface IDeck extends Document {
    title: string;
    tags: string[];
    lexemes: ILexeme[];
    createdAt: Date;
    updatedAt: Date;
}

const LexemeSchema = new Schema<ILexeme>({
    term: { type: String, required: true },
    meaning: { type: String, required: true },
    POS: { type: String, required: true },
    mastery: { type: Number, default: 0 }
});

const DeckSchema = new Schema<IDeck>({
    title: { type: String, required: true },
    tags: [{ type: String }],
    lexemes: [LexemeSchema],
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

DeckSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const Deck = mongoose.model<IDeck>('Deck', DeckSchema);
