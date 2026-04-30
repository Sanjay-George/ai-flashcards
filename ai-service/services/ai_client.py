import os
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
import dotenv

dotenv.load_dotenv()


class AIClient:
    """AI client using LangChain with Azure OpenAI."""

    def __init__(self):
        # Get Azure OpenAI configuration from environment
        api_key = os.getenv("AZURE_OPENAI_API_KEY")
        endpoint = os.getenv("AZURE_OPENAI_ENDPOINT")
        deployment = os.getenv("AZURE_OPENAI_DEPLOYMENT_NAME", "gpt-4o-mini")
        chat_deployment = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT_NAME", deployment)
        api_version = os.getenv(
            "AZURE_OPENAI_API_VERSION", "2024-02-15-preview")

        if not api_key:
            raise ValueError("AZURE_OPENAI_API_KEY not found in environment")
        if not endpoint:
            raise ValueError("AZURE_OPENAI_ENDPOINT not found in environment")

        # Primary LLM: large model, JSON mode, deterministic
        self.llm = AzureChatOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            azure_deployment=deployment,
            api_version=api_version,
            temperature=0,
            model_kwargs={"response_format": {"type": "json_object"}}
        )

        # Chat LLM: smaller model, plain text, slightly creative
        self.chat_llm = AzureChatOpenAI(
            azure_endpoint=endpoint,
            api_key=api_key,
            azure_deployment=chat_deployment,
            api_version=api_version,
            temperature=0.7
        )

    async def generate(self, system_prompt: str, user_content: str, use_json_format: bool = True, use_chat_model: bool = False) -> str:
        """Generate AI response using LangChain with Azure OpenAI.

        Args:
            system_prompt: System instruction for the model
            user_content: User message content
            use_json_format: Whether to enforce JSON response format (default: True)
            use_chat_model: Use the smaller chat model instead of the primary model (default: False)
        """

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=user_content)
        ]

        if use_chat_model:
            response = await self.chat_llm.ainvoke(messages)
        elif use_json_format:
            response = await self.llm.ainvoke(messages)
        else:
            # Non-JSON call on the primary model (e.g. conversation endpoints)
            llm_no_json = AzureChatOpenAI(
                azure_endpoint=self.llm.azure_endpoint,
                api_key=self.llm.openai_api_key,
                azure_deployment=self.llm.deployment_name,
                api_version=self.llm.openai_api_version,
                temperature=0.7
            )
            response = await llm_no_json.ainvoke(messages)

        return response.content
