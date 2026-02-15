"""API routes for AI service"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import json

from services.ai_client import AIClient
from services.ocr_service import OCRService
from middleware.auth import verify_firebase_token
from models import (
    Lexeme,
    DeckCreateRequest, DeckCreateResponse,
    DeckEditRequest, DeckEditResponse,
    FlashcardGenerateRequest, FlashcardGenerateResponse,
    ProgressUpdateRequest, ProgressUpdateResponse,
    ChatRequest, ChatResponse
)

from prompts.deck import CREATE_DECK_PROMPT, EDIT_DECK_PROMPT
from prompts.flashcards import GENERATE_FLASHCARDS_PROMPT
from typing import Set, Tuple, List

router = APIRouter()

# Initialize services
ai_client = AIClient()
ocr_service = OCRService()


def _deduplicate_lexemes(
    lexemes: List[Lexeme],
    existing_terms: Set[str] | None = None
) -> Tuple[List[Lexeme], int]:
    """Remove duplicate lexemes (case-insensitive, whitespace-normalized).

    Args:
        lexemes: List of lexemes to deduplicate.
        existing_terms: Optional set of already-known terms to also exclude.

    Returns:
        Tuple of (unique lexemes, number of duplicates removed).
    """
    seen: Set[str] = set()
    if existing_terms:
        seen = {t.strip().lower() for t in existing_terms}

    unique: List[Lexeme] = []
    for lexeme in lexemes:
        normalized = lexeme.term.strip().lower()
        if normalized not in seen:
            lexeme.term = lexeme.term.strip()
            unique.append(lexeme)
            seen.add(normalized)

    return unique, len(lexemes) - len(unique)


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Service"}


@router.post("/ai/create_deck", response_model=DeckCreateResponse)
async def create_deck(request: DeckCreateRequest, user=Depends(verify_firebase_token)):
    """Create a flashcard deck from text or extracted text from image."""
    try:
        system_prompt = CREATE_DECK_PROMPT

        user_content = f"User message: {request.user_message}\n"
        if request.text:
            user_content += f"\nExtracted text: {request.text}"

        response = await ai_client.generate(system_prompt, user_content)

        result = json.loads(response)
        deck = DeckCreateResponse(**result)

        # Deduplicate lexemes (case-insensitive, whitespace-normalized)
        deck.lexemes, removed_count = _deduplicate_lexemes(deck.lexemes)

        if removed_count > 0:
            print(
                f"Removed {removed_count} duplicate lexeme(s) from AI response")

        original_count = len(deck.lexemes) + removed_count

        # If duplicates caused a shortfall, ask AI to fill the gap (one retry)
        if removed_count > 0 and len(deck.lexemes) < original_count:
            shortfall = original_count - len(deck.lexemes)
            existing_terms = [lex.term for lex in deck.lexemes]
            fill_prompt = (
                f"You previously generated a deck with these terms: {json.dumps(existing_terms)}\n"
                f"Some were duplicates and were removed. Generate exactly {shortfall} NEW, UNIQUE additional "
                f"lexemes for the same topic. Do NOT repeat any of the existing terms above.\n"
                f"Original request: {request.user_message}\n"
                f"Return JSON with ONLY a \"lexemes\" array, same format as before."
            )

            try:
                fill_response = await ai_client.generate(system_prompt, fill_prompt)
                fill_result = json.loads(fill_response)
                fill_lexemes = [Lexeme(**lex)
                                for lex in fill_result.get("lexemes", [])]

                # Deduplicate the fill results against existing terms
                fill_lexemes, _ = _deduplicate_lexemes(fill_lexemes, existing_terms={
                                                       lex.term for lex in deck.lexemes})
                deck.lexemes.extend(fill_lexemes)
                print(
                    f"Filled {len(fill_lexemes)} replacement lexeme(s) after dedup")
            except Exception as fill_err:
                print(f"Warning: failed to fill dedup shortfall: {fill_err}")
                # Continue with what we have — partial deck is better than failure

        print(
            f"Final lexemes ({len(deck.lexemes)}): {[lex.term for lex in deck.lexemes]}")

        return deck

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/edit_deck", response_model=DeckEditResponse)
async def edit_deck(request: DeckEditRequest, user=Depends(verify_firebase_token)):
    """Modify an existing deck based on user instructions."""
    try:
        system_prompt = EDIT_DECK_PROMPT

        print(f"Editing deck with instruction: {request.instruction}")

        # TODO: Improve the prompt engineering here. Too much data is passed with deck_Json.
        #       Only pass terms-meanings and user conversation history.
        # Build user content with message history context
        user_content = f"""Current deck: {json.dumps(request.deck_json)} """

        # Add conversation history if provided
        if request.message_history and len(request.message_history) > 0:
            user_content += "Previous conversation:\n"
            for msg in request.message_history:
                user_content += f"{msg.role}: {msg.content}\n"
            user_content += "\n"

        user_content += f"User instruction: {request.instruction}"

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        deck = DeckEditResponse(**result)

        # Remove duplicates from updated lexemes (case-insensitive)
        # Also check original deck for existing terms to avoid adding duplicates when editing
        existing_terms = {lexeme['term']
                          for lexeme in request.deck_json.get('lexemes', [])}
        deck.updated_lexemes, removed_count = _deduplicate_lexemes(
            deck.updated_lexemes, existing_terms=existing_terms
        )

        if removed_count > 0:
            print(
                f"Removed {removed_count} duplicate lexeme(s) from edit response")

        return deck

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/generate_flashcards", response_model=FlashcardGenerateResponse)
async def generate_flashcards(request: FlashcardGenerateRequest, user=Depends(verify_firebase_token)):
    """Generate flashcards from a deck."""
    try:
        system_prompt = GENERATE_FLASHCARDS_PROMPT

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
async def update_progress(request: ProgressUpdateRequest, user=Depends(verify_firebase_token)):
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
    {"term": "...", "mastery": 0.82,
        "next_step": "review soon | continue practicing | mastered"}
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
async def extract_text_from_image(file: UploadFile = File(...), user=Depends(verify_firebase_token)):
    """Extract text from an uploaded image using OCR."""
    try:
        contents = await file.read()
        text = await ocr_service.extract_text(contents)
        return {"text": text}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/chat", response_model=ChatResponse)
async def chat_about_flashcard(request: ChatRequest, user=Depends(verify_firebase_token)):
    """Answer user questions about a flashcard."""
    try:
        system_prompt = """You are a helpful language tutor. Answer the user's question about a flashcard.

    Use the provided flashcard context to give a concise, helpful response. If the user asks for examples,
    provide 1-3 short examples. If the pattern indicates grammar (e.g., conjugation, article), explain briefly.
    Respond in plain text.
    """

        context = {
            "question": request.question,
            "answer": request.answer,
            "lexeme": request.lexeme.dict() if request.lexeme else None,
            "pattern": request.pattern.dict() if request.pattern else None
        }

        user_content = f"Context: {json.dumps(context)}"

        # Add conversation history if provided
        if request.message_history and len(request.message_history) > 0:
            user_content += "\n\nPrevious conversation:\n"
            for msg in request.message_history:
                user_content += f"{msg.role}: {msg.content}\n"
            user_content += "\n"

        user_content += f"User question: {request.user_message}"

        response = await ai_client.generate(system_prompt, user_content, use_json_format=False)
        return ChatResponse(response=response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
