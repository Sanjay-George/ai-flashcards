"""Deck creation and editing routes."""
import json
from typing import List, Set, Tuple

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_firebase_token
from models import (
    DeckCreateRequest,
    DeckCreateResponse,
    DeckEditRequest,
    DeckEditResponse,
    Lexeme,
)
from prompts.deck import CREATE_DECK_PROMPT, EDIT_DECK_PROMPT
from services.ai_client import AIClient

router = APIRouter()
ai_client = AIClient()


def _deduplicate_lexemes(
    lexemes: List[Lexeme],
    existing_terms: Set[str] | None = None,
) -> Tuple[List[Lexeme], int]:
    """Remove duplicate lexemes (case-insensitive, whitespace-normalized)."""
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

        deck.lexemes, removed_count = _deduplicate_lexemes(deck.lexemes)

        if removed_count > 0:
            print(
                f"Removed {removed_count} duplicate lexeme(s) from AI response")

        original_count = len(deck.lexemes) + removed_count

        if removed_count > 0 and len(deck.lexemes) < original_count:
            shortfall = original_count - len(deck.lexemes)
            existing_terms = [lex.term for lex in deck.lexemes]
            fill_prompt = (
                f"You previously generated a deck with these terms: {json.dumps(existing_terms)}\\n"
                f"Some were duplicates and were removed. Generate exactly {shortfall} NEW, UNIQUE additional "
                f"lexemes for the same topic. Do NOT repeat any of the existing terms above.\\n"
                f"Original request: {request.user_message}\\n"
                f"Return JSON with ONLY a \"lexemes\" array, same format as before."
            )

            try:
                fill_response = await ai_client.generate(system_prompt, fill_prompt)
                fill_result = json.loads(fill_response)
                fill_lexemes = [Lexeme(**lex)
                                for lex in fill_result.get("lexemes", [])]

                fill_lexemes, _ = _deduplicate_lexemes(
                    fill_lexemes, existing_terms={
                        lex.term for lex in deck.lexemes}
                )
                deck.lexemes.extend(fill_lexemes)
                print(
                    f"Filled {len(fill_lexemes)} replacement lexeme(s) after dedup")
            except Exception as fill_err:
                print(f"Warning: failed to fill dedup shortfall: {fill_err}")

        print(
            f"Final lexemes ({len(deck.lexemes)}): {[lex.term for lex in deck.lexemes]}")

        return deck

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/edit_deck", response_model=DeckEditResponse)
async def edit_deck(request: DeckEditRequest, user=Depends(verify_firebase_token)):
    """Modify an existing deck based on user instructions."""
    try:
        system_prompt = EDIT_DECK_PROMPT

        print(f"Editing deck with instruction: {request.instruction}")

        user_content = f"""Current deck: {json.dumps(request.deck_json)} """

        if request.message_history and len(request.message_history) > 0:
            user_content += "Previous conversation:\n"
            for msg in request.message_history:
                user_content += f"{msg.role}: {msg.content}\n"
            user_content += "\n"

        user_content += f"User instruction: {request.instruction}"

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        deck = DeckEditResponse(**result)

        existing_terms = {lexeme["term"]
                          for lexeme in request.deck_json.get("lexemes", [])}
        deck.updated_lexemes, removed_count = _deduplicate_lexemes(
            deck.updated_lexemes,
            existing_terms=existing_terms,
        )

        if removed_count > 0:
            print(
                f"Removed {removed_count} duplicate lexeme(s) from edit response")

        return deck

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
