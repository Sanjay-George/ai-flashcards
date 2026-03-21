<script setup lang="ts">
defineProps<{
    selectedLanguageLabel: string
    selectedDifficulty: string
    error: string | null
    showTranscriptionConfirm: boolean
    transcribedText: string
    speechSupported: boolean
    isRecording: boolean
    userInput: string
    loading: boolean
}>()

const emit = defineEmits<{
    (e: 'confirmTranscription'): void
    (e: 'editTranscription'): void
    (e: 'cancelTranscription'): void
    (e: 'toggleRecording'): void
    (e: 'update:userInput', value: string): void
    (e: 'submit'): void
    (e: 'back'): void
}>()
</script>

<template>
    <div class="max-w-3xl mx-auto">
        <div class="mb-4">
            <h1 class="text-xl font-semibold text-foreground mb-1">Custom scenario</h1>
            <p class="text-sm text-muted-foreground">Describe the conversation topic to begin.</p>
        </div>

        <div class="card mb-3">
            <p class="text-xs text-muted-foreground">
                {{ selectedLanguageLabel }} · {{ selectedDifficulty }}
            </p>
        </div>

        <div v-if="error" class="mb-2 p-2 bg-destructive/10 text-destructive text-xs text-center"
            style="border-radius: 0.375rem;">
            {{ error }}
        </div>

        <div v-if="showTranscriptionConfirm" class="mb-2 p-3 border border-foreground" style="border-radius: 0.375rem;">
            <p class="text-xs font-medium text-foreground mb-1.5">Transcribed:</p>
            <p class="text-sm text-foreground bg-secondary p-2 mb-2 border border-border" style="border-radius: 0.25rem;">
                {{ transcribedText }}
            </p>
            <div class="flex gap-1.5">
                <button @click="emit('confirmTranscription')" class="btn btn-primary text-xs flex-1">
                    Start
                </button>
                <button @click="emit('editTranscription')" class="btn btn-secondary text-xs flex-1">
                    Edit
                </button>
                <button @click="emit('cancelTranscription')" class="btn btn-secondary text-xs px-2">
                    &times;
                </button>
            </div>
        </div>

        <div class="flex items-center gap-1.5 pt-2 border-t border-border">
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

            <input :value="userInput" @input="emit('update:userInput', ($event.target as HTMLInputElement).value)" @keydown.enter="emit('submit')"
                :disabled="loading"
                class="flex-1 px-3 py-2 border border-border text-sm focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                style="border-radius: 0.375rem;" :placeholder="isRecording ? 'Listening...' : 'Describe your scenario...'"
                autocomplete="off" />

            <button @click="emit('submit')" :disabled="!userInput.trim() || loading"
                class="btn btn-primary p-2 shrink-0 disabled:opacity-30 cursor-pointer" title="Start with this scenario">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
            </button>
        </div>

        <div class="mt-3">
            <button @click="emit('back')" class="btn btn-secondary text-sm">
                Back
            </button>
        </div>
    </div>
</template>
