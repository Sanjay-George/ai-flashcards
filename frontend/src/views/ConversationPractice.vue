<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore, TOPIC_OPTIONS, DIFFICULTY_OPTIONS, LANGUAGE_OPTIONS } from '../stores/conversationStore'
import { useDeckStore } from '../stores/deckStore'
import type { ConversationDifficulty, ConversationNextResponse } from '../types/index'
import ConversationSetupPanel from '../components/conversation/ConversationSetupPanel.vue'
import ConversationScenarioStep from '../components/conversation/ConversationScenarioStep.vue'
import ConversationChatStep from '../components/conversation/ConversationChatStep.vue'
import ConversationFeedbackStep from '../components/conversation/ConversationFeedbackStep.vue'

const router = useRouter()
const store = useConversationStore()
const deckStore = useDeckStore()

type Phase = 'setup' | 'scenario' | 'chat' | 'feedback'
const phase = ref<Phase>('setup')

const selectedLanguage = ref('de')
const selectedDifficulty = ref<ConversationDifficulty>('easy')
const selectedTopic = ref('restaurant')
const CUSTOM_TOPIC_ID = '__custom__'
const isCustomTopicSelected = computed(() => selectedTopic.value === CUSTOM_TOPIC_ID)

const userInput = ref('')
const showTranslations = ref(false)
const conversationEnded = ref(false)
const hint = ref<string | null>(null)

let inactivityTimer: ReturnType<typeof setTimeout> | null = null
const inactivityHint = ref<string | null>(null)

const startInactivityTimer = () => {
    clearInactivityTimer()
    inactivityTimer = setTimeout(() => {
        if (store.isActive && !store.sendingMessage && !conversationEnded.value) {
            inactivityHint.value = "Still there? Take your time — or type 'skip' if you'd like a hint!"
        }
    }, 60 * 1000)
}

const clearInactivityTimer = () => {
    if (inactivityTimer) {
        clearTimeout(inactivityTimer)
        inactivityTimer = null
    }
    inactivityHint.value = null
}

onUnmounted(() => {
    clearInactivityTimer()
})

const selectedLanguageLabel = computed(() => {
    const lang = LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage.value)
    return lang ? `${lang.flag} ${lang.label}` : selectedLanguage.value
})

const startConversation = async () => {
    if (isCustomTopicSelected.value) {
        userInput.value = ''
        store.error = null
        phase.value = 'scenario'
        return
    }

    await startConversationWithTopic(selectedTopic.value)
}

const startConversationWithTopic = async (topic: string) => {
    try {
        await store.startConversation(
            selectedLanguage.value,
            selectedDifficulty.value,
            topic
        )
        phase.value = 'chat'
        startInactivityTimer()
        await nextTick()
        scrollToBottom()
    } catch {
        // error is set in store
    }
}

const submitScenarioTopic = async () => {
    const scenarioTopic = userInput.value.trim()
    if (!scenarioTopic || store.loading) return

    userInput.value = ''
    await startConversationWithTopic(scenarioTopic)
}

const scrollToBottom = () => {
    nextTick(() => {
        const container = document.querySelector('.conversation-chat-scroll') as HTMLElement | null
        if (container) {
            container.scrollTop = container.scrollHeight
        }
    })
}

const sendMessage = async () => {
    const msg = userInput.value.trim()
    if (!msg || store.sendingMessage || conversationEnded.value) return

    userInput.value = ''
    hint.value = null
    clearInactivityTimer()

    try {
        const response: ConversationNextResponse = await store.sendMessage(msg)
        scrollToBottom()

        if (response.hint) {
            hint.value = response.hint
        }

        if (response.should_end) {
            conversationEnded.value = true
            clearInactivityTimer()
        } else {
            startInactivityTimer()
        }
    } catch {
        scrollToBottom()
    }
}

const endConversation = async () => {
    conversationEnded.value = true
    clearInactivityTimer()
    await requestFeedback()
}

const requestFeedback = async () => {
    try {
        await store.getFeedback()
        phase.value = 'feedback'
    } catch {
        // error displayed in template
    }
}

const startNewConversation = () => {
    store.resetConversation()
    conversationEnded.value = false
    hint.value = null
    phase.value = 'setup'
}

const tryAgain = async () => {
    store.resetConversation()
    conversationEnded.value = false
    hint.value = null

    try {
        await startConversationWithTopic(store.topic || selectedTopic.value)
    } catch {
        // error displayed
    }
}

const isRecording = ref(false)
const transcribedText = ref('')
const showTranscriptionConfirm = ref(false)
const speechSupported = ref(globalThis.window !== undefined && ('SpeechRecognition' in globalThis || 'webkitSpeechRecognition' in globalThis))
let recognition: any = null

const languageMap: Record<string, string> = {
    de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN',
}

const startRecording = () => {
    if (!speechSupported.value) return

    const SpeechRecognition = (globalThis as any).SpeechRecognition || (globalThis as any).webkitSpeechRecognition
    recognition = new SpeechRecognition()
    recognition.lang = languageMap[selectedLanguage.value] || 'en-US'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onresult = (event: any) => {
        transcribedText.value = event.results[0][0].transcript
        showTranscriptionConfirm.value = true
        isRecording.value = false
    }

    recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        store.error = "Couldn't understand that — please try again."
        isRecording.value = false
    }

    recognition.onend = () => {
        isRecording.value = false
    }

    isRecording.value = true
    recognition.start()
}

const stopRecording = () => {
    if (recognition) {
        recognition.stop()
        isRecording.value = false
    }
}

const confirmTranscription = () => {
    userInput.value = transcribedText.value
    showTranscriptionConfirm.value = false
    transcribedText.value = ''

    if (phase.value === 'scenario') {
        submitScenarioTopic()
        return
    }

    sendMessage()
}

const editTranscription = () => {
    userInput.value = transcribedText.value
    showTranscriptionConfirm.value = false
    transcribedText.value = ''
}

const cancelTranscription = () => {
    showTranscriptionConfirm.value = false
    transcribedText.value = ''
}

const ttsSupported = ref(globalThis.window !== undefined && 'speechSynthesis' in globalThis)
const autoSpeak = ref(false)
const speakingMessageIdx = ref<number | null>(null)

const getTTSLang = (langCode: string): string => {
    const map: Record<string, string> = {
        de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN',
    }
    return map[langCode] || 'en-US'
}

const speakMessage = (text: string, idx: number) => {
    if (!ttsSupported.value) return
    globalThis.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getTTSLang(selectedLanguage.value)

    let speechRate = 1
    if (selectedDifficulty.value === 'easy') {
        speechRate = 0.8
    } else if (selectedDifficulty.value === 'medium') {
        speechRate = 0.9
    }
    utterance.rate = speechRate

    utterance.onstart = () => { speakingMessageIdx.value = idx }
    utterance.onend = () => { speakingMessageIdx.value = null }
    utterance.onerror = () => { speakingMessageIdx.value = null }

    globalThis.speechSynthesis.speak(utterance)
}

const stopSpeaking = () => {
    globalThis.speechSynthesis.cancel()
    speakingMessageIdx.value = null
}

watch(() => store.messages.length, (newLen, oldLen) => {
    if (!autoSpeak.value || !ttsSupported.value) return
    if (newLen > oldLen) {
        const lastMsg = store.messages[newLen - 1]
        if (lastMsg?.role === 'ai') {
            speakMessage(lastMsg.content, newLen - 1)
        }
    }
})

onUnmounted(() => {
    if (ttsSupported.value) {
        globalThis.speechSynthesis.cancel()
    }
})

const creatingDeck = ref(false)
const deckCreated = ref(false)
const deckCreateError = ref<string | null>(null)

const createFlashcardsFromConversation = async () => {
    creatingDeck.value = true
    deckCreateError.value = null
    deckCreated.value = false

    try {
        const result = await store.extractVocabulary()

        const mappedLexemes = result.lexemes.map((l: any) => ({
            term: l.term,
            meaning: l.definition || l.meaning,
            POS: l.POS || '',
        }))

        const deck = await deckStore.createDeck({
            title: result.title,
            tags: result.tags,
            language: store.language,
            lexemes: mappedLexemes,
            isPublic: false,
        })

        deckCreated.value = true

        setTimeout(() => {
            router.push(`/deck/${deck._id}`)
        }, 1500)
    } catch (e: any) {
        deckCreateError.value = e?.response?.data?.detail || e.message || 'Failed to create flashcards'
    } finally {
        creatingDeck.value = false
    }
}

const ratingStars = computed(() => {
    if (!store.feedback) return []
    const rating = store.feedback.overall_rating
    return Array.from({ length: 5 }, (_, i) => i < rating ? '★' : '☆')
})

const feedbackCategoryLabel = (category: string) => {
    return category.charAt(0).toUpperCase() + category.slice(1)
}

const transcriptMessageFeedback = computed(() => {
    const feedbackItems = store.feedback?.message_feedback || []
    const feedbackMap = new Map<number, (typeof feedbackItems)[number]>()

    for (const item of feedbackItems) {
        feedbackMap.set(item.transcript_message_index, item)
    }

    return feedbackMap
})

const getMessageFeedback = (messageIndex: number) => {
    return transcriptMessageFeedback.value.get(messageIndex)
}
</script>

<template>
    <div>
        <ConversationSetupPanel v-if="phase === 'setup'" :language-options="LANGUAGE_OPTIONS"
            :difficulty-options="DIFFICULTY_OPTIONS" :topic-options="TOPIC_OPTIONS"
            :selected-language="selectedLanguage" :selected-difficulty="selectedDifficulty"
            :selected-topic="selectedTopic" :custom-topic-id="CUSTOM_TOPIC_ID"
            :is-custom-topic-selected="isCustomTopicSelected" :show-history-button="true" :loading="store.loading"
            :error="store.error" @update:selected-language="selectedLanguage = $event"
            @update:selected-difficulty="selectedDifficulty = $event as ConversationDifficulty"
            @update:selected-topic="selectedTopic = $event" @start="startConversation"
            @open-history="router.push('/conversation/history')" />

        <ConversationScenarioStep v-if="phase === 'scenario'" :selected-language-label="selectedLanguageLabel"
            :selected-difficulty="selectedDifficulty" :error="store.error"
            :show-transcription-confirm="showTranscriptionConfirm" :transcribed-text="transcribedText"
            :speech-supported="speechSupported" :is-recording="isRecording" :user-input="userInput"
            :loading="store.loading" @confirm-transcription="confirmTranscription"
            @edit-transcription="editTranscription" @cancel-transcription="cancelTranscription"
            @toggle-recording="isRecording ? stopRecording() : startRecording()" @update:user-input="userInput = $event"
            @submit="submitScenarioTopic" @back="phase = 'setup'; userInput = ''; store.error = null" />

        <ConversationChatStep v-if="phase === 'chat'"
            :topic-label="TOPIC_OPTIONS.find(t => t.id === store.topic)?.label || store.topic"
            :selected-language-label="selectedLanguageLabel" :selected-difficulty="selectedDifficulty"
            :auto-speak="autoSpeak" :tts-supported="ttsSupported" :speaking-message-idx="speakingMessageIdx"
            :context="store.context" :messages="store.messages" :sending-message="store.sendingMessage" :hint="hint"
            :inactivity-hint="inactivityHint" :error="store.error"
            :show-transcription-confirm="showTranscriptionConfirm" :transcribed-text="transcribedText"
            :conversation-ended="conversationEnded" :loading-feedback="store.loadingFeedback"
            :show-translations="showTranslations" :speech-supported="speechSupported" :is-recording="isRecording"
            :user-input="userInput" @toggle-auto-speak="autoSpeak = !autoSpeak; if (!autoSpeak) stopSpeaking()"
            @stop-speaking="stopSpeaking" @speak-message="speakMessage" @end-conversation="endConversation"
            @confirm-transcription="confirmTranscription" @edit-transcription="editTranscription"
            @cancel-transcription="cancelTranscription" @request-feedback="requestFeedback"
            @toggle-translations="showTranslations = !showTranslations"
            @toggle-recording="isRecording ? stopRecording() : startRecording()" @update:user-input="userInput = $event"
            @send-message="sendMessage" />

        <ConversationFeedbackStep v-if="phase === 'feedback' && store.feedback" :feedback="store.feedback"
            :topic-label="TOPIC_OPTIONS.find(t => t.id === store.topic)?.label || store.topic"
            :selected-language-label="selectedLanguageLabel" :selected-difficulty="selectedDifficulty"
            :rating-stars="ratingStars" :messages="store.messages" :get-message-feedback="getMessageFeedback"
            :feedback-category-label="feedbackCategoryLabel" :creating-deck="creatingDeck" :deck-created="deckCreated"
            :deck-create-error="deckCreateError" @create-deck="createFlashcardsFromConversation" @try-again="tryAgain"
            @new-topic="startNewConversation" @home="router.push('/')" />
    </div>
</template>
