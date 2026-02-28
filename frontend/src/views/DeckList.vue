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


const getMasteryLabel = (percent: number): string => {
    if (percent >= 80) return 'Mastered'
    if (percent >= 50) return 'Proficient'
    if (percent >= 25) return 'Learning'
    if (percent > 0) return 'Getting started'
    return 'Not started'
}
</script>

<template>
    <div>
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
            <h1 class="text-xl font-semibold text-foreground">Decks</h1>
            <RouterLink v-if="authStore.isAuthenticated" to="/create" class="btn btn-primary text-sm w-full sm:w-auto">
                Create deck
            </RouterLink>
            <RouterLink v-else to="/login" class="btn btn-primary text-sm w-full sm:w-auto">
                Sign in to create
            </RouterLink>
        </div>

        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p class="mt-4 text-sm">Loading decks...</p>
        </div>

        <div v-else-if="deckStore.error" class="bg-destructive/10 text-destructive p-4 text-sm text-center"
            style="border-radius: 0.375rem;">
            <p>Error loading decks: {{ deckStore.error }}</p>
        </div>

        <div v-else-if="deckStore.decks.length === 0"
            class="text-center py-12 sm:py-16 px-4 sm:px-8 border border-border" style="border-radius: 0.5rem;">
            <h2 class="text-base font-medium text-foreground mb-1">No decks yet</h2>
            <p class="text-sm text-muted-foreground mb-6">Create your first deck to start learning</p>
            <RouterLink v-if="authStore.isAuthenticated" to="/create" class="btn btn-primary text-sm">
                Create deck
            </RouterLink>
            <RouterLink v-else to="/login" class="btn btn-primary text-sm">
                Sign in to create
            </RouterLink>
        </div>

        <div v-else class="grid-2">
            <div v-for="deck in deckStore.decks" :key="deck._id"
                class="card flex flex-col gap-3 min-w-0 overflow-hidden">
                <div class="flex justify-between items-start gap-2">
                    <div class="min-w-0">
                        <h3 class="text-sm font-medium text-foreground truncate">{{ deck.title }}</h3>
                        <div class="flex gap-1.5 mt-1">
                            <span v-if="isOwner(deck.userId)"
                                class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                style="border-radius: 0.25rem;">
                                Owner
                            </span>
                            <span v-else class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                style="border-radius: 0.25rem;">
                                Public
                            </span>
                            <span v-if="deck.isPublic && isOwner(deck.userId)"
                                class="text-xs px-1.5 py-0.5 border border-border text-muted-foreground"
                                style="border-radius: 0.25rem;">
                                Shared
                            </span>
                        </div>
                    </div>
                    <span class="text-xs text-muted-foreground border border-border px-2 py-0.5 shrink-0"
                        style="border-radius: 0.25rem;">
                        {{ deck.lexemes.length }} words
                    </span>
                </div>

                <div class="flex flex-wrap gap-1">
                    <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                        {{ tag }}
                    </span>
                </div>

                <!-- Mastery Progress Bar (owner only) -->
                <div v-if="isOwner(deck.userId) && progressStore.getDeckMastery(deck._id)" class="mt-0.5">
                    <div class="flex justify-between items-center mb-1">
                        <span class="text-xs text-muted-foreground">
                            {{ getMasteryLabel(progressStore.getDeckMastery(deck._id)!.masteryPercent) }}
                        </span>
                        <span class="text-xs font-medium text-foreground">
                            {{ progressStore.getDeckMastery(deck._id)!.masteryPercent }}%
                        </span>
                    </div>
                    <div class="w-full h-1.5 bg-secondary overflow-hidden" style="border-radius: 1px;">
                        <div class="h-full bg-primary transition-all duration-500"
                            :style="{ width: progressStore.getDeckMastery(deck._id)!.masteryPercent + '%' }">
                        </div>
                    </div>
                </div>

                <div class="text-xs text-muted-foreground">
                    <span>{{ formatDate(deck.updatedAt) }}</span>
                </div>

                <div class="flex gap-2 mt-auto">
                    <RouterLink :to="`/deck/${deck._id}`" class="btn btn-secondary flex-1 text-xs py-1.5">
                        View
                    </RouterLink>
                    <button v-if="isOwner(deck.userId)" @click="handleDelete(deck._id)"
                        class="btn flex-1 text-xs py-1.5 border border-destructive/50 text-destructive transition-colors">
                        Delete
                    </button>
                    <button v-else @click="handleClone(deck._id)" class="btn btn-primary flex-1 text-xs py-1.5">
                        Clone
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>
