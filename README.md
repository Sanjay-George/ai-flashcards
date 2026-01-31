# 🎴 Flashcards AI - Language Learning Assistant

A complete AI-powered flashcard application for language learning built with **Bun**, **Vue 3 (Composition API)**, **FastAPI**, and **MongoDB**.

## 🌟 Features

- **AI-Powered Deck Creation**: Create flashcard decks from text descriptions using OpenAI
- **Intelligent Lexeme Extraction**: Automatically identify terms, meanings, and parts of speech
- **Interactive Deck Editing**: Modify decks using natural language instructions
- **Smart Flashcard Generation**: Create contextual questions in Simple or Master mode
- **Progress Tracking**: Track learning progress with rating system
- **Modern UI**: Beautiful, responsive Vue 3 interface
- **RESTful API**: Clean separation between backend, AI service, and frontend

## 🏗️ Architecture

```
┌─────────────────┐
│  Vue 3 Frontend │  (Port 9050)
│  Composition API│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   Bun Backend   │  (Port 9051)
│   Hono + APIs   │
└────────┬────────┘
         │
         ├─────────→  MongoDB (Port 27017)
         │
         ↓
┌─────────────────┐
│ FastAPI Service │  (Port 9052)
│  AI Operations  │
│  LangChain +    │
│ Azure OpenAI    │
└─────────────────┘
```

## 📋 Prerequisites

- **Bun** >= 1.0.0 ([Install Bun](https://bun.sh))
- **Node.js** >= 18.0.0 (for frontend)
- **Python** >= 3.9 (for AI service)
- **MongoDB** >= 7.0
- **Azure OpenAI** account and API key

## 🚀 Quick Start

### 1. Clone and Setup

```bash
cd flashcards-ai-vc
```

### 2. Configure Environment Variables

```bash
# Copy environment files
cp .env.example .env
cp ai-service/.env.example ai-service/.env

# Edit .env and add your configuration
# Edit ai-service/.env and add your Azure OpenAI credentials
```

### 3. Start MongoDB

Using Docker:
```bash
docker-compose up -d
```

Or use your local MongoDB installation.

### 4. Install Dependencies

**Backend (Bun):**
```bash
bun install
```

**Frontend (Vue):**
```bash
cd frontend
npm install
cd ..
```

**AI Service (Python):**
```bash
cd ai-service
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 5. Start All Services

**Note:** Make sure you've set up your Azure OpenAI credentials in `ai-service/.env` before starting.

**Terminal 1 - Backend:**
```bash
bun run dev
```

**Terminal 2 - AI Service:**
```bash
cd ai-service
source venv/bin/activate  # On Windows: venv\Scripts\activate
uvicorn main:app --reload --port 9052
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm run dev
```

### 6. Access the Application

Open your browser and navigate to: **http://localhost:9050**

## 📚 API Documentation

### Bun Backend API (Port 9051)

#### Decks

- `GET /api/decks` - Get all decks
- `GET /api/decks/:id` - Get single deck
- `POST /api/decks` - Create deck
- `PUT /api/decks/:id` - Update deck
- `DELETE /api/decks/:id` - Delete deck

#### Flashcards

- `GET /api/flashcards/deck/:deckId` - Get flashcards for a deck
- `GET /api/flashcards/:id` - Get single flashcard
- `POST /api/flashcards/bulk` - Create multiple flashcards
- `POST /api/flashcards/:id/rate` - Rate a flashcard
- `DELETE /api/flashcards/:id` - Delete flashcard

#### AI Proxy Endpoints

- `POST /api/ai/create_deck` - Create deck from text
- `POST /api/ai/edit_deck` - Edit deck with AI
- `POST /api/ai/generate_flashcards` - Generate flashcards
- `POST /api/ai/update_progress` - Update learning progress
- `POST /api/ai/extract_text` - Extract text from image (OCR)

### FastAPI AI Service (Port 9052)

- `POST /ai/create_deck` - AI deck creation
- `POST /ai/edit_deck` - AI deck editing
- `POST /ai/generate_flashcards` - AI flashcard generation
- `POST /ai/update_progress` - AI progress tracking
- `POST /ai/extract_text` - OCR text extraction
- `GET /health` - Health check

API documentation available at: **http://localhost:9052/docs**

## 🎯 Usage Guide

### Creating a Deck

1. Navigate to "Create Deck"
2. Enter your learning goal (e.g., "I want to learn common Spanish verbs")
3. Click "Generate Deck with AI"
4. Review the generated lexemes
5. Click "Save Deck"

### Editing a Deck

1. Open a deck from "My Decks"
2. Use the AI edit feature to modify:
   - "Add 10 more common adjectives"
   - "Remove verbs related to food"
   - "Add travel-related vocabulary"

### Studying

1. Open a deck
2. Select mode (Simple or Master)
3. Click "Generate & Study"
4. Flip cards and rate your knowledge (1-5)
5. Track your progress

## 🔧 Configuration

### Backend (.env)

```env
PORT=9051
MONGODB_URI=mongodb://localhost:27017/flashcards-ai
AI_SERVICE_URL=http://localhost:9052
```

### AI Service (ai-service/.env)

```env
# Azure OpenAI Configuration
AZURE_OPENAI_API_KEY=your_azure_openai_api_key_here
AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com/
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o-mini
AZURE_OPENAI_API_VERSION=2024-02-15-preview
AZURE_OPENAI_EMBEDDING_DEPLOYMENT=text-embedding-ada-002
```

## 📦 Project Structure

```
flashcards-ai-vc/
├── src/                      # Bun backend
│   ├── index.ts              # Main server
│   ├── models/               # Mongoose models
│   │   ├── Deck.ts
│   │   └── Flashcard.ts
│   └── routes/               # API routes
│       ├── decks.ts
│       ├── flashcards.ts
│       └── ai.ts
├── frontend/                 # Vue 3 frontend
│   ├── src/
│   │   ├── views/            # Page components
│   │   ├── stores/           # Pinia stores
│   │   ├── router/           # Vue Router
│   │   ├── services/         # API client
│   │   ├── App.vue
│   │   └── main.ts
│   ├── index.html
│   └── vite.config.ts
├── ai-service/               # FastAPI AI service
│   ├── main.py               # FastAPI app
│   ├── services/             # AI services
│   │   ├── ai_client.py      # OpenAI client
│   │   └── ocr_service.py    # OCR service
│   └── requirements.txt
├── docker-compose.yml        # MongoDB setup
├── package.json              # Bun dependencies
└── README.md
```

## 🧪 Development

### Run Individual Services

**Backend only:**
```bash
bun run dev
```

**AI Service only:**
```bash
cd ai-service
python -m uvicorn main:app --reload --port 9052
```

**Frontend only:**
```bash
cd frontend
npm run dev
```

### Build for Production

**Frontend:**
```bash
cd frontend
npm run build
```

**Backend:**
```bash
bun run start
```

## 🔍 Testing

### Test Backend API

```bash
# Health check
curl http://localhost:9051/health

# Get all decks
curl http://localhost:9051/api/decks
```

### Test AI Service

```bash
# Health check
curl http://localhost:9052/health

# Create deck
curl -X POST http://localhost:9052/ai/create_deck \
  -H "Content-Type: application/json" \
  -d '{"user_message": "I want to learn basic Spanish greetings", "text": null}'
```

## 🛠️ Troubleshooting

### MongoDB Connection Issues

- Ensure MongoDB is running: `docker-compose ps`
- Check connection string in `.env`

### AI Service Errors

- Verify Azure OpenAI credentials are set in `ai-service/.env`
- Check Azure OpenAI endpoint URL is correct
- Ensure deployment name matches your Azure OpenAI deployment
- Review logs: `cd ai-service && uvicorn main:app --reload --port 9052`

### Frontend Not Loading

- Clear browser cache
- Check proxy configuration in `frontend/vite.config.ts`
- Ensure backend is running on port 9051

## 🎨 Customization

### Using Different LLM Providers

The AI service uses LangChain, making it easy to switch providers. Edit `ai-service/services/ai_client.py` to use other LangChain chat models (OpenAI, Anthropic, etc.)

### Changing Database

Modify `src/models/` and update connection in `src/index.ts`

### Styling

Edit `frontend/src/style.css` for global styles or component-specific `<style>` blocks

## 📝 License

MIT License - feel free to use this project for learning or commercial purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.

---

Built with ❤️ using Bun, Vue 3, FastAPI, LangChain, Azure OpenAI, and MongoDB
