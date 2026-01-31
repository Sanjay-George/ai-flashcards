<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import type { CreateDeckResponse } from '../types/index'

const router = useRouter()
const deckStore = useDeckStore()

const userMessage = ref<string>('')
const generatedDeck = ref<CreateDeckResponse | null>(null)
const isGenerating = ref<boolean>(false)
const error = ref<string>('')

const generateDeck = async () => {
    if (!userMessage.value.trim()) {
        error.value = 'Please enter a message'
        return
    }

    error.value = ''
    isGenerating.value = true

    try {
        const result = await deckStore.createDeckFromText(userMessage.value)
        generatedDeck.value = result
    } catch (e: any) {
        error.value = e.message || 'Failed to generate deck'
    } finally {
        isGenerating.value = false
    }
}

const saveDeck = async () => {
    if (!generatedDeck.value) return

    try {
        const deck = await deckStore.createDeck(generatedDeck.value)
        router.push(`/deck/${deck._id}`)
    } catch (e: any) {
        error.value = e.message || 'Failed to save deck'
    }
}

const resetForm = () => {
    userMessage.value = ''
    generatedDeck.value = null
    error.value = ''
}
</script>

<template>
    <div class="create-deck">
        <h1>Create New Deck</h1>

        <div class="card">
            <div class="form-section">
                <h2>Step 1: Describe What You Want to Learn</h2>
                <p class="help-text">
                    Tell the AI what you want to learn. For example:
                    "I want to learn the most common verbs in Spanish" or
                    "Create flashcards for French food vocabulary"
                </p>

                <div class="form-group">
                    <label for="message">Your Learning Goal</label>
                    <textarea id="message" v-model="userMessage" class="form-control" placeholder="I want to learn..."
                        rows="4" :disabled="isGenerating"></textarea>
                </div>

                <button @click="generateDeck" class="btn btn-primary" :disabled="isGenerating || !userMessage.trim()">
                    {{ isGenerating ? 'Generating...' : 'Generate Deck with AI' }}
                </button>

                <div v-if="error" class="error-message">
                    {{ error }}
                </div>
            </div>

            <div v-if="isGenerating" class="loading">
                <div class="spinner"></div>
                <p>AI is creating your deck...</p>
            </div>

            <div v-if="generatedDeck" class="generated-deck">
                <h2>Step 2: Review Generated Deck</h2>

                <div class="deck-preview">
                    <div class="form-group">
                        <label>Deck Title</label>
                        <input v-model="generatedDeck.title" class="form-control" type="text" />
                    </div>

                    <div class="form-group">
                        <label>Tags</label>
                        <div class="tags-display">
                            <span v-for="(tag, index) in generatedDeck.tags" :key="index" class="tag tag-primary">
                                {{ tag }}
                            </span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Lexemes ({{ generatedDeck.lexemes.length }})</label>
                        <div class="lexemes-list">
                            <div v-for="(lexeme, index) in generatedDeck.lexemes" :key="index" class="lexeme-item">
                                <div class="lexeme-term">{{ lexeme.term }}</div>
                                <div class="lexeme-meaning">{{ lexeme.meaning }}</div>
                                <div class="lexeme-pos">{{ lexeme.POS }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="action-buttons">
                        <button @click="saveDeck" class="btn btn-primary">
                            Save Deck
                        </button>
                        <button @click="resetForm" class="btn btn-secondary">
                            Start Over
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.create-deck {
    max-width: 900px;
    margin: 0 auto;
}

.create-deck h1 {
    font-size: 2rem;
    margin-bottom: 2rem;
    color: #2d3748;
}

.form-section h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #2d3748;
}

.help-text {
    color: #718096;
    margin-bottom: 1.5rem;
    line-height: 1.6;
}

.error-message {
    background: #fed7d7;
    color: #c53030;
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
}

.generated-deck {
    margin-top: 2rem;
    padding-top: 2rem;
    border-top: 2px solid #e2e8f0;
}

.deck-preview {
    background: #f7fafc;
    padding: 1.5rem;
    border-radius: 8px;
}

.tags-display {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.lexemes-list {
    max-height: 400px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.lexeme-item {
    background: white;
    padding: 1rem;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr 2fr auto;
    gap: 1rem;
    align-items: center;
}

.lexeme-term {
    font-weight: 600;
    color: #2d3748;
    font-size: 1.1rem;
}

.lexeme-meaning {
    color: #4a5568;
}

.lexeme-pos {
    background: #e2e8f0;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    color: #2d3748;
}

.action-buttons {
    display: flex;
    gap: 1rem;
    margin-top: 1.5rem;
}
</style>
