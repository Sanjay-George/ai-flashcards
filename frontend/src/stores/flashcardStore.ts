import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { aiApi } from '../services/api'
import type {
    Flashcard,
    Pattern,
    GenerateFlashcardsResponse
} from '../types/index'

export { Flashcard, Pattern }

export const useFlashcardStore = defineStore('flashcard', () => {
    const flashcards = ref<Flashcard[]>([])
    const sessionFlashcards = ref<Flashcard[]>([])
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch flashcards for a deck
    const fetchFlashcards = async (deckId: string) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get(`/flashcards/deck/${deckId}`)
            flashcards.value = response.data
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Generate flashcards from deck
    const generateFlashcards = async (deckJson: any, mode: 'simple' | 'master'): Promise<GenerateFlashcardsResponse> => {
        loading.value = true
        error.value = null
        try {
            const response = await aiApi.post<GenerateFlashcardsResponse>('/generate_flashcards', {
                deck_json: deckJson,
                mode
            })
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Save flashcards to database
    const saveFlashcards = async (flashcards: any[]): Promise<Flashcard[]> => {
        loading.value = true
        error.value = null
        try {
            const response = await api.post<Flashcard[]>('/flashcards/bulk', { flashcards })
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Rate flashcard
    const rateFlashcard = async (id: string, rating: number): Promise<Flashcard> => {
        try {
            const response = await api.post<Flashcard>(`/flashcards/${id}/rate`, { rating })
            const index = flashcards.value.findIndex((f: Flashcard) => f._id === id)
            if (index !== -1) {
                flashcards.value[index] = response.data
            }
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    const setSessionFlashcards = (cards: Flashcard[]) => {
        sessionFlashcards.value = cards
    }

    const clearSessionFlashcards = () => {
        sessionFlashcards.value = []
    }

    return {
        flashcards,
        sessionFlashcards,
        loading,
        error,
        fetchFlashcards,
        generateFlashcards,
        saveFlashcards,
        rateFlashcard,
        setSessionFlashcards,
        clearSessionFlashcards
    }
})
