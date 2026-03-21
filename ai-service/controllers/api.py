"""API router aggregator."""
from fastapi import APIRouter

from controllers.routers import (
    conversation_router,
    deck_router,
    flashcards_router,
    health_router,
    ocr_chat_router,
    progress_router,
)

router = APIRouter()
router.include_router(health_router)
router.include_router(deck_router)
router.include_router(flashcards_router)
router.include_router(progress_router)
router.include_router(ocr_chat_router)
router.include_router(conversation_router)
