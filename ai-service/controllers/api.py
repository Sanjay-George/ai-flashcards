"""API routes for AI service"""
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
import json

from services.ai_client import AIClient
from services.ocr_service import OCRService
from middleware.auth import verify_firebase_token
from models import (
    DeckCreateRequest, DeckCreateResponse,
    DeckEditRequest, DeckEditResponse,
    FlashcardGenerateRequest, FlashcardGenerateResponse,
    ProgressUpdateRequest, ProgressUpdateResponse,
    ChatRequest, ChatResponse
)

router = APIRouter()

# Initialize services
ai_client = AIClient()
ocr_service = OCRService()


@router.get("/health")
async def health_check():
    return {"status": "ok", "service": "AI Service"}


@router.post("/ai/create_deck", response_model=DeckCreateResponse)
async def create_deck(request: DeckCreateRequest, user=Depends(verify_firebase_token)):
    """Create a flashcard deck from text or extracted text from image."""
    try:
        system_prompt = """
You are an AI language-learning assistant that creates flashcard decks.

Input:
- User text or extracted text from an uploaded image.

Task:
1. Identify useful lexemes or learning items from the input.
2. For each item, include:
   - "term": The text shown on the front of the flashcard (prompt side). This could be a word, phrase, question, or form in any language.
   - "meaning": The text shown on the back of the flashcard (answer side). This could be a translation, grammatical form, conjugation, definition, synonym, or any appropriate response in any language.
   - "POS": Part of speech or other classification (e.g., noun, verb, adjective, phrase).
3. Detect the main learning language or context from the content.
4. Suggest:
   - "title": A descriptive deck title summarizing the theme/content.
   - "language": ISO 639-1 code for the language being studied (e.g., 'de' for German, 'es' for Spanish, 'fr' for French, etc.)
   - "tags": Optional keywords (e.g., "verbs", "travel", "grammar", "beginner") to help categorize the deck.

Output JSON:
{
  "title": "...",
  "language": "de",
  "tags": ["...", "..."],
  "lexemes": [
    {"term": "...", "meaning": "...", "POS": "..."},
    ...
  ]
}

Respond ONLY with valid JSON, no additional text.
"""

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
async def edit_deck(request: DeckEditRequest, user=Depends(verify_firebase_token)):
    """Modify an existing deck based on user instructions."""
    try:
        system_prompt = """You are assisting a user in refining their flashcard deck.

Input:
- Current deck JSON
- User instruction
- Optional conversation history for context

Field definitions:
- "term": The word/phrase in the TARGET language being learned (e.g., German, Spanish). This is what the student is trying to learn.
- "meaning": The ENGLISH translation/definition of the term.
- "POS": Part of speech (noun, verb, adjective, etc.)

Task:
- Interpret the instruction to add, edit, or remove lexemes.
- When modifying terms (e.g., adding articles to German nouns), update the "term" field, NOT the "meaning" field.
- The "meaning" field should always remain in English.
- Use the conversation history to understand context and follow-up requests.
- Examples:
  * Adding German article: term "Zimmer" → term "das Zimmer", meaning stays "room"
  * Adding Spanish article: term "casa" → term "la casa", meaning stays "house"

Output JSON:
{
  "action": "add | edit | remove",
  "updated_lexemes": [
    {"term": "...", "meaning": "...", "POS": "..."}
  ]
}

Respond ONLY with valid JSON, no additional text."""

        # Build user content with message history context
        user_content = f"""Current deck: {json.dumps(request.deck_json)}

"""

        # Add conversation history if provided
        if request.message_history and len(request.message_history) > 0:
            user_content += "Previous conversation:\n"
            for msg in request.message_history:
                user_content += f"{msg.role}: {msg.content}\n"
            user_content += "\n"

        user_content += f"User instruction: {request.instruction}"

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return DeckEditResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/generate_flashcards", response_model=FlashcardGenerateResponse)
async def generate_flashcards(request: FlashcardGenerateRequest, user=Depends(verify_firebase_token)):
    """Generate flashcards from a deck."""
    try:
        system_prompt = """You are an AI flashcard generator for language learning.

Input:
- Deck JSON with lexemes
- Selected mode ("simple" or "master")

Task:
1. For each lexeme, create exactly ONE flashcard in the same order as the input lexemes.
2. The total number of flashcards MUST equal the number of input lexemes.
3. Determine the base language from the lexeme terms and their meanings (base language = the lexeme term language, English = the meaning language).
4. Use the mode rules below.
5. Always frame the question in English so user knows what is being asked.


Mode rules:
- Simple mode: base language → English only.
  Example: Q: "hablar" A: "to speak".
  Use a pattern with name "base_to_english".

- Master mode: mix multiple patterns. Include at least one of each where applicable and NEVER repeat the same pattern consecutively:
  1) base language → English (pattern name: "base_to_english")
  2) English → base language (pattern name: "english_to_base")
  3) Fill in the blank (pattern name: "fill_in_blank")
     IMPORTANT: Always include a hint showing the English meaning in parentheses!
     Example: Q: "Ich habe es nicht ____. (to understand)" A: "verstanden"
  4) Conjugated/inflected forms for verbs/adjectives as appropriate (pattern name: "conjugation")
     Include the infinitive and tense/form required.
     Example: Q: "sprechen (past participle)" A: "gesprochen"
  5) Articles/gender where relevant (e.g., der/die/das) (pattern name: "article")
  

Pattern object format:
{
  "name": "base_to_english | english_to_base | fill_in_blank | conjugation | article",
  "pos": "noun | verb |     adjective | etc.",
  "prompt": "short instruction for the learner"
}

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

        user_content = f"Context: {json.dumps(context)}\nUser question: {request.user_message}"

        response = await ai_client.generate(system_prompt, user_content, use_json_format=False)
        return ChatResponse(response=response)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
