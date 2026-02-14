import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '../services/api'
import type {
    UserProgressProfile,
    DeckMastery,
    SessionCompleteResponse
} from '../types/index'

export const useProgressStore = defineStore('progress', () => {
    const profile = ref<UserProgressProfile | null>(null)
    const deckMasteries = ref<Record<string, DeckMastery>>({})
    const loading = ref(false)
    const error = ref<string | null>(null)

    // Fetch user progress profile
    const fetchProfile = async (): Promise<UserProgressProfile | null> => {
        loading.value = true
        error.value = null
        try {
            const response = await api.get<UserProgressProfile>('/progress')
            profile.value = response.data
            return response.data
        } catch (e: any) {
            // Don't set error for 401 (not logged in)
            if (e.response?.status !== 401) {
                error.value = e.message
            }
            return null
        } finally {
            loading.value = false
        }
    }

    // Fetch mastery for all user's decks (for deck list)
    const fetchAllDeckMasteries = async (): Promise<void> => {
        try {
            const response = await api.get<DeckMastery[]>('/progress/my-decks')
            const map: Record<string, DeckMastery> = {}
            for (const dm of response.data) {
                map[dm.deckId] = dm
            }
            deckMasteries.value = map
        } catch (e: any) {
            // Silently fail - progress bars just won't show
            console.warn('Could not fetch deck masteries:', e.message)
        }
    }

    // Fetch mastery for a single deck
    const fetchDeckMastery = async (deckId: string): Promise<DeckMastery | null> => {
        try {
            const response = await api.get<DeckMastery>(`/progress/deck/${deckId}`)
            deckMasteries.value[deckId] = response.data
            return response.data
        } catch (e: any) {
            return null
        }
    }

    // Complete a study session and earn XP
    const completeSession = async (
        deckId: string,
        deckTitle: string,
        cardsStudied: number,
        ratings: number[]
    ): Promise<SessionCompleteResponse | null> => {
        try {
            const response = await api.post<SessionCompleteResponse>('/progress/complete-session', {
                deckId,
                deckTitle,
                cardsStudied,
                ratings
            })

            // Update local profile
            if (profile.value) {
                profile.value.totalXP = response.data.totalXP
                profile.value.level = response.data.level
                profile.value.currentMilestone = response.data.currentMilestone
                profile.value.nextMilestone = response.data.nextMilestone
                profile.value.xpToNextLevel = response.data.xpToNextLevel
                profile.value.currentStreak = response.data.currentStreak
                profile.value.longestStreak = response.data.longestStreak
            }

            return response.data
        } catch (e: any) {
            console.error('Failed to complete session:', e.message)
            return null
        }
    }

    // Get mastery for a specific deck (from cache)
    const getDeckMastery = (deckId: string): DeckMastery | null => {
        return deckMasteries.value[deckId] || null
    }

    // Clear all progress data (on logout)
    const clearProgress = () => {
        profile.value = null
        deckMasteries.value = {}
    }

    return {
        profile,
        deckMasteries,
        loading,
        error,
        fetchProfile,
        fetchAllDeckMasteries,
        fetchDeckMastery,
        completeSession,
        getDeckMastery,
        clearProgress
    }
})
