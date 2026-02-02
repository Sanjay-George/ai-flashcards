import { defineStore } from 'pinia'
import { ref } from 'vue'
import api, { aiApi } from '../services/api'
import type {
    Deck,
    Lexeme,
    CreateDeckResponse,
    EditDeckResponse,
    ChatMessage
} from '../types/index'

export { Deck, Lexeme }

export const useDeckStore = defineStore('deck', () => {
    const decks = ref<Deck[]>([])
    const currentDeck = ref<Deck | null>(null)
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch all decks
    const fetchDecks = async () => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get('/decks')
            decks.value = response.data
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    // Fetch single deck
    const fetchDeck = async (id: string) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get(`/decks/${id}`)
            currentDeck.value = response.data
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Create deck
    const createDeck = async (deck: Partial<Deck>) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.post('/decks', deck)
            decks.value.unshift(response.data)
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Update deck
    const updateDeck = async (id: string, updates: Partial<Deck>) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.put(`/decks/${id}`, updates)
            const index = decks.value.findIndex((d: Deck) => d._id === id)
            if (index !== -1) {
                decks.value[index] = response.data
            }
            if (currentDeck.value?._id === id) {
                currentDeck.value = response.data
            }
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Delete deck
    const deleteDeck = async (id: string) => {
        loading.value = true
        error.value = null
        try {
            await api.delete(`/decks/${id}`)
            decks.value = decks.value.filter((d: Deck) => d._id !== id)
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // AI: Create deck from text
    const createDeckFromText = async (userMessage: string, extractedText?: string): Promise<CreateDeckResponse> => {
        loading.value = true
        error.value = null
        try {
            const response = await aiApi.post<CreateDeckResponse>('/create_deck', {
                user_message: userMessage,
                text: extractedText
            })
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // AI: Edit deck
    const editDeckWithAI = async (
        deckJson: any, 
        instruction: string, 
        messageHistory?: ChatMessage[]
    ): Promise<EditDeckResponse> => {
        loading.value = true
        error.value = null
        try {
            const response = await aiApi.post<EditDeckResponse>('/edit_deck', {
                deck_json: deckJson,
                instruction,
                message_history: messageHistory
            })
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // AI: Extract text from image
    const extractTextFromImage = async (file: File): Promise<string> => {
        loading.value = true
        error.value = null
        try {
            const formData = new FormData()
            formData.append('file', file)
            const response = await aiApi.post<{ text: string }>('/extract_text', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            })
            return response.data.text
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Remove lexeme from deck
    const removeLexeme = async (deckId: string, term: string) => {
        loading.value = true
        error.value = null
        try {
            const response = await api.delete(`/decks/${deckId}/lexemes/${encodeURIComponent(term)}`)
            if (currentDeck.value?._id === deckId) {
                currentDeck.value = response.data
            }
            const index = decks.value.findIndex((d: Deck) => d._id === deckId)
            if (index !== -1) {
                decks.value[index] = response.data
            }
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Get lexemes due for review (SRS)
    const fetchDueLexemes = async (deckId: string, limit: number = 10): Promise<Lexeme[]> => {
        try {
            const response = await api.get<Lexeme[]>(`/decks/${deckId}/lexemes/due?limit=${limit}`)
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    // Rate a lexeme (update SRS data)
    const rateLexeme = async (deckId: string, term: string, rating: number): Promise<Lexeme> => {
        try {
            const response = await api.post<Lexeme>(
                `/decks/${deckId}/lexemes/${encodeURIComponent(term)}/rate`,
                { rating }
            )
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    // Clone a deck (for public decks)
    const cloneDeck = async (deckId: string): Promise<Deck> => {
        loading.value = true
        error.value = null
        try {
            const response = await api.post<Deck>(`/decks/${deckId}/clone`)
            decks.value.unshift(response.data)
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    // Toggle deck visibility (public/private)
    const toggleVisibility = async (deckId: string, isPublic: boolean): Promise<Deck> => {
        try {
            const response = await api.put<Deck>(`/decks/${deckId}`, { isPublic })
            const index = decks.value.findIndex((d: Deck) => d._id === deckId)
            if (index !== -1) {
                decks.value[index] = response.data
            }
            if (currentDeck.value?._id === deckId) {
                currentDeck.value = response.data
            }
            return response.data
        } catch (e: any) {
            error.value = e.message
            throw e
        }
    }

    return {
        decks,
        currentDeck,
        loading,
        error,
        fetchDecks,
        fetchDeck,
        createDeck,
        updateDeck,
        deleteDeck,
        createDeckFromText,
        editDeckWithAI,
        removeLexeme,
        extractTextFromImage,
        fetchDueLexemes,
        rateLexeme,
        cloneDeck,
        toggleVisibility
    }
})
