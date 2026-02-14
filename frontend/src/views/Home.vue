<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <div class="text-center py-6 sm:py-10 lg:py-12">
            <h1
                class="text-3xl sm:text-4xl lg:text-5xl font-bold mb-3 sm:mb-4 bg-linear-to-r from-primary to-primary-gradient-end bg-clip-text text-transparent leading-tight">
                🎴 Welcome to Flashcards AI
            </h1>
            <p class="text-base sm:text-lg lg:text-xl text-muted-foreground mb-8 sm:mb-12 px-2">
                Your intelligent language learning companion powered by AI
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 mb-8 sm:mb-12">
                <div class="card text-center p-5 sm:p-8">
                    <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">🤖</div>
                    <h3 class="text-base sm:text-lg font-semibold mb-2 text-foreground">AI-Powered Creation</h3>
                    <p class="text-sm text-muted-foreground">Create flashcard decks from text or images using advanced
                        AI</p>
                </div>

                <div class="card text-center p-5 sm:p-8">
                    <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">💬</div>
                    <h3 class="text-base sm:text-lg font-semibold mb-2 text-foreground">Interactive Editing</h3>
                    <p class="text-sm text-muted-foreground">Refine your decks with natural language instructions</p>
                </div>

                <div class="card text-center p-5 sm:p-8">
                    <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">📚</div>
                    <h3 class="text-base sm:text-lg font-semibold mb-2 text-foreground">Smart Flashcards</h3>
                    <p class="text-sm text-muted-foreground">Generate contextual questions in Simple or Master mode</p>
                </div>

                <div class="card text-center p-5 sm:p-8">
                    <div class="text-4xl sm:text-5xl mb-3 sm:mb-4">📈</div>
                    <h3 class="text-base sm:text-lg font-semibold mb-2 text-foreground">Progress Tracking</h3>
                    <p class="text-sm text-muted-foreground">Track your learning progress with mastery scores</p>
                </div>
            </div>

            <div class="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0">
                <RouterLink to="/create" class="btn btn-primary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg">
                    Create Your First Deck
                </RouterLink>
                <RouterLink to="/decks" class="btn btn-secondary px-6 sm:px-8 py-3 sm:py-4 text-base sm:text-lg">
                    View My Decks
                </RouterLink>
            </div>
        </div>

        <div class="mt-10 sm:mt-16 lg:mt-20 py-8 sm:py-12 bg-card rounded-xl border border-border">
            <h2 class="text-center text-2xl sm:text-3xl lg:text-4xl font-bold mb-8 sm:mb-12 text-foreground">How It
                Works</h2>
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 px-4 sm:px-8">
                <div class="text-center">
                    <div
                        class="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-primary to-primary-gradient-end text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                        1
                    </div>
                    <h3 class="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">Create or Upload</h3>
                    <p class="text-xs sm:text-sm text-muted-foreground">Share text or upload an image of the content you
                        want to learn</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-primary to-primary-gradient-end text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                        2
                    </div>
                    <h3 class="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">AI Extracts Lexemes</h3>
                    <p class="text-xs sm:text-sm text-muted-foreground">Our AI identifies key terms, meanings, and parts
                        of speech</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-primary to-primary-gradient-end text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                        3
                    </div>
                    <h3 class="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">Generate Flashcards</h3>
                    <p class="text-xs sm:text-sm text-muted-foreground">Choose Simple or Master mode to create targeted
                        questions</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-12 h-12 sm:w-16 sm:h-16 bg-linear-to-br from-primary to-primary-gradient-end text-white rounded-full flex items-center justify-center text-xl sm:text-2xl font-bold mx-auto mb-3 sm:mb-4">
                        4
                    </div>
                    <h3 class="text-sm sm:text-lg font-semibold mb-1 sm:mb-2 text-foreground">Study & Master</h3>
                    <p class="text-xs sm:text-sm text-muted-foreground">Practice with flashcards and track your progress
                    </p>
                </div>
            </div>
        </div>
    </div>
</template>
