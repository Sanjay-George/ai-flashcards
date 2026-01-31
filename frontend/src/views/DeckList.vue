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
    <div class="deck-list">
        <div class="header">
            <h1>My Flashcard Decks</h1>
            <RouterLink to="/create" class="btn btn-primary">
                + Create New Deck
            </RouterLink>
        </div>

        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p>Loading decks...</p>
        </div>

        <div v-else-if="deckStore.error" class="error">
            <p>Error loading decks: {{ deckStore.error }}</p>
        </div>

        <div v-else-if="deckStore.decks.length === 0" class="empty-state">
            <div class="empty-icon">📚</div>
            <h2>No decks yet</h2>
            <p>Create your first deck to start learning!</p>
            <RouterLink to="/create" class="btn btn-primary">
                Create Deck
            </RouterLink>
        </div>

        <div v-else class="grid grid-2">
            <div v-for="deck in deckStore.decks" :key="deck._id" class="deck-card card">
                <div class="deck-header">
                    <h3>{{ deck.title }}</h3>
                    <span class="lexeme-count">{{ deck.lexemes.length }} words</span>
                </div>

                <div class="deck-tags">
                    <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                        {{ tag }}
                    </span>
                </div>

                <div class="deck-meta">
                    <span>Created: {{ formatDate(deck.createdAt) }}</span>
                    <span>Updated: {{ formatDate(deck.updatedAt) }}</span>
                </div>

                <div class="deck-actions">
                    <RouterLink :to="`/deck/${deck._id}`" class="btn btn-secondary">
                        View Details
                    </RouterLink>
                    <RouterLink :to="`/study/${deck._id}`" class="btn btn-primary">
                        Study
                    </RouterLink>
                    <button @click="handleDelete(deck._id)" class="btn btn-danger">
                        Delete
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
.deck-list {
    max-width: 1200px;
    margin: 0 auto;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
}

.header h1 {
    font-size: 2rem;
    color: #2d3748;
}

.empty-state {
    text-align: center;
    padding: 4rem 2rem;
    background: white;
    border-radius: 12px;
}

.empty-icon {
    font-size: 5rem;
    margin-bottom: 1rem;
}

.empty-state h2 {
    font-size: 1.5rem;
    color: #2d3748;
    margin-bottom: 0.5rem;
}

.empty-state p {
    color: #718096;
    margin-bottom: 2rem;
}

.deck-card {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.deck-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
}

.deck-header h3 {
    font-size: 1.25rem;
    color: #2d3748;
    margin: 0;
}

.lexeme-count {
    background: #bee3f8;
    color: #2c5282;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
    font-weight: 600;
}

.deck-tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.deck-meta {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    font-size: 0.875rem;
    color: #718096;
}

.deck-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: auto;
}

.deck-actions .btn {
    flex: 1;
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

.error {
    background: #fed7d7;
    color: #c53030;
    padding: 1rem;
    border-radius: 8px;
    text-align: center;
}
</style>
