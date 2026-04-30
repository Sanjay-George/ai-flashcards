<script setup lang="ts">
import type { ConversationMessage } from '../../types/index'

defineProps<{
    topicLabel: string
    selectedLanguageLabel: string
    selectedDifficulty: string
    autoSpeak: boolean
    ttsSupported: boolean
    speakingMessageIdx: number | null
    context: string
    messages: ConversationMessage[]
    sendingMessage: boolean
    hint: string | null
    inactivityHint: string | null
    error: string | null
    showTranscriptionConfirm: boolean
    transcribedText: string
    conversationEnded: boolean
    loadingFeedback: boolean
    showTranslations: boolean
    speechSupported: boolean
    isRecording: boolean
    userInput: string
}>()

const emit = defineEmits<{
    (e: 'toggleAutoSpeak'): void
    (e: 'stopSpeaking'): void
    (e: 'speakMessage', text: string, idx: number): void
    (e: 'endConversation'): void
    (e: 'confirmTranscription'): void
    (e: 'editTranscription'): void
    (e: 'cancelTranscription'): void
    (e: 'requestFeedback'): void
    (e: 'toggleTranslations'): void
    (e: 'toggleRecording'): void
    (e: 'update:userInput', value: string): void
    (e: 'sendMessage'): void
    (e: 'dismissError'): void
}>()
</script>

<template>
    <div class="flex flex-col h-[calc(100dvh-12rem)]">
        <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
                <h2 class="text-sm font-medium text-foreground">{{ topicLabel }}</h2>
                <span class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                    style="border-radius: 0.25rem;">
                    {{ selectedLanguageLabel }} · {{ selectedDifficulty }}
                </span>
            </div>
            <div class="flex items-center gap-1.5">
                <button v-if="ttsSupported" @click="emit('toggleAutoSpeak')" :class="[
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
                <button @click="emit('endConversation')" :disabled="loadingFeedback || sendingMessage"
                    class="btn btn-secondary text-xs px-2.5 py-1.5">
                    End
                </button>
            </div>
        </div>

        <div class="mb-3 p-2.5 border border-border text-xs text-muted-foreground" style="border-radius: 0.375rem;">
            {{ context }}
        </div>

        <div class="conversation-chat-scroll flex-1 overflow-y-auto space-y-2.5 mb-3 pr-1 scroll-smooth">
            <div v-for="(msg, idx) in messages" :key="idx" :class="[
                'max-w-[85%] sm:max-w-[75%] p-3 text-sm',
                msg.role === 'user'
                    ? 'ml-auto bg-foreground text-background'
                    : 'mr-auto bg-secondary text-foreground border border-border'
            ]" style="border-radius: 0.5rem;">
                <p class="whitespace-pre-wrap">{{ msg.content }}</p>

                <div v-if="msg.role === 'ai'" class="mt-1.5 flex items-center gap-2">
                    <button v-if="ttsSupported"
                        @click="speakingMessageIdx === idx ? emit('stopSpeaking') : emit('speakMessage', msg.content, idx)"
                        class="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                        :title="speakingMessageIdx === idx ? 'Stop' : 'Listen'">
                        <svg v-if="speakingMessageIdx !== idx" class="w-3 h-3" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M15.536 8.464a5 5 0 010 7.072M11 5L6 9H2v6h4l5 4V5z" />
                        </svg>
                        <svg v-else class="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>{{ speakingMessageIdx === idx ? 'Stop' : 'Listen' }}</span>
                    </button>
                </div>

                <div v-if="msg.role === 'ai' && msg.translation && showTranslations"
                    class="mt-1.5 pt-1.5 border-t border-border/50 text-xs text-muted-foreground italic">
                    {{ msg.translation }}
                </div>
            </div>

            <div v-if="sendingMessage" class="mr-auto bg-secondary border border-border p-3 max-w-[75%]"
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

            <div v-if="hint"
                class="mx-auto max-w-[80%] p-2 border border-border text-center text-xs text-muted-foreground"
                style="border-radius: 0.375rem;">
                {{ hint }}
            </div>

            <div v-if="inactivityHint"
                class="mx-auto max-w-[80%] p-2 border border-border text-center text-xs text-muted-foreground"
                style="border-radius: 0.375rem;">
                {{ inactivityHint }}
            </div>
        </div>

        <div v-if="error" class="mb-2 p-2 bg-destructive/10 text-destructive text-xs flex items-center justify-between gap-2"
            style="border-radius: 0.375rem;">
            <span>{{ error }}</span>
            <button @click="emit('dismissError')" class="shrink-0 leading-none hover:opacity-70 transition-opacity cursor-pointer" title="Dismiss">&times;</button>
        </div>

        <div v-if="showTranscriptionConfirm" class="mb-2 p-3 border border-foreground" style="border-radius: 0.375rem;">
            <p class="text-xs font-medium text-foreground mb-1.5">Transcribed:</p>
            <p class="text-sm text-foreground bg-secondary p-2 mb-2 border border-border"
                style="border-radius: 0.25rem;">
                {{ transcribedText }}
            </p>
            <div class="flex gap-1.5">
                <button @click="emit('confirmTranscription')" class="btn btn-primary text-xs flex-1">Send</button>
                <button @click="emit('editTranscription')" class="btn btn-secondary text-xs flex-1">Edit</button>
                <button @click="emit('cancelTranscription')" class="btn btn-secondary text-xs px-2">&times;</button>
            </div>
        </div>

        <div v-if="conversationEnded && !loadingFeedback" class="mb-2 p-3 border border-border text-center"
            style="border-radius: 0.375rem;">
            <p class="text-xs text-foreground font-medium">Conversation ended</p>
            <button @click="emit('requestFeedback')" class="btn btn-primary text-xs mt-2">Get feedback</button>
        </div>

        <div v-if="loadingFeedback" class="mb-2 p-3 border border-border text-center" style="border-radius: 0.375rem;">
            <div class="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Analyzing...
            </div>
        </div>

        <div v-if="!conversationEnded" class="flex items-center gap-1.5 pt-2 border-t border-border">
            <button @click="emit('toggleTranslations')" :class="[
                'p-2 border transition-colors shrink-0 cursor-pointer',
                showTranslations
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
            ]" style="border-radius: 0.25rem;" :title="showTranslations ? 'Hide translations' : 'Show translations'">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                </svg>
            </button>

            <button v-if="speechSupported" @click="emit('toggleRecording')" :class="[
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

            <input :value="userInput" @input="emit('update:userInput', ($event.target as HTMLInputElement).value)"
                @keydown.enter="emit('sendMessage')" :disabled="sendingMessage || conversationEnded"
                class="flex-1 px-3 py-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                style="border-radius: 0.375rem;" :placeholder="isRecording ? 'Listening...' : 'Type your response...'"
                autocomplete="off" />

            <button @click="emit('sendMessage')" :disabled="!userInput.trim() || sendingMessage || conversationEnded"
                class="btn btn-primary p-2 shrink-0 disabled:opacity-30 cursor-pointer">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </div>
    </div>
</template>
