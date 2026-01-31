# Setup Guide - Updated Configuration

## 🔄 Changes Made

### Port Updates
- **Backend (Bun)**: Port 3000 → **9051**
- **Frontend (Vue)**: Port 5173 → **9050**
- **AI Service (FastAPI)**: Port 8001 → **9052**

### AI Provider Migration
- **From**: Direct OpenAI API client
- **To**: LangChain with Azure OpenAI

## 🚀 Quick Setup Steps

### 1. Configure Azure OpenAI

Edit `ai-service/.env` with your Azure OpenAI credentials:

```env
AZURE_OPENAI_API_KEY=your_actual_azure_openai_key
AZURE_OPENAI_ENDPOINT=https://your-resource-name.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

**Where to find these values:**
- Go to [Azure Portal](https://portal.azure.com)
- Navigate to your Azure OpenAI resource
- Keys & Endpoint section will have your API key and endpoint
- Deployments section will show your deployment names

### 2. Install Python Dependencies

```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

**New Dependencies Added:**
- `langchain==0.3.19` - LangChain framework
- `langchain-openai==0.2.14` - Azure OpenAI integration

### 3. Start Services (3 Terminals)

**Terminal 1 - MongoDB:**
```bash
docker-compose up -d
```

**Terminal 2 - Backend:**
```bash
bun install
bun run dev
# Should start on http://localhost:9051
```

**Terminal 3 - AI Service:**
```bash
cd ai-service
source venv/bin/activate
uvicorn main:app --reload --port 9052
# Should start on http://localhost:9052
# Swagger docs: http://localhost:9052/docs
```

**Terminal 4 - Frontend:**
```bash
cd frontend
npm install
npm run dev
# Should start on http://localhost:9050
```

### 4. Verify Services

```bash
# Backend health check
curl http://localhost:9051/health

# AI Service health check
curl http://localhost:9052/health

# Frontend
open http://localhost:9050
```

## 🔍 What Changed in the Code

### AI Client (`ai-service/services/ai_client.py`)
**Before:**
```python
from openai import AsyncOpenAI
self.client = AsyncOpenAI(api_key=api_key)
```

**After:**
```python
from langchain_openai import AzureChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

self.llm = AzureChatOpenAI(
    azure_endpoint=endpoint,
    api_key=api_key,
    azure_deployment=deployment,
    api_version=api_version,
    temperature=0.7,
    model_kwargs={"response_format": {"type": "json_object"}}
)
```

### Benefits of LangChain
- **Flexible**: Easy to switch between different LLM providers
- **Powerful**: Built-in tools for chains, agents, and RAG
- **Production-ready**: Robust error handling and retries
- **Future-proof**: Can add embeddings, vector stores, etc.

## 🛠️ Common Issues

### Issue: Azure OpenAI 401 Unauthorized
**Solution:** Double-check your API key and endpoint URL in `ai-service/.env`

### Issue: Deployment not found
**Solution:** Ensure `AZURE_OPENAI_DEPLOYMENT_NAME` matches your deployment name in Azure Portal

### Issue: Port already in use
**Solution:** Kill existing processes:
```bash
# macOS/Linux
lsof -ti:9051 | xargs kill -9
lsof -ti:9050 | xargs kill -9
lsof -ti:9052 | xargs kill -9
```

### Issue: pip install fails
**Solution:** Try upgrading pip first:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## 📝 Next Steps

1. Test deck creation with: "I want to learn common Spanish verbs"
2. Try editing a deck: "Add 10 more adjectives"
3. Generate flashcards in both Simple and Master modes
4. Study and rate flashcards

## 🔗 Useful Links

- [Azure OpenAI Documentation](https://learn.microsoft.com/en-us/azure/ai-services/openai/)
- [LangChain Documentation](https://python.langchain.com/)
- [LangChain Azure OpenAI](https://python.langchain.com/docs/integrations/chat/azure_chat_openai)

## 💡 Tips

- Use environment variables for all sensitive data
- Keep your Azure OpenAI endpoint and keys secure
- Monitor your Azure OpenAI usage in the Azure Portal
- LangChain provides great logging - check console for detailed info

---

Need help? Check the main [README.md](README.md) for full documentation!
