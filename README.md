# 🎴 Flashcards AI

AI-powered flashcard application for language learning with spaced repetition.

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org) >= 21
- [Python](https://python.org) >= 3.11
- [Docker](https://docker.com) (for MongoDB)
- Azure OpenAI API credentials

### 1. Start MongoDB

```bash
docker-compose up -d
```

### 2. Configure Environment

```bash
# Backend
cp .env.example .env

# AI Service - add your Azure OpenAI credentials
cp ai-service/.env.example ai-service/.env
```

### 3. Install Dependencies

```bash
# Backend
bun install

# Frontend
cd frontend && npm install && cd ..

# AI Service
cd ai-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

### 4. Start Services

Run each in a separate terminal:

```bash
# Terminal 1 - Backend (port 9051)
bun run dev

# Terminal 2 - AI Service (port 9052)
cd ai-service && source venv/bin/activate && uvicorn main:app --reload --port 9052

# Terminal 3 - Frontend (port 9050)
cd frontend && npm run dev
```

### 5. Open App

Visit **http://localhost:9050**

## 📝 License

MIT License - free for personal and commercial use.
