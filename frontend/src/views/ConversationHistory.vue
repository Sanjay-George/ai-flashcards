<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore, LANGUAGE_OPTIONS } from '../stores/conversationStore'
import { useDeckStore } from '../stores/deckStore'
import type { ConversationSession } from '../types/index'
import ConversationTranscriptWithFeedback from '../components/conversation/ConversationTranscriptWithFeedback.vue'

const router = useRouter()
const conversationStore = useConversationStore()
const deckStore = useDeckStore()

const expandedSessionId = ref<string | null>(null)
const sessionDetails = ref<Record<string, ConversationSession>>({})
const loadingDetails = ref<Record<string, boolean>>({})
const creatingDeckForSession = ref<string | null>(null)
const deletingSessionId = ref<string | null>(null)
const localError = ref<string | null>(null)

const sortedSessions = computed(() => {
    return [...conversationStore.pastSessions].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    })
})

const languageLabel = (lang: string): string => {
    const found = LANGUAGE_OPTIONS.find(option => option.code === lang)
    return found ? `${found.flag} ${found.label}` : lang
}

const formatDate = (value: string): string => {
    return new Date(value).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit'
    })
}

const feedbackCategoryLabel = (category: string): string => {
    return category.charAt(0).toUpperCase() + category.slice(1)
}

const getMessageFeedbackMap = (session: ConversationSession) => {
    const items = session.feedback?.message_feedback || []
    const feedbackMap = new Map<number, (typeof items)[number]>()

    for (const item of items) {
        feedbackMap.set(item.transcript_message_index, item)
    }

    return feedbackMap
}

const getMessageFeedback = (session: ConversationSession, messageIndex: number) => {
    return getMessageFeedbackMap(session).get(messageIndex)
}

const toggleSessionDetails = async (sessionId: string): Promise<void> => {
    localError.value = null

    if (expandedSessionId.value === sessionId) {
        expandedSessionId.value = null
        return
    }

    expandedSessionId.value = sessionId

    if (sessionDetails.value[sessionId]) {
        return
    }

    loadingDetails.value[sessionId] = true

    try {
        const fullSession = await conversationStore.fetchSessionById(sessionId)
        sessionDetails.value = {
            ...sessionDetails.value,
            [sessionId]: fullSession
        }
    } catch (e: any) {
        localError.value = e?.response?.data?.error || e.message || 'Failed to load conversation details'
    } finally {
        loadingDetails.value[sessionId] = false
    }
}

const handleDeleteSession = async (sessionId: string): Promise<void> => {
    if (!confirm('Delete this conversation permanently?')) return

    localError.value = null
    deletingSessionId.value = sessionId

    try {
        await conversationStore.deletePastSession(sessionId)
        if (expandedSessionId.value === sessionId) {
            expandedSessionId.value = null
        }
        if (sessionDetails.value[sessionId]) {
            const { [sessionId]: _removed, ...rest } = sessionDetails.value
            sessionDetails.value = rest
        }
    } catch (e: any) {
        localError.value = e?.response?.data?.error || e.message || 'Failed to delete conversation'
    } finally {
        deletingSessionId.value = null
    }
}

const handleCreateDeckFromSession = async (session: ConversationSession): Promise<void> => {
    localError.value = null
    creatingDeckForSession.value = session._id

    try {
        const result = await conversationStore.extractVocabularyFromSession(session._id)

        const mappedLexemes = result.lexemes.map((lexeme: any) => ({
            term: lexeme.term,
            meaning: lexeme.definition || lexeme.meaning,
            POS: lexeme.POS || '',
        }))

        const createdDeck = await deckStore.createDeck({
            title: result.title,
            tags: result.tags,
            language: session.language,
            lexemes: mappedLexemes,
            isPublic: false,
        })

        router.push(`/deck/${createdDeck._id}`)
    } catch (e: any) {
        localError.value = e?.response?.data?.detail || e?.response?.data?.error || e.message || 'Failed to create deck from conversation'
    } finally {
        creatingDeckForSession.value = null
    }
}

onMounted(async () => {
    localError.value = null
    await conversationStore.fetchPastSessions(100)
})
</script>

<template>
    <div>
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
                <h1 class="text-xl font-semibold text-foreground">Conversation History</h1>
                <p class="text-sm text-muted-foreground mt-1">Your previous conversations and feedback</p>
            </div>
        </div>

        <div v-if="localError" class="bg-destructive/10 text-destructive p-4 text-sm mb-4"
            style="border-radius: 0.375rem;">
            {{ localError }}
        </div>

        <div v-if="conversationStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4 text-sm">Loading conversations...</p>
        </div>

        <div v-else-if="sortedSessions.length === 0"
            class="text-center py-12 sm:py-16 px-4 sm:px-8 border border-border" style="border-radius: 0.5rem;">
            <h2 class="text-base font-medium text-foreground mb-1">No conversations yet</h2>
            <p class="text-sm text-muted-foreground mb-6">Start a conversation to see history and feedback here</p>
            <button class="btn btn-primary text-sm" @click="router.push('/conversation')">Start conversation</button>
        </div>

        <div v-else class="space-y-3">
            <div v-for="session in sortedSessions" :key="session._id" class="card p-4 sm:p-5">
                <div class="flex flex-col gap-3 sm:gap-4">
                    <div class="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div>
                            <div class="flex flex-wrap items-center gap-2 mb-1.5">
                                <h2 class="text-sm sm:text-base font-medium text-foreground">{{ session.topic }}</h2>
                                <span class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                    style="border-radius: 0.25rem;">
                                    {{ languageLabel(session.language) }}
                                </span>
                                <span class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                    style="border-radius: 0.25rem;">
                                    {{ session.difficulty }}
                                </span>
                                <span class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                    style="border-radius: 0.25rem;">
                                    {{ session.status }}
                                </span>
                            </div>
                            <p class="text-xs text-muted-foreground">Updated {{ formatDate(session.updatedAt) }}</p>
                        </div>

                        <div v-if="session.feedback" class="text-sm text-foreground">
                            <span class="font-medium">Rating:</span>
                            <span class="ml-1">{{ session.feedback.overall_rating }}/5</span>
                        </div>
                    </div>

                    <div v-if="session.feedback?.summary" class="text-sm text-muted-foreground">
                        {{ session.feedback.summary }}
                    </div>

                    <div class="flex flex-wrap gap-2">
                        <button class="btn btn-secondary text-xs py-1.5" @click="toggleSessionDetails(session._id)">
                            {{ expandedSessionId === session._id ? 'Hide details' : 'View details' }}
                        </button>
                        <button class="btn btn-secondary text-xs py-1.5"
                            :disabled="creatingDeckForSession === session._id"
                            @click="handleCreateDeckFromSession(session)">
                            {{ creatingDeckForSession === session._id
                                ? 'Creating deck...' :
                                'Create deck from conversation' }}
                        </button>
                        <button class="btn text-xs py-1.5 border border-destructive/50 text-destructive"
                            :disabled="deletingSessionId === session._id" @click="handleDeleteSession(session._id)">
                            {{ deletingSessionId === session._id ? 'Deleting...' : 'Delete' }}
                        </button>
                    </div>

                    <div v-if="expandedSessionId === session._id" class="border-t border-border pt-4 mt-1">
                        <div v-if="loadingDetails[session._id]" class="text-sm text-muted-foreground">
                            Loading conversation details...
                        </div>

                        <div v-else-if="sessionDetails[session._id]" class="space-y-4">
                            <div class="text-xs text-muted-foreground">{{ sessionDetails[session._id].context }}</div>

                            <ConversationTranscriptWithFeedback :messages="sessionDetails[session._id].messages"
                                :get-message-feedback="(index) => getMessageFeedback(sessionDetails[session._id], index)"
                                :feedback-category-label="feedbackCategoryLabel" :show-translations="true" />

                            <div v-if="sessionDetails[session._id].feedback" class="p-3 border border-border"
                                style="border-radius: 0.375rem;">
                                <div class="text-sm font-medium text-foreground mb-1">Overall feedback</div>
                                <div class="text-sm text-muted-foreground">
                                    {{ sessionDetails[session._id].feedback?.summary }}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>
