<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useAuthStore } from '../stores/authStore'
import type { Deck, Lexeme } from '../types/index'

const route = useRoute()
const router = useRouter()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()
const authStore = useAuthStore()

const deckId = route.params.id as string
const editInstruction = ref<string>('')
const isEditing = ref<boolean>(false)
const editError = ref<string>('')
const generatingFlashcards = ref<boolean>(false)
const selectedMode = ref<'simple' | 'master'>('simple')
const sessionSize = 10

// Pending changes state
const hasPendingChanges = ref<boolean>(false)
const pendingAction = ref<'add' | 'remove' | 'edit' | null>(null)
const pendingAdditions = ref<Lexeme[]>([])
const pendingRemovals = ref<Lexeme[]>([])
const originalLexemes = ref<Lexeme[]>([])

// Message history for AI context (optional for existing decks)
interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}
const messageHistory = ref<ChatMessage[]>([])

// Ownership check
const isOwner = computed(() => deck.value?.userId === authStore.userId)

onMounted(async () => {
    await deckStore.fetchDeck(deckId)
})

const deck = computed<Deck | null>(() => deckStore.currentDeck)

const handleEdit = async (): Promise<void> => {
    if (!editInstruction.value.trim() || !deck.value) return

    isEditing.value = true
    editError.value = ''

    try {
        // Add user message to history
        messageHistory.value.push({
            role: 'user',
            content: editInstruction.value
        })

        const result = await deckStore.editDeckWithAI(
            {
                title: deck.value.title,
                tags: deck.value.tags,
                lexemes: deck.value.lexemes
            },
            editInstruction.value,
            messageHistory.value
        )

        // Store original state and set pending changes
        originalLexemes.value = [...deck.value.lexemes]
        pendingAction.value = result.action

        if (result.action === 'add') {
            pendingAdditions.value = result.updated_lexemes
            pendingRemovals.value = []
            messageHistory.value.push({
                role: 'assistant',
                content: `Adding ${result.updated_lexemes.length} new lexeme(s).`
            })
        } else if (result.action === 'remove') {
            const termsToRemove = result.updated_lexemes.map((l: Lexeme) => l.term)
            pendingRemovals.value = deck.value.lexemes.filter((l: Lexeme) => termsToRemove.includes(l.term))
            pendingAdditions.value = []
            messageHistory.value.push({
                role: 'assistant',
                content: `Removing ${pendingRemovals.value.length} lexeme(s).`
            })
        } else if (result.action === 'edit') {
            // For edits, show old as removal and new as addition
            const editedTerms = result.updated_lexemes.map((l: Lexeme) => l.term)
            pendingRemovals.value = deck.value.lexemes.filter((l: Lexeme) => editedTerms.includes(l.term))
            pendingAdditions.value = result.updated_lexemes
            messageHistory.value.push({
                role: 'assistant',
                content: `Editing ${result.updated_lexemes.length} lexeme(s).`
            })
        }

        hasPendingChanges.value = true
        editInstruction.value = ''
    } catch (e: any) {
        editError.value = e.message || 'Failed to edit deck'
        // Remove the user message if there was an error
        messageHistory.value.pop()
    } finally {
        isEditing.value = false
    }
}

const commitChanges = async (): Promise<void> => {
    if (!deck.value || !hasPendingChanges.value) return

    try {
        let updatedLexemes = [...deck.value.lexemes]

        if (pendingAction.value === 'add') {
            updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
        } else if (pendingAction.value === 'remove') {
            const termsToRemove = pendingRemovals.value.map((l: Lexeme) => l.term)
            updatedLexemes = updatedLexemes.filter((l: Lexeme) => !termsToRemove.includes(l.term))
        } else if (pendingAction.value === 'edit') {
            // Remove old versions and add new ones
            const termsToUpdate = pendingAdditions.value.map((l: Lexeme) => l.term)
            updatedLexemes = updatedLexemes.filter((l: Lexeme) => !termsToUpdate.includes(l.term))
            updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
        }

        await deckStore.updateDeck(deckId, { lexemes: updatedLexemes })
        clearPendingChanges()
    } catch (e: any) {
        editError.value = e.message || 'Failed to apply changes'
    }
}

const undoChanges = (): void => {
    clearPendingChanges()
    // Remove last two messages (user instruction and assistant response)
    if (messageHistory.value.length >= 2) {
        messageHistory.value.splice(-2)
    }
}

const clearPendingChanges = (): void => {
    hasPendingChanges.value = false
    pendingAction.value = null
    pendingAdditions.value = []
    pendingRemovals.value = []
    originalLexemes.value = []
}

// Study with SRS - generates flashcards on-the-fly from due lexemes
const studyWithSRS = async (): Promise<void> => {
    if (!deck.value) return

    generatingFlashcards.value = true

    try {
        // Fetch lexemes due for review using spaced repetition
        const dueLexemes = await deckStore.fetchDueLexemes(deckId, sessionSize)

        if (dueLexemes.length === 0) {
            editError.value = 'No lexemes available for review!'
            return
        }

        // Generate flashcards dynamically with selected mode
        const result = await flashcardStore.generateFlashcards(
            {
                title: deck.value.title,
                lexemes: dueLexemes
            },
            selectedMode.value
        )

        // Create session flashcards (not saved to DB, just for the session)
        const sessionCards = result.flashcards.map((fc: any, index: number) => ({
            _id: `session-${index}-${Date.now()}`, // Temporary ID
            deckId: deckId,
            lexemeId: dueLexemes[index % dueLexemes.length].term,
            question: fc.question,
            answer: fc.answer,
            pattern: fc.pattern,
            mode: selectedMode.value,
            ratings: [],
            // Include lexeme data for rating
            lexeme: dueLexemes[index % dueLexemes.length]
        }))

        flashcardStore.setSessionFlashcards(sessionCards)
        router.push(`/study/${deckId}`)
    } catch (e: any) {
        editError.value = e.message || 'Failed to generate flashcards'
    } finally {
        generatingFlashcards.value = false
    }
}

const handleRemoveLexeme = async (term: string): Promise<void> => {
    if (!confirm(`Remove "${term}" from this deck?`)) return

    try {
        await deckStore.removeLexeme(deckId, term)
    } catch (e: any) {
        editError.value = e.message || 'Failed to remove lexeme'
    }
}

// Available languages with their display names
const availableLanguages = [
    { code: 'de', name: 'German' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'it', name: 'Italian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'nl', name: 'Dutch' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese' },
    { code: 'ko', name: 'Korean' },
]

const handleLanguageChange = async (event: Event): Promise<void> => {
    const target = event.target as HTMLSelectElement
    const newLanguage = target.value || undefined

    try {
        await deckStore.updateDeck(deckId, { language: newLanguage })
    } catch (e: any) {
        editError.value = e.message || 'Failed to update language'
    }
}

// Toggle deck visibility (public/private)
const handleVisibilityToggle = async (): Promise<void> => {
    if (!deck.value) return
    try {
        await deckStore.toggleVisibility(deckId, !deck.value.isPublic)
    } catch (e: unknown) {
        editError.value = e.message || 'Failed to update visibility'
    }
}

// Clone deck (for non-owners)
const handleClone = async (): Promise<void> => {
    if (!authStore.isAuthenticated) {
        router.push('/login')
        return
    }
    try {
        const clonedDeck = await deckStore.cloneDeck(deckId)
        router.push(`/deck/${clonedDeck._id}`)
    } catch (e: any) {
        editError.value = e.message || 'Failed to clone deck'
    }
}
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4">Loading deck...</p>
        </div>

        <div v-else-if="deck">
            <div class="flex justify-between items-start mb-8">
                <div>
                    <div class="flex items-center gap-3 mb-2">
                        <h1 class="text-3xl font-bold text-foreground">{{ deck.title }}</h1>
                        <!-- Ownership & visibility badges -->
                        <span v-if="isOwner"
                            class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Owner
                        </span>
                        <span v-else
                            class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Public
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-2 items-center">
                        <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                            {{ tag }}
                        </span>
                        <!-- Language Selector (owner only) -->
                        <select v-if="isOwner" :value="deck.language || ''" @change="handleLanguageChange"
                            class="ml-2 px-3 py-1 text-sm bg-secondary border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
                            title="Reference language">
                            <option value="">No language</option>
                            <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
                                {{ lang.name }}
                            </option>
                        </select>
                        <span v-else-if="deck.language"
                            class="tag bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            🌐 {{availableLanguages.find(l => l.code === deck?.language)?.name || deck?.language}}
                        </span>

                        <!-- Visibility Toggle (owner only) -->
                        <button v-if="isOwner" @click="handleVisibilityToggle"
                            class="ml-2 px-3 py-1 text-sm rounded-lg border transition-colors" :class="deck.isPublic
                                ? 'bg-purple-100 border-purple-300 text-purple-700 dark:bg-purple-900/30 dark:border-purple-700 dark:text-purple-300'
                                : 'bg-secondary border-border text-muted-foreground hover:bg-accent'"
                            :title="deck.isPublic ? 'Click to make private' : 'Click to share publicly'">
                            {{ deck.isPublic ? '🌐 Public' : '🔒 Private' }}
                        </button>
                    </div>
                </div>
                <div class="flex gap-2">
                    <!-- Clone button (non-owners) -->
                    <button v-if="!isOwner" @click="handleClone" class="btn btn-primary">
                        Clone to Study
                    </button>
                    <button @click="$router.back()" class="btn btn-secondary">
                        Back to List
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <!-- Lexemes List -->
                <div class="card">
                    <h2 class="text-2xl font-semibold mb-4 text-foreground">Lexemes ({{ deck.lexemes.length }})</h2>
                    <div class="max-h-[500px] overflow-y-auto flex flex-col gap-3">
                        <div v-for="(lexeme, index) in deck.lexemes" :key="index"
                            class="bg-secondary p-4 rounded-lg grid gap-4 items-center"
                            :class="isOwner ? 'grid-cols-[1fr_2fr_auto_auto]' : 'grid-cols-[1fr_2fr_auto]'">
                            <div class="font-semibold text-foreground">{{ lexeme.term }}</div>
                            <div class="text-muted-foreground">{{ lexeme.meaning }}</div>
                            <div class="bg-border px-3 py-1 rounded-full text-sm">{{ lexeme.POS }}</div>
                            <button v-if="isOwner" @click="handleRemoveLexeme(lexeme.term)"
                                class="text-destructive text-2xl cursor-pointer p-1 rounded hover:bg-destructive/10 transition-all"
                                title="Remove word" :disabled="hasPendingChanges">
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Pending Changes Preview -->
                <div v-if="hasPendingChanges" class="card border-2 border-primary">
                    <div class="flex justify-between items-center mb-4">
                        <h2 class="text-2xl font-semibold text-foreground">Pending Changes</h2>
                        <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium">
                            {{ pendingAction === 'add' ? 'Adding' : pendingAction === 'remove' ? 'Removing' : 'Editing'
                            }}
                        </span>
                    </div>

                    <!-- Removals (shown in red) -->
                    <div v-if="pendingRemovals.length > 0" class="mb-4">
                        <h3 class="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-destructive"></span>
                            Will be removed ({{ pendingRemovals.length }})
                        </h3>
                        <div class="flex flex-col gap-2 max-h-92 overflow-y-auto">
                            <div v-for="(lexeme, index) in pendingRemovals" :key="'remove-' + index"
                                class="bg-destructive/10 border border-destructive/30 p-3 rounded-lg grid grid-cols-[1fr_2fr_auto] gap-3 items-center">
                                <div class="font-semibold text-destructive">{{ lexeme.term }}</div>
                                <div class="text-destructive/70">{{ lexeme.meaning }}</div>
                                <div class="bg-destructive/20 px-2 py-0.5 rounded-full text-xs text-destructive">{{
                                    lexeme.POS }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Additions (shown in green) -->
                    <div v-if="pendingAdditions.length > 0" class="mb-4">
                        <h3 class="text-sm font-semibold text-green-600 mb-2 flex items-center gap-2">
                            <span class="w-3 h-3 rounded-full bg-green-500"></span>
                            Will be added ({{ pendingAdditions.length }})
                        </h3>
                        <div class="flex flex-col gap-2 max-h-92 overflow-y-auto">
                            <div v-for="(lexeme, index) in pendingAdditions" :key="'add-' + index"
                                class="bg-green-500/10 border border-green-500/30 p-3 rounded-lg grid grid-cols-[1fr_2fr_auto] gap-3 items-center">
                                <div class="font-semibold text-green-700">{{ lexeme.term }}</div>
                                <div class="text-green-600/70">{{ lexeme.meaning }}</div>
                                <div class="bg-green-500/20 px-2 py-0.5 rounded-full text-xs text-green-700">{{
                                    lexeme.POS }}</div>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="flex gap-3 pt-4 border-t border-border">
                        <button @click="undoChanges" class="btn btn-secondary flex-1">
                            ✕ Undo
                        </button>
                        <button @click="commitChanges" class="btn btn-primary flex-1">
                            ✓ Commit Changes
                        </button>
                    </div>
                </div>

                <!-- Edit Deck (only show when no pending changes and user is owner) -->
                <div v-if="!hasPendingChanges && isOwner" class="card">
                    <h2 class="text-2xl font-semibold mb-4 text-foreground">Edit Deck with AI</h2>
                    <p class="text-muted-foreground text-sm mb-4 leading-relaxed">
                        Tell the AI how to modify your deck. Examples:<br />
                        • "Add 10 more common adjectives"<br />
                        • "Remove verbs related to food"<br />
                        • "Add greetings and farewells"
                    </p>

                    <div class="form-group">
                        <textarea v-model="editInstruction" class="form-control"
                            placeholder="Add more words, remove specific words, etc..." rows="3"
                            :disabled="isEditing"></textarea>
                    </div>

                    <button @click="handleEdit" class="btn btn-primary"
                        :disabled="isEditing || !editInstruction.trim()">
                        {{ isEditing ? 'Processing...' : 'Apply Changes' }}
                    </button>
                </div>
            </div>

            <!-- Error message (shown regardless of pending state) -->
            <div v-if="editError" class="bg-destructive/10 text-destructive p-3 rounded-lg mb-6">
                {{ editError }}
            </div>

            <!-- Study Flashcards -->
            <div class="card text-center">
                <h2 class="text-2xl font-semibold mb-4 text-foreground">Study Flashcards</h2>
                <p class="text-muted-foreground text-sm mb-6">
                    Choose your mode and start studying with spaced repetition
                </p>

                <!-- Mode Selection -->
                <div class="grid grid-cols-2 gap-4 mb-6">
                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="simple" class="hidden peer" />
                        <div
                            class="bg-secondary p-6 rounded-lg border-2 border-border transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                            <h3 class="text-xl font-semibold mb-2 text-foreground">Simple Mode</h3>
                            <p class="text-muted-foreground text-sm">Direct meaning recall questions</p>
                        </div>
                    </label>

                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="master" class="hidden peer" />
                        <div
                            class="bg-secondary p-6 rounded-lg border-2 border-border transition-all peer-checked:border-primary peer-checked:bg-primary/5">
                            <h3 class="text-xl font-semibold mb-2 text-foreground">Master Mode</h3>
                            <p class="text-muted-foreground text-sm">Contextual usage and fill-in-the-blank</p>
                        </div>
                    </label>
                </div>

                <!-- Study Button (owner only) or Clone prompt -->
                <div class="p-6 bg-secondary rounded-lg">
                    <div v-if="isOwner">
                        <p class="text-muted-foreground text-sm mb-4">
                            📚 Cards are selected using spaced repetition. Difficult words appear more often, mastered
                            words
                            less frequently.
                        </p>
                        <button @click="studyWithSRS" class="btn btn-primary px-8 py-4 text-lg"
                            :disabled="generatingFlashcards">
                            {{ generatingFlashcards ? 'Generating...' : 'Start Studying' }}
                        </button>
                    </div>
                    <div v-else class="text-center">
                        <p class="text-muted-foreground mb-4">
                            🔒 Clone this deck to study with your own progress tracking
                        </p>
                        <button @click="handleClone" class="btn btn-primary px-8 py-4 text-lg">
                            Clone Deck to Study
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
