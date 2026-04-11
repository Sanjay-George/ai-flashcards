"""Deck creation and editing routes."""
import json
import re
from collections import Counter
from typing import Any, Dict, List, Set, Tuple, TypeVar

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_firebase_token
from models import (
    DeckCreateRequest,
    DeckCreateResponse,
    DeckEditRequest,
    DeckEditResponse,
    EditLexeme,
    Lexeme,
)
from prompts.deck import CREATE_DECK_PROMPT, EDIT_DECK_PROMPT
from services.ai_client import AIClient

router = APIRouter()
ai_client = AIClient()

T = TypeVar("T", bound=Lexeme)

_ALLOWED_EDIT_ACTIONS = {"add", "edit", "remove"}

_STYLE_REWRITE_PROMPT = """
You normalize flashcard lexeme meanings so they match a deck's established format.

Rules:
1. Keep each lexeme's "term" exactly as provided.
2. Keep each lexeme's "POS" exactly as provided.
3. Keep "replace_term" exactly as provided.
4. Rewrite ONLY "meaning" so it follows the same style as the provided examples.
5. Preserve semantic intent.
6. Output JSON only:
{
    "lexemes": [
        {"term": "...", "meaning": "...", "POS": "..."}
    ]
}
"""


def _normalize_text(value: str) -> str:
    return value.strip().lower()


def _normalize_meaning_for_match(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"[^A-Za-z0-9\s]", " ", value.lower())).strip()


def _deduplicate_lexemes(
    lexemes: List[T],
    existing_terms: Set[str] | None = None,
) -> Tuple[List[T], int]:
    """Remove duplicate lexemes (case-insensitive, whitespace-normalized)."""
    seen: Set[str] = set()
    if existing_terms:
        seen = {t.strip().lower() for t in existing_terms}

    unique: List[T] = []
    for lexeme in lexemes:
        normalized = lexeme.term.strip().lower()
        if normalized not in seen:
            lexeme.term = lexeme.term.strip()
            unique.append(lexeme)
            seen.add(normalized)

    return unique, len(lexemes) - len(unique)


def _normalize_action(action: str, instruction: str) -> str:
    """Normalize model action output to one of add/edit/remove."""
    normalized = action.strip().lower()

    alias_map = {
        "delete": "remove",
        "update": "edit",
        "modify": "edit",
        "replace": "edit",
        "append": "add",
        "insert": "add",
        "create": "add",
    }

    if normalized in _ALLOWED_EDIT_ACTIONS:
        return normalized
    if normalized in alias_map:
        return alias_map[normalized]

    instruction_lower = instruction.lower()
    if any(word in instruction_lower for word in ["remove", "delete", "drop"]):
        return "remove"
    if any(word in instruction_lower for word in ["edit", "change", "update", "modify", "replace"]):
        return "edit"
    return "add"


def _extract_existing_lexemes(deck_json: Dict[str, Any]) -> List[Lexeme]:
    """Safely parse existing deck lexemes from incoming JSON."""
    parsed: List[Lexeme] = []
    for raw_lexeme in deck_json.get("lexemes", []):
        try:
            parsed.append(Lexeme(**raw_lexeme))
        except Exception:
            continue
    return parsed


def _attach_replace_terms_for_edits(
    existing_lexemes: List[Lexeme],
    updated_lexemes: List[EditLexeme],
) -> int:
    """Attach replace_term to edited lexemes when missing by matching existing entries."""
    consumed_indexes: Set[int] = set()
    attached_count = 0

    normalized_existing_terms = [_normalize_text(lex.term) for lex in existing_lexemes]

    def _find_index(candidate: EditLexeme) -> int:
        if candidate.replace_term:
            target = _normalize_text(candidate.replace_term)
            for index, existing_term in enumerate(normalized_existing_terms):
                if index in consumed_indexes:
                    continue
                if existing_term == target:
                    return index

        candidate_term = _normalize_text(candidate.term)
        for index, existing_term in enumerate(normalized_existing_terms):
            if index in consumed_indexes:
                continue
            if existing_term == candidate_term:
                return index

        candidate_meaning = _normalize_meaning_for_match(candidate.meaning)
        candidate_pos = _normalize_text(candidate.POS)

        for index, existing in enumerate(existing_lexemes):
            if index in consumed_indexes:
                continue
            if (
                _normalize_meaning_for_match(existing.meaning) == candidate_meaning
                and _normalize_text(existing.POS) == candidate_pos
            ):
                return index

        for index, existing in enumerate(existing_lexemes):
            if index in consumed_indexes:
                continue
            if _normalize_meaning_for_match(existing.meaning) == candidate_meaning:
                return index

        return -1

    for candidate in updated_lexemes:
        index = _find_index(candidate)
        if index == -1:
            continue
        consumed_indexes.add(index)
        matched_term = existing_lexemes[index].term
        if candidate.replace_term != matched_term:
            candidate.replace_term = matched_term
            attached_count += 1

    return attached_count


def _meaning_shape(text: str) -> str:
    """Convert a meaning string to a structural shape (words -> W, numbers -> N)."""
    tokens = re.findall(r"[A-Za-zÀ-ÖØ-öø-ÿ']+|\d+|[^\w\s]|\s+", text)
    shaped: List[str] = []

    for token in tokens:
        if token.isspace():
            shaped.append(" ")
        elif token.isdigit():
            shaped.append("N")
        elif re.fullmatch(r"[A-Za-zÀ-ÖØ-öø-ÿ']+", token):
            shaped.append("W")
        else:
            shaped.append(token)

    return re.sub(r"\s+", " ", "".join(shaped)).strip()


def _infer_meaning_style(lexemes: List[Lexeme]) -> Dict[str, Any] | None:
    """Infer dominant meaning format from existing deck entries, if any."""
    meanings = [lex.meaning.strip() for lex in lexemes if lex.meaning and lex.meaning.strip()]
    if len(meanings) < 3:
        return None

    shapes = [_meaning_shape(meaning) for meaning in meanings]
    shape_counts = Counter(shapes)
    dominant_shape, dominant_count = shape_counts.most_common(1)[0]
    ratio = dominant_count / len(shapes)

    # Only enforce style when there is a strong and structured pattern.
    punctuation_signature = "".join(
        char for char in dominant_shape if not char.isalnum() and not char.isspace()
    )
    if ratio < 0.5 or not punctuation_signature:
        return None

    examples = [meaning for meaning in meanings if _meaning_shape(meaning) == dominant_shape][:5]
    return {
        "shape": dominant_shape,
        "ratio": ratio,
        "examples": examples,
    }


def _is_style_compatible(meaning: str, style: Dict[str, Any]) -> bool:
    """Check whether a meaning matches the inferred dominant shape."""
    return _meaning_shape(meaning.strip()) == style["shape"]


async def _rewrite_lexeme_meanings_to_style(
    lexemes_to_rewrite: List[EditLexeme],
    style_examples: List[str],
    instruction: str,
) -> List[EditLexeme]:
    """Ask the model to rewrite meanings so they match existing deck style."""
    serialized_lexemes = []
    for lex in lexemes_to_rewrite:
        if hasattr(lex, "model_dump"):
            serialized_lexemes.append(lex.model_dump(exclude={"mastery"}))
        else:
            serialized_lexemes.append(lex.dict(exclude={"mastery"}))

    rewrite_payload = {
        "style_examples": style_examples,
        "instruction": instruction,
        "lexemes": serialized_lexemes,
    }
    rewrite_user_content = (
        "Rewrite these lexeme meanings to match deck style examples. "
        "Keep term and POS unchanged.\n"
        f"Payload: {json.dumps(rewrite_payload)}"
    )

    rewrite_response = await ai_client.generate(_STYLE_REWRITE_PROMPT, rewrite_user_content)
    rewrite_result = json.loads(rewrite_response)

    rewritten: List[EditLexeme] = []
    for raw_lexeme in rewrite_result.get("lexemes", []):
        rewritten.append(EditLexeme(**raw_lexeme))

    # Keep identity fields stable even if the model drifts.
    for original, normalized in zip(lexemes_to_rewrite, rewritten):
        normalized.term = original.term
        normalized.POS = original.POS
        normalized.replace_term = original.replace_term

    return rewritten


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

        existing_lexemes = _extract_existing_lexemes(request.deck_json)
        style = _infer_meaning_style(existing_lexemes)

        user_content = f"Current deck JSON: {json.dumps(request.deck_json)}\n"
        if style:
            user_content += (
                f"Detected dominant meaning format shape: {style['shape']}\n"
                f"Style examples to follow: {json.dumps(style['examples'])}\n"
            )

        if request.message_history and len(request.message_history) > 0:
            user_content += "Previous conversation:\n"
            for msg in request.message_history:
                user_content += f"{msg.role}: {msg.content}\n"
            user_content += "\n"

        user_content += f"User instruction: {request.instruction}"

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        deck = DeckEditResponse(**result)

        deck.action = _normalize_action(deck.action, request.instruction)
        if deck.action not in _ALLOWED_EDIT_ACTIONS:
            raise HTTPException(
                status_code=500,
                detail=f"Invalid edit action from AI: {deck.action}",
            )

        existing_terms = {
            str(lexeme.get("term", "")).strip()
            for lexeme in request.deck_json.get("lexemes", [])
            if str(lexeme.get("term", "")).strip()
        }
        dedup_terms = existing_terms if deck.action == "add" else None
        deck.updated_lexemes, removed_count = _deduplicate_lexemes(
            deck.updated_lexemes,
            existing_terms=dedup_terms,
        )

        if removed_count > 0:
            print(
                f"Removed {removed_count} duplicate lexeme(s) from edit response")

        if deck.action == "remove":
            existing_terms_normalized = {term.strip().lower() for term in existing_terms}
            before_count = len(deck.updated_lexemes)
            deck.updated_lexemes = [
                lex
                for lex in deck.updated_lexemes
                if lex.term.strip().lower() in existing_terms_normalized
            ]
            filtered_count = before_count - len(deck.updated_lexemes)
            if filtered_count > 0:
                print(
                    f"Filtered out {filtered_count} remove action lexeme(s) not present in deck"
                )

        if deck.action == "edit" and deck.updated_lexemes:
            attached_count = _attach_replace_terms_for_edits(
                existing_lexemes,
                deck.updated_lexemes,
            )
            missing_replace = [
                lex.term for lex in deck.updated_lexemes if not lex.replace_term
            ]
            if attached_count > 0:
                print(f"Attached replace_term for {attached_count} edited lexeme(s)")
            if missing_replace:
                print(
                    "Warning: could not determine replace_term for edited lexeme(s): "
                    f"{missing_replace}"
                )

        if style and deck.action in {"add", "edit"} and deck.updated_lexemes:
            non_conforming_indexes = [
                index
                for index, lex in enumerate(deck.updated_lexemes)
                if not _is_style_compatible(lex.meaning, style)
            ]

            if non_conforming_indexes:
                lexemes_to_rewrite = [deck.updated_lexemes[index] for index in non_conforming_indexes]
                try:
                    rewritten = await _rewrite_lexeme_meanings_to_style(
                        lexemes_to_rewrite,
                        style_examples=style["examples"],
                        instruction=request.instruction,
                    )

                    for idx, rewritten_lexeme in zip(non_conforming_indexes, rewritten):
                        deck.updated_lexemes[idx] = rewritten_lexeme

                    print(
                        f"Rewrote {len(rewritten)} lexeme meaning(s) to match existing deck style"
                    )
                except Exception as rewrite_err:
                    print(f"Warning: failed to rewrite non-conforming meanings: {rewrite_err}")

        return deck

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
