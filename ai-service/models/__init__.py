"""Pydantic models for AI service requests and responses"""
from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class Lexeme(BaseModel):
    term: str
    meaning: str
    POS: str
    mastery: Optional[float] = 0.0


class DeckCreateRequest(BaseModel):
    text: Optional[str] = None
    user_message: str


class DeckCreateResponse(BaseModel):
    title: str
    tags: List[str]
    language: Optional[str] = None  # Language code (e.g., 'de', 'es', 'fr')
    lexemes: List[Lexeme]


class DeckEditRequest(BaseModel):
    deck_json: Dict[str, Any]
    instruction: str


class DeckEditResponse(BaseModel):
    action: str
    updated_lexemes: List[Lexeme]


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


class ChatResponse(BaseModel):
    response: str
