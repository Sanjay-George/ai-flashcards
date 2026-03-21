<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useDeckStore } from '../stores/deckStore'
import { useProgressStore } from '../stores/progressStore'
import { aiApi } from '../services/api'
import type { Flashcard, Deck, SessionCompleteResponse } from '../types/index'
import { marked } from 'marked'

// Configure marked for safe rendering
marked.setOptions({
    breaks: true,
    gfm: true
})

// Helper function to render markdown
const renderMarkdown = (text: string): string => {
    return marked.parse(text) as string
}

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
const chatLoading = ref<boolean>(false)
const chatError = ref<string>('')

// Message history for conversation context
interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

const chatHistory = ref<ChatMessage[]>([])

// Progress tracking
const sessionRatings = ref<number[]>([])
const sessionResult = ref<SessionCompleteResponse | null>(null)

// ========== Text-to-Speech ==========
const ttsSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
const isSpeaking = ref(false)

const languageMap: Record<string, string> = {
    de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN',
}

const speakText = (text: string) => {
    if (!ttsSupported.value || !deck.value?.language) return
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = languageMap[deck.value.language] || 'en-US'
    utterance.rate = 0.85
    utterance.onstart = () => { isSpeaking.value = true }
    utterance.onend = () => { isSpeaking.value = false }
    utterance.onerror = () => { isSpeaking.value = false }
    window.speechSynthesis.speak(utterance)
}

const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    isSpeaking.value = false
}

onUnmounted(() => {
    if (ttsSupported.value) window.speechSynthesis.cancel()
})

// Language-specific reference URLs
const referenceUrls: Record<string, { baseUrl: string; name: string }> = {
    de: { baseUrl: 'https://www.verbformen.de/konjugation/?w=', name: 'Verbformen.de' },
    fr: { baseUrl: 'https://www.wordreference.com/fren/', name: 'WordReference' },
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
    chatHistory.value = [] // Clear chat history when moving to next card

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
        chatHistory.value = [] // Clear chat history when navigating
        currentIndex.value--
    }
}

const goToNext = (): void => {
    if (canGoForward.value) {
        showAnswer.value = false
        chatInput.value = ''
        chatHistory.value = [] // Clear chat history when navigating
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

    const userMessage = chatInput.value.trim()
    chatLoading.value = true
    chatError.value = ''
    chatInput.value = '' // Clear input immediately

    try {
        // Add user message to history
        chatHistory.value.push({
            role: 'user',
            content: userMessage
        })

        const card = currentCard.value
        const response = await aiApi.post('/chat', {
            user_message: userMessage,
            question: card.question,
            answer: card.answer,
            lexeme: card.lexeme || {
                term: card.lexemeId,
                meaning: card.answer,
                POS: card.pattern?.pos || 'unknown'
            },
            pattern: card.pattern,
            message_history: chatHistory.value.slice(0, -1) // Send history excluding the current message
        })

        // Add assistant response to history
        chatHistory.value.push({
            role: 'assistant',
            content: response.data.response
        })
    } catch (e: any) {
        chatError.value = e.message || 'Failed to get response'
        // Remove the user message if there was an error
        chatHistory.value.pop()
    } finally {
        chatLoading.value = false
    }
}
</script>

<template>
    <div>
        <div v-if="flashcardStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4 text-sm">Loading flashcards...</p>
        </div>

        <!-- Session Complete -->
        <div v-else-if="sessionComplete" class="max-w-sm mx-auto mt-8">
            <h1 class="text-xl font-semibold text-foreground mb-1">Session complete</h1>
            <p class="text-sm text-muted-foreground mb-6">Reviewed {{ flashcards.length }} cards</p>

            <div v-if="sessionResult" class="mb-6">
                <!-- Level up -->
                <div v-if="sessionResult.leveledUp" class="mb-4 p-3 border border-primary"
                    style="border-radius: 0.375rem;">
                    <p class="text-sm font-medium text-foreground">Level up</p>
                    <p class="text-lg font-semibold text-foreground">
                        {{ sessionResult.currentMilestone.emoji }} {{ sessionResult.currentMilestone.title }}
                    </p>
                    <p class="text-xs text-muted-foreground mt-0.5">{{ sessionResult.currentMilestone.description }}</p>
                </div>

                <div class="grid grid-cols-3 gap-2 mb-4">
                    <div class="p-2.5 border border-border text-center" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">+{{ sessionResult.xpEarned }}</div>
                        <div class="text-xs text-muted-foreground">XP</div>
                    </div>
                    <div class="p-2.5 border border-border text-center" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ sessionResult.totalXP }}</div>
                        <div class="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div class="p-2.5 border border-border text-center" style="border-radius: 0.25rem;">
                        <div class="text-base font-semibold text-foreground">{{ sessionResult.currentStreak }}</div>
                        <div class="text-xs text-muted-foreground">Streak</div>
                    </div>
                </div>

                <!-- Level progress -->
                <div v-if="sessionResult.nextMilestone" class="mb-4">
                    <div class="flex justify-between items-center text-xs mb-1">
                        <span class="text-muted-foreground">
                            Lv.{{ sessionResult.level }} {{ sessionResult.currentMilestone.title }}
                        </span>
                        <span class="text-muted-foreground">
                            Lv.{{ sessionResult.nextMilestone.level }}
                        </span>
                    </div>
                    <div class="w-full h-1.5 bg-secondary overflow-hidden" style="border-radius: 1px;">
                        <div class="h-full bg-primary transition-all duration-700"
                            :style="{ width: Math.round(((sessionResult.totalXP - sessionResult.currentMilestone.xpRequired) / (sessionResult.nextMilestone.xpRequired - sessionResult.currentMilestone.xpRequired)) * 100) + '%' }">
                        </div>
                    </div>
                    <p class="text-xs text-muted-foreground mt-1">
                        {{ sessionResult.xpToNextLevel }} XP to next level
                    </p>
                </div>
            </div>

            <div class="flex gap-2">
                <button @click="restartSession" class="btn btn-primary flex-1 text-sm">
                    Study again
                </button>
                <button @click="goToDeck" class="btn btn-secondary flex-1 text-sm">
                    Back
                </button>
            </div>
        </div>

        <!-- Study Card -->
        <div v-else-if="currentCard">
            <div class="flex justify-between items-center mb-4">
                <h2 class="text-sm font-medium text-foreground truncate mr-2">{{ deck?.title }}</h2>
                <button @click="goToDeck"
                    class="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">Exit</button>
            </div>

            <!-- Progress bar -->
            <div class="w-full h-1 bg-secondary overflow-hidden mb-1.5" style="border-radius: 1px;">
                <div class="h-full bg-primary transition-all duration-300" :style="{ width: progress + '%' }"></div>
            </div>

            <!-- Card counter and navigation -->
            <div class="flex justify-center items-center gap-3 mb-6">
                <button @click="goToPrevious" :disabled="!canGoBack"
                    class="p-1.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary cursor-pointer"
                    style="border-radius: 0.25rem;" title="Previous card">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <p class="text-muted-foreground text-xs">
                    {{ currentIndex + 1 }} / {{ flashcards.length }}
                    <span v-if="isReviewingPrevious" class="ml-1.5 text-xs border border-border px-1.5 py-0.5"
                        style="border-radius: 0.25rem;">
                        reviewing
                    </span>
                </p>
                <button @click="goToNext" :disabled="!canGoForward"
                    class="p-1.5 transition-colors disabled:opacity-20 disabled:cursor-not-allowed hover:bg-secondary cursor-pointer"
                    style="border-radius: 0.25rem;" title="Next reviewed card">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>

            <!-- Flashcard -->
            <div class="perspective-[1000px] mb-6 cursor-pointer" @click="flipCard">
                <div class="relative w-full min-h-56 sm:min-h-72 lg:min-h-80 transition-transform duration-600 transform-style-preserve-3d"
                    :class="{ 'rotate-y-180': showAnswer }">
                    <!-- Front -->
                    <div class="absolute w-full min-h-56 sm:min-h-72 lg:min-h-80 backface-hidden flex flex-col items-center justify-center p-6 sm:p-10 bg-background border border-border"
                        style="border-radius: 0.5rem;">
                        <div class="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                            Question
                        </div>
                        <div
                            class="text-lg sm:text-xl lg:text-2xl font-medium text-center text-foreground leading-relaxed">
                            {{ currentCard.question }}</div>
                        <div class="mt-6 flex items-center gap-3">
                            <span class="text-xs text-muted-foreground">Tap to reveal</span>
                            <button v-if="ttsSupported && deck?.language"
                                @click.stop="isSpeaking ? stopSpeaking() : speakText(currentCard.question)"
                                class="inline-flex items-center gap-1 px-2 py-1 border border-border text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer"
                                style="border-radius: 0.25rem;" title="Listen">
                                <svg v-if="!isSpeaking" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                                </svg>
                                <svg v-else class="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span class="text-xs">{{ isSpeaking ? 'Stop' : 'Listen' }}</span>
                            </button>
                        </div>
                    </div>

                    <!-- Back -->
                    <div class="absolute w-full min-h-56 sm:min-h-72 lg:min-h-80 backface-hidden rotate-y-180 flex flex-col items-center justify-center p-6 sm:p-10 bg-primary/5 text-foreground border border-primary/30"
                        style="border-radius: 0.5rem;">
                        <div class="text-xs uppercase tracking-widest text-primary/60 mb-4">Answer</div>
                        <div class="text-lg sm:text-xl lg:text-2xl font-medium text-center leading-relaxed">
                            {{ currentCard.answer }}</div>

                        <!-- TTS + Reference -->
                        <div class="mt-5 flex items-center gap-2">
                            <button v-if="ttsSupported && deck?.language"
                                @click.stop="isSpeaking ? stopSpeaking() : speakText(currentCard.answer)"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 text-primary hover:bg-primary/10 transition-colors text-xs cursor-pointer"
                                style="border-radius: 0.25rem;" title="Listen">
                                <svg v-if="!isSpeaking" class="w-3.5 h-3.5" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                                </svg>
                                <svg v-else class="w-3.5 h-3.5 animate-pulse" fill="none" stroke="currentColor"
                                    viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {{ isSpeaking ? 'Stop' : 'Listen' }}
                            </button>
                        </div>

                        <!-- Reference Link -->
                        <div v-if="referenceUrl" class="mt-2">
                            <a :href="referenceUrl.url" target="_blank" rel="noopener noreferrer"
                                class="inline-flex items-center gap-1.5 px-3 py-1.5 border border-primary/30 hover:bg-primary/10 transition-colors text-xs text-primary/70"
                                style="border-radius: 0.25rem;">
                                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                                {{ referenceUrl.name }}
                            </a>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rating Section -->
            <div v-if="showAnswer">
                <!-- Reviewing previous -->
                <div v-if="isReviewingPrevious" class="text-center mb-4">
                    <p class="text-xs text-muted-foreground mb-3">Already rated</p>
                    <div class="flex justify-center gap-2">
                        <button v-if="canGoBack" @click="goToPrevious" class="btn btn-secondary text-sm">
                            Previous
                        </button>
                        <button @click="goToNext" class="btn btn-primary text-sm">
                            Next
                        </button>
                    </div>
                </div>

                <!-- Rating new card -->
                <div v-else class="text-center">
                    <p class="text-xs text-muted-foreground mb-3">How well did you know this?</p>
                    <div class="flex justify-center gap-1.5">
                        <button @click="rateCard(1)"
                            class="btn px-3 py-2 border border-red-300 bg-red-50 text-red-700 hover:bg-red-100 transition-colors text-xs cursor-pointer"
                            style="border-radius: 0.25rem;">
                            Again
                        </button>
                        <button @click="rateCard(2)"
                            class="btn px-3 py-2 border border-orange-300 bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors text-xs cursor-pointer"
                            style="border-radius: 0.25rem;">
                            Hard
                        </button>
                        <button @click="rateCard(3)"
                            class="btn px-3 py-2 border border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 transition-colors text-xs cursor-pointer"
                            style="border-radius: 0.25rem;">
                            Good
                        </button>
                        <button @click="rateCard(4)"
                            class="btn px-3 py-2 border border-green-300 bg-green-50 text-green-700 hover:bg-green-100 transition-colors text-xs cursor-pointer"
                            style="border-radius: 0.25rem;">
                            Easy
                        </button>
                        <button @click="rateCard(5)"
                            class="btn px-3 py-2 border border-primary/40 bg-primary/8 text-primary hover:bg-primary/15 transition-colors text-xs cursor-pointer"
                            style="border-radius: 0.25rem;">
                            Perfect
                        </button>
                    </div>
                </div>

                <!-- Chat Section -->
                <div class="mt-5 border-t border-border pt-4">
                    <p class="text-xs font-medium text-foreground mb-2">Ask about this card</p>

                    <!-- Chat History -->
                    <div v-if="chatHistory.length > 0" class="mb-3 border border-border p-3 max-h-100 overflow-y-auto"
                        style="border-radius: 0.375rem;">
                        <div v-for="(message, index) in chatHistory" :key="index" :class="[
                            'mb-2 p-2.5 text-sm',
                            message.role === 'user' ? 'bg-foreground text-background ml-6' : 'bg-secondary text-foreground mr-6'
                        ]" style="border-radius: 0.375rem;">
                            <div class="text-xs font-medium mb-1 opacity-60">
                                {{ message.role === 'user' ? 'You' : 'Tutor' }}
                            </div>
                            <div v-if="message.role === 'user'" class="whitespace-pre-wrap text-sm">{{ message.content
                                }}</div>
                            <div v-else class="text-sm markdown-content" v-html="renderMarkdown(message.content)"></div>
                        </div>
                    </div>

                    <!-- Input -->
                    <div class="flex gap-2 items-center">
                        <input v-model="chatInput"
                            class="flex-1 px-3 py-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                            style="border-radius: 0.375rem;" type="text" placeholder="e.g. How do I use this word?"
                            :disabled="chatLoading" @keydown.enter="askFlashcardQuestion" />
                        <button @click="askFlashcardQuestion" class="btn btn-secondary text-sm px-3 py-2"
                            :disabled="chatLoading || !chatInput.trim()">
                            {{ chatLoading ? '...' : 'Ask' }}
                        </button>
                    </div>
                    <p v-if="chatError" class="text-destructive text-xs mt-1.5">{{ chatError }}</p>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
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

.min-h-56 {
    min-height: 14rem;
}

@media (min-width: 640px) {
    .sm\:min-h-72 {
        min-height: 18rem;
    }
}

@media (min-width: 1024px) {
    .lg\:min-h-80 {
        min-height: 20rem;
    }
}

.markdown-content {
    line-height: 1.5;
}

.markdown-content :deep(p) {
    margin: 0.4em 0;
}

.markdown-content :deep(p:first-child) {
    margin-top: 0;
}

.markdown-content :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-content :deep(strong) {
    font-weight: 600;
}

.markdown-content :deep(code) {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 0.1rem 0.2rem;
    border-radius: 0.2rem;
    font-size: 0.85em;
    font-family: monospace;
}

.markdown-content :deep(pre) {
    background-color: rgba(0, 0, 0, 0.06);
    padding: 0.5rem;
    border-radius: 0.25rem;
    overflow-x: auto;
    margin: 0.4em 0;
}

.markdown-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    margin: 0.4em 0;
    padding-left: 1.25em;
}

.markdown-content :deep(li) {
    margin: 0.2em 0;
}

.markdown-content :deep(blockquote) {
    border-left: 2px solid currentColor;
    padding-left: 0.75em;
    margin: 0.4em 0;
    opacity: 0.7;
}

.markdown-content :deep(a) {
    color: inherit;
    text-decoration: underline;
}
</style>
