"""OCR and chat routes."""
import json

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from middleware.auth import verify_firebase_token
from models import ChatRequest, ChatResponse
from services.ai_client import AIClient
from services.ocr_service import OCRService

router = APIRouter()
ai_client = AIClient()
ocr_service = OCRService()


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
            "pattern": request.pattern.dict() if request.pattern else None,
        }

        user_content = f"Context: {json.dumps(context)}"

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
