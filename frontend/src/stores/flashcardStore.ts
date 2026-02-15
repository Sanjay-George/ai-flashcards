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

    // Fetch flashcards due for review (spaced repetition)
    const fetchDueFlashcards = async (deckId: string, limit: number = 10): Promise<Flashcard[]> => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get<Flashcard[]>(`/flashcards/deck/${deckId}/due?limit=${limit}`)
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
        fetchDueFlashcards,
        generateFlashcards,
        saveFlashcards,
        setSessionFlashcards,
        clearSessionFlashcards
    }
})
