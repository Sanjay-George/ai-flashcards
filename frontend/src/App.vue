<script setup lang="ts">
import { RouterView } from 'vue-router'
</script>

<template>
    <div id="app" class="min-h-screen flex flex-col">
        <header class="bg-card text-foreground py-4 border-b border-border shadow-sm">
            <div class="max-w-7xl mx-auto px-5 w-full">
                <h1 class="text-2xl font-bold mb-3 tracking-tight">🎴 Flashcards AI</h1>
                <nav class="flex gap-2">
                    <router-link to="/"
                        class="text-muted-foreground no-underline font-medium text-sm px-3.5 py-2 rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        Home
                    </router-link>
                    <router-link to="/decks"
                        class="text-muted-foreground no-underline font-medium text-sm px-3.5 py-2 rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        My Decks
                    </router-link>
                    <router-link to="/create"
                        class="text-muted-foreground no-underline font-medium text-sm px-3.5 py-2 rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        Create Deck
                    </router-link>
                </nav>
            </div>
        </header>

        <main class="flex-1 py-8">
            <div class="max-w-7xl mx-auto px-5 w-full">
                <RouterView />
            </div>
        </main>

        <footer class="bg-card text-muted-foreground py-6 text-center mt-auto border-t border-border text-sm">
            <div class="max-w-7xl mx-auto px-5 w-full">
                <p>&copy; 2026 Flashcards AI - Language Learning Assistant</p>
            </div>
        </footer>
    </div>
</template>
