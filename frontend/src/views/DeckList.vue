<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import { useAuthStore } from '../stores/authStore'
import { useProgressStore } from '../stores/progressStore'

const router = useRouter()
const deckStore = useDeckStore()
const authStore = useAuthStore()
const progressStore = useProgressStore()

onMounted(async () => {
    await deckStore.fetchDecks()
    // Fetch masteries for owned decks (for progress bars)
    if (authStore.isAuthenticated) {
        progressStore.fetchAllDeckMasteries()
        progressStore.fetchProfile()
    }
})

// Check if user owns a deck
const isOwner = (userId: string): boolean => {
    return authStore.userId === userId
}

const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this deck?')) {
        await deckStore.deleteDeck(id)
    }
}

const handleClone = async (id: string): Promise<void> => {
    if (!authStore.isAuthenticated) {
        router.push('/login')
        return
    }
    try {
        const clonedDeck = await deckStore.cloneDeck(id)
        router.push(`/deck/${clonedDeck._id}`)
    } catch (e) {
        console.error('Failed to clone deck')
    }
}

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}

// Get progress bar color based on mastery percentage
const getMasteryColor = (percent: number): string => {
    if (percent >= 80) return 'from-green-400 to-emerald-500'
    if (percent >= 50) return 'from-blue-400 to-cyan-500'
    if (percent >= 25) return 'from-yellow-400 to-orange-500'
    return 'from-orange-400 to-red-400'
}

const getMasteryLabel = (percent: number): string => {
    if (percent >= 80) return 'Mastered'
    if (percent >= 50) return 'Proficient'
    if (percent >= 25) return 'Learning'
    if (percent > 0) return 'Getting started'
    return 'Not started'
}
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-foreground">Flashcard Decks</h1>
            <RouterLink v-if="authStore.isAuthenticated" to="/create" class="btn btn-primary">
                + Create New Deck
            </RouterLink>
            <RouterLink v-else to="/login" class="btn btn-primary">
                Sign in to Create
            </RouterLink>
        </div>

        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4">Loading decks...</p>
        </div>

        <div v-else-if="deckStore.error" class="bg-destructive/10 text-destructive p-4 rounded-lg text-center">
            <p>Error loading decks: {{ deckStore.error }}</p>
        </div>

        <div v-else-if="deckStore.decks.length === 0"
            class="text-center py-16 px-8 bg-card rounded-xl border border-border">
            <div class="text-7xl mb-4">📚</div>
            <h2 class="text-2xl font-semibold text-foreground mb-2">No decks yet</h2>
            <p class="text-muted-foreground mb-8">Create your first deck to start learning!</p>
            <RouterLink v-if="authStore.isAuthenticated" to="/create" class="btn btn-primary">
                Create Deck
            </RouterLink>
            <RouterLink v-else to="/login" class="btn btn-primary">
                Sign in to Create
            </RouterLink>
        </div>

        <div v-else class="grid-2">
            <div v-for="deck in deckStore.decks" :key="deck._id" class="card flex flex-col gap-4">
                <div class="flex justify-between items-start">
                    <div>
                        <h3 class="text-xl font-semibold text-foreground">{{ deck.title }}</h3>
                        <!-- Ownership & visibility badges -->
                        <div class="flex gap-2 mt-1">
                            <span v-if="isOwner(deck.userId)"
                                class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                                Owner
                            </span>
                            <span v-else
                                class="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                Public
                            </span>
                            <span v-if="deck.isPublic && isOwner(deck.userId)"
                                class="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                                🌐 Shared
                            </span>
                        </div>
                    </div>
                    <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        {{ deck.lexemes.length }} words
                    </span>
                </div>

                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                        {{ tag }}
                    </span>
                </div>

                <!-- Mastery Progress Bar (owner only) -->
                <div v-if="isOwner(deck.userId) && progressStore.getDeckMastery(deck._id)" class="mt-1">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs font-medium text-muted-foreground">
                            {{ getMasteryLabel(progressStore.getDeckMastery(deck._id)!.masteryPercent) }}
                        </span>
                        <span class="text-xs font-semibold text-foreground">
                            {{ progressStore.getDeckMastery(deck._id)!.masteryPercent }}%
                        </span>
                    </div>
                    <div class="w-full h-2 bg-border rounded-full overflow-hidden">
                        <div class="h-full bg-linear-to-r transition-all duration-500 rounded-full"
                            :class="getMasteryColor(progressStore.getDeckMastery(deck._id)!.masteryPercent)"
                            :style="{ width: progressStore.getDeckMastery(deck._id)!.masteryPercent + '%' }">
                        </div>
                    </div>
                </div>

                <div class="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Created: {{ formatDate(deck.createdAt) }}</span>
                    <span>Updated: {{ formatDate(deck.updatedAt) }}</span>
                </div>

                <div class="flex gap-2 mt-auto">
                    <RouterLink :to="`/deck/${deck._id}`" class="btn btn-secondary flex-1 text-sm py-2">
                        View Details
                    </RouterLink>
                    <!-- Owner actions -->
                    <button v-if="isOwner(deck.userId)" @click="handleDelete(deck._id)"
                        class="btn btn-danger flex-1 text-sm py-2">
                        Delete
                    </button>
                    <!-- Non-owner: Clone button -->
                    <button v-else @click="handleClone(deck._id)" class="btn btn-primary flex-1 text-sm py-2">
                        Clone to Study
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles - Tailwind handles most */
</style>
