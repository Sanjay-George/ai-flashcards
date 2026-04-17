
# 🎴 Flashcards AI

AI-powered flashcard application for language learning with spaced repetition.

<img width="1479" height="858" alt="Screenshot 2026-04-17 at 17 34 27" src="https://github.com/user-attachments/assets/95ce8fb0-902b-48ab-819a-07cebfe8f7bb" />


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

## Screenshots
<img width="1479" height="858" alt="Screenshot 2026-04-17 at 17 33 39" src="https://github.com/user-attachments/assets/2b64bca3-2768-45ba-8680-1cd5fd8d9abf" />
<img width="1479" height="858" alt="Screenshot 2026-04-17 at 17 34 27" src="https://github.com/user-attachments/assets/95ce8fb0-902b-48ab-819a-07cebfe8f7bb" />
<img width="1479" height="858" alt="Screenshot 2026-04-17 at 17 35 57" src="https://github.com/user-attachments/assets/f3ced5e5-6f60-4fb5-80ab-364da74a3598" />


## 📝 License

MIT License - free for personal and commercial use.
