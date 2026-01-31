<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import type { CreateDeckResponse } from '../types/index'

const router = useRouter()
const deckStore = useDeckStore()

const userMessage = ref<string>('')
const extractedText = ref<string>('')
const uploadedImage = ref<File | null>(null)
const isExtractingText = ref<boolean>(false)
const generatedDeck = ref<CreateDeckResponse | null>(null)
const isGenerating = ref<boolean>(false)
const error = ref<string>('')

const handleImageUpload = async (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (!file) return

    uploadedImage.value = file
    error.value = ''
    isExtractingText.value = true

    try {
        const text = await deckStore.extractTextFromImage(file)
        extractedText.value = text
        if (!userMessage.value.trim()) {
            userMessage.value = 'Create flashcards from the extracted text'
        }
    } catch (e: any) {
        error.value = e.message || 'Failed to extract text from image'
        uploadedImage.value = null
    } finally {
        isExtractingText.value = false
    }
}

const clearImage = () => {
    uploadedImage.value = null
    extractedText.value = ''
}

const generateDeck = async () => {
    if (!userMessage.value.trim()) {
        error.value = 'Please enter a message'
        return
    }

    error.value = ''
    isGenerating.value = true

    try {
        const result = await deckStore.createDeckFromText(
            userMessage.value,
            extractedText.value || undefined
        )
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
    extractedText.value = ''
    uploadedImage.value = null
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
                    Tell the AI what you want to learn, or upload an image with text to extract.
                    For example: "I want to learn the most common verbs in Spanish" or
                    "Create flashcards for French food vocabulary"
                </p>

                <!-- Image Upload Section -->
                <div class="image-upload-section">
                    <label class="upload-label">
                        <input type="file" accept="image/*" capture="environment" @change="handleImageUpload"
                            class="file-input" :disabled="isGenerating || isExtractingText" />
                        <span class="upload-btn">
                            📷 {{ uploadedImage ? 'Change Image' : 'Upload Image or Take Photo' }}
                        </span>
                    </label>

                    <div v-if="isExtractingText" class="extracting-text">
                        <div class="spinner-small"></div>
                        <span>Extracting text from image...</span>
                    </div>

                    <div v-if="uploadedImage && !isExtractingText" class="image-preview">
                        <div class="preview-header">
                            <span>✓ Image uploaded: {{ uploadedImage.name }}</span>
                            <button @click="clearImage" class="btn-clear" type="button">✕</button>
                        </div>
                        <div v-if="extractedText" class="extracted-text">
                            <strong>Extracted text:</strong>
                            <p>{{ extractedText }}</p>
                        </div>
                    </div>
                </div>

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

.image-upload-section {
    margin-bottom: 1.5rem;
}

.upload-label {
    display: inline-block;
    cursor: pointer;
}

.file-input {
    display: none;
}

.upload-btn {
    display: inline-block;
    background: #667eea;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 8px;
    font-weight: 500;
    transition: background 0.3s;
}

.upload-btn:hover {
    background: #5568d3;
}

.extracting-text {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 1rem;
    color: #667eea;
    font-size: 0.875rem;
}

.spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid #e2e8f0;
    border-top-color: #667eea;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
}

.image-preview {
    margin-top: 1rem;
    padding: 1rem;
    background: #f7fafc;
    border-radius: 8px;
    border: 2px solid #667eea;
}

.preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
    color: #2d3748;
    font-weight: 500;
}

.btn-clear {
    background: transparent;
    border: none;
    color: #e53e3e;
    font-size: 1.25rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    border-radius: 4px;
    transition: background 0.2s;
}

.btn-clear:hover {
    background: #fed7d7;
}

.extracted-text {
    background: white;
    padding: 1rem;
    border-radius: 6px;
    font-size: 0.875rem;
}

.extracted-text strong {
    display: block;
    margin-bottom: 0.5rem;
    color: #2d3748;
}

.extracted-text p {
    color: #4a5568;
    margin: 0;
    line-height: 1.6;
    max-height: 150px;
    overflow-y: auto;
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
