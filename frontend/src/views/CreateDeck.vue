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
    <div class="max-w-4xl mx-auto">
        <h1 class="text-3xl font-bold mb-8 text-foreground">Create New Deck</h1>

        <div class="card">
            <div>
                <h2 class="text-2xl font-semibold mb-4 text-foreground">Step 1: Describe What You Want to Learn</h2>
                <p class="text-muted-foreground mb-6 leading-relaxed">
                    Tell the AI what you want to learn, or upload an image with text to extract.
                    For example: "I want to learn the most common verbs in Spanish" or
                    "Create flashcards for French food vocabulary"
                </p>

                <!-- Image Upload Section -->
                <div class="mb-6">
                    <label class="inline-block cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" @change="handleImageUpload"
                            class="hidden" :disabled="isGenerating || isExtractingText" />
                        <span
                            class="inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium transition-all duration-200 hover:bg-primary/90">
                            📷 {{ uploadedImage ? 'Change Image' : 'Upload Image or Take Photo' }}
                        </span>
                    </label>

                    <div v-if="isExtractingText" class="flex items-center gap-2 mt-4 text-primary text-sm">
                        <div class="w-4 h-4 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                        <span>Extracting text from image...</span>
                    </div>

                    <div v-if="uploadedImage && !isExtractingText"
                        class="mt-4 p-4 bg-secondary rounded-lg border-2 border-primary">
                        <div class="flex justify-between items-center mb-3 text-foreground font-medium">
                            <span>✓ Image uploaded: {{ uploadedImage.name }}</span>
                            <button @click="clearImage"
                                class="text-destructive text-xl cursor-pointer p-1 rounded hover:bg-destructive/10"
                                type="button">✕</button>
                        </div>
                        <div v-if="extractedText" class="bg-card p-4 rounded-md text-sm">
                            <strong class="block mb-2 text-foreground">Extracted text:</strong>
                            <p class="text-muted-foreground leading-relaxed max-h-40 overflow-y-auto m-0">{{
                                extractedText }}</p>
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

                <div v-if="error" class="bg-destructive/10 text-destructive p-4 rounded-lg mt-4">
                    {{ error }}
                </div>
            </div>

            <div v-if="isGenerating" class="loading mt-8">
                <div class="spinner"></div>
                <p class="mt-4">AI is creating your deck...</p>
            </div>

            <div v-if="generatedDeck" class="mt-8 pt-8 border-t border-border">
                <h2 class="text-2xl font-semibold mb-4 text-foreground">Step 2: Review Generated Deck</h2>

                <div class="bg-secondary p-6 rounded-lg">
                    <div class="form-group">
                        <label>Deck Title</label>
                        <input v-model="generatedDeck.title" class="form-control" type="text" />
                    </div>

                    <div class="form-group">
                        <label>Tags</label>
                        <div class="flex flex-wrap gap-2">
                            <span v-for="(tag, index) in generatedDeck.tags" :key="index" class="tag tag-primary">
                                {{ tag }}
                            </span>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Lexemes ({{ generatedDeck.lexemes.length }})</label>
                        <div class="max-h-96 overflow-y-auto flex flex-col gap-4">
                            <div v-for="(lexeme, index) in generatedDeck.lexemes" :key="index"
                                class="bg-card p-4 rounded-lg grid grid-cols-[1fr_2fr_auto] gap-4 items-center">
                                <div class="font-semibold text-foreground text-lg">{{ lexeme.term }}</div>
                                <div class="text-muted-foreground">{{ lexeme.meaning }}</div>
                                <div class="bg-secondary px-3 py-1 rounded-full text-sm text-secondary-foreground">{{
                                    lexeme.POS }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-4 mt-6">
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
/* Minimal scoped styles - Tailwind handles most */
</style>
