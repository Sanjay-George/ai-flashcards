<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'

const router = useRouter()
const deckStore = useDeckStore()

const userMessage = ref<string>('')
const extractedText = ref<string>('')
const uploadedImage = ref<File | null>(null)
const isExtractingText = ref<boolean>(false)
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

        // Navigate to edit page with the generated deck
        router.push({
            name: 'EditGeneratedDeck',
            state: {
                // @ts-expect-error - passing object directly in state, not ideal but works for now
                generatedDeck: result,
                initialMessage: userMessage.value + (extractedText.value ? '\n\nExtracted text: ' + extractedText.value : '')
            }
        })
    } catch (e: any) {
        error.value = e.message || 'Failed to generate deck'
    } finally {
        isGenerating.value = false
    }
}

const resetForm = () => {
    userMessage.value = ''
    extractedText.value = ''
    uploadedImage.value = null
    error.value = ''
}
</script>

<template>
    <div class="max-w-4xl mx-auto">
        <h1 class="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 text-foreground">Create New Deck</h1>

        <div class="card">
            <div>
                <h2 class="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4 text-foreground">Step 1: Describe What You
                    Want to Learn</h2>
                <p class="text-sm sm:text-base text-muted-foreground mb-4 sm:mb-6 leading-relaxed">
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

                <div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <button @click="generateDeck" class="btn btn-primary w-full sm:w-auto"
                        :disabled="isGenerating || !userMessage.trim()">
                        {{ isGenerating ? 'Generating...' : '✨ Generate Deck with AI' }}
                    </button>
                    <button v-if="userMessage || uploadedImage" @click="resetForm"
                        class="btn btn-secondary w-full sm:w-auto">
                        🔄 Reset
                    </button>
                </div>

                <div v-if="error" class="bg-destructive/10 text-destructive p-4 rounded-lg mt-4">
                    {{ error }}
                </div>
            </div>

            <div v-if="isGenerating" class="loading mt-8">
                <div class="spinner"></div>
                <p class="mt-4">AI is creating your deck...</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles - Tailwind handles most */
</style>
