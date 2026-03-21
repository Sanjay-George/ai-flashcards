import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import api, { aiApi } from '../services/api'
import type {
    ConversationDifficulty,
    ConversationMessage,
    ConversationStartResponse,
    ConversationNextResponse,
    ConversationFeedbackResponse,
    ConversationSession,
    ConversationTopicOption
} from '../types/index'

export const TOPIC_OPTIONS: ConversationTopicOption[] = [
    { id: 'restaurant', label: 'Restaurant', emoji: '🍽️', description: 'Order food and drinks' },
    { id: 'travel', label: 'Travel', emoji: '✈️', description: 'Plan trips and ask for directions' },
    { id: 'shopping', label: 'Shopping', emoji: '🛍️', description: 'Buy items and negotiate prices' },
    { id: 'job_interview', label: 'Job Interview', emoji: '💼', description: 'Answer interview questions' },
    { id: 'hotel', label: 'Hotel', emoji: '🏨', description: 'Check in, request services' },
    { id: 'directions', label: 'Directions', emoji: '🗺️', description: 'Ask for and give directions' },
    { id: 'doctor', label: 'Doctor Visit', emoji: '🏥', description: 'Describe symptoms, understand advice' },
    { id: 'phone_call', label: 'Phone Call', emoji: '📞', description: 'Make appointments and inquiries' },
    { id: 'small_talk', label: 'Small Talk', emoji: '💬', description: 'Casual everyday conversation' },
    { id: 'airport', label: 'Airport', emoji: '🛫', description: 'Check-in, boarding, customs' },
]

export const DIFFICULTY_OPTIONS = [
    { id: 'easy' as ConversationDifficulty, label: 'Easy', emoji: '🟡', description: 'Simple vocabulary, short sentences' },
    { id: 'medium' as ConversationDifficulty, label: 'Medium', emoji: '🟠', description: 'Mixed tenses, natural dialogue' },
    { id: 'hard' as ConversationDifficulty, label: 'Hard', emoji: '🔴', description: 'Advanced vocabulary, idioms' },
]

// Language options (matching what the app already supports)
export const LANGUAGE_OPTIONS = [
    { code: 'de', label: 'German', flag: '🇩🇪' },
    { code: 'fr', label: 'French', flag: '🇫🇷' },
    { code: 'hi', label: 'Hindi', flag: '🇮🇳' },
]

export const useConversationStore = defineStore('conversation', () => {
    // State
    const currentSession = ref<ConversationSession | null>(null)
    const messages = ref<ConversationMessage[]>([])
    const context = ref<string>('')
    const language = ref<string>('de')
    const difficulty = ref<ConversationDifficulty>('easy')
    const topic = ref<string>('restaurant')
    const feedback = ref<ConversationFeedbackResponse | null>(null)
    const pastSessions = ref<ConversationSession[]>([])

    const loading = ref(false)
    const sendingMessage = ref(false)
    const loadingFeedback = ref(false)
    const error = ref<string | null>(null)

    // Computed
    const isActive = computed(() => currentSession.value?.status === 'active')
    const messageCount = computed(() => messages.value.length)
    const userMessageCount = computed(() => messages.value.filter(m => m.role === 'user').length)

    /**
     * Start a new conversation session
     */
    const startConversation = async (
        lang: string,
        diff: ConversationDifficulty,
        top: string
    ): Promise<void> => {
        loading.value = true
        error.value = null
        feedback.value = null

        try {
            // 1. Call AI service to start conversation
            const aiResponse = await aiApi.post<ConversationStartResponse>('/conversation/start', {
                language: lang,
                difficulty: diff,
                topic: top
            })

            const { context: ctx, ai_message, ai_message_translation } = aiResponse.data

            // 2. Save session to backend
            const backendResponse = await api.post<ConversationSession>('/conversations', {
                language: lang,
                difficulty: diff,
                topic: top,
                context: ctx,
                firstMessage: ai_message,
                firstMessageTranslation: ai_message_translation
            })

            // 3. Set local state
            currentSession.value = backendResponse.data
            language.value = lang
            difficulty.value = diff
            topic.value = top
            context.value = ctx
            messages.value = [{
                role: 'ai',
                content: ai_message,
                translation: ai_message_translation
            }]
        } catch (e: any) {
            error.value = e?.response?.data?.detail || e.message || 'Failed to start conversation'
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Send a user message and get AI response
     */
    const sendMessage = async (userMessage: string): Promise<ConversationNextResponse> => {
        if (!currentSession.value) {
            throw new Error('No active conversation session')
        }

        sendingMessage.value = true
        error.value = null

        try {
            // Add user message locally
            const userMsg: ConversationMessage = {
                role: 'user',
                content: userMessage
            }
            messages.value.push(userMsg)

            // Save user message to backend
            await api.post(`/conversations/${currentSession.value._id}/messages`, {
                role: 'user',
                content: userMessage
            })

            // Get AI response
            const aiResponse = await aiApi.post<ConversationNextResponse>('/conversation/next', {
                language: language.value,
                difficulty: difficulty.value,
                topic: topic.value,
                context: context.value,
                conversation_history: messages.value,
                user_message: userMessage
            })

            const { ai_message, ai_message_translation } = aiResponse.data

            // Add AI response locally
            const aiMsg: ConversationMessage = {
                role: 'ai',
                content: ai_message,
                translation: ai_message_translation
            }
            messages.value.push(aiMsg)

            // Save AI message to backend
            await api.post(`/conversations/${currentSession.value._id}/messages`, {
                role: 'ai',
                content: ai_message,
                translation: ai_message_translation
            })

            return aiResponse.data
        } catch (e: any) {
            // Remove the user message we optimistically added
            if (messages.value[messages.value.length - 1]?.role === 'user') {
                messages.value.pop()
            }
            error.value = e?.response?.data?.detail || e.message || 'Failed to send message'
            throw e
        } finally {
            sendingMessage.value = false
        }
    }

    /**
     * Get feedback on the completed conversation
     */
    const getFeedback = async (): Promise<ConversationFeedbackResponse> => {
        if (!currentSession.value) {
            throw new Error('No conversation session')
        }

        loadingFeedback.value = true
        error.value = null

        try {
            // Get feedback from AI
            const aiResponse = await aiApi.post<ConversationFeedbackResponse>('/conversation/feedback', {
                language: language.value,
                difficulty: difficulty.value,
                topic: topic.value,
                transcript: messages.value
            })

            feedback.value = aiResponse.data

            // Save completion + feedback to backend
            await api.post(`/conversations/${currentSession.value._id}/complete`, {
                feedback: aiResponse.data
            })

            // Update local session status
            if (currentSession.value) {
                currentSession.value.status = 'completed'
            }

            return aiResponse.data
        } catch (e: any) {
            error.value = e?.response?.data?.detail || e.message || 'Failed to get feedback'
            throw e
        } finally {
            loadingFeedback.value = false
        }
    }

    /**
     * Fetch past conversation sessions
     */
    const fetchPastSessions = async (limit: number = 20): Promise<void> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.get<ConversationSession[]>(`/conversations?limit=${limit}`)
            pastSessions.value = response.data
        } catch (e: any) {
            error.value = e.message
        } finally {
            loading.value = false
        }
    }

    /**
     * Load a specific past session
     */
    const loadSession = async (sessionId: string): Promise<void> => {
        loading.value = true
        error.value = null

        try {
            const response = await api.get<ConversationSession>(`/conversations/${sessionId}`)
            const session = response.data
            currentSession.value = session
            language.value = session.language
            difficulty.value = session.difficulty
            topic.value = session.topic
            context.value = session.context
            messages.value = session.messages
            feedback.value = session.feedback || null
        } catch (e: any) {
            error.value = e.message
            throw e
        } finally {
            loading.value = false
        }
    }

    /**
     * Extract vocabulary/phrases from the conversation for flashcard creation
     */
    const extractVocabulary = async (): Promise<{ title: string; tags: string[]; lexemes: any[] }> => {
        if (messages.value.length < 2) {
            throw new Error('Not enough conversation messages to extract vocabulary')
        }

        try {
            const response = await aiApi.post('/conversation/extract_vocabulary', {
                language: language.value,
                difficulty: difficulty.value,
                topic: topic.value,
                transcript: messages.value,
            })
            return response.data
        } catch (e: any) {
            throw new Error(e?.response?.data?.detail || e.message || 'Failed to extract vocabulary')
        }
    }

    /**
     * Reset conversation state for a new session
     */
    const resetConversation = () => {
        currentSession.value = null
        messages.value = []
        context.value = ''
        feedback.value = null
        error.value = null
    }

    return {
        // State
        currentSession,
        messages,
        context,
        language,
        difficulty,
        topic,
        feedback,
        pastSessions,
        loading,
        sendingMessage,
        loadingFeedback,
        error,

        // Computed
        isActive,
        messageCount,
        userMessageCount,

        // Actions
        startConversation,
        sendMessage,
        getFeedback,
        extractVocabulary,
        fetchPastSessions,
        loadSession,
        resetConversation,
    }
})
