// Shared type definitions for the backend

export interface ILexeme {
    term: string;
    meaning: string;
    POS: string;
    // Spaced Repetition fields
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: Date;
    lastReviewed?: Date;
}

export interface IDeck {
    _id?: string;
    title: string;
    tags: string[];
    language?: string;  // Language being learned (e.g., 'de', 'es', 'fr')
    userId: string;     // Firebase user ID (owner)
    isPublic: boolean;  // Whether deck is publicly visible
    lexemes: ILexeme[];
    createdAt?: Date;
    updatedAt?: Date;
}

export interface IPattern {
    name: string;
    pos: string;
    prompt: string;
}

export interface IFlashcard {
    _id?: string;
    deckId: string;
    lexemeId: string;
    question: string;
    answer: string;
    pattern?: IPattern;
    mode: 'simple' | 'master';
    ratings: number[];
    lastReviewed?: Date;
    createdAt?: Date;
    // Spaced Repetition fields
    easeFactor?: number;
    interval?: number;
    repetitions?: number;
    nextReviewDate?: Date;
}

// AI Service Request/Response Types
export interface AICreateDeckRequest {
    text?: string;
    user_message: string;
}

export interface AICreateDeckResponse {
    title: string;
    tags: string[];
    lexemes: ILexeme[];
}

export interface AIEditDeckRequest {
    deck_json: {
        title: string;
        tags: string[];
        lexemes: ILexeme[];
    };
    instruction: string;
}

export interface AIEditDeckResponse {
    action: 'add' | 'edit' | 'remove';
    updated_lexemes: ILexeme[];
}

export interface AIGenerateFlashcardsRequest {
    deck_json: {
        title: string;
        lexemes: ILexeme[];
    };
    mode: 'simple' | 'master';
}

export interface AIFlashcardItem {
    question: string;
    answer: string;
    pattern?: IPattern;
}

export interface AIGenerateFlashcardsResponse {
    flashcards: AIFlashcardItem[];
}

export interface AIProgressData {
    term: string;
    ratings: number[];
}

export interface AIProgressItem {
    term: string;
    mastery: number;
    next_step: string;
}

export interface AIUpdateProgressRequest {
    progress_data: AIProgressData[];
    deck_json: {
        title: string;
        lexemes: ILexeme[];
    };
}

export interface AIUpdateProgressResponse {
    updated_progress: AIProgressItem[];
}

// API Error Response
export interface APIError {
    error: string;
    statusCode?: number;
}

// API Success Response
export interface APISuccessMessage {
    message: string;
}
