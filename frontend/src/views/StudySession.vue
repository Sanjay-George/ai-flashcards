<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useFlashcardStore } from '../stores/flashcardStore'
import { useDeckStore } from '../stores/deckStore'
import type { Flashcard, Deck } from '../types/index'

const route = useRoute()
const router = useRouter()
const flashcardStore = useFlashcardStore()
const deckStore = useDeckStore()

const deckId = route.params.id as string
const currentIndex = ref<number>(0)
const showAnswer = ref<boolean>(false)
const sessionComplete = ref<boolean>(false)

onMounted(async () => {
    await Promise.all([
        deckStore.fetchDeck(deckId),
        flashcardStore.fetchFlashcards(deckId)
    ])

    if (flashcardStore.flashcards.length === 0) {
        // No flashcards generated yet, redirect to deck detail
        router.push(`/deck/${deckId}`)
    }
})

const deck = computed<Deck | null>(() => deckStore.currentDeck)
const flashcards = computed<Flashcard[]>(() => flashcardStore.flashcards)
const currentCard = computed<Flashcard | undefined>(() => flashcards.value[currentIndex.value])
const progress = computed<number>(() => {
    if (flashcards.value.length === 0) return 0
    return Math.round(((currentIndex.value + 1) / flashcards.value.length) * 100)
})

const flipCard = (): void => {
    showAnswer.value = !showAnswer.value
}

const rateCard = async (rating: number): Promise<void> => {
    if (!currentCard.value) return

    await flashcardStore.rateFlashcard(currentCard.value._id, rating)

    if (currentIndex.value < flashcards.value.length - 1) {
        currentIndex.value++
        showAnswer.value = false
    } else {
        sessionComplete.value = true
    }
}

const restartSession = (): void => {
    currentIndex.value = 0
    showAnswer.value = false
    sessionComplete.value = false
}

const goToDeck = (): void => {
    router.push(`/deck/${deckId}`)
}
</script>

<template>
    <div class="study-session">
        <div v-if="flashcardStore.loading" class="loading">
            <div class="spinner"></div>
            <p>Loading flashcards...</p>
        </div>

        <div v-else-if="sessionComplete" class="session-complete card">
            <div class="complete-icon">🎉</div>
            <h1>Session Complete!</h1>
            <p>You've reviewed all {{ flashcards.length }} flashcards</p>

            <div class="complete-actions">
                <button @click="restartSession" class="btn btn-primary">
                    Study Again
                </button>
                <button @click="goToDeck" class="btn btn-secondary">
                    Back to Deck
                </button>
            </div>
        </div>

        <div v-else-if="currentCard" class="study-container">
            <div class="study-header">
                <h2>{{ deck?.title }}</h2>
                <button @click="goToDeck" class="btn btn-secondary">Exit</button>
            </div>

            <div class="progress-bar">
                <div class="progress-fill" :style="{ width: progress + '%' }"></div>
            </div>
            <div class="progress-text">
                Card {{ currentIndex + 1 }} of {{ flashcards.length }}
            </div>

            <div class="flashcard-container" @click="flipCard">
                <div class="flashcard" :class="{ flipped: showAnswer }">
                    <div class="flashcard-front">
                        <div class="card-label">Question</div>
                        <div class="card-content">{{ currentCard.question }}</div>
                        <div class="card-hint">Click to reveal answer</div>
                    </div>

                    <div class="flashcard-back">
                        <div class="card-label">Answer</div>
                        <div class="card-content">{{ currentCard.answer }}</div>
                        <div v-if="currentCard.pattern" class="card-pattern">
                            Pattern: {{ currentCard.pattern.name }} ({{ currentCard.pattern.pos }})
                        </div>
                    </div>
                </div>
            </div>

            <div v-if="showAnswer" class="rating-section">
                <p>How well did you know this?</p>
                <div class="rating-buttons">
                    <button @click="rateCard(1)" class="btn rating-btn rating-1">
                        😞 Again
                    </button>
                    <button @click="rateCard(2)" class="btn rating-btn rating-2">
                        😐 Hard
                    </button>
                    <button @click="rateCard(3)" class="btn rating-btn rating-3">
                        🙂 Good
                    </button>
                    <button @click="rateCard(4)" class="btn rating-btn rating-4">
                        😊 Easy
                    </button>
                    <button @click="rateCard(5)" class="btn rating-btn rating-5">
                        🎯 Perfect
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.study-session {
    max-width: 800px;
    margin: 0 auto;
}

.study-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.study-header h2 {
    font-size: 1.5rem;
    color: #2d3748;
}

.progress-bar {
    width: 100%;
    height: 8px;
    background: #e2e8f0;
    border-radius: 4px;
    overflow: hidden;
    margin-bottom: 0.5rem;
}

.progress-fill {
    height: 100%;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    transition: width 0.3s ease;
}

.progress-text {
    text-align: center;
    color: #718096;
    font-size: 0.875rem;
    margin-bottom: 2rem;
}

.flashcard-container {
    perspective: 1000px;
    margin-bottom: 2rem;
    cursor: pointer;
}

.flashcard {
    position: relative;
    width: 100%;
    min-height: 400px;
    transform-style: preserve-3d;
    transition: transform 0.6s;
}

.flashcard.flipped {
    transform: rotateY(180deg);
}

.flashcard-front,
.flashcard-back {
    position: absolute;
    width: 100%;
    min-height: 400px;
    backface-visibility: hidden;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
}

.flashcard-back {
    transform: rotateY(180deg);
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
}

.card-label {
    font-size: 0.875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1.5rem;
    opacity: 0.8;
}

.card-content {
    font-size: 2rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.4;
}

.card-hint {
    margin-top: 2rem;
    font-size: 0.875rem;
    color: #718096;
    font-style: italic;
}

.card-pattern {
    margin-top: 1.5rem;
    font-size: 0.875rem;
    opacity: 0.9;
}

.rating-section {
    text-align: center;
}

.rating-section p {
    font-size: 1.125rem;
    margin-bottom: 1rem;
    color: #2d3748;
    font-weight: 600;
}

.rating-buttons {
    display: flex;
    justify-content: center;
    gap: 0.75rem;
    flex-wrap: wrap;
}

.rating-btn {
    padding: 0.75rem 1.25rem;
    font-size: 1rem;
    border: 2px solid transparent;
    transition: all 0.3s;
}

.rating-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
}

.rating-1 {
    background: #fc8181;
    color: white;
}

.rating-2 {
    background: #f6ad55;
    color: white;
}

.rating-3 {
    background: #68d391;
    color: white;
}

.rating-4 {
    background: #4fd1c5;
    color: white;
}

.rating-5 {
    background: #667eea;
    color: white;
}

.session-complete {
    text-align: center;
    padding: 4rem 2rem;
    max-width: 600px;
    margin: 2rem auto;
}

.complete-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
}

.session-complete h1 {
    font-size: 2rem;
    color: #2d3748;
    margin-bottom: 0.5rem;
}

.session-complete p {
    color: #718096;
    margin-bottom: 2rem;
}

.complete-actions {
    display: flex;
    justify-content: center;
    gap: 1rem;
}
</style>
