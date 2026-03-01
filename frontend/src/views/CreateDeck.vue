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
    <div class="max-w-2xl mx-auto">
        <h1 class="text-xl font-semibold mb-6 text-foreground">Create deck</h1>

        <div class="card">
            <p class="text-sm text-muted-foreground mb-5 leading-relaxed">
                Describe what you want to learn, or upload an image with text to extract.
            </p>

            <!-- Image Upload Section -->
            <div class="mb-5">
                <label class="inline-block cursor-pointer">
                    <input type="file" accept="image/*" capture="environment" @change="handleImageUpload" class="hidden"
                        :disabled="isGenerating || isExtractingText" />
                    <span class="btn btn-secondary text-sm">
                        {{ uploadedImage ? 'Change image' : 'Upload image' }}
                    </span>
                </label>

                <div v-if="isExtractingText" class="flex items-center gap-2 mt-3 text-muted-foreground text-sm">
                    <div class="w-3.5 h-3.5 border-2 border-border border-t-primary rounded-full animate-spin"></div>
                    <span>Extracting text...</span>
                </div>

                <div v-if="uploadedImage && !isExtractingText" class="mt-3 p-3 bg-secondary border border-border"
                    style="border-radius: 0.375rem;">
                    <div class="flex justify-between items-center mb-2 text-sm text-foreground">
                        <span>{{ uploadedImage.name }}</span>
                        <button @click="clearImage"
                            class="text-destructive/70 hover:text-destructive text-sm cursor-pointer transition-colors"
                            type="button">Remove</button>
                    </div>
                    <div v-if="extractedText" class="bg-background p-3 text-sm border border-border"
                        style="border-radius: 0.25rem;">
                        <p class="text-muted-foreground leading-relaxed max-h-32 overflow-y-auto m-0">{{
                            extractedText }}</p>
                    </div>
                </div>
            </div>

            <div class="form-group">
                <label for="message">Learning goal</label>
                <textarea id="message" v-model="userMessage" class="form-control" placeholder="I want to learn..."
                    rows="4" :disabled="isGenerating"></textarea>
            </div>

            <div class="flex gap-3">
                <button @click="generateDeck" class="btn btn-primary text-sm"
                    :disabled="isGenerating || !userMessage.trim()">
                    {{ isGenerating ? 'Generating...' : 'Generate deck' }}
                </button>
                <button v-if="userMessage || uploadedImage" @click="resetForm" class="btn btn-secondary text-sm">
                    Reset
                </button>
            </div>

            <div v-if="error" class="bg-destructive/10 text-destructive p-3 text-sm mt-4"
                style="border-radius: 0.375rem;">
                {{ error }}
            </div>

            <div v-if="isGenerating" class="loading mt-6">
                <div class="spinner"></div>
                <p class="mt-3 text-sm">Generating your deck...</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles */
</style>
