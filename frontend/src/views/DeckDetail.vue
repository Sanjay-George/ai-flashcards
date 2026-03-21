<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useAuthStore } from '../stores/authStore'
import { useProgressStore } from '../stores/progressStore'
import type { Deck, Lexeme, DeckMastery } from '../types/index'

const route = useRoute()
const router = useRouter()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()
const authStore = useAuthStore()
const progressStore = useProgressStore()

const deckId = route.params.id as string
const editInstruction = ref<string>('')
const isEditing = ref<boolean>(false)
const editError = ref<string>('')
const generatingFlashcards = ref<boolean>(false)
const selectedMode = ref<'simple' | 'master'>('simple')
const sessionSize = 10
const deckMastery = ref<DeckMastery | null>(null)

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
    // Fetch mastery for owner's deck
    if (deck.value?.userId === authStore.userId) {
        deckMastery.value = await progressStore.fetchDeckMastery(deckId)
    }
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
    { code: 'fr', name: 'French' },
    { code: 'hi', name: 'Hindi' },
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
        editError.value = (e as Error)?.message || 'Failed to update visibility'
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
    <div>
        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4 text-sm">Loading deck...</p>
        </div>

        <div v-else-if="deck">
            <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                <div class="min-w-0">
                    <div class="flex flex-wrap items-center gap-2 mb-2">
                        <h1 class="text-xl font-semibold text-foreground">{{ deck.title }}</h1>
                        <span v-if="isOwner" class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                            style="border-radius: 0.25rem;">
                            Owner
                        </span>
                        <span v-else class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                            style="border-radius: 0.25rem;">
                            Public
                        </span>
                    </div>
                    <div class="flex flex-wrap gap-1.5 items-center">
                        <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                            {{ tag }}
                        </span>
                        <select v-if="isOwner" :value="deck.language || ''" @change="handleLanguageChange"
                            class="ml-1 px-2 py-0.5 text-xs bg-background border border-border focus:outline-none focus:ring-1 focus:ring-ring cursor-pointer"
                            style="border-radius: 0.25rem;" title="Reference language">
                            <option value="">No language</option>
                            <option v-for="lang in availableLanguages" :key="lang.code" :value="lang.code">
                                {{ lang.name }}
                            </option>
                        </select>
                        <span v-else-if="deck.language" class="tag">
                            {{availableLanguages.find(l => l.code === deck?.language)?.name || deck?.language}}
                        </span>

                        <button v-if="isOwner" @click="handleVisibilityToggle"
                            class="ml-1 px-2 py-0.5 text-xs border border-border transition-colors cursor-pointer hover:bg-secondary"
                            style="border-radius: 0.25rem;"
                            :title="deck.isPublic ? 'Click to make private' : 'Click to share publicly'">
                            {{ deck.isPublic ? 'Public' : 'Private' }}
                        </button>
                    </div>
                </div>
                <div class="flex gap-2 w-full sm:w-auto">
                    <button v-if="!isOwner" @click="handleClone" class="btn btn-primary flex-1 sm:flex-none text-sm">
                        Clone
                    </button>
                    <button @click="$router.back()" class="btn btn-secondary flex-1 sm:flex-none text-sm">
                        Back
                    </button>
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <!-- Lexemes List -->
                <div class="card">
                    <h2 class="text-sm font-medium mb-3 text-foreground">Lexemes ({{ deck.lexemes.length }})</h2>
                    <div class="max-h-100 sm:max-h-125 overflow-y-auto flex flex-col gap-1">
                        <div v-for="(lexeme, index) in deck.lexemes" :key="index"
                            class="p-2.5 flex items-center gap-3 border-b border-border last:border-0">
                            <div class="font-medium text-sm text-foreground min-w-20">{{ lexeme.term }}</div>
                            <div class="text-xs text-muted-foreground flex-1">{{ lexeme.meaning }}</div>
                            <div class="text-xs text-muted-foreground border border-border px-1.5 py-0.5 shrink-0"
                                style="border-radius: 0.25rem;">{{ lexeme.POS }}</div>
                            <button v-if="isOwner" @click="handleRemoveLexeme(lexeme.term)"
                                class="text-destructive/60 hover:text-destructive text-sm cursor-pointer shrink-0 transition-colors"
                                title="Remove" :disabled="hasPendingChanges">
                                &times;
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Pending Changes Preview -->
                <div v-if="hasPendingChanges" class="card border-primary border">
                    <div class="flex justify-between items-center mb-3">
                        <h2 class="text-sm font-medium text-foreground">Pending changes</h2>
                        <span class="text-xs text-muted-foreground border border-border px-2 py-0.5"
                            style="border-radius: 0.25rem;">
                            {{ pendingAction === 'add' ? 'Adding' : pendingAction === 'remove' ? 'Removing' : 'Editing'
                            }}
                        </span>
                    </div>

                    <div v-if="pendingRemovals.length > 0" class="mb-3">
                        <h3 class="text-xs font-medium text-destructive mb-1.5">Removing ({{ pendingRemovals.length }})
                        </h3>
                        <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
                            <div v-for="(lexeme, index) in pendingRemovals" :key="'remove-' + index"
                                class="bg-destructive/5 border border-destructive/20 p-2 flex items-center gap-2 text-sm"
                                style="border-radius: 0.25rem;">
                                <span class="font-medium text-destructive">{{ lexeme.term }}</span>
                                <span class="text-xs text-destructive/60 flex-1">{{ lexeme.meaning }}</span>
                                <span class="text-xs text-destructive/60">{{ lexeme.POS }}</span>
                            </div>
                        </div>
                    </div>

                    <div v-if="pendingAdditions.length > 0" class="mb-3">
                        <h3 class="text-xs font-medium text-green-700 mb-1.5">Adding ({{ pendingAdditions.length }})
                        </h3>
                        <div class="flex flex-col gap-1 max-h-48 overflow-y-auto">
                            <div v-for="(lexeme, index) in pendingAdditions" :key="'add-' + index"
                                class="bg-green-500/5 border border-green-500/20 p-2 flex items-center gap-2 text-sm"
                                style="border-radius: 0.25rem;">
                                <span class="font-medium text-green-700">{{ lexeme.term }}</span>
                                <span class="text-xs text-green-600/60 flex-1">{{ lexeme.meaning }}</span>
                                <span class="text-xs text-green-600/60">{{ lexeme.POS }}</span>
                            </div>
                        </div>
                    </div>

                    <div class="flex gap-2 pt-3 border-t border-border">
                        <button @click="undoChanges" class="btn btn-secondary flex-1 text-sm">
                            Undo
                        </button>
                        <button @click="commitChanges" class="btn btn-primary flex-1 text-sm">
                            Commit
                        </button>
                    </div>
                </div>

                <!-- Edit Deck -->
                <div v-if="!hasPendingChanges && isOwner" class="card">
                    <h2 class="text-sm font-medium mb-2 text-foreground">Edit with AI</h2>
                    <p class="text-xs text-muted-foreground mb-3 leading-relaxed">
                        e.g. "Add 10 common adjectives", "Remove food-related verbs"
                    </p>

                    <div class="form-group">
                        <textarea v-model="editInstruction" class="form-control" placeholder="Describe changes..."
                            rows="3" :disabled="isEditing"></textarea>
                    </div>

                    <button @click="handleEdit" class="btn btn-primary text-sm"
                        :disabled="isEditing || !editInstruction.trim()">
                        {{ isEditing ? 'Processing...' : 'Apply changes' }}
                    </button>
                </div>
            </div>

            <div v-if="editError" class="bg-destructive/10 text-destructive p-3 text-sm mb-4"
                style="border-radius: 0.375rem;">
                {{ editError }}
            </div>

            <!-- Deck Mastery Progress -->
            <div v-if="isOwner && deckMastery" class="card mb-4">
                <div class="flex justify-between items-center mb-3">
                    <h2 class="text-sm font-medium text-foreground">Mastery</h2>
                    <span class="text-sm font-semibold text-foreground">
                        {{ deckMastery.masteryPercent }}%
                    </span>
                </div>

                <div class="w-full h-1.5 bg-secondary overflow-hidden mb-4" style="border-radius: 1px;">
                    <div class="h-full bg-primary transition-all duration-700"
                        :style="{ width: deckMastery.masteryPercent + '%' }">
                    </div>
                </div>

                <div class="grid grid-cols-5 gap-2 text-center text-xs">
                    <div class="p-2 border border-border" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-muted-foreground">{{ deckMastery.masteryBreakdown.new
                        }}</div>
                        <div class="text-muted-foreground text-xs">New</div>
                    </div>
                    <div class="p-2 border border-border" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ deckMastery.masteryBreakdown.learning }}
                        </div>
                        <div class="text-muted-foreground text-xs">Learning</div>
                    </div>
                    <div class="p-2 border border-border" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ deckMastery.masteryBreakdown.familiar }}
                        </div>
                        <div class="text-muted-foreground text-xs">Familiar</div>
                    </div>
                    <div class="p-2 border border-border" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ deckMastery.masteryBreakdown.proficient
                        }}</div>
                        <div class="text-muted-foreground text-xs">Proficient</div>
                    </div>
                    <div class="p-2 border border-border" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ deckMastery.masteryBreakdown.mastered }}
                        </div>
                        <div class="text-muted-foreground text-xs">Mastered</div>
                    </div>
                </div>
            </div>

            <!-- Study Flashcards -->
            <div class="card">
                <h2 class="text-sm font-medium mb-3 text-foreground">Study</h2>

                <div class="grid grid-cols-2 gap-3 mb-4">
                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="simple" class="hidden peer" />
                        <div class="p-3 border border-border transition-colors peer-checked:border-primary peer-checked:bg-primary/10"
                            style="border-radius: 0.375rem;">
                            <h3 class="text-sm font-medium text-foreground peer-checked:text-primary">Simple</h3>
                            <p class="text-xs text-muted-foreground mt-0.5">Meaning recall</p>
                        </div>
                    </label>

                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="master" class="hidden peer" />
                        <div class="p-3 border border-border transition-colors peer-checked:border-primary peer-checked:bg-primary/10"
                            style="border-radius: 0.375rem;">
                            <h3 class="text-sm font-medium text-foreground peer-checked:text-primary">Master</h3>
                            <p class="text-xs text-muted-foreground mt-0.5">Context & fill-in-blank</p>
                        </div>
                    </label>
                </div>

                <div v-if="isOwner">
                    <p class="text-xs text-muted-foreground mb-3">
                        Cards selected via spaced repetition. Difficult words appear more often.
                    </p>
                    <button @click="studyWithSRS" class="btn btn-primary text-sm w-full sm:w-auto"
                        :disabled="generatingFlashcards">
                        {{ generatingFlashcards ? 'Generating...' : 'Start studying' }}
                    </button>
                </div>
                <div v-else>
                    <p class="text-xs text-muted-foreground mb-3">
                        Clone this deck to study with your own progress tracking.
                    </p>
                    <button @click="handleClone" class="btn btn-primary text-sm w-full sm:w-auto">
                        Clone to study
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal */
</style>
