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
const showAnswer = ref<boolean>(false)
const sessionComplete = ref<boolean>(false)
const sessionSize = 10
const chatInput = ref<string>('')
const chatAnswer = ref<string>('')
const chatLoading = ref<boolean>(false)
const chatError = ref<string>('')

const pickRandom = <T,>(items: T[], count: number): T[] => {
    const array = [...items]
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array.slice(0, Math.min(count, array.length))
}

onMounted(async () => {
    await deckStore.fetchDeck(deckId)

    if (flashcardStore.sessionFlashcards.length === 0) {
        await flashcardStore.fetchFlashcards(deckId)

        if (flashcardStore.flashcards.length === 0) {
            // No flashcards generated yet, redirect to deck detail
            router.push(`/deck/${deckId}`)
            return
        }

        flashcardStore.setSessionFlashcards(
            pickRandom(flashcardStore.flashcards, sessionSize)
        )
    }
})

const deck = computed<Deck | null>(() => deckStore.currentDeck)
const flashcards = computed<Flashcard[]>(() =>
    flashcardStore.sessionFlashcards.length > 0
        ? flashcardStore.sessionFlashcards
        : flashcardStore.flashcards
)
const currentCard = computed<Flashcard | undefined>(() => flashcards.value[currentIndex.value])
const progress = computed<number>(() => {
    if (flashcards.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / flashcards.value.length) * 100)
})

const flipDurationMs = 600
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

const flipCard = (): void => {
    showAnswer.value = !showAnswer.value
}

const rateCard = async (rating: number): Promise<void> => {
    if (!currentCard.value) return

    showAnswer.value = false
    const ratePromise = flashcardStore.rateFlashcard(currentCard.value._id, rating)

    if (currentIndex.value < flashcards.value.length - 1) {
        await wait(flipDurationMs)
        currentIndex.value++
    } else {
        sessionComplete.value = true
    }

    await ratePromise
}

const restartSession = (): void => {
    currentIndex.value = 0
    showAnswer.value = false
    sessionComplete.value = false

    if (flashcardStore.flashcards.length > 0) {
        flashcardStore.setSessionFlashcards(
            pickRandom(flashcardStore.flashcards, sessionSize)
        )
    }
}

const goToDeck = (): void => {
    router.push(`/deck/${deckId}`)
}

const askFlashcardQuestion = async (): Promise<void> => {
    if (!currentCard.value || !chatInput.value.trim()) return

    chatLoading.value = true
    chatError.value = ''
    chatAnswer.value = ''

    try {
        const response = await aiApi.post('/chat', {
            user_message: chatInput.value.trim(),
            question: currentCard.value.question,
            answer: currentCard.value.answer,
            lexeme: {
                term: currentCard.value.lexemeId,
                meaning: currentCard.value.answer,
                POS: currentCard.value.pattern?.pos || 'unknown'
            },
            pattern: currentCard.value.pattern
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
                <div class="h-full bg-gradient-to-r from-primary to-purple-600 transition-all duration-300"
                    :style="{ width: progress + '%' }"></div>
            </div>
            <p class="text-center text-muted-foreground text-sm mb-8">
                Card {{ currentIndex + 1 }} of {{ flashcards.length }}
            </p>

            <!-- Flashcard -->
            <div class="perspective-[1000px] mb-8 cursor-pointer" @click="flipCard">
                <div class="relative w-full min-h-[400px] transition-transform duration-600 transform-style-preserve-3d"
                    :class="{ 'rotate-y-180': showAnswer }">
                    <!-- Front -->
                    <div
                        class="absolute w-full min-h-[400px] backface-hidden flex flex-col items-center justify-center p-12 bg-card rounded-xl border border-border shadow-lg">
                        <div class="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-6">Question
                        </div>
                        <div class="text-3xl font-semibold text-center text-foreground leading-relaxed">{{
                            currentCard.question }}</div>
                        <div class="mt-8 text-sm text-muted-foreground italic">Click to reveal answer</div>
                    </div>

                    <!-- Back -->
                    <div
                        class="absolute w-full min-h-[400px] backface-hidden rotate-y-180 flex flex-col items-center justify-center p-12 bg-gradient-to-br from-primary to-purple-600 text-white rounded-xl shadow-lg">
                        <div class="text-sm font-semibold uppercase tracking-wide opacity-80 mb-6">Answer</div>
                        <div class="text-3xl font-semibold text-center leading-relaxed">{{ currentCard.answer }}</div>
                        <div v-if="currentCard.pattern" class="mt-6 text-sm opacity-90">
                            Pattern: {{ currentCard.pattern.name }} ({{ currentCard.pattern.pos }})
                        </div>
                    </div>
                </div>
            </div>

            <!-- Rating Section -->
            <div v-if="showAnswer" class="text-center">
                <p class="text-lg font-semibold text-foreground mb-4">How well did you know this?</p>
                <div class="flex justify-center gap-3 flex-wrap">
                    <button @click="rateCard(1)"
                        class="btn px-5 py-3 bg-red-400 text-white hover:bg-red-500 hover:-translate-y-0.5 transition-all">
                        😞 Again
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
