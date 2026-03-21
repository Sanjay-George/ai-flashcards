// Shared type definitions for the frontend

export interface Lexeme {
    term: string;
    meaning: string;
    POS: string;
    // Spaced Repetition fields
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: string;
    lastReviewed?: string;
}

export interface Deck {
    _id: string;
    title: string;
    tags: string[];
    language?: string;  // Language being learned (e.g., 'de', 'es', 'fr')
    userId: string;     // Firebase user ID (owner)
    isPublic: boolean;  // Whether deck is publicly visible
    lexemes: Lexeme[];
    createdAt: string;
    updatedAt: string;
}

export interface Pattern {
    name: string;
    pos: string;
    prompt: string;
}

export interface Flashcard {
    _id: string;
    deckId: string;
    lexemeId: string;
    question: string;
    answer: string;
    pattern?: Pattern;
    mode: 'simple' | 'master';
    ratings: number[];
    lastReviewed?: string;
    createdAt?: string;
    // Session-only field (not stored in DB)
    lexeme?: Lexeme;
}

// AI Service Request/Response Types
export interface CreateDeckRequest {
    text?: string;
    user_message: string;
}

export interface CreateDeckResponse {
    title: string;
    tags: string[];
    language?: string;  // Detected language code (e.g., 'de', 'es', 'fr')
    lexemes: Lexeme[];
}

export interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

export interface EditDeckRequest {
    deck_json: {
        title: string;
        tags: string[];
        lexemes: Lexeme[];
    };
    instruction: string;
    message_history?: ChatMessage[];
}

export interface EditDeckResponse {
    action: 'add' | 'edit' | 'remove';
    updated_lexemes: Lexeme[];
}

export interface GenerateFlashcardsRequest {
    deck_json: {
        title: string;
        lexemes: Lexeme[];
    };
    mode: 'simple' | 'master';
}

export interface FlashcardItem {
    question: string;
    answer: string;
    pattern?: Pattern;
}

export interface GenerateFlashcardsResponse {
    flashcards: FlashcardItem[];
}

export interface ProgressData {
    term: string;
    ratings: number[];
}

export interface ProgressItem {
    term: string;
    mastery: number;
    next_step: string;
}

export interface UpdateProgressRequest {
    progress_data: ProgressData[];
    deck_json: {
        title: string;
        lexemes: Lexeme[];
    };
}

export interface UpdateProgressResponse {
    updated_progress: ProgressItem[];
}

// API Response Types
export interface APIError {
    error: string;
}

export interface APISuccess {
    message: string;
}

// Store State Types
export interface DeckStoreState {
    decks: Deck[];
    currentDeck: Deck | null;
    loading: boolean;
    error: string | null;
}

export interface FlashcardStoreState {
    flashcards: Flashcard[];
    loading: boolean;
    error: string | null;
}

// Progress & Gamification Types
export interface Milestone {
    level: number;
    title: string;
    xpRequired: number;
    emoji: string;
    description: string;
}

export interface SessionRecord {
    deckId: string;
    deckTitle: string;
    cardsStudied: number;
    avgRating: number;
    xpEarned: number;
    completedAt: string;
}

export interface MasteryBreakdown {
    new: number;
    learning: number;
    familiar: number;
    proficient: number;
    mastered: number;
}

export interface UserProgressProfile {
    totalXP: number;
    level: number;
    currentMilestone: Milestone;
    nextMilestone: Milestone | null;
    xpToNextLevel: number;
    totalSessionsCompleted: number;
    totalCardsStudied: number;
    currentStreak: number;
    longestStreak: number;
    recentSessions: SessionRecord[];
    milestones: Milestone[];
}

export interface DeckMastery {
    deckId: string;
    masteryPercent: number;
    masteryBreakdown: MasteryBreakdown;
    totalLexemes: number;
}

export interface SessionCompleteResponse {
    xpEarned: number;
    totalXP: number;
    level: number;
    currentMilestone: Milestone;
    nextMilestone: Milestone | null;
    xpToNextLevel: number;
    leveledUp: boolean;
    currentStreak: number;
    longestStreak: number;
}

// ========== Conversation Practice Types ==========

export type ConversationDifficulty = 'easy' | 'medium' | 'hard';

export type ConversationTopic =
    | 'restaurant'
    | 'travel'
    | 'shopping'
    | 'job_interview'
    | 'hotel'
    | 'directions'
    | 'doctor'
    | 'phone_call'
    | 'small_talk'
    | 'airport';

export interface ConversationMessage {
    role: 'ai' | 'user';
    content: string;
    translation?: string;
    timestamp?: string;
}

export interface ConversationStartRequest {
    language: string;
    difficulty: ConversationDifficulty;
    topic: ConversationTopic | string;
}

export interface ConversationStartResponse {
    context: string;
    ai_message: string;
    ai_message_translation: string;
}

export interface ConversationNextRequest {
    language: string;
    difficulty: ConversationDifficulty;
    topic: ConversationTopic | string;
    context: string;
    conversation_history: ConversationMessage[];
    user_message: string;
}

export interface ConversationNextResponse {
    ai_message: string;
    ai_message_translation: string;
    should_end: boolean;
    hint?: string | null;
}

export interface FeedbackPoint {
    category: 'grammar' | 'vocabulary' | 'fluency';
    original: string;
    corrected: string;
    explanation: string;
}

export interface MessageFeedback {
    transcript_message_index: number;
    category: 'grammar' | 'vocabulary' | 'fluency';
    original: string;
    corrected: string;
    explanation: string;
}

export interface ConversationFeedbackRequest {
    language: string;
    difficulty: ConversationDifficulty;
    topic: ConversationTopic | string;
    transcript: ConversationMessage[];
}

export interface ConversationFeedbackResponse {
    overall_rating: number;
    feedback_points: FeedbackPoint[];
    message_feedback?: MessageFeedback[];
    summary: string;
}

export interface ConversationSession {
    _id: string;
    userId: string;
    language: string;
    difficulty: ConversationDifficulty;
    topic: string;
    context: string;
    messages: ConversationMessage[];
    feedback?: ConversationFeedbackResponse;
    status: 'active' | 'completed';
    createdAt: string;
    updatedAt: string;
}

export interface ConversationTopicOption {
    id: ConversationTopic;
    label: string;
    emoji: string;
    description: string;
}
