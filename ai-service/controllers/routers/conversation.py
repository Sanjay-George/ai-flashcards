"""Conversation practice routes."""
import json

from fastapi import APIRouter, Depends, HTTPException

from middleware.auth import verify_firebase_token
from models import (
    ConversationExtractVocabRequest,
    ConversationExtractVocabResponse,
    ConversationFeedbackRequest,
    ConversationFeedbackResponse,
    ConversationNextRequest,
    ConversationNextResponse,
    ConversationStartRequest,
    ConversationStartResponse,
)
from prompts.conversation import (
    CONVERSATION_EXTRACT_VOCABULARY_PROMPT,
    CONVERSATION_FEEDBACK_PROMPT,
    CONVERSATION_NEXT_PROMPT,
    CONVERSATION_START_PROMPT,
)
from services.ai_client import AIClient

router = APIRouter()
ai_client = AIClient()


@router.post("/ai/conversation/start", response_model=ConversationStartResponse)
async def conversation_start(request: ConversationStartRequest, user=Depends(verify_firebase_token)):
    """Initialize a conversation practice session."""
    try:
        system_prompt = CONVERSATION_START_PROMPT

        user_content = f"""Language: {request.language}
Difficulty: {request.difficulty}
Topic: {request.topic}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return ConversationStartResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/conversation/next", response_model=ConversationNextResponse)
async def conversation_next(request: ConversationNextRequest, user=Depends(verify_firebase_token)):
    """Get the next AI response in a conversation."""
    try:
        system_prompt = CONVERSATION_NEXT_PROMPT

        history_json = json.dumps([msg.dict()
                                  for msg in request.conversation_history])

        user_content = f"""Language: {request.language}
Difficulty: {request.difficulty}
Topic: {request.topic}
Context: {request.context}
Conversation history: {history_json}
User message: {request.user_message}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return ConversationNextResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/conversation/feedback", response_model=ConversationFeedbackResponse)
async def conversation_feedback(request: ConversationFeedbackRequest, user=Depends(verify_firebase_token)):
    """Get feedback on a completed conversation."""
    try:
        system_prompt = CONVERSATION_FEEDBACK_PROMPT

        transcript_json = json.dumps([msg.dict()
                                     for msg in request.transcript])

        user_content = f"""Language: {request.language}
Difficulty: {request.difficulty}
Topic: {request.topic}
Transcript: {transcript_json}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return ConversationFeedbackResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/ai/conversation/extract_vocabulary", response_model=ConversationExtractVocabResponse)
async def conversation_extract_vocabulary(request: ConversationExtractVocabRequest, user=Depends(verify_firebase_token)):
    """Extract vocabulary and phrases from a conversation for flashcard creation."""
    try:
        system_prompt = CONVERSATION_EXTRACT_VOCABULARY_PROMPT

        transcript_json = json.dumps([msg.dict()
                                     for msg in request.transcript])

        user_content = f"""Language: {request.language}
Difficulty: {request.difficulty}
Topic: {request.topic}
Transcript: {transcript_json}"""

        response = await ai_client.generate(system_prompt, user_content)
        result = json.loads(response)
        return ConversationExtractVocabResponse(**result)

    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to parse AI response as JSON: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
