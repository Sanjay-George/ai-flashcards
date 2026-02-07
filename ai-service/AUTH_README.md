# AI Service - Firebase Authentication

The AI service now requires Firebase authentication for all endpoints except `/health`.

## Setup

1. Install dependencies:
```bash
cd ai-service
pip install -r requirements.txt
```

2. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

3. Set the Firebase service account path in `.env`:
```
FIREBASE_SERVICE_ACCOUNT_PATH=../firebase-service-account.json
```

## Authentication

All API endpoints (except `/health`) require a valid Firebase ID token in the Authorization header:

```
Authorization: Bearer <firebase-id-token>
```

### Protected Endpoints

- `POST /ai/create_deck` - Create a flashcard deck
- `POST /ai/edit_deck` - Edit an existing deck
- `POST /ai/generate_flashcards` - Generate flashcards
- `POST /ai/update_progress` - Update learner progress
- `POST /ai/extract_text` - Extract text from images
- `POST /ai/chat` - Chat about flashcards

### Public Endpoints

- `GET /health` - Health check (no authentication required)

## Example Request

```javascript
const token = await firebase.auth().currentUser.getIdToken();

const response = await fetch('http://localhost:9052/ai/create_deck', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    user_message: "Create flashcards for German verbs",
    text: "..."
  })
});
```

## Error Responses

- `401 Unauthorized - No token provided` - Missing Authorization header
- `401 Unauthorized - Invalid token` - Token is malformed or invalid
- `401 Unauthorized - Token expired` - Token has expired
- `401 Unauthorized - Firebase not configured` - Firebase Admin SDK not initialized

## Running the Service

```bash
cd ai-service
python main.py
```

The service will run on `http://localhost:9052`
