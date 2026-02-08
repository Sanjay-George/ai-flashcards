import mongoose, { Schema, Document } from 'mongoose';

export interface ISessionRecord {
    deckId: string;
    deckTitle: string;
    cardsStudied: number;
    avgRating: number;    // Average rating across the session (1-5)
    xpEarned: number;
    completedAt: Date;
}

export interface IUserProgress extends Document {
    userId: string;          // Firebase user ID
    totalXP: number;
    level: number;
    totalSessionsCompleted: number;
    totalCardsStudied: number;
    currentStreak: number;   // Consecutive days studied
    longestStreak: number;
    lastStudiedDate: Date | null;
    sessionHistory: ISessionRecord[];  // Recent sessions (capped)
    createdAt: Date;
    updatedAt: Date;
}

const SessionRecordSchema = new Schema<ISessionRecord>({
    deckId: { type: String, required: true },
    deckTitle: { type: String, required: true },
    cardsStudied: { type: Number, required: true },
    avgRating: { type: Number, required: true },
    xpEarned: { type: Number, required: true },
    completedAt: { type: Date, default: Date.now }
});

const UserProgressSchema = new Schema<IUserProgress>({
    userId: { type: String, required: true, unique: true, index: true },
    totalXP: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    totalSessionsCompleted: { type: Number, default: 0 },
    totalCardsStudied: { type: Number, default: 0 },
    currentStreak: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    lastStudiedDate: { type: Date, default: null },
    sessionHistory: { type: [SessionRecordSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

UserProgressSchema.pre('save', function (next) {
    this.updatedAt = new Date();
    next();
});

export const UserProgress = mongoose.model<IUserProgress>('UserProgress', UserProgressSchema);
