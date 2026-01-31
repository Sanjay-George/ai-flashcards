"""API routes for AI service"""
from fastapi import APIRouter, UploadFile, File, HTTPException
import json

from services.ai_client import AIClient
from services.ocr_service import OCRService
from models import (
    DeckCreateRequest, DeckCreateResponse,
    DeckEditRequest, DeckEditResponse,
    FlashcardGenerateRequest, FlashcardGenerateResponse,
    ProgressUpdateRequest, ProgressUpdateResponse
)

router = APIRouter()

# Initialize services
ai_client = AIClient()
ocr_service = OCRService()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Service"}


@router.post("/ai/create_deck", response_model=DeckCreateResponse)
async def create_deck(request: DeckCreateRequest):
    """Create a flashcard deck from text or extracted text from image."""
    try:
        system_prompt = """You are an AI language-learning assistant that creates flashcard decks.

Input:
- User text or extracted text from an uploaded image.
Task:
1. Identify useful lexemes (words or expressions) from the input.
2. For each lexeme, include:
   - term
   - meaning (in user's learning language)
   - part of speech (POS: noun | verb | adjective | etc.)
3. Suggest:
   - deck title
   - optional tags (e.g., verbs, travel, beginner)
Output JSON:
{
  "title": "...",
  "tags": ["...", "..."],
  "lexemes": [
    {"term": "...", "meaning": "...", "POS": "..."},
    ...
  ]
}

Respond ONLY with valid JSON, no additional text."""

        user_content = f"User message: {request.user_message}\n"
        if request.text:
            user_content += f"\nExtracted text: {request.text}"

        response = await ai_client.generate(system_prompt, user_content)

        # Parse JSON response
        result = json.loads(response)
        return DeckCreateResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/edit_deck", response_model=DeckEditResponse)
async def edit_deck(request: DeckEditRequest):
    """Modify an existing deck based on user instructions."""
    try:
        system_prompt = """You are assisting a user in refining their flashcard deck.

Input:
- Current deck JSON
- User instruction

Task:
- Interpret the instruction to add, edit, or remove lexemes.
- Maintain consistent meanings and POS.
Output JSON:
{
  "action": "add | edit | remove",
  "updated_lexemes": [
    {"term": "...", "meaning": "...", "POS": "..."}
  ]
}

Respond ONLY with valid JSON, no additional text."""

        user_content = f"""Current deck: {json.dumps(request.deck_json)}

User instruction: {request.instruction}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return DeckEditResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/generate_flashcards", response_model=FlashcardGenerateResponse)
async def generate_flashcards(request: FlashcardGenerateRequest):
    """Generate flashcards from a deck."""
    try:
        system_prompt = """You are an AI flashcard generator for language learning.

Input:
- Deck JSON with lexemes
- Selected mode ("simple" or "master")

Task:
1. For each lexeme, create one or more flashcards.
2. Use appropriate question and answer format:
   - Simple mode: direct meaning recall (e.g., "What does 'hablar' mean?" → "to speak")
   - Master mode: contextual usage or fill-in-the-blank (e.g., "Complete: Yo ___ español." → "hablo")
3. Include pattern information when possible.

Output JSON:
{
  "flashcards": [
    {
      "question": "...",
      "answer": "...",
      "pattern": {"name": "...", "pos": "...", "prompt": "..."}
    },
    ...
  ]
}

Respond ONLY with valid JSON, no additional text."""

        user_content = f"""Deck: {json.dumps(request.deck_json)}
Mode: {request.mode}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return FlashcardGenerateResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/update_progress", response_model=ProgressUpdateResponse)
async def update_progress(request: ProgressUpdateRequest):
    """Update learner progress based on flashcard ratings."""
    try:
        system_prompt = """You are tracking language learning progress.

Input:
- User rating data per flashcard (1-5 scale)
- Existing progress metrics

Task:
- Update mastery score for each lexeme (0.0 to 1.0)
- Suggest next focus areas
- Calculate mastery based on: average rating, consistency, recent performance

Output JSON:
{
  "updated_progress": [
    {"term": "...", "mastery": 0.82, "next_step": "review soon | continue practicing | mastered"}
  ]
}

Respond ONLY with valid JSON, no additional text."""

        user_content = f"""Progress data: {json.dumps([p.dict() for p in request.progress_data])}
Deck context: {json.dumps(request.deck_json)}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return ProgressUpdateResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/extract_text")
async def extract_text_from_image(file: UploadFile = File(...)):
    """Extract text from an uploaded image using OCR."""
    try:
        contents = await file.read()
        text = await ocr_service.extract_text(contents)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
