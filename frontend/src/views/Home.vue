<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <div class="max-w-3xl mx-auto">
        <div class="py-8 sm:py-16 lg:py-20">
            <h1
                class="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-foreground mb-4 leading-tight">
                Learn languages<br />with AI-powered flashcards
            </h1>
            <p class="text-base sm:text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed">
                Create flashcard decks from text or images. Study with spaced repetition. Practice conversations with AI
                feedback.
            </p>

            <div class="flex flex-col sm:flex-row gap-3 mb-16 sm:mb-20">
                <RouterLink to="/decks" class="btn btn-secondary px-5 py-2.5 text-sm">
                    Browse decks
                </RouterLink>
                <RouterLink to="/conversation" class="btn btn-primary px-5 py-2.5 text-sm">
                    Practice conversations
                </RouterLink>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border"
                style="border-radius: 0.5rem; overflow: hidden;">
                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">AI-powered creation</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Create flashcard decks from text or images
                        using advanced AI</p>
                </div>

                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">Interactive editing</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Refine your decks with natural language
                        instructions</p>
                </div>

                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">Smart flashcards</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Generate contextual questions in Simple or
                        Master mode</p>
                </div>

                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">Progress tracking</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Track your learning progress with mastery
                        scores</p>
                </div>

                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">Conversation practice</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Simulate real-world dialogues and get
                        personalized feedback</p>
                </div>

                <div class="bg-background p-6">
                    <h3 class="text-sm font-medium text-foreground mb-1.5">Spaced repetition</h3>
                    <p class="text-sm text-muted-foreground leading-relaxed">Difficult words appear more often, mastered
                        words less frequently</p>
                </div>
            </div>
        </div>

        <div class="border-t border-border pt-12 sm:pt-16 pb-4">
            <h2 class="text-lg font-medium text-foreground mb-10">How it works</h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-10">
                <div>
                    <div class="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mb-3"
                        style="border-radius: 0.25rem;">
                        1
                    </div>
                    <h3 class="text-sm font-medium mb-1 text-foreground">Create or upload</h3>
                    <p class="text-xs text-muted-foreground leading-relaxed">Share text or upload an image of the
                        content you want to learn</p>
                </div>

                <div>
                    <div class="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mb-3"
                        style="border-radius: 0.25rem;">
                        2
                    </div>
                    <h3 class="text-sm font-medium mb-1 text-foreground">AI extracts lexemes</h3>
                    <p class="text-xs text-muted-foreground leading-relaxed">AI identifies key terms, meanings, and
                        parts of speech</p>
                </div>

                <div>
                    <div class="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mb-3"
                        style="border-radius: 0.25rem;">
                        3
                    </div>
                    <h3 class="text-sm font-medium mb-1 text-foreground">Generate flashcards</h3>
                    <p class="text-xs text-muted-foreground leading-relaxed">Choose Simple or Master mode to create
                        targeted questions</p>
                </div>

                <div>
                    <div class="w-8 h-8 bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium mb-3"
                        style="border-radius: 0.25rem;">
                        4
                    </div>
                    <h3 class="text-sm font-medium mb-1 text-foreground">Study & master</h3>
                    <p class="text-xs text-muted-foreground leading-relaxed">Practice with flashcards and track your
                        progress</p>
                </div>
            </div>
        </div>
    </div>
</template>
