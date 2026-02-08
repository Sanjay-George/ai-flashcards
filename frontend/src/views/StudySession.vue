<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useDeckStore } from '../stores/deckStore'
import { useProgressStore } from '../stores/progressStore'
import { aiApi } from '../services/api'
import type { Flashcard, Deck, SessionCompleteResponse } from '../types/index'

const route = useRoute()
const router = useRouter()
const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()
const progressStore = useProgressStore()

const deckId = route.params.id as string
const currentIndex = ref<number>(0)
const highestReviewedIndex = ref<number>(-1) // Track furthest reviewed card
const showAnswer = ref<boolean>(false)
const sessionComplete = ref<boolean>(false)
const chatInput = ref<string>('')
const chatAnswer = ref<string>('')
const chatLoading = ref<boolean>(false)
const chatError = ref<string>('')

// Progress tracking
const sessionRatings = ref<number[]>([])
const sessionResult = ref<SessionCompleteResponse | null>(null)

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
        // Track rating for XP calculation
        sessionRatings.value.push(rating)
    }

    if (currentIndex.value < flashcards.value.length - 1) {
        await wait(flipDurationMs)
        currentIndex.value++
        // Update highest reviewed to current position after moving forward
        if (currentIndex.value > highestReviewedIndex.value) {
            highestReviewedIndex.value = currentIndex.value
        }
    } else {
        // Session complete - award XP
        sessionComplete.value = true
        if (deck.value && sessionRatings.value.length > 0) {
            const result = await progressStore.completeSession(
                deckId,
                deck.value.title,
                sessionRatings.value.length,
                sessionRatings.value
            )
            sessionResult.value = result
        }
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

        <div v-else-if="sessionComplete"
            class="card text-center py-8 sm:py-12 px-4 sm:px-8 max-w-xl mx-auto mt-4 sm:mt-8">
            <div class="text-5xl sm:text-7xl mb-4">🎉</div>
            <h1 class="text-2xl sm:text-3xl font-bold text-foreground mb-2">Session Complete!</h1>
            <p class="text-muted-foreground mb-4 sm:mb-6">You've reviewed all {{ flashcards.length }} flashcards</p>

            <!-- XP Earned -->
            <div v-if="sessionResult" class="mb-8">
                <!-- Level up celebration -->
                <div v-if="sessionResult.leveledUp"
                    class="mb-6 p-4 bg-linear-to-r from-yellow-100 to-amber-100 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-xl border border-yellow-300 dark:border-yellow-700">
                    <div class="text-4xl mb-2">🏆</div>
                    <p class="text-lg font-bold text-yellow-700 dark:text-yellow-400">Level Up!</p>
                    <p class="text-2xl font-bold text-foreground">
                        {{ sessionResult.currentMilestone.emoji }} {{ sessionResult.currentMilestone.title }}
                    </p>
                    <p class="text-sm text-muted-foreground mt-1">{{ sessionResult.currentMilestone.description }}</p>
                </div>

                <div class="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
                    <div class="p-2 sm:p-3 bg-secondary rounded-lg">
                        <div class="text-lg sm:text-2xl font-bold text-primary">+{{ sessionResult.xpEarned }}</div>
                        <div class="text-xs text-muted-foreground">XP Earned</div>
                    </div>
                    <div class="p-2 sm:p-3 bg-secondary rounded-lg">
                        <div class="text-lg sm:text-2xl font-bold text-foreground">{{ sessionResult.totalXP }}</div>
                        <div class="text-xs text-muted-foreground">Total XP</div>
                    </div>
                    <div class="p-2 sm:p-3 bg-secondary rounded-lg">
                        <div class="text-lg sm:text-2xl font-bold text-foreground">🔥 {{ sessionResult.currentStreak }}
                        </div>
                        <div class="text-xs text-muted-foreground">Day Streak</div>
                    </div>
                </div>

                <!-- Level progress bar -->
                <div v-if="sessionResult.nextMilestone" class="mb-2">
                    <div class="flex justify-between items-center text-sm mb-1">
                        <span class="text-muted-foreground">
                            {{ sessionResult.currentMilestone.emoji }} Lv.{{ sessionResult.level }}
                            {{ sessionResult.currentMilestone.title }}
                        </span>
                        <span class="text-muted-foreground">
                            {{ sessionResult.nextMilestone.emoji }} Lv.{{ sessionResult.nextMilestone.level }}
                        </span>
                    </div>
                    <div class="w-full h-2.5 bg-border rounded-full overflow-hidden">
                        <div class="h-full bg-linear-to-r from-primary to-primary-gradient-end transition-all duration-700 rounded-full"
                            :style="{ width: Math.round(((sessionResult.totalXP - sessionResult.currentMilestone.xpRequired) / (sessionResult.nextMilestone.xpRequired - sessionResult.currentMilestone.xpRequired)) * 100) + '%' }">
                        </div>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                        {{ sessionResult.xpToNextLevel }} XP to next level
                    </p>
                </div>
                <div v-else class="text-sm text-muted-foreground">
                    {{ sessionResult.currentMilestone.emoji }} Max level reached! You're a {{
                        sessionResult.currentMilestone.title }}!
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4">
                <button @click="restartSession" class="btn btn-primary w-full sm:w-auto">
                    Study Again
                </button>
                <button @click="goToDeck" class="btn btn-secondary w-full sm:w-auto">
                    Back to Deck
                </button>
            </div>
        </div>

        <div v-else-if="currentCard">
            <div class="flex justify-between items-center mb-4 sm:mb-6">
                <h2 class="text-lg sm:text-2xl font-semibold text-foreground truncate mr-2">{{ deck?.title }}</h2>
                <button @click="goToDeck" class="btn btn-secondary text-sm shrink-0">Exit</button>
            </div>

            <!-- Progress bar -->
            <div class="w-full h-2 bg-border rounded-full overflow-hidden mb-2">
                <div class="h-full bg-linear-to-r from-primary to-primary-gradient-end transition-all duration-300"
                    :style="{ width: progress + '%' }"></div>
            </div>

            <!-- Card counter and navigation -->
            <div class="flex justify-center items-center gap-3 sm:gap-4 mb-6 sm:mb-8">
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
            <div class="perspective-[1000px] mb-6 sm:mb-8 cursor-pointer" @click="flipCard">
                <div class="relative w-full min-h-64 sm:min-h-80 lg:min-h-100 transition-transform duration-600 transform-style-preserve-3d"
                    :class="{ 'rotate-y-180': showAnswer }">
                    <!-- Front -->
                    <div
                        class="absolute w-full min-h-64 sm:min-h-80 lg:min-h-100 backface-hidden flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 bg-card rounded-xl border border-border shadow-lg">
                        <div
                            class="text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4 sm:mb-6">
                            Question
                        </div>
                        <div
                            class="text-xl sm:text-2xl lg:text-3xl font-semibold text-center text-foreground leading-relaxed">
                            {{ currentCard.question }}</div>
                        <div class="mt-6 sm:mt-8 text-xs sm:text-sm text-muted-foreground italic">Tap to reveal answer
                        </div>
                    </div>

                    <!-- Back -->
                    <div
                        class="absolute w-full min-h-64 sm:min-h-80 lg:min-h-100 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-12 bg-linear-to-br from-primary to-primary-gradient-end text-white rounded-xl shadow-lg">
                        <div class="text-xs sm:text-sm font-semibold uppercase tracking-wide opacity-80 mb-4 sm:mb-6">
                            Answer</div>
                        <div class="text-xl sm:text-2xl lg:text-3xl font-semibold text-center leading-relaxed">{{
                            currentCard.answer }}</div>

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
                    <p class="text-base sm:text-lg font-semibold text-foreground mb-3 sm:mb-4">How well did you know
                        this?</p>
                    <div class="grid grid-cols-3 sm:flex sm:justify-center gap-2 sm:gap-3">
                        <button @click="rateCard(1)"
                            class="btn px-3 sm:px-5 py-2.5 sm:py-3 bg-red-400 text-white hover:bg-red-500 active:scale-95 transition-all text-xs sm:text-sm">
                            😞 Not at all
                        </button>
                        <button @click="rateCard(2)"
                            class="btn px-3 sm:px-5 py-2.5 sm:py-3 bg-orange-400 text-white hover:bg-orange-500 active:scale-95 transition-all text-xs sm:text-sm">
                            😐 Hard
                        </button>
                        <button @click="rateCard(3)"
                            class="btn px-3 sm:px-5 py-2.5 sm:py-3 bg-green-400 text-white hover:bg-green-500 active:scale-95 transition-all text-xs sm:text-sm">
                            🙂 Good
                        </button>
                        <button @click="rateCard(4)"
                            class="btn px-3 sm:px-5 py-2.5 sm:py-3 bg-teal-400 text-white hover:bg-teal-500 active:scale-95 transition-all text-xs sm:text-sm">
                            😊 Easy
                        </button>
                        <button @click="rateCard(5)"
                            class="btn px-3 sm:px-5 py-2.5 sm:py-3 bg-primary text-white hover:bg-primary/90 active:scale-95 transition-all text-xs sm:text-sm">
                            🎯 Perfect
                        </button>
                    </div>
                </div>

                <!-- Chat Section -->
                <div class="mt-4 sm:mt-6 text-left bg-secondary p-3 sm:p-4 rounded-lg">
                    <p class="font-semibold text-foreground mb-2 sm:mb-3 text-sm sm:text-base">Ask a question about this
                        card</p>
                    <div class="flex gap-2 items-center">
                        <input v-model="chatInput"
                            class="flex-1 px-3 py-2.5 border border-input rounded-lg text-base sm:text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/10"
                            type="text" placeholder="e.g., How do I use this?" :disabled="chatLoading" />
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

/* Responsive min-heights for flashcard */
.min-h-64 {
    min-height: 16rem;
}

@media (min-width: 640px) {
    .sm\:min-h-80 {
        min-height: 20rem;
    }
}

@media (min-width: 1024px) {
    .lg\:min-h-100 {
        min-height: 25rem;
    }
}
</style>
