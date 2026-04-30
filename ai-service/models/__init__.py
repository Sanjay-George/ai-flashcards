"""Pydantic models for AI service requests and responses"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any


class Lexeme(BaseModel):
    term: str
    meaning: str
    POS: str
    mastery: Optional[float] = 0.0


class DeckContext(BaseModel):
    creation_prompt: Optional[str] = None
    extracted_text: Optional[str] = None
    edit_history: Optional[List[str]] = None


class DeckCreateRequest(BaseModel):
    text: Optional[str] = None
    user_message: str


class DeckCreateResponse(BaseModel):
    title: str
    tags: List[str]
    language: Optional[str] = None  # Language code (e.g., 'de', 'es', 'fr')
    lexemes: List[Lexeme]


class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str


class DeckEditRequest(BaseModel):
    deck_json: Dict[str, Any]
    instruction: str
    message_history: Optional[List[ChatMessage]] = None
    deck_context: Optional["DeckContext"] = None


class EditLexeme(Lexeme):
    # For edit actions, this identifies which existing term should be replaced.
    replace_term: Optional[str] = None


class DeckEditResponse(BaseModel):
    action: str
    updated_lexemes: List[EditLexeme]


class Pattern(BaseModel):
    name: str
    pos: str
    prompt: str


class FlashcardItem(BaseModel):
    question: str
    answer: str
    pattern: Optional[Pattern] = None


class FlashcardGenerateRequest(BaseModel):
    deck_json: Dict[str, Any]
    mode: str = "simple"
    deck_context: Optional["DeckContext"] = None


class FlashcardGenerateResponse(BaseModel):
    flashcards: List[FlashcardItem]


class ProgressData(BaseModel):
    term: str
    ratings: List[int]


class ProgressUpdateRequest(BaseModel):
    progress_data: List[ProgressData]
    deck_json: Dict[str, Any]


class ProgressItem(BaseModel):
    term: str
    mastery: float
    next_step: str


class ProgressUpdateResponse(BaseModel):
    updated_progress: List[ProgressItem]


class ChatRequest(BaseModel):
    user_message: str
    question: str
    answer: str
    lexeme: Optional[Lexeme] = None
    pattern: Optional[Pattern] = None
    message_history: Optional[List[ChatMessage]] = None


class ChatResponse(BaseModel):
    response: str


# ========== Conversation Practice Models ==========

class ConversationMessage(BaseModel):
    role: str  # 'ai' or 'user'
    content: str
    translation: Optional[str] = None


class ConversationStartRequest(BaseModel):
    language: str  # ISO 639-1 code (e.g., 'de', 'es', 'fr')
    difficulty: str  # 'easy', 'medium', 'hard'
    topic: str  # e.g., 'restaurant', 'travel', 'shopping'


class ConversationStartResponse(BaseModel):
    context: str
    ai_message: str
    ai_message_translation: str


class ConversationNextRequest(BaseModel):
    language: str
    difficulty: str
    topic: str
    context: str
    conversation_history: List[ConversationMessage]
    user_message: str


class ConversationNextResponse(BaseModel):
    ai_message: str
    ai_message_translation: str
    should_end: bool = False
    hint: Optional[str] = None


class FeedbackPoint(BaseModel):
    category: str  # 'grammar', 'vocabulary', 'fluency'
    original: str
    corrected: str
    explanation: str


class MessageFeedback(BaseModel):
    transcript_message_index: int  # Index in full transcript array
    category: str  # 'grammar', 'vocabulary', 'fluency'
    original: str
    corrected: str
    explanation: str


class ConversationFeedbackRequest(BaseModel):
    language: str
    difficulty: str
    topic: str
    transcript: List[ConversationMessage]


class ConversationFeedbackResponse(BaseModel):
    overall_rating: int  # 1-5
    feedback_points: List[FeedbackPoint]
    message_feedback: List[MessageFeedback] = Field(default_factory=list)
    summary: str


class ConversationExtractVocabRequest(BaseModel):
    language: str
    difficulty: str
    topic: str
    transcript: List[ConversationMessage]


class ExtractedLexeme(BaseModel):
    term: str
    definition: str
    example_sentence: str = ""
    notes: str = ""


class ConversationExtractVocabResponse(BaseModel):
    title: str
    tags: List[str]
    lexemes: List[ExtractedLexeme]
