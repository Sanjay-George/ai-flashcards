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
    <div id="app" class="min-h-dvh flex flex-col bg-background">
        <header class="bg-background text-foreground border-b border-border sticky top-0 z-50">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 w-full">
                <div class="flex items-center justify-between h-14">
                    <!-- Logo + Nav -->
                    <div class="flex items-center gap-8">
                        <router-link to="/" class="no-underline flex items-center" @click="closeMenu">
                            <span class="text-sm font-semibold tracking-tight text-foreground">flashcards<span
                                    class="text-primary font-normal">.ai</span></span>
                        </router-link>

                        <!-- Desktop nav -->
                        <nav class="hidden md:flex items-center gap-1">
                            <router-link to="/"
                                class="flex items-center text-muted-foreground no-underline text-sm px-3 py-1.5 transition-colors hover:text-foreground [&.router-link-active]:text-primary">
                                Home
                            </router-link>
                            <router-link to="/decks"
                                class="flex items-center text-muted-foreground no-underline text-sm px-3 py-1.5 transition-colors hover:text-foreground [&.router-link-active]:text-primary">
                                Decks
                            </router-link>
                            <router-link v-if="authStore.isAuthenticated" to="/create"
                                class="flex items-center text-muted-foreground no-underline text-sm px-3 py-1.5 transition-colors hover:text-foreground [&.router-link-active]:text-primary">
                                Create
                            </router-link>
                            <router-link v-if="authStore.isAuthenticated" to="/conversation"
                                class="flex items-center text-muted-foreground no-underline text-sm px-3 py-1.5 transition-colors hover:text-foreground [&.router-link-active]:text-primary">
                                Conversation
                            </router-link>
                        </nav>
                    </div>

                    <!-- Desktop auth section -->
                    <div class="hidden md:flex items-center gap-3">
                        <template v-if="authStore.isAuthenticated">
                            <div v-if="progressStore.profile"
                                class="flex items-center gap-1.5 text-xs text-muted-foreground border border-border px-2.5 py-1"
                                style="border-radius: 0.25rem;">
                                <span>{{ progressStore.profile.currentMilestone.emoji }}</span>
                                <span class="font-medium text-foreground">Lv.{{ progressStore.profile.level }}</span>
                                <span class="text-muted-foreground">{{ progressStore.profile.totalXP }} XP</span>
                            </div>
                            <span class="text-xs text-muted-foreground truncate max-w-40">
                                {{ authStore.user?.email }}
                            </span>
                            <button @click="handleLogout"
                                class="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                                Sign out
                            </button>
                        </template>
                        <router-link v-else to="/login" class="btn btn-primary text-xs px-3 py-1.5">
                            Sign in
                        </router-link>
                    </div>

                    <!-- Mobile hamburger -->
                    <button class="md:hidden p-2 -mr-2 hover:bg-secondary transition-colors cursor-pointer"
                        style="border-radius: 0.25rem;" @click="mobileMenuOpen = !mobileMenuOpen"
                        aria-label="Toggle menu">
                        <svg v-if="!mobileMenuOpen" class="w-5 h-5" fill="none" stroke="currentColor"
                            viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                        <svg v-else class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5"
                                d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <!-- Mobile slide-down menu -->
                <div v-if="mobileMenuOpen"
                    class="md:hidden py-3 border-t border-border flex flex-col gap-0.5 animate-in">
                    <div v-if="authStore.isAuthenticated && progressStore.profile"
                        class="flex items-center gap-2 px-3 py-2 mb-2 border border-border text-xs"
                        style="border-radius: 0.25rem;">
                        <span>{{ progressStore.profile.currentMilestone.emoji }}</span>
                        <span class="font-medium text-foreground">Lv.{{ progressStore.profile.level }}</span>
                        <span class="text-muted-foreground">{{ progressStore.profile.totalXP }} XP</span>
                    </div>

                    <router-link to="/" @click="closeMenu"
                        class="text-foreground no-underline text-sm px-3 py-2.5 transition-colors hover:bg-secondary [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/5">
                        Home
                    </router-link>
                    <router-link to="/decks" @click="closeMenu"
                        class="text-foreground no-underline text-sm px-3 py-2.5 transition-colors hover:bg-secondary [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/5">
                        Decks
                    </router-link>
                    <router-link v-if="authStore.isAuthenticated" to="/create" @click="closeMenu"
                        class="text-foreground no-underline text-sm px-3 py-2.5 transition-colors hover:bg-secondary [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/5">
                        Create
                    </router-link>
                    <router-link v-if="authStore.isAuthenticated" to="/conversation" @click="closeMenu"
                        class="text-foreground no-underline text-sm px-3 py-2.5 transition-colors hover:bg-secondary [&.router-link-active]:text-primary [&.router-link-active]:bg-primary/5">
                        Conversation
                    </router-link>

                    <div class="border-t border-border mt-2 pt-2">
                        <template v-if="authStore.isAuthenticated">
                            <div class="px-3 py-2 text-xs text-muted-foreground truncate">
                                {{ authStore.user?.email }}
                            </div>
                            <button @click="handleLogout"
                                class="w-full text-left text-sm px-3 py-2.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors cursor-pointer">
                                Sign out
                            </button>
                        </template>
                        <router-link v-else to="/login" @click="closeMenu"
                            class="block text-center btn btn-primary w-full text-sm">
                            Sign in
                        </router-link>
                    </div>
                </div>
            </div>
        </header>

        <main class="flex-1 py-6 sm:py-8 lg:py-10">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 w-full">
                <RouterView />
            </div>
        </main>

        <footer class="text-muted-foreground mb-1 text-center text-xs safe-bottom flex items-center">
            <div class="max-w-5xl mx-auto px-4 sm:px-6 w-full">
                <p>&copy; 2026 Flashcards AI</p>
            </div>
        </footer>
    </div>
</template>

<style scoped>
.animate-in {
    animation: slideDown 0.15s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-4px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
