<script setup lang="ts">
import { watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useProgressStore } from './stores/progressStore'

const authStore = useAuthStore()
const progressStore = useProgressStore()

// Fetch progress when user logs in
watch(() => authStore.isAuthenticated, (isAuth) => {
    if (isAuth) {
        progressStore.fetchProfile()
    } else {
        progressStore.clearProgress()
    }
}, { immediate: true })

const handleLogout = async () => {
    await authStore.logout()
    progressStore.clearProgress()
}
</script>

<template>
    <div id="app" class="min-h-screen flex flex-col">
        <header class="bg-card text-foreground py-4 border-b border-border shadow-sm">
            <div class="max-w-7xl mx-auto px-5 w-full">
                <div class="flex justify-between items-center mb-3">
                    <h1 class="text-2xl font-bold tracking-tight">🎴 Flashcards AI</h1>

                    <!-- Auth Section -->
                    <div v-if="authStore.isAuthenticated" class="flex items-center gap-4">
                        <!-- XP / Level badge -->
                        <div v-if="progressStore.profile" class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                            <span class="text-sm">{{ progressStore.profile.currentMilestone.emoji }}</span>
                            <span class="text-xs font-semibold text-primary">
                                Lv.{{ progressStore.profile.level }}
                            </span>
                            <span class="text-xs text-muted-foreground">
                                {{ progressStore.profile.totalXP }} XP
                            </span>
                        </div>
                        <span class="text-sm text-muted-foreground">
                            {{ authStore.user?.email }}
                        </span>
                        <button @click="handleLogout"
                            class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                            Sign Out
                        </button>
                    </div>
                    <div v-else>
                        <router-link to="/login" class="btn btn-primary text-sm px-4 py-2">
                            Sign In
                        </router-link>
                    </div>
                </div>
                <nav class="flex gap-2">
                    <router-link to="/"
                        class="text-muted-foreground no-underline font-medium text-sm px-3.5 py-2 rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        Home
                    </router-link>
                    <router-link to="/decks"
                        class="text-muted-foreground no-underline font-medium text-sm px-3.5 py-2 rounded-md transition-all duration-200 hover:text-foreground hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        My Decks
                    </router-link>
                    <router-link v-if="authStore.isAuthenticated" to="/create"
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
