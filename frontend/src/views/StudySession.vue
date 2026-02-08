<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useDeckStore } from '../stores/deckStore'
import { aiApi } from '../services/api'
import type { Flashcard, Deck } from '../types/index'

const route = useRoute()
const router = useRouter()
const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()

const deckId = route.params.id as string
const currentIndex = ref<number>(0)
const highestReviewedIndex = ref<number>(-1) // Track furthest reviewed card
const showAnswer = ref<boolean>(false)
const sessionComplete = ref<boolean>(false)
const chatInput = ref<string>('')
const chatAnswer = ref<string>('')
const chatLoading = ref<boolean>(false)
const chatError = ref<string>('')

// Language-specific reference URLs
const referenceUrls: Record<string, { baseUrl: string; name: string }> = {
    de: { baseUrl: 'https://www.verbformen.de/konjugation/?w=', name: 'Verbformen.de' },
    es: { baseUrl: 'https://www.spanishdict.com/translate/', name: 'SpanishDict' },
    fr: { baseUrl: 'https://www.wordreference.com/fren/', name: 'WordReference' },
    // Add more languages as needed
}

onMounted(async () => {
    await deckStore.fetchDeck(deckId)

    // If no session flashcards, redirect back to deck
    if (flashcardStore.sessionFlashcards.length === 0) {
        router.push(`/deck/${deckId}`)
        return
    }
})

const deck = computed<Deck | null>(() => deckStore.currentDeck)
const flashcards = computed<Flashcard[]>(() => flashcardStore.sessionFlashcards)
const currentCard = computed<any>(() => flashcards.value[currentIndex.value])
const progress = computed<number>(() => {
    if (flashcards.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / flashcards.value.length) * 100)
})

// Navigation helpers
const canGoBack = computed(() => currentIndex.value > 0)
const canGoForward = computed(() => currentIndex.value < highestReviewedIndex.value)
const isReviewingPrevious = computed(() => currentIndex.value < highestReviewedIndex.value)

// Reference URL for the current card
const referenceUrl = computed<{ url: string; name: string } | null>(() => {
    if (!currentCard.value || !deck.value?.language) return null

    const langConfig = referenceUrls[deck.value.language]
    if (!langConfig) return null

    // Extract the term from lexemeId
    const term = currentCard.value.lexemeId || currentCard.value.lexeme?.term
    if (!term) return null

    return {
        url: langConfig.baseUrl + encodeURIComponent(term),
        name: langConfig.name
    }
})

const flipDurationMs = 600
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const flipCard = (): void => {
    showAnswer.value = !showAnswer.value
}

const rateCard = async (rating: number): Promise<void> => {
    if (!currentCard.value) return

    showAnswer.value = false
    chatInput.value = ''
    chatAnswer.value = ''

    // Only rate if this is a new card (not reviewing a previous one)
    const isNewCard = currentIndex.value >= highestReviewedIndex.value

    if (isNewCard) {
        // Rate the lexeme (not the flashcard) - this updates SRS data
        deckStore.rateLexeme(deckId, currentCard.value.lexemeId, rating)
    }

    if (currentIndex.value < flashcards.value.length - 1) {
        await wait(flipDurationMs)
        currentIndex.value++
        // Update highest reviewed to current position after moving forward
        if (currentIndex.value > highestReviewedIndex.value) {
            highestReviewedIndex.value = currentIndex.value
        }
    } else {
        sessionComplete.value = true
    }
}

// Navigation functions
const goToPrevious = (): void => {
    if (canGoBack.value) {
        showAnswer.value = false
        chatInput.value = ''
        chatAnswer.value = ''
        currentIndex.value--
    }
}

const goToNext = (): void => {
    if (canGoForward.value) {
        showAnswer.value = false
        chatInput.value = ''
        chatAnswer.value = ''
        currentIndex.value++
    }
}

const restartSession = (): void => {
    // Go back to deck to regenerate with SRS
    router.push(`/deck/${deckId}`)
}

const goToDeck = (): void => {
    flashcardStore.clearSessionFlashcards()
    router.push(`/deck/${deckId}`)
}

const askFlashcardQuestion = async (): Promise<void> => {
    if (!currentCard.value || !chatInput.value.trim()) return

    chatLoading.value = true
    chatError.value = ''
    chatAnswer.value = ''

    try {
        const card = currentCard.value
        const response = await aiApi.post('/chat', {
            user_message: chatInput.value.trim(),
            question: card.question,
            answer: card.answer,
            lexeme: card.lexeme || {
                term: card.lexemeId,
                meaning: card.answer,
                POS: card.pattern?.pos || 'unknown'
            },
            pattern: card.pattern
        })

        chatAnswer.value = response.data.response
    } catch (e: any) {
        chatError.value = e.message || 'Failed to get response'
    } finally {
        chatLoading.value = false
    }
}
</script>

<template>
    <div class="max-w-3xl mx-auto">
        <div v-if="flashcardStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4">Loading flashcards...</p>
        </div>

        <div v-else-if="sessionComplete" class="card text-center py-16 px-8 max-w-xl mx-auto mt-8">
            <div class="text-7xl mb-4">🎉</div>
            <h1 class="text-3xl font-bold text-foreground mb-2">Session Complete!</h1>
            <p class="text-muted-foreground mb-8">You've reviewed all {{ flashcards.length }} flashcards</p>

            <div class="flex justify-center gap-4">
                <button @click="restartSession" class="btn btn-primary">
                    Study Again
                </button>
                <button @click="goToDeck" class="btn btn-secondary">
                    Back to Deck
                </button>
            </div>
        </div>

        <div v-else-if="currentCard">
            <div class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-semibold text-foreground">{{ deck?.title }}</h2>
                <button @click="goToDeck" class="btn btn-secondary">Exit</button>
            </div>

            <!-- Progress bar -->
            <div class="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
                <div class="h-full bg-linear-to-r from-primary to-purple-600 transition-all duration-300"
                    :style="{ width: progress + '%' }"></div>
            </div>

            <!-- Card counter and navigation -->
            <div class="flex justify-center items-center gap-4 mb-8">
                <button @click="goToPrevious" :disabled="!canGoBack"
                    class="p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary"
                    title="Previous card">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <p class="text-muted-foreground text-sm">
                    Card {{ currentIndex + 1 }} of {{ flashcards.length }}
                    <span v-if="isReviewingPrevious"
                        class="ml-2 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                        Reviewing
                    </span>
                </p>
                <button @click="goToNext" :disabled="!canGoForward"
                    class="p-2 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:bg-secondary"
                    title="Next reviewed card">
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <!-- Flashcard -->
            <div class="perspective-[1000px] mb-8 cursor-pointer" @click="flipCard">
                <div class="relative w-full min-h-100 transition-transform duration-600 transform-style-preserve-3d"
                    :class="{ 'rotate-y-180': showAnswer }">
                    <!-- Front -->
                    <div
                        class="absolute w-full min-h-100 backface-hidden flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border shadow-lg">
                        <div class="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-6">Question
                        </div>
                        <div class="text-3xl font-semibold text-center text-foreground leading-relaxed">{{
                            currentCard.question }}</div>
                        <div class="mt-8 text-sm text-muted-foreground italic">Click to reveal answer</div>
                    </div>

                    <!-- Back -->
                    <div
                        class="absolute w-full min-h-100 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary to-purple-600 text-white rounded-xl shadow-lg">
                        <div class="text-sm font-semibold uppercase tracking-wide opacity-80 mb-6">Answer</div>
                        <div class="text-3xl font-semibold text-center leading-relaxed">{{ currentCard.answer }}</div>

                        <!-- Reference Link -->
                        <div v-if="referenceUrl" class="mt-6">
                            <a :href="referenceUrl.url" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-all text-sm font-medium">
                                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                View on {{ referenceUrl.name }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rating Section -->
            <div v-if="showAnswer" class="text-center">
                <!-- When reviewing a previous card -->
                <div v-if="isReviewingPrevious" class="mb-4">
                    <p class="text-muted-foreground mb-4">You've already rated this card</p>
                    <div class="flex justify-center gap-3">
                        <button v-if="canGoBack" @click="goToPrevious" class="btn btn-secondary">
                            ← Previous
                        </button>
                        <button @click="goToNext" class="btn btn-primary">
                            Next →
                        </button>
                    </div>
                </div>

                <!-- When rating a new card -->
                <div v-else>
                    <p class="text-lg font-semibold text-foreground mb-4">How well did you know this?</p>
                    <div class="flex justify-center gap-3 flex-wrap">
                        <button @click="rateCard(1)"
                            class="btn px-5 py-3 bg-red-400 text-white hover:bg-red-500 hover:-translate-y-0.5 transition-all">
                            😞 Not at all
                        </button>
                        <button @click="rateCard(2)"
                            class="btn px-5 py-3 bg-orange-400 text-white hover:bg-orange-500 hover:-translate-y-0.5 transition-all">
                            😐 Hard
                        </button>
                        <button @click="rateCard(3)"
                            class="btn px-5 py-3 bg-green-400 text-white hover:bg-green-500 hover:-translate-y-0.5 transition-all">
                            🙂 Good
                        </button>
                        <button @click="rateCard(4)"
                            class="btn px-5 py-3 bg-teal-400 text-white hover:bg-teal-500 hover:-translate-y-0.5 transition-all">
                            😊 Easy
                        </button>
                        <button @click="rateCard(5)"
                            class="btn px-5 py-3 bg-primary text-white hover:bg-primary/90 hover:-translate-y-0.5 transition-all">
                            🎯 Perfect
                        </button>
                    </div>
                </div>

                <!-- Chat Section -->
                <div class="mt-6 text-left bg-secondary p-4 rounded-lg">
                    <p class="font-semibold text-foreground mb-3">Ask a question about this card</p>
                    <div class="flex gap-2 items-center">
                        <input v-model="chatInput"
                            class="flex-1 px-3 py-2.5 border border-input rounded-md text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
                            type="text" placeholder="e.g., How do I use this in a sentence?" :disabled="chatLoading" />
                        <button @click="askFlashcardQuestion" class="btn btn-secondary"
                            :disabled="chatLoading || !chatInput.trim()">
                            {{ chatLoading ? 'Asking...' : 'Ask' }}
                        </button>
                    </div>
                    <p v-if="chatError" class="text-destructive mt-2">{{ chatError }}</p>
                    <div v-if="chatAnswer" class="mt-3 bg-card p-3 rounded-lg border border-border">
                        {{ chatAnswer }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Custom 3D flip styles that Tailwind doesn't support directly */
.perspective-\[1000px\] {
    perspective: 1000px;
}

.transform-style-preserve-3d {
    transform-style: preserve-3d;
}

.backface-hidden {
    backface-visibility: hidden;
}

.rotate-y-180 {
    transform: rotateY(180deg);
}

.duration-600 {
    transition-duration: 600ms;
}
</style>
