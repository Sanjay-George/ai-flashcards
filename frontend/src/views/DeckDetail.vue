<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useAuthStore } from '../stores/authStore'
import { useProgressStore } from '../stores/progressStore'
import type { Deck, DeckMastery, Lexeme } from '../types/index'
import { useDeckAiEditLoop } from '../composables/useDeckAiEditLoop'
import AppButton from '../components/ui/AppButton.vue'
import IconButton from '../components/ui/IconButton.vue'
import LexemeListItem from '../components/deck/LexemeListItem.vue'
import LexemeFlashcardPreview from '../components/deck/LexemeFlashcardPreview.vue'
import PendingLexemeChanges from '../components/deck/PendingLexemeChanges.vue'

const route = useRoute()
const router = useRouter()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()
const authStore = useAuthStore()
const progressStore = useProgressStore()

const deckId = route.params.id as string
const isEditingTitle = ref<boolean>(false)
const titleDraft = ref<string>('')
const titleError = ref<string>('')
const generatingFlashcards = ref<boolean>(false)
const selectedMode = ref<'simple' | 'flip' | 'master'>('simple')
const sessionSize = 10
const deckMastery = ref<DeckMastery | null>(null)
const previewLexeme = ref<Lexeme | null>(null)

const deck = computed<Deck | null>(() => deckStore.currentDeck)

const {
    editInstruction,
    isEditing,
    editError,
    hasPendingChanges,
    pendingAction,
    pendingAdditions,
    pendingRemovals,
    handleEdit,
    commitChanges,
    undoChanges,
} = useDeckAiEditLoop({
    getDeckSnapshot: () => {
        if (!deck.value) return null
        return {
            title: deck.value.title,
            tags: deck.value.tags,
            lexemes: deck.value.lexemes,
        }
    },
    getDeckContext: () => deck.value?.promptContext ?? null,
    runEdit: (deckSnapshot, instruction, history, deckContext) =>
        deckStore.editDeckWithAI(deckSnapshot, instruction, history, deckContext),
    applyCommittedLexemes: async (updatedLexemes, instruction) => {
        const existing = deck.value?.promptContext
        await deckStore.updateDeck(deckId, {
            lexemes: updatedLexemes,
            promptContext: {
                ...existing,
                editHistory: [...(existing?.editHistory ?? []), instruction],
            },
        })
    },
})

// Ownership check
const isOwner = computed(() => deck.value?.userId === authStore.userId)

onMounted(async () => {
    await deckStore.fetchDeck(deckId)
    // Fetch mastery for owner's deck
    if (deck.value?.userId === authStore.userId) {
        deckMastery.value = await progressStore.fetchDeckMastery(deckId)
    }
})

watch(
    () => deck.value?.title,
    (newTitle) => {
        if (newTitle && !isEditingTitle.value) {
            titleDraft.value = newTitle
        }
    },
    { immediate: true }
)

const startTitleEdit = (): void => {
    if (!deck.value) return
    titleDraft.value = deck.value.title
    titleError.value = ''
    isEditingTitle.value = true
}

const cancelTitleEdit = (): void => {
    if (!deck.value) return
    titleDraft.value = deck.value.title
    titleError.value = ''
    isEditingTitle.value = false
}

const saveTitleEdit = async (): Promise<void> => {
    if (!deck.value) return

    const normalizedTitle = titleDraft.value.trim()
    if (!normalizedTitle) {
        titleError.value = 'Title cannot be empty'
        return
    }

    try {
        await deckStore.updateDeck(deckId, { title: normalizedTitle })
        titleError.value = ''
        isEditingTitle.value = false
    } catch (e: any) {
        titleError.value = e.message || 'Failed to update title'
    }
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

        let sessionCards: any[]

        if (selectedMode.value === 'simple' || selectedMode.value === 'flip') {
            // Rule-based: no AI — directly map lexemes to flashcards
            sessionCards = dueLexemes.map((lexeme, index) => ({
                _id: `session-${index}-${Date.now()}`,
                deckId: deckId,
                lexemeId: lexeme.term,
                question: selectedMode.value === 'flip' ? lexeme.meaning : lexeme.term,
                answer: selectedMode.value === 'flip' ? lexeme.term : lexeme.meaning,
                mode: selectedMode.value,
                ratings: [],
                lexeme,
            }))
        } else {
            // Custom (master) mode: AI-generated flashcards
            const result = await flashcardStore.generateFlashcards(
                {
                    title: deck.value.title,
                    lexemes: dueLexemes
                },
                'master',
                deck.value.promptContext
            )

            sessionCards = result.flashcards.map((fc: any, index: number) => ({
                _id: `session-${index}-${Date.now()}`,
                deckId: deckId,
                lexemeId: dueLexemes[index % dueLexemes.length].term,
                question: fc.question,
                answer: fc.answer,
                pattern: fc.pattern,
                mode: selectedMode.value,
                ratings: [],
                lexeme: dueLexemes[index % dueLexemes.length]
            }))
        }

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
        if (previewLexeme.value?.term === term) {
            previewLexeme.value = null
        }
    } catch (e: any) {
        editError.value = e.message || 'Failed to remove lexeme'
    }
}

const openLexemePreview = (lexeme: Lexeme): void => {
    previewLexeme.value = lexeme
}

const closeLexemePreview = (): void => {
    previewLexeme.value = null
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
            <div class="mb-6 space-y-3">
                <div class="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-3">
                    <div class="min-w-0 flex-1 space-y-1">
                        <template v-if="isOwner && isEditingTitle">
                            <div class="flex flex-col sm:flex-row gap-2 sm:items-center">
                                <input
                                    v-model="titleDraft"
                                    class="form-control text-sm flex-1"
                                    type="text"
                                    placeholder="Enter deck title"
                                    @keydown.enter.prevent="saveTitleEdit"
                                    @keydown.esc.prevent="cancelTitleEdit"
                                />
                                <div class="flex gap-2">
                                    <AppButton size="sm" @click="saveTitleEdit">Save title</AppButton>
                                    <AppButton size="sm" variant="secondary" @click="cancelTitleEdit">Cancel</AppButton>
                                </div>
                            </div>
                        </template>
                        <template v-else>
                            <div class="flex items-start gap-1.5">
                                <h1 class="text-xl font-semibold text-foreground leading-tight wrap-break-word flex-1">{{ deck.title }}</h1>
                                <div v-if="isOwner" class="flex items-center gap-1">
                                    <IconButton
                                        @click="handleVisibilityToggle"
                                        :title="deck.isPublic ? 'Make private' : 'Share publicly'"
                                        :aria-label="deck.isPublic ? 'Make private' : 'Share publicly'"
                                    >
                                        <svg
                                            v-if="deck.isPublic"
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        >
                                            <circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7" />
                                            <path d="M3 12h18M12 3c2.5 2.5 4 5.6 4 9s-1.5 6.5-4 9c-2.5-2.5-4-5.6-4-9s1.5-6.5 4-9Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                        <svg
                                            v-else
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        >
                                            <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.7" />
                                            <path d="M8 10V8a4 4 0 1 1 8 0v2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" />
                                        </svg>
                                    </IconButton>
                                    <IconButton
                                        @click="startTitleEdit"
                                        title="Edit title"
                                    >
                                        <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="h-4 w-4"
                                            aria-hidden="true"
                                        >
                                            <path d="M4 20h4l10-10a2 2 0 0 0-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                                            <path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    </IconButton>
                                </div>
                            </div>
                        </template>

                        <div class="flex flex-wrap items-center gap-2">
                            <!--
                            <AppBadge v-if="isOwner" size="sm">Owner</AppBadge>
                            <AppBadge v-else size="sm">Public</AppBadge>
                            -->
                            <!--
                            <AppButton
                                v-if="isOwner && !isEditingTitle"
                                @click="startTitleEdit"
                                variant="secondary"
                                size="sm"
                                class="gap-1.5"
                            >
                                <svg
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    class="h-3.5 w-3.5"
                                    aria-hidden="true"
                                >
                                    <path d="M4 20h4l10-10a2 2 0 0 0-4-4L4 16v4Z" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                                    <path d="m13.5 6.5 4 4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                                Edit title
                            </AppButton>
                            -->
                        </div>

                        <p v-if="titleError" class="text-xs text-destructive">{{ titleError }}</p>
                    </div>

                    <div class="flex gap-2 w-full sm:w-auto sm:justify-end">
                        <AppButton v-if="!isOwner" @click="handleClone" class="flex-1 sm:flex-none">
                            Clone
                        </AppButton>
                        <AppButton variant="secondary" size="sm" @click="$router.back()" class="flex-1 sm:flex-none">
                            Back
                        </AppButton>
                    </div>
                </div>

                <!--
                <div class="flex flex-wrap gap-2 items-center">
                    <AppBadge v-for="tag in deck.tags" :key="tag" variant="primary" size="sm">
                        {{ tag }}
                    </AppBadge>
                </div>
                -->
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                <!-- Lexemes List -->
                <div class="card">
                    <h2 class="text-sm font-medium mb-3 text-foreground">Lexemes ({{ deck.lexemes.length }})</h2>
                    <div class="max-h-100 sm:max-h-125 overflow-y-auto flex flex-col">
                        <LexemeListItem
                            v-for="(lexeme, index) in deck.lexemes"
                            :key="index"
                            :lexeme="lexeme"
                            :removable="isOwner"
                            :viewable="true"
                            :disabled="hasPendingChanges"
                            @remove="handleRemoveLexeme"
                            @view="openLexemePreview"
                        />
                    </div>
                </div>

                <!-- Pending Changes Preview -->
                <PendingLexemeChanges
                    v-if="hasPendingChanges"
                    :pending-action="pendingAction"
                    :pending-additions="pendingAdditions"
                    :pending-removals="pendingRemovals"
                    @undo="undoChanges"
                    @commit="commitChanges"
                    @view="openLexemePreview"
                />

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

                    <AppButton @click="handleEdit"
                        :disabled="isEditing || !editInstruction.trim()">
                        {{ isEditing ? 'Processing...' : 'Apply changes' }}
                    </AppButton>
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

                <div class="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="simple" class="hidden peer" />
                        <div class="p-3 border border-border transition-colors peer-checked:border-primary peer-checked:bg-primary/10"
                            style="border-radius: 0.375rem;">
                            <h3 class="text-sm font-medium text-foreground peer-checked:text-primary">Simple</h3>
                            <p class="text-xs text-muted-foreground mt-0.5">Term → meaning</p>
                        </div>
                    </label>

                    <label class="cursor-pointer">
                        <input type="radio" v-model="selectedMode" value="flip" class="hidden peer" />
                        <div class="p-3 border border-border transition-colors peer-checked:border-primary peer-checked:bg-primary/10"
                            style="border-radius: 0.375rem;">
                            <h3 class="text-sm font-medium text-foreground peer-checked:text-primary">Flip</h3>
                            <p class="text-xs text-muted-foreground mt-0.5">Meaning → term</p>
                        </div>
                    </label>

                    <label class="cursor-pointer col-span-2 sm:col-span-1">
                        <input type="radio" v-model="selectedMode" value="master" class="hidden peer" />
                        <div class="p-3 border border-border transition-colors peer-checked:border-primary peer-checked:bg-primary/10 sm:text-left text-center"
                            style="border-radius: 0.375rem;">
                            <h3 class="text-sm font-medium text-foreground peer-checked:text-primary">Custom</h3>
                            <p class="text-xs text-muted-foreground mt-0.5">Context &amp; fill-in-blank (AI)</p>
                        </div>
                    </label>
                </div>

                <div v-if="isOwner">
                    <p class="text-xs text-muted-foreground mb-3">
                        Cards selected via spaced repetition. Difficult words appear more often.
                    </p>
                    <AppButton @click="studyWithSRS" class="w-full sm:w-auto"
                        :disabled="generatingFlashcards">
                        {{ generatingFlashcards ? 'Generating...' : 'Start studying' }}
                    </AppButton>
                </div>
                <div v-else>
                    <p class="text-xs text-muted-foreground mb-3">
                        Clone this deck to study with your own progress tracking.
                    </p>
                    <AppButton @click="handleClone" class="w-full sm:w-auto">
                        Clone to study
                    </AppButton>
                </div>
            </div>

            <Teleport to="body">
                <div
                    v-if="previewLexeme"
                    class="fixed inset-0 z-50 bg-black/50 p-4 sm:p-6 flex items-center justify-center"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Lexeme preview"
                    @click.self="closeLexemePreview"
                >
                    <div class="w-full max-w-xl bg-card border border-border p-4 sm:p-5" style="border-radius: 0.5rem;">
                        <div class="flex items-center justify-between gap-2 mb-3">
                            <h3 class="text-sm font-medium text-foreground">Lexeme preview</h3>
                            <AppButton size="xs" variant="secondary" @click="closeLexemePreview">Close</AppButton>
                        </div>
                        <LexemeFlashcardPreview :lexeme="previewLexeme" />
                    </div>
                </div>
            </Teleport>
        </div>
    </div>
</template>

<style scoped>
/* Minimal */
</style>
