import os
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from typing import Optional
import dotenv

dotenv.load_dotenv()

class AIClient:
    """AI client using LangChain with Azure OpenAI."""

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

        # Initialize LangChain Azure OpenAI client
        self.llm = AzureChatOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            azure_deployment=deployment,
            api_version=api_version,
            temperature=0.7,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

    async def generate(self, system_prompt: str, user_content: str) -> str:
        """Generate AI response using LangChain with Azure OpenAI."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content)
        ]

        response = await self.llm.ainvoke(messages)
        return response.content
