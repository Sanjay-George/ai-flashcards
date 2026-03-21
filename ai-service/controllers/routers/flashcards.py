"""Flashcard generation routes."""
import json

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_firebase_token
from models import FlashcardGenerateRequest, FlashcardGenerateResponse
from prompts.flashcards import GENERATE_FLASHCARDS_PROMPT
from services.ai_client import AIClient

router = APIRouter()
ai_client = AIClient()


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
