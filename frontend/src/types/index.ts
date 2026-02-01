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

export interface EditDeckRequest {
    deck_json: {
        title: string;
        tags: string[];
        lexemes: Lexeme[];
    };
    instruction: string;
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
