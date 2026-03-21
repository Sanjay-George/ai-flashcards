<script setup lang="ts">
interface LanguageOption {
    code: string
    label: string
    flag: string
}

interface DifficultyOption {
    id: string
    label: string
    description: string
}

interface TopicOption {
    id: string
    label: string
    emoji: string
    description: string
}

defineProps<{
    languageOptions: LanguageOption[]
    difficultyOptions: DifficultyOption[]
    topicOptions: TopicOption[]
    selectedLanguage: string
    selectedDifficulty: string
    selectedTopic: string
    customTopicId: string
    isCustomTopicSelected: boolean
    showHistoryButton?: boolean
    loading: boolean
    error: string | null
}>()

const emit = defineEmits<{
    (e: 'update:selectedLanguage', value: string): void
    (e: 'update:selectedDifficulty', value: string): void
    (e: 'update:selectedTopic', value: string): void
    (e: 'start'): void
    (e: 'openHistory'): void
}>()
</script>

<template>
    <div>
        <div class="mb-6">
            <div class="flex items-center justify-between gap-2 mb-1">
                <h1 class="text-xl font-semibold text-foreground">Conversation practice</h1>
                <button v-if="showHistoryButton" class="btn btn-secondary text-xs py-1.5" @click="emit('openHistory')">
                    View previous conversations
                </button>
            </div>
            <p class="text-sm text-muted-foreground">
                Practice real conversations with AI.
            </p>
        </div>

        <div class="card">
            <div class="mb-5">
                <p class="block text-xs font-medium text-muted-foreground mb-2">Language</p>
                <div class="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
                    <button v-for="lang in languageOptions" :key="lang.code"
                        @click="emit('update:selectedLanguage', lang.code)" :class="[
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

            <div class="mb-5">
                <p class="block text-xs font-medium text-muted-foreground mb-2">Difficulty</p>
                <div class="grid grid-cols-3 gap-2">
                    <button v-for="diff in difficultyOptions" :key="diff.id"
                        @click="emit('update:selectedDifficulty', diff.id)" :class="[
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

            <div class="mb-5">
                <p class="block text-xs font-medium text-muted-foreground mb-2">Topic</p>
                <div class="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                    <button @click="emit('update:selectedTopic', customTopicId)" :class="[
                        'px-2.5 py-2.5 border text-left transition-colors cursor-pointer',
                        isCustomTopicSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-secondary text-foreground'
                    ]" style="border-radius: 0.25rem;">
                        <span class="text-base">🧠</span>
                        <span class="block text-sm font-medium mt-0.5">Custom scenario</span>
                        <span class="block text-xs"
                            :class="isCustomTopicSelected ? 'text-primary/60' : 'text-muted-foreground'">
                            Describe your own topic before starting
                        </span>
                    </button>

                    <button v-for="topic in topicOptions" :key="topic.id"
                        @click="emit('update:selectedTopic', topic.id)" :class="[
                            'px-2.5 py-2.5 border text-left transition-colors cursor-pointer',
                            selectedTopic === topic.id
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border hover:bg-secondary text-foreground'
                        ]" style="border-radius: 0.25rem;">
                        <span class="text-base">{{ topic.emoji }}</span>
                        <span class="block text-sm font-medium mt-0.5">{{ topic.label }}</span>
                        <span class="block text-xs"
                            :class="selectedTopic === topic.id ? 'text-primary/60' : 'text-muted-foreground'">{{
                                topic.description }}</span>
                    </button>


                </div>
            </div>

            <div v-if="error" class="mb-3 p-2.5 bg-destructive/10 text-destructive text-sm"
                style="border-radius: 0.375rem;">
                {{ error }}
            </div>

            <button @click="emit('start')" :disabled="loading" class="btn btn-primary w-full text-sm">
                <span v-if="loading" class="flex items-center justify-center gap-2">
                    <svg class="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Setting up...
                </span>
                <span v-else>Start conversation</span>
            </button>
        </div>
    </div>
</template>
