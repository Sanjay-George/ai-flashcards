<script setup lang="ts">
import { ref, computed, nextTick, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useConversationStore, TOPIC_OPTIONS, DIFFICULTY_OPTIONS, LANGUAGE_OPTIONS } from '../stores/conversationStore'
import { useDeckStore } from '../stores/deckStore'
import type { ConversationDifficulty, ConversationNextResponse } from '../types/index'

const router = useRouter()
const store = useConversationStore()
const deckStore = useDeckStore()

// ========== State machine: 'setup' | 'chat' | 'feedback' ==========
type Phase = 'setup' | 'chat' | 'feedback'
const phase = ref<Phase>('setup')

// Setup state
const selectedLanguage = ref('de')
const selectedDifficulty = ref<ConversationDifficulty>('easy')
const selectedTopic = ref('restaurant')

// Chat state
const userInput = ref('')
const chatContainer = ref<HTMLElement | null>(null)
const showTranslations = ref(false)
const conversationEnded = ref(false)
const hint = ref<string | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)

// Inactivity timer
let inactivityTimer: ReturnType<typeof setTimeout> | null = null
const inactivityHint = ref<string | null>(null)

const startInactivityTimer = () => {
    clearInactivityTimer()
    inactivityTimer = setTimeout(() => {
        if (store.isActive && !store.sendingMessage && !conversationEnded.value) {
            inactivityHint.value = "Still there? Take your time — or type 'skip' if you'd like a hint!"
        }
    }, 60 * 1000) // 60 seconds
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

// ========== Setup Phase ==========

const selectedLanguageLabel = computed(() => {
    const lang = LANGUAGE_OPTIONS.find(l => l.code === selectedLanguage.value)
    return lang ? `${lang.flag} ${lang.label}` : selectedLanguage.value
})

const startConversation = async () => {
    try {
        await store.startConversation(
            selectedLanguage.value,
            selectedDifficulty.value,
            selectedTopic.value
        )
        phase.value = 'chat'
        startInactivityTimer()
        await nextTick()
        scrollToBottom()
        inputRef.value?.focus()
    } catch (e) {
        // error is set in store
    }
}

// ========== Chat Phase ==========

const scrollToBottom = () => {
    nextTick(() => {
        if (chatContainer.value) {
            chatContainer.value.scrollTop = chatContainer.value.scrollHeight
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
    } catch (e) {
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
    } catch (e) {
        // error displayed in template
    }
}

// ========== Feedback Phase ==========

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
    // Re-start with same settings
    try {
        await store.startConversation(
            selectedLanguage.value,
            selectedDifficulty.value,
            selectedTopic.value
        )
        phase.value = 'chat'
        startInactivityTimer()
        await nextTick()
        scrollToBottom()
        inputRef.value?.focus()
    } catch (e) {
        // error displayed
    }
}

// ========== Speech Recognition ==========
const isRecording = ref(false)
const transcribedText = ref('')
const showTranscriptionConfirm = ref(false)
const speechSupported = ref(typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))
let recognition: any = null

const languageMap: Record<string, string> = {
    de: 'de-DE', fr: 'fr-FR', hi: 'hi-IN',
}

const startRecording = () => {
    if (!speechSupported.value) return

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
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
    // Auto-send after confirming
    sendMessage()
}

const editTranscription = () => {
    userInput.value = transcribedText.value
    showTranscriptionConfirm.value = false
    transcribedText.value = ''
    inputRef.value?.focus()
}

const cancelTranscription = () => {
    showTranscriptionConfirm.value = false
    transcribedText.value = ''
}

// ========== Text-to-Speech ==========
const ttsSupported = ref(typeof window !== 'undefined' && 'speechSynthesis' in window)
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
    // Stop any current speech
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = getTTSLang(selectedLanguage.value)
    utterance.rate = selectedDifficulty.value === 'easy' ? 0.8 : selectedDifficulty.value === 'medium' ? 0.9 : 1.0

    utterance.onstart = () => { speakingMessageIdx.value = idx }
    utterance.onend = () => { speakingMessageIdx.value = null }
    utterance.onerror = () => { speakingMessageIdx.value = null }

    window.speechSynthesis.speak(utterance)
}

const stopSpeaking = () => {
    window.speechSynthesis.cancel()
    speakingMessageIdx.value = null
}

// Auto-speak AI messages when they arrive
watch(() => store.messages.length, (newLen, oldLen) => {
    if (!autoSpeak.value || !ttsSupported.value) return
    if (newLen > oldLen) {
        const lastMsg = store.messages[newLen - 1]
        if (lastMsg?.role === 'ai') {
            speakMessage(lastMsg.content, newLen - 1)
        }
    }
})

// Cleanup TTS on unmount
onUnmounted(() => {
    if (ttsSupported.value) {
        window.speechSynthesis.cancel()
    }
})

// ========== Flashcard Creation from Conversation ==========
const creatingDeck = ref(false)
const deckCreated = ref(false)
const deckCreateError = ref<string | null>(null)

const createFlashcardsFromConversation = async () => {
    creatingDeck.value = true
    deckCreateError.value = null
    deckCreated.value = false

    try {
        const result = await store.extractVocabulary()

        // Map AI response fields to Deck model fields
        const mappedLexemes = result.lexemes.map((l: any) => ({
            term: l.term,
            meaning: l.definition || l.meaning,
            POS: l.POS || '',
        }))

        // Create a deck using the backend
        const deck = await deckStore.createDeck({
            title: result.title,
            tags: result.tags,
            language: store.language,
            lexemes: mappedLexemes,
            isPublic: false,
        })

        deckCreated.value = true

        // Navigate to deck after a brief delay
        setTimeout(() => {
            router.push(`/deck/${deck._id}`)
        }, 1500)
    } catch (e: any) {
        deckCreateError.value = e?.response?.data?.detail || e.message || 'Failed to create flashcards'
    } finally {
        creatingDeck.value = false
    }
}

// ========== Rating display ==========
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

        <!-- ==================== SETUP PHASE ==================== -->
        <div v-if="phase === 'setup'">
            <div class="mb-6">
                <h1 class="text-xl font-semibold text-foreground mb-1">Conversation practice</h1>
                <p class="text-sm text-muted-foreground">
                    Practice real conversations with AI.
                </p>
            </div>

            <div class="card">
                <!-- Language Selection -->
                <div class="mb-5">
                    <label class="block text-xs font-medium text-muted-foreground mb-2">Language</label>
                    <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                        <button v-for="lang in LANGUAGE_OPTIONS" :key="lang.code" @click="selectedLanguage = lang.code"
                            :class="[
                                'px-2.5 py-2 border text-sm transition-colors text-center cursor-pointer',
                                selectedLanguage === lang.code
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:bg-secondary text-foreground'
                            ]" style="border-radius: 0.25rem;">
                            <span class="text-base">{{ lang.flag }}</span>
                            <span class="block text-xs mt-0.5">{{ lang.label }}</span>
                        </button>
                    </div>
                </div>

                <!-- Difficulty Selection -->
                <div class="mb-5">
                    <label class="block text-xs font-medium text-muted-foreground mb-2">Difficulty</label>
                    <div class="grid grid-cols-3 gap-2">
                        <button v-for="diff in DIFFICULTY_OPTIONS" :key="diff.id" @click="selectedDifficulty = diff.id"
                            :class="[
                                'px-3 py-3 border text-center transition-colors cursor-pointer',
                                selectedDifficulty === diff.id
                                    ? 'border-primary bg-primary/10 text-primary'
                                    : 'border-border hover:bg-secondary text-foreground'
                            ]" style="border-radius: 0.375rem;">
                            <span class="block text-sm font-medium">{{ diff.label }}</span>
                            <span class="block text-xs mt-0.5"
                                :class="selectedDifficulty === diff.id ? 'text-primary/70' : 'text-muted-foreground'">{{
                                    diff.description }}</span>
                        </button>
                    </div>
                </div>

                <!-- Topic Selection -->
                <div class="mb-5">
                    <label class="block text-xs font-medium text-muted-foreground mb-2">Topic</label>
                    <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                        <button v-for="t in TOPIC_OPTIONS" :key="t.id" @click="selectedTopic = t.id" :class="[
                            'px-2.5 py-2.5 border text-left transition-colors cursor-pointer',
                            selectedTopic === t.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-secondary text-foreground'
                        ]" style="border-radius: 0.25rem;">
                            <span class="text-base">{{ t.emoji }}</span>
                            <span class="block text-sm font-medium mt-0.5">{{ t.label }}</span>
                            <span class="block text-xs"
                                :class="selectedTopic === t.id ? 'text-primary/60' : 'text-muted-foreground'">{{
                                    t.description }}</span>
                        </button>
                    </div>
                </div>

                <!-- Error -->
                <div v-if="store.error" class="mb-3 p-2.5 bg-destructive/10 text-destructive text-sm"
                    style="border-radius: 0.375rem;">
                    {{ store.error }}
                </div>

                <!-- Start Button -->
                <button @click="startConversation" :disabled="store.loading" class="btn btn-primary w-full text-sm">
                    <span v-if="store.loading" class="flex items-center justify-center gap-2">
                        <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Setting up...
                    </span>
                    <span v-else>Start conversation</span>
                </button>
            </div>
        </div>

        <!-- ==================== CHAT PHASE ==================== -->
        <div v-if="phase === 'chat'" class="flex flex-col h-[calc(100dvh-12rem)]">
            <!-- Chat header -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <h2 class="text-sm font-medium text-foreground">
                        {{TOPIC_OPTIONS.find(t => t.id === store.topic)?.label || store.topic}}
                    </h2>
                    <span class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                        style="border-radius: 0.25rem;">
                        {{ selectedLanguageLabel }} · {{ selectedDifficulty }}
                    </span>
                </div>
                <div class="flex items-center gap-1.5">
                    <!-- Auto-speak toggle -->
                    <button v-if="ttsSupported" @click="autoSpeak = !autoSpeak; if (!autoSpeak) stopSpeaking()" :class="[
                        'p-1.5 border transition-colors cursor-pointer',
                        autoSpeak
                            ? 'bg-primary/10 border-primary text-primary'
                            : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                    ]" style="border-radius: 0.25rem;" :title="autoSpeak ? 'Auto-speak on' : 'Auto-speak off'">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z" />
                        </svg>
                    </button>
                    <button @click="endConversation" :disabled="store.loadingFeedback || store.sendingMessage"
                        class="btn btn-secondary text-xs px-2.5 py-1.5">
                        End
                    </button>
                </div>
            </div>

            <!-- Context banner -->
            <div class="mb-3 p-2.5 border border-border text-xs text-muted-foreground" style="border-radius: 0.375rem;">
                {{ store.context }}
            </div>

            <!-- Messages area -->
            <div ref="chatContainer" class="flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 scroll-smooth">

                <div v-for="(msg, idx) in store.messages" :key="idx" :class="[
                    'max-w-[85%] sm:max-w-[75%] p-3 text-sm',
                    msg.role === 'user'
                        ? 'ml-auto bg-foreground text-background'
                        : 'mr-auto bg-secondary text-foreground border border-border'
                ]" style="border-radius: 0.5rem;">
                    <!-- Message content -->
                    <p class="whitespace-pre-wrap">{{ msg.content }}</p>

                    <!-- AI message actions -->
                    <div v-if="msg.role === 'ai'" class="mt-1.5 flex items-center gap-2">
                        <button v-if="ttsSupported"
                            @click="speakingMessageIdx === idx ? stopSpeaking() : speakMessage(msg.content, idx)"
                            class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                            :title="speakingMessageIdx === idx ? 'Stop' : 'Listen'">
                            <svg v-if="speakingMessageIdx !== idx" class="w-3 h-3" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                            </svg>
                            <svg v-else class="w-3 h-3 animate-pulse" fill="none" stroke="currentColor"
                                viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span>{{ speakingMessageIdx === idx ? 'Stop' : 'Listen' }}</span>
                        </button>
                    </div>

                    <!-- Translation -->
                    <div v-if="msg.role === 'ai' && msg.translation && showTranslations"
                        class="mt-1.5 pt-1.5 border-t border-border/50 text-xs text-muted-foreground italic">
                        {{ msg.translation }}
                    </div>
                </div>

                <!-- Typing indicator -->
                <div v-if="store.sendingMessage" class="mr-auto bg-secondary border border-border p-3 max-w-[75%]"
                    style="border-radius: 0.5rem;">
                    <div class="flex gap-1">
                        <span class="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                            style="animation-delay: 0ms"></span>
                        <span class="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                            style="animation-delay: 150ms"></span>
                        <span class="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce"
                            style="animation-delay: 300ms"></span>
                    </div>
                </div>

                <!-- Hint -->
                <div v-if="hint"
                    class="mx-auto max-w-[80%] p-2 border border-border text-center text-xs text-muted-foreground"
                    style="border-radius: 0.375rem;">
                    {{ hint }}
                </div>

                <!-- Inactivity hint -->
                <div v-if="inactivityHint"
                    class="mx-auto max-w-[80%] p-2 border border-border text-center text-xs text-muted-foreground"
                    style="border-radius: 0.375rem;">
                    {{ inactivityHint }}
                </div>
            </div>

            <!-- Error message -->
            <div v-if="store.error" class="mb-2 p-2 bg-destructive/10 text-destructive text-xs text-center"
                style="border-radius: 0.375rem;">
                {{ store.error }}
            </div>

            <!-- Transcription confirmation -->
            <div v-if="showTranscriptionConfirm" class="mb-2 p-3 border border-foreground"
                style="border-radius: 0.375rem;">
                <p class="text-xs font-medium text-foreground mb-1.5">Transcribed:</p>
                <p class="text-sm text-foreground bg-secondary p-2 mb-2 border border-border"
                    style="border-radius: 0.25rem;">
                    {{ transcribedText }}
                </p>
                <div class="flex gap-1.5">
                    <button @click="confirmTranscription" class="btn btn-primary text-xs flex-1">
                        Send
                    </button>
                    <button @click="editTranscription" class="btn btn-secondary text-xs flex-1">
                        Edit
                    </button>
                    <button @click="cancelTranscription" class="btn btn-secondary text-xs px-2">
                        &times;
                    </button>
                </div>
            </div>

            <!-- Conversation ended notice -->
            <div v-if="conversationEnded && !store.loadingFeedback" class="mb-2 p-3 border border-border text-center"
                style="border-radius: 0.375rem;">
                <p class="text-xs text-foreground font-medium">Conversation ended</p>
                <button @click="requestFeedback" class="btn btn-primary text-xs mt-2">
                    Get feedback
                </button>
            </div>

            <!-- Loading feedback -->
            <div v-if="store.loadingFeedback" class="mb-2 p-3 border border-border text-center"
                style="border-radius: 0.375rem;">
                <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Analyzing...
                </div>
            </div>

            <!-- Input bar -->
            <div v-if="!conversationEnded" class="flex items-center gap-1.5 pt-2 border-t border-border">
                <!-- Toggle translations -->
                <button @click="showTranslations = !showTranslations" :class="[
                    'p-2 border transition-colors shrink-0 cursor-pointer',
                    showTranslations
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                ]" style="border-radius: 0.25rem;"
                    :title="showTranslations ? 'Hide translations' : 'Show translations'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </button>

                <!-- Microphone button -->
                <button v-if="speechSupported" @click="isRecording ? stopRecording() : startRecording()" :class="[
                    'p-2 border transition-colors shrink-0 cursor-pointer',
                    isRecording
                        ? 'bg-destructive border-destructive text-background animate-pulse'
                        : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                ]" style="border-radius: 0.25rem;" :title="isRecording ? 'Stop recording' : 'Record voice'">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                </button>

                <!-- Text input -->
                <input ref="inputRef" v-model="userInput" @keydown.enter="sendMessage"
                    :disabled="store.sendingMessage || conversationEnded"
                    class="flex-1 px-3 py-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                    style="border-radius: 0.375rem;"
                    :placeholder="isRecording ? 'Listening...' : 'Type your response...'" autocomplete="off" />

                <!-- Send button -->
                <button @click="sendMessage" :disabled="!userInput.trim() || store.sendingMessage || conversationEnded"
                    class="btn btn-primary p-2 shrink-0 disabled:opacity-30 cursor-pointer">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </div>
        </div>

        <!-- ==================== FEEDBACK PHASE ==================== -->
        <div v-if="phase === 'feedback' && store.feedback">
            <div class="mb-5">
                <h1 class="text-xl font-semibold text-foreground mb-1">Feedback</h1>
                <p class="text-xs text-muted-foreground">
                    {{TOPIC_OPTIONS.find(t => t.id === store.topic)?.label || store.topic}}
                    · {{ selectedLanguageLabel }} · {{ selectedDifficulty }}
                </p>
            </div>

            <!-- Overall Rating -->
            <div class="card mb-4">
                <div class="flex items-center gap-3 mb-2">
                    <span class="text-lg tracking-wider text-foreground">
                        {{ ratingStars.join('') }}
                    </span>
                    <span class="text-sm font-semibold text-foreground">
                        {{ store.feedback.overall_rating }}/5
                    </span>
                </div>
                <p class="text-sm text-muted-foreground">
                    {{ store.feedback.summary }}
                </p>
            </div>

            <!-- Feedback Points -->
            <div class="space-y-2 mb-4">
                <h2 class="text-sm font-medium text-foreground mb-2">Improvements</h2>
                <div v-for="(point, idx) in store.feedback.feedback_points" :key="idx" class="card p-3">
                    <div class="flex items-center gap-1.5 mb-2">
                        <span
                            class="text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border px-1.5 py-0.5"
                            style="border-radius: 0.25rem;">
                            {{ feedbackCategoryLabel(point.category) }}
                        </span>
                    </div>

                    <div class="space-y-1.5 text-sm">
                        <div class="flex items-start gap-2">
                            <span class="text-destructive text-xs mt-0.5 shrink-0">&times;</span>
                            <span class="text-foreground line-through opacity-60">{{ point.original }}</span>
                        </div>
                        <div class="flex items-start gap-2">
                            <span class="text-green-600 text-xs mt-0.5 shrink-0">&check;</span>
                            <span class="text-foreground font-medium">{{ point.corrected }}</span>
                        </div>
                        <p class="text-xs text-muted-foreground mt-1 pl-4">{{ point.explanation }}</p>
                    </div>
                </div>
            </div>

            <!-- Transcript -->
            <details class="card p-3 mb-4">
                <summary
                    class="cursor-pointer text-xs font-medium text-foreground hover:text-muted-foreground transition-colors">
                    View transcript
                </summary>
                <div class="mt-3 space-y-1.5 max-h-60 overflow-y-auto">
                    <div v-for="(msg, idx) in store.messages" :key="idx" :class="[
                        'p-2.5 text-sm',
                        msg.role === 'user'
                            ? 'bg-primary/10 text-foreground border border-border ml-8'
                            : 'bg-secondary text-foreground mr-8'
                    ]" style="border-radius: 0.375rem;">
                        <span class="text-xs font-medium opacity-50">
                            {{ msg.role === 'user' ? 'You' : 'AI' }}
                        </span>
                        <p class="mt-0.5 whitespace-pre-wrap">{{ msg.content }}</p>

                        <div v-if="msg.role === 'user' && getMessageFeedback(idx)"
                            class="mt-2 pt-2 border-t border-border space-y-1.5">
                            <span
                                class="text-xs font-medium text-muted-foreground uppercase tracking-wider border border-border px-1.5 py-0.5"
                                style="border-radius: 0.25rem;">
                                {{ feedbackCategoryLabel(getMessageFeedback(idx)!.category) }}
                            </span>

                            <div v-if="getMessageFeedback(idx)!.corrected !== getMessageFeedback(idx)!.original"
                                class="space-y-1 text-xs">
                                <div class="flex items-start gap-2">
                                    <span class="text-destructive mt-0.5 shrink-0">&times;</span>
                                    <span class="line-through opacity-60">{{ getMessageFeedback(idx)!.original }}</span>
                                </div>
                                <div class="flex items-start gap-2">
                                    <span class="text-foreground mt-0.5 shrink-0">→</span>
                                    <span class="font-medium">{{ getMessageFeedback(idx)!.corrected }}</span>
                                </div>
                            </div>
                            <div v-else class="text-xs">
                                <span class="font-medium">{{ getMessageFeedback(idx)!.corrected }}</span>
                            </div>

                            <p class="text-xs text-muted-foreground">{{ getMessageFeedback(idx)!.explanation }}</p>
                        </div>
                    </div>
                </div>
            </details>

            <!-- Create Flashcards -->
            <div class="card p-3 mb-4">
                <h3 class="text-sm font-medium text-foreground mb-1">Create flashcards</h3>
                <p class="text-xs text-muted-foreground mb-2.5">
                    Extract vocabulary from this conversation into a deck.
                </p>

                <div v-if="deckCreated" class="p-2 border border-green-500/30 text-green-700 text-xs mb-2"
                    style="border-radius: 0.25rem;">
                    Deck created. Redirecting...
                </div>

                <div v-if="deckCreateError" class="p-2 bg-destructive/10 text-destructive text-xs mb-2"
                    style="border-radius: 0.25rem;">
                    {{ deckCreateError }}
                </div>

                <button @click="createFlashcardsFromConversation" :disabled="creatingDeck || deckCreated"
                    class="btn btn-primary text-sm">
                    <span v-if="creatingDeck" class="flex items-center gap-1.5">
                        <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                            <path class="opacity-75" fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Extracting...
                    </span>
                    <span v-else>Create deck</span>
                </button>
            </div>

            <!-- Action buttons -->
            <div class="flex gap-2">
                <button @click="tryAgain" :disabled="store.loading" class="btn btn-primary flex-1 text-sm">
                    Try again
                </button>
                <button @click="startNewConversation" class="btn btn-secondary flex-1 text-sm">
                    New topic
                </button>
                <button @click="router.push('/')" class="btn btn-secondary flex-1 text-sm">
                    Home
                </button>
            </div>
        </div>

    </div>
</template>

<style scoped>
@keyframes bounce {

    0%,
    80%,
    100% {
        transform: translateY(0);
    }

    40% {
        transform: translateY(-4px);
    }
}
</style>
