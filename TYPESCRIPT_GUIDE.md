# TypeScript Configuration Guide

## Overview

This project uses **strict TypeScript** across both frontend and backend to ensure type safety and better development experience.

## Backend TypeScript (Bun)

### Configuration
- **File**: `tsconfig.json`
- **Strict Mode**: Enabled
- **Target**: ESNext
- **Module System**: ESNext with bundler resolution

### Type Definitions

#### Location
All backend types are defined in `src/types/index.ts`

#### Key Types
```typescript
// Core Data Models
- ILexeme: Word/term definition
- IDeck: Flashcard deck with lexemes
- IFlashcard: Individual flashcard
- IPattern: Question pattern metadata

// AI Service Types
- AICreateDeckRequest/Response
- AIEditDeckRequest/Response
- AIGenerateFlashcardsRequest/Response
- AIUpdateProgressRequest/Response

// API Response Types
- APIError
- APISuccessMessage
```

#### Environment Variables
Environment variables are typed in `src/types/env.d.ts`:
```typescript
- PORT
- MONGODB_URI
- AI_SERVICE_URL
- NODE_ENV
```

### Usage in Routes

All routes use proper TypeScript typing:

```typescript
// Example from src/routes/ai.ts
app.post('/create_deck', async (c) => {
  const body = await c.req.json<AICreateDeckRequest>();
  // body is now properly typed
});
```

## Frontend TypeScript (Vue 3)

### Configuration
- **File**: `frontend/tsconfig.json`
- **Strict Mode**: Enabled
- **Target**: ES2020
- **Framework**: Vue 3 with Composition API

### Type Definitions

#### Location
All frontend types are defined in `frontend/src/types/index.ts`

#### Key Types
```typescript
// Core Data Models
- Lexeme: Word/term definition
- Deck: Flashcard deck
- Flashcard: Individual flashcard
- Pattern: Question pattern

// Store State Types
- DeckStoreState
- FlashcardStoreState

// API Types (matching backend)
- CreateDeckRequest/Response
- EditDeckRequest/Response
- GenerateFlashcardsRequest/Response
```

### Usage in Components

All Vue components use TypeScript with proper typing:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'
import type { Deck, Flashcard } from '../types/index'

const deck = ref<Deck | null>(null)
const flashcards = ref<Flashcard[]>([])

const handleSubmit = async (): Promise<void> => {
  // Fully typed function
}
</script>
```

### Usage in Stores (Pinia)

Stores use TypeScript with type imports:

```typescript
import type { Deck, Lexeme } from '../types/index'

const decks = ref<Deck[]>([])
const currentDeck = ref<Deck | null>(null)
```

## Benefits of TypeScript Configuration

### 1. **Type Safety**
- Catch errors at compile time
- Autocomplete in IDEs
- Refactoring confidence

### 2. **Better DX**
- IntelliSense support
- Inline documentation
- Type inference

### 3. **Maintainability**
- Self-documenting code
- Easier onboarding
- Reduced bugs

### 4. **API Contract**
- Frontend-Backend type alignment
- Shared interfaces
- Version compatibility

## Common Patterns

### 1. Async Functions
```typescript
const fetchData = async (): Promise<Deck[]> => {
  const response = await api.get<Deck[]>('/decks')
  return response.data
}
```

### 2. Event Handlers
```typescript
const handleClick = (event: MouseEvent): void => {
  // Handle click
}
```

### 3. Computed Properties
```typescript
const filteredDecks = computed<Deck[]>(() => {
  return decks.value.filter(d => d.tags.includes('spanish'))
})
```

### 4. Refs with Types
```typescript
const count = ref<number>(0)
const user = ref<User | null>(null)
const items = ref<Item[]>([])
```

## Type Checking

### Backend
```bash
# Check types (via Bun)
bun run typecheck  # If you add this script

# Or let Bun check on run
bun run dev
```

### Frontend
```bash
# Check types
cd frontend
npm run build  # TypeScript checks during build

# Or use vue-tsc
npx vue-tsc --noEmit
```

## Strict Mode Features

Both configs enable:
- ✅ `strict: true` - All strict checks
- ✅ `noUnusedLocals: true` - Catch unused variables (frontend)
- ✅ `noUnusedParameters: true` - Catch unused params (frontend)
- ✅ `noFallthroughCasesInSwitch: true` - Switch safety
- ✅ `forceConsistentCasingInFileNames: true` - File name consistency

## Best Practices

### 1. Always Type Function Returns
```typescript
// ✅ Good
const getName = (): string => user.name

// ❌ Avoid
const getName = () => user.name
```

### 2. Use Type Imports
```typescript
// ✅ Good
import type { Deck, Flashcard } from '../types/index'

// ❌ Avoid mixing types and values unnecessarily
import { Deck } from '../types/index'  // if Deck is only a type
```

### 3. Avoid `any`
```typescript
// ✅ Good
const data: Deck | null = null

// ❌ Avoid
const data: any = null
```

### 4. Use Generics
```typescript
// ✅ Good
const response = await api.get<Deck[]>('/decks')

// ❌ Less type-safe
const response = await api.get('/decks')
```

### 5. Optional Chaining
```typescript
// ✅ Good
const title = deck?.title ?? 'Untitled'

// ❌ Risky
const title = deck.title || 'Untitled'
```

## Troubleshooting

### Issue: "Cannot find module"
**Solution**: Check `tsconfig.json` paths configuration

### Issue: "Type errors in node_modules"
**Solution**: Ensure `skipLibCheck: true` is set

### Issue: "Implicit any"
**Solution**: Add explicit type annotations

### Issue: ".vue shims missing"
**Solution**: Ensure `frontend/src/vite-env.d.ts` exists (auto-generated)

## Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Vue 3 TypeScript Guide](https://vuejs.org/guide/typescript/overview.html)
- [Bun TypeScript](https://bun.sh/docs/runtime/typescript)
- [Pinia TypeScript](https://pinia.vuejs.org/core-concepts/#typescript)

---

**Note**: All types are shared between frontend and backend through the `/types` directories, ensuring API contract consistency.
