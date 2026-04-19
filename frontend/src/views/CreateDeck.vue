<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'

const router = useRouter()
const deckStore = useDeckStore()

const userMessage = ref<string>('')
const uploadedFiles = ref<File[]>([])
const isGenerating = ref<boolean>(false)
const progressLabel = ref<string>('')
const error = ref<string>('')

const addFiles = (event: Event) => {
    const target = event.target as HTMLInputElement
    const incoming = Array.from(target.files ?? [])
    const existingNames = new Set(uploadedFiles.value.map(f => f.name))
    uploadedFiles.value.push(...incoming.filter(f => !existingNames.has(f.name)))
    target.value = '' // reset so the same file can be re-selected after removal
}

const removeFile = (index: number) => {
    uploadedFiles.value.splice(index, 1)
}

const generateDeck = async () => {
    if (!userMessage.value.trim()) {
        error.value = 'Please enter a message'
        return
    }

    error.value = ''
    isGenerating.value = true

    try {
        let extractedText: string | undefined

        if (uploadedFiles.value.length > 0) {
            progressLabel.value = 'Extracting text...'
            const texts = await Promise.all(
                uploadedFiles.value.map(async (file) => {
                    try {
                        return await deckStore.extractTextFromImage(file)
                    } catch {
                        throw new Error(`Failed to extract text from "${file.name}"`)
                    }
                })
            )
            extractedText = texts.join('\n\n---\n\n')
        }

        progressLabel.value = 'Generating deck...'
        const result = await deckStore.createDeckFromText(userMessage.value, extractedText)

        router.push({
            name: 'EditGeneratedDeck',
            state: {
                // @ts-expect-error - passing object directly in state, not ideal but works for now
                generatedDeck: result,
                initialMessage: userMessage.value + (extractedText ? '\n\nExtracted text: ' + extractedText : '')
            }
        })
    } catch (e: any) {
        error.value = e.message || 'Failed to generate deck'
    } finally {
        isGenerating.value = false
        progressLabel.value = ''
    }
}

const resetForm = () => {
    userMessage.value = ''
    uploadedFiles.value = []
    error.value = ''
}
</script>

<template>
    <div class="max-w-2xl mx-auto">
        <h1 class="text-xl font-semibold mb-6 text-foreground">Create deck</h1>

        <div class="card">
            <p class="text-sm text-muted-foreground mb-5 leading-relaxed">
                Upload images and describe your learning goal, then generate your deck.
            </p>

            <!-- Image Upload Section -->
            <div class="mb-5">
                <div class="flex gap-2">
                    <label class="inline-block cursor-pointer">
                        <input type="file" accept="image/*" multiple @change="addFiles" class="hidden"
                            :disabled="isGenerating" />
                        <span class="btn btn-secondary text-sm">Add images</span>
                    </label>
                    <label class="inline-block cursor-pointer">
                        <input type="file" accept="image/*" capture="environment" @change="addFiles" class="hidden"
                            :disabled="isGenerating" />
                        <span class="btn btn-secondary text-sm">Take photo</span>
                    </label>
                </div>

                <ul v-if="uploadedFiles.length > 0" class="mt-3 space-y-1">
                    <li v-for="(file, i) in uploadedFiles" :key="file.name"
                        class="flex justify-between items-center px-3 py-2 bg-secondary border border-border text-sm"
                        style="border-radius: 0.375rem;">
                        <span class="text-foreground truncate mr-3">{{ file.name }}</span>
                        <button @click="removeFile(i)"
                            class="text-destructive/70 hover:text-destructive cursor-pointer transition-colors shrink-0"
                            type="button" :disabled="isGenerating">Remove</button>
                    </li>
                </ul>
            </div>

            <div class="form-group">
                <label for="message">Learning goal</label>
                <textarea id="message" v-model="userMessage" class="form-control" placeholder="I want to learn..."
                    rows="4" :disabled="isGenerating"></textarea>
            </div>

            <div class="flex gap-3">
                <button @click="generateDeck" class="btn btn-primary text-sm"
                    :disabled="isGenerating || !userMessage.trim()">
                    {{ isGenerating ? progressLabel : 'Generate deck' }}
                </button>
                <button v-if="userMessage || uploadedFiles.length" @click="resetForm"
                    class="btn btn-secondary text-sm" :disabled="isGenerating">
                    Reset
                </button>
            </div>

            <div v-if="error" class="bg-destructive/10 text-destructive p-3 text-sm mt-4"
                style="border-radius: 0.375rem;">
                {{ error }}
            </div>

            <div v-if="isGenerating" class="loading mt-6">
                <div class="spinner"></div>
                <p class="mt-3 text-sm">{{ progressLabel }}</p>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles */
</style>
