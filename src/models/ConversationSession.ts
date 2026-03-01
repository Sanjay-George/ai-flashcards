import mongoose, { Schema, Document } from 'mongoose';

export interface IConversationMessage {
    role: 'ai' | 'user';
    content: string;
    translation?: string;
    timestamp: Date;
}

export interface IFeedbackPoint {
    category: 'grammar' | 'vocabulary' | 'fluency';
    original: string;
    corrected: string;
    explanation: string;
}

export interface IConversationFeedback {
    overall_rating: number;  // 1-5
    feedback_points: IFeedbackPoint[];
    summary: string;
}

export interface IConversationSession extends Document {
    userId: string;          // Firebase user ID
    language: string;        // ISO 639-1 code
    difficulty: 'easy' | 'medium' | 'hard';
    topic: string;
    context: string;         // Situation setup description
    messages: IConversationMessage[];
    feedback?: IConversationFeedback;
    status: 'active' | 'completed';
    createdAt: Date;
    updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>({
    role: { type: String, enum: ['ai', 'user'], required: true },
    content: { type: String, required: true },
    translation: { type: String },
    timestamp: { type: Date, default: Date.now }
});

const FeedbackPointSchema = new Schema<IFeedbackPoint>({
    category: { type: String, enum: ['grammar', 'vocabulary', 'fluency'], required: true },
    original: { type: String, required: true },
    corrected: { type: String, required: true },
    explanation: { type: String, required: true }
});

const ConversationFeedbackSchema = new Schema<IConversationFeedback>({
    overall_rating: { type: Number, required: true, min: 1, max: 5 },
    feedback_points: [FeedbackPointSchema],
    summary: { type: String, required: true }
});

const ConversationSessionSchema = new Schema<IConversationSession>({
    userId: { type: String, required: true, index: true },
    language: { type: String, required: true },
    difficulty: { type: String, enum: ['easy', 'medium', 'hard'], required: true },
    topic: { type: String, required: true },
    context: { type: String, required: true },
    messages: [ConversationMessageSchema],
    feedback: ConversationFeedbackSchema,
    status: { type: String, enum: ['active', 'completed'], default: 'active' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

ConversationSessionSchema.pre<IConversationSession>('save', function () {
    this.updatedAt = new Date();
});

export const ConversationSession = mongoose.model<IConversationSession>(
    'ConversationSession',
    ConversationSessionSchema
);
