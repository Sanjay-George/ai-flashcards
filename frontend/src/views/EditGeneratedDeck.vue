<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import type { CreateDeckResponse, DeckPromptContext } from '../types/index'
import AppButton from '../components/ui/AppButton.vue'
import AppBadge from '../components/ui/AppBadge.vue'
import LexemeListItem from '../components/deck/LexemeListItem.vue'
import LexemeFlashcardPreview from '../components/deck/LexemeFlashcardPreview.vue'
import PendingLexemeChanges from '../components/deck/PendingLexemeChanges.vue'
import { useDeckAiEditLoop } from '../composables/useDeckAiEditLoop'
import type { Lexeme } from '../types/index'

const router = useRouter()
const deckStore = useDeckStore()

// Deck data from route state or fallback
const generatedDeck = ref<CreateDeckResponse | null>(null)
const deckTitleDraft = ref<string>('')
const titleError = ref<string>('')
const creationPrompt = ref<string>('')
const extractedText = ref<string>('')
const previewLexeme = ref<Lexeme | null>(null)

const {
    editInstruction,
    isEditing,
    editError,
    messageHistory,
    hasPendingChanges,
    pendingAction,
    pendingAdditions,
    pendingRemovals,
    handleEdit,
    commitChanges,
    undoChanges,
} = useDeckAiEditLoop({
    getDeckSnapshot: () => {
        if (!generatedDeck.value) return null
        return {
            title: generatedDeck.value.title,
            tags: generatedDeck.value.tags,
            lexemes: generatedDeck.value.lexemes,
        }
    },
    getDeckContext: (): DeckPromptContext | null => {
        if (!generatedDeck.value) return null
        return { creationPrompt: creationPrompt.value, extractedText: extractedText.value }
    },
    runEdit: (deckSnapshot, instruction, history, deckContext) =>
        deckStore.editDeckWithAI(deckSnapshot, instruction, history, deckContext),
    applyCommittedLexemes: (updatedLexemes) => {
        if (!generatedDeck.value) return
        generatedDeck.value.lexemes = updatedLexemes
    },
})

onMounted(() => {
    // Get deck data from route state
    const state = history.state as any
    if (state?.generatedDeck) {
        generatedDeck.value = state.generatedDeck
        deckTitleDraft.value = state.generatedDeck.title
        creationPrompt.value = state.initialMessage ?? ''
        extractedText.value = state.extractedText ?? ''

        // Add initial creation message to history
        if (state.initialMessage) {
            messageHistory.value.push({
                role: 'user',
                content: state.initialMessage
            })
            messageHistory.value.push({
                role: 'assistant',
                content: `Created deck "${state.generatedDeck.title}" with ${state.generatedDeck.lexemes.length} lexemes.`
            })
        }
    } else {
        // No deck data, redirect back to create
        router.push('/create')
    }
})

const handleRemoveLexeme = (term: string): void => {
    if (!generatedDeck.value) return
    if (!confirm(`Remove "${term}" from this deck?`)) return

    generatedDeck.value.lexemes = generatedDeck.value.lexemes.filter(l => l.term !== term)
}

const applyTitleEdit = (): boolean => {
    if (!generatedDeck.value) return false

    const normalizedTitle = deckTitleDraft.value.trim()
    if (!normalizedTitle) {
        titleError.value = 'Title cannot be empty'
        return false
    }

    generatedDeck.value.title = normalizedTitle
    deckTitleDraft.value = normalizedTitle
    titleError.value = ''
    return true
}

const clearTitleError = (): void => {
    if (titleError.value) {
        titleError.value = ''
    }
}

const saveDeck = async () => {
    if (!generatedDeck.value) return

    if (!applyTitleEdit()) return

    try {
        const deck = await deckStore.createDeck({
            ...generatedDeck.value,
            promptContext: {
                creationPrompt: creationPrompt.value,
                extractedText: extractedText.value,
                editHistory: [],
            },
        })
        router.push(`/deck/${deck._id}`)
    } catch (e: any) {
        editError.value = e.message || 'Failed to save deck'
    }
}

const goBack = () => {
    if (confirm('Are you sure? Your generated deck will be lost.')) {
        router.push('/create')
    }
}

// Language display helper
const languageNames: Record<string, string> = {
    de: 'German',
    fr: 'French',
    hi: 'Hindi',
}

const getLanguageName = (code: string): string => {
    return languageNames[code] || code.toUpperCase()
}
</script>

<template>
    <div>
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 class="text-xl font-semibold text-foreground">Edit generated deck</h1>
            <AppButton variant="secondary" size="sm" class="w-full sm:w-auto" @click="goBack">Back</AppButton>
        </div>

        <div v-if="generatedDeck" class="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <!-- Left Column: Deck Info & Lexemes -->
            <div class="card">
                <h2 class="text-sm font-medium mb-3 text-foreground">Preview</h2>

                <div class="form-group">
                    <label>Title</label>
                    <div class="flex flex-col sm:flex-row gap-2">
                        <input
                            v-model="deckTitleDraft"
                            class="form-control flex-1"
                            type="text"
                            placeholder="Enter deck title"
                            @input="clearTitleError"
                            @blur="applyTitleEdit"
                            @keydown.enter.prevent="applyTitleEdit"
                        />
                        <!-- <AppButton variant="secondary" class="shrink-0" @click="applyTitleEdit">Apply title</AppButton> -->
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">Edit title manually before saving the deck.</p>
                    <p v-if="titleError" class="text-xs text-destructive mt-1">{{ titleError }}</p>
                </div>

                <div class="form-group">
                    <label>Tags</label>
                    <div class="flex flex-wrap gap-2 items-center">
                        <AppBadge
                            v-for="(tag, index) in generatedDeck.tags"
                            :key="index"
                            variant="primary"
                            size="sm"
                        >
                            {{ tag }}
                        </AppBadge>
                        <AppBadge v-if="generatedDeck.language" size="sm">
                            {{ getLanguageName(generatedDeck.language) }}
                        </AppBadge>
                    </div>
                </div>

                <div class="form-group">
                    <label>Lexemes ({{ generatedDeck.lexemes.length }})</label>
                    <div class="max-h-100 sm:max-h-125 overflow-y-auto flex flex-col">
                        <LexemeListItem
                            v-for="(lexeme, index) in generatedDeck.lexemes"
                            :key="`${lexeme.term}-${index}`"
                            :lexeme="lexeme"
                            removable
                            :disabled="hasPendingChanges"
                            @remove="handleRemoveLexeme"
                        />
                    </div>
                </div>

                <div class="mt-4">
                    <AppButton :disabled="hasPendingChanges" @click="saveDeck">Save deck</AppButton>
                </div>
            </div>

            <!-- Right Column: AI Edit Loop -->
            <div class="space-y-4">
                <PendingLexemeChanges
                    v-if="hasPendingChanges"
                    :pending-action="pendingAction"
                    :pending-additions="pendingAdditions"
                    :pending-removals="pendingRemovals"
                    @undo="undoChanges"
                    @commit="commitChanges"
                    @view="previewLexeme = $event"
                />

                <div v-else class="card">
                    <h2 class="text-sm font-medium mb-2 text-foreground">Edit with AI</h2>
                    <p class="text-xs text-muted-foreground mb-3 leading-relaxed">
                        e.g. "Add 10 common adjectives", "Remove food-related verbs"
                    </p>

                    <div class="form-group">
                        <textarea
                            v-model="editInstruction"
                            class="form-control"
                            placeholder="Describe changes..."
                            rows="3"
                            :disabled="isEditing"
                        ></textarea>
                    </div>

                    <AppButton
                        :disabled="isEditing || !editInstruction.trim()"
                        @click="handleEdit"
                    >
                        {{ isEditing ? 'Processing...' : 'Apply changes' }}
                    </AppButton>
                </div>

                <div v-if="editError" class="bg-destructive/10 text-destructive p-3 text-sm"
                    style="border-radius: 0.375rem;">
                    {{ editError }}
                </div>
            </div>
        </div>
    </div>

    <Teleport to="body">
        <div
            v-if="previewLexeme"
            class="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex items-center justify-center"
            role="dialog"
            aria-modal="true"
            aria-label="Lexeme preview"
            @click.self="previewLexeme = null"
        >
            <div class="w-full max-w-xl bg-card border border-border p-4 sm:p-5" style="border-radius: 0.5rem;">
                <div class="flex items-center justify-between gap-2 mb-3">
                    <h3 class="text-sm font-medium text-foreground">Lexeme preview</h3>
                    <AppButton size="xs" variant="secondary" @click="previewLexeme = null">Close</AppButton>
                </div>
                <LexemeFlashcardPreview :lexeme="previewLexeme" />
            </div>
        </div>
    </Teleport>
</template>
