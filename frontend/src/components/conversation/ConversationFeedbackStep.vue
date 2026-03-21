<script setup lang="ts">
import type { ConversationFeedbackResponse, ConversationMessage } from '../../types/index'
import ConversationTranscriptWithFeedback from './ConversationTranscriptWithFeedback.vue'

defineProps<{
    feedback: ConversationFeedbackResponse
    topicLabel: string
    selectedLanguageLabel: string
    selectedDifficulty: string
    ratingStars: string[]
    messages: ConversationMessage[]
    getMessageFeedback: (messageIndex: number) => any
    feedbackCategoryLabel: (category: string) => string
    creatingDeck: boolean
    deckCreated: boolean
    deckCreateError: string | null
}>()

const emit = defineEmits<{
    (e: 'createDeck'): void
    (e: 'tryAgain'): void
    (e: 'newTopic'): void
    (e: 'home'): void
}>()
</script>

<template>
    <div>
        <div class="mb-5">
            <h1 class="text-xl font-semibold text-foreground mb-1">Feedback</h1>
            <p class="text-xs text-muted-foreground">
                {{ topicLabel }} · {{ selectedLanguageLabel }} · {{ selectedDifficulty }}
            </p>
        </div>

        <div class="card mb-4">
            <div class="flex items-center gap-3 mb-2">
                <span class="text-lg tracking-wider text-foreground">
                    {{ ratingStars.join('') }}
                </span>
                <span class="text-sm font-semibold text-foreground">
                    {{ feedback.overall_rating }}/5
                </span>
            </div>
            <p class="text-sm text-muted-foreground">
                {{ feedback.summary }}
            </p>
        </div>

        <div class="space-y-2 mb-4">
            <h2 class="text-sm font-medium text-foreground mb-2">Improvements</h2>
            <div v-for="(point, idx) in feedback.feedback_points" :key="idx" class="card p-3">
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

        <details class="card p-3 mb-4">
            <summary
                class="cursor-pointer text-xs font-medium text-foreground hover:text-muted-foreground transition-colors">
                View transcript with feedback
            </summary>
            <div class="mt-3">
                <ConversationTranscriptWithFeedback :messages="messages" :get-message-feedback="getMessageFeedback"
                    :feedback-category-label="feedbackCategoryLabel" :show-translations="false" />
            </div>
        </details>

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

            <button @click="emit('createDeck')" :disabled="creatingDeck || deckCreated" class="btn btn-primary text-sm">
                <span v-if="creatingDeck" class="flex items-center gap-1.5">
                    <svg class="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Extracting...
                </span>
                <span v-else>Create deck</span>
            </button>
        </div>

        <div class="flex gap-2">
            <button @click="emit('tryAgain')" class="btn btn-primary flex-1 text-sm">Try again</button>
            <button @click="emit('newTopic')" class="btn btn-secondary flex-1 text-sm">New topic</button>
            <button @click="emit('home')" class="btn btn-secondary flex-1 text-sm">Home</button>
        </div>
    </div>
</template>
