import os
import base64
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage
import dotenv

dotenv.load_dotenv()


class OCRService:
    """Service for extracting text from images using LLM vision capabilities."""

    def __init__(self):
        # Get Azure OpenAI configuration from environment
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        api_version = os.getenv(
            "AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY not found in environment")
        if not endpoint:
            raise ValueError("AZURE_OPENAI_ENDPOINT not found in environment")

        # Initialize LangChain Azure OpenAI client for vision
        self.llm = AzureChatOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            azure_deployment=deployment,
            api_version=api_version,
            temperature=0.3
        )

    async def extract_text(self, image_bytes: bytes) -> str:
        """Extract text from image bytes using LLM vision."""
        try:
            # Encode image to base64
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')

            # Create message with image
            message = HumanMessage(
                content=[
                    {
                        "type": "text",
                        "text": "Extract all text from this image. Return only the text content, nothing else. If there are multiple languages, extract all of them. Preserve the original formatting and line breaks as much as possible."
                    },
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{image_base64}"
                        }
                    }
                ]
            )

            response = await self.llm.ainvoke([message])
            return response.content.strip()

        except Exception as e:
            raise Exception(f"Text extraction failed: {str(e)}")
