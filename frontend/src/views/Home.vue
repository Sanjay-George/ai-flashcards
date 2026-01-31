<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <div class="text-center py-12">
            <h1
                class="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent">
                🎴 Welcome to Flashcards AI
            </h1>
            <p class="text-xl text-muted-foreground mb-12">
                Your intelligent language learning companion powered by AI
            </p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
                <div class="card text-center p-8">
                    <div class="text-5xl mb-4">🤖</div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">AI-Powered Creation</h3>
                    <p class="text-muted-foreground">Create flashcard decks from text or images using advanced AI</p>
                </div>

                <div class="card text-center p-8">
                    <div class="text-5xl mb-4">💬</div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Interactive Editing</h3>
                    <p class="text-muted-foreground">Refine your decks with natural language instructions</p>
                </div>

                <div class="card text-center p-8">
                    <div class="text-5xl mb-4">📚</div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Smart Flashcards</h3>
                    <p class="text-muted-foreground">Generate contextual questions in Simple or Master mode</p>
                </div>

                <div class="card text-center p-8">
                    <div class="text-5xl mb-4">📈</div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Progress Tracking</h3>
                    <p class="text-muted-foreground">Track your learning progress with mastery scores</p>
                </div>
            </div>

            <div class="flex justify-center gap-4 flex-wrap">
                <RouterLink to="/create" class="btn btn-primary px-8 py-4 text-lg">
                    Create Your First Deck
                </RouterLink>
                <RouterLink to="/decks" class="btn btn-secondary px-8 py-4 text-lg">
                    View My Decks
                </RouterLink>
            </div>
        </div>

        <div class="mt-20 py-12 bg-card rounded-xl border border-border">
            <h2 class="text-center text-4xl font-bold mb-12 text-foreground">How It Works</h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 px-8">
                <div class="text-center">
                    <div
                        class="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        1
                    </div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Create or Upload</h3>
                    <p class="text-muted-foreground">Share text or upload an image of the content you want to learn</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        2
                    </div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">AI Extracts Lexemes</h3>
                    <p class="text-muted-foreground">Our AI identifies key terms, meanings, and parts of speech</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        3
                    </div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Generate Flashcards</h3>
                    <p class="text-muted-foreground">Choose Simple or Master mode to create targeted questions</p>
                </div>

                <div class="text-center">
                    <div
                        class="w-16 h-16 bg-gradient-to-br from-primary to-purple-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                        4
                    </div>
                    <h3 class="text-lg font-semibold mb-2 text-foreground">Study & Master</h3>
                    <p class="text-muted-foreground">Practice with flashcards and track your progress</p>
                </div>
            </div>
        </div>
    </div>
</template>
