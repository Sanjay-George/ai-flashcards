<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import { useAuthStore } from './stores/authStore'
import { useProgressStore } from './stores/progressStore'

const authStore = useAuthStore()
const progressStore = useProgressStore()
const mobileMenuOpen = ref(false)

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
    mobileMenuOpen.value = false
}

const closeMenu = () => {
    mobileMenuOpen.value = false
}
</script>

<template>
    <div id="app" class="min-h-dvh flex flex-col">
        <header class="bg-card text-foreground py-3 sm:py-4 border-b border-border shadow-sm sticky top-0 z-50">
            <div class="max-w-7xl mx-auto px-4 sm:px-5 w-full">
                <!-- Top row: logo + hamburger (mobile) or full header (desktop) -->
                <div class="flex justify-between items-center">
                    <router-link to="/" class="no-underline" @click="closeMenu">
                        <h1 class="text-xl sm:text-2xl font-bold tracking-tight text-foreground">🎴 Flashcards AI</h1>
                    </router-link>

                    <!-- Desktop auth section -->
                    <div class="hidden md:flex items-center gap-4">
                        <template v-if="authStore.isAuthenticated">
                            <div v-if="progressStore.profile"
                                class="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                                <span class="text-sm">{{ progressStore.profile.currentMilestone.emoji }}</span>
                                <span class="text-xs font-semibold text-primary">
                                    Lv.{{ progressStore.profile.level }}
                                </span>
                                <span class="text-xs text-muted-foreground">
                                    {{ progressStore.profile.totalXP }} XP
                                </span>
                            </div>
                            <span class="text-sm text-muted-foreground truncate max-w-45">
                                {{ authStore.user?.email }}
                            </span>
                            <button @click="handleLogout"
                                class="text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Sign Out
                            </button>
                        </template>
                        <router-link v-else to="/login" class="btn btn-primary text-sm px-4 py-2">
                            Sign In
                        </router-link>
                    </div>

                    <!-- Mobile hamburger -->
                    <button class="md:hidden p-2 -mr-2 rounded-lg hover:bg-secondary transition-colors"
                        @click="mobileMenuOpen = !mobileMenuOpen" aria-label="Toggle menu">
                        <svg v-if="!mobileMenuOpen" class="w-6 h-6" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <svg v-else class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Desktop nav -->
                <nav class="hidden md:flex gap-2 mt-3">
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

                <!-- Mobile slide-down menu -->
                <div v-if="mobileMenuOpen"
                    class="md:hidden mt-3 pt-3 border-t border-border flex flex-col gap-1 animate-in">
                    <!-- Mobile user info -->
                    <div v-if="authStore.isAuthenticated && progressStore.profile"
                        class="flex items-center gap-2 px-3 py-2 mb-2 bg-primary/10 rounded-lg">
                        <span class="text-sm">{{ progressStore.profile.currentMilestone.emoji }}</span>
                        <span class="text-xs font-semibold text-primary">Lv.{{ progressStore.profile.level }}</span>
                        <span class="text-xs text-muted-foreground">{{ progressStore.profile.totalXP }} XP</span>
                    </div>

                    <router-link to="/" @click="closeMenu"
                        class="text-foreground no-underline font-medium text-base px-3 py-3 rounded-lg transition-all hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        Home
                    </router-link>
                    <router-link to="/decks" @click="closeMenu"
                        class="text-foreground no-underline font-medium text-base px-3 py-3 rounded-lg transition-all hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        My Decks
                    </router-link>
                    <router-link v-if="authStore.isAuthenticated" to="/create" @click="closeMenu"
                        class="text-foreground no-underline font-medium text-base px-3 py-3 rounded-lg transition-all hover:bg-accent [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/10">
                        Create Deck
                    </router-link>

                    <div class="border-t border-border mt-2 pt-2">
                        <template v-if="authStore.isAuthenticated">
                            <div class="px-3 py-2 text-sm text-muted-foreground truncate">
                                {{ authStore.user?.email }}
                            </div>
                            <button @click="handleLogout"
                                class="w-full text-left text-base font-medium px-3 py-3 rounded-lg text-destructive hover:bg-destructive/10 transition-colors">
                                Sign Out
                            </button>
                        </template>
                        <router-link v-else to="/login" @click="closeMenu"
                            class="block text-center btn btn-primary w-full">
                            Sign In
                        </router-link>
                    </div>
                </div>
            </div>
        </header>

        <main class="flex-1 py-4 sm:py-6 lg:py-8">
            <div class="max-w-7xl mx-auto px-4 sm:px-5 w-full">
                <RouterView />
            </div>
        </main>

        <footer
            class="bg-card text-muted-foreground py-4 sm:py-6 text-center mt-auto border-t border-border text-xs sm:text-sm safe-bottom">
            <div class="max-w-7xl mx-auto px-4 sm:px-5 w-full">
                <p>&copy; 2026 Flashcards AI - Language Learning Assistant</p>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.animate-in {
    animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
