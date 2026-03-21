"""Router modules for AI endpoints."""
from .conversation import router as conversation_router
from .deck import router as deck_router
from .flashcards import router as flashcards_router
from .health import router as health_router
from .ocr_chat import router as ocr_chat_router
from .progress import router as progress_router

__all__ = [
    "conversation_router",
    "deck_router",
    "flashcards_router",
    "health_router",
    "ocr_chat_router",
    "progress_router",
]
