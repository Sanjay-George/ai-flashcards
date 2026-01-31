<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'

const deckStore = useDeckStore()

onMounted(() => {
    deckStore.fetchDecks()
})

const handleDelete = async (id: string): Promise<void> => {
    if (confirm('Are you sure you want to delete this deck?')) {
        await deckStore.deleteDeck(id)
    }
}

const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    })
}
</script>

<template>
    <div class="max-w-7xl mx-auto">
        <div class="flex justify-between items-center mb-8">
            <h1 class="text-3xl font-bold text-foreground">My Flashcard Decks</h1>
            <RouterLink to="/create" class="btn btn-primary">
                + Create New Deck
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
            <RouterLink to="/create" class="btn btn-primary">
                Create Deck
            </RouterLink>
        </div>

        <div v-else class="grid-2">
            <div v-for="deck in deckStore.decks" :key="deck._id" class="card flex flex-col gap-4">
                <div class="flex justify-between items-start">
                    <h3 class="text-xl font-semibold text-foreground">{{ deck.title }}</h3>
                    <span class="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-semibold">
                        {{ deck.lexemes.length }} words
                    </span>
                </div>

                <div class="flex flex-wrap gap-2">
                    <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                        {{ tag }}
                    </span>
                </div>

                <div class="flex flex-col gap-1 text-sm text-muted-foreground">
                    <span>Created: {{ formatDate(deck.createdAt) }}</span>
                    <span>Updated: {{ formatDate(deck.updatedAt) }}</span>
                </div>

                <div class="flex gap-2 mt-auto">
                    <RouterLink :to="`/deck/${deck._id}`" class="btn btn-secondary flex-1 text-sm py-2">
                        View Details
                    </RouterLink>
                    <button @click="handleDelete(deck._id)" class="btn btn-danger flex-1 text-sm py-2">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles - Tailwind handles most */
</style>
