<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import { useFlashcardStore } from '../stores/flashcardStore'
import type { Deck, Lexeme } from '../types/index'

const route = useRoute()
const router = useRouter()
const deckStore = useDeckStore()
const flashcardStore = useFlashcardStore()

const deckId = route.params.id as string
const editInstruction = ref<string>('')
const isEditing = ref<boolean>(false)
const editError = ref<string>('')
const generatingFlashcards = ref<boolean>(false)
const selectedMode = ref<'simple' | 'master'>('simple')
const sessionSize = 10

const pickRandomLexemes = (lexemes: Lexeme[], count: number): Lexeme[] => {
    const array = [...lexemes]
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
            ;[array[i], array[j]] = [array[j], array[i]]
    }
    return array.slice(0, Math.min(count, array.length))
}

onMounted(async () => {
    await deckStore.fetchDeck(deckId)
})

const deck = computed<Deck | null>(() => deckStore.currentDeck)

const handleEdit = async (): Promise<void> => {
    if (!editInstruction.value.trim() || !deck.value) return

    isEditing.value = true
    editError.value = ''

    try {
        const result = await deckStore.editDeckWithAI(
            {
                title: deck.value.title,
                tags: deck.value.tags,
                lexemes: deck.value.lexemes
            },
            editInstruction.value
        )

        // Apply changes based on action
        let updatedLexemes = [...deck.value.lexemes]

        if (result.action === 'add') {
            updatedLexemes = [...updatedLexemes, ...result.updated_lexemes]
        } else if (result.action === 'remove') {
            const termsToRemove = result.updated_lexemes.map((l: Lexeme) => l.term)
            updatedLexemes = updatedLexemes.filter((l: Lexeme) => !termsToRemove.includes(l.term))
        } else if (result.action === 'edit') {
            // Update existing lexemes
            result.updated_lexemes.forEach((newLex: Lexeme) => {
                const index = updatedLexemes.findIndex((l: Lexeme) => l.term === newLex.term)
                if (index !== -1) {
                    updatedLexemes[index] = newLex
                }
            })
        }

        await deckStore.updateDeck(deckId, { lexemes: updatedLexemes })
        editInstruction.value = ''
    } catch (e: any) {
        editError.value = e.message || 'Failed to edit deck'
    } finally {
        isEditing.value = false
    }
}

const generateAndStudy = async (): Promise<void> => {
    if (!deck.value) return

    generatingFlashcards.value = true

    try {
        const selectedLexemes = pickRandomLexemes(deck.value.lexemes, sessionSize)
        const result = await flashcardStore.generateFlashcards(
            {
                title: deck.value.title,
                lexemes: selectedLexemes
            },
            selectedMode.value
        )

        // Save flashcards to database
        const flashcardsToSave = result.flashcards.map((fc: any, index: number) => ({
            deckId: deckId,
            lexemeId: selectedLexemes[index % selectedLexemes.length].term,
            question: fc.question,
            answer: fc.answer,
            pattern: fc.pattern,
            mode: selectedMode.value,
            ratings: []
        }))

        const saved = await flashcardStore.saveFlashcards(flashcardsToSave)
        flashcardStore.setSessionFlashcards(saved)

        // Navigate to study session
        router.push(`/study/${deckId}`)
    } catch (e: any) {
        editError.value = e.message || 'Failed to generate flashcards'
    } finally {
        generatingFlashcards.value = false
    }
}

const handleRemoveLexeme = async (term: string): Promise<void> => {
    if (!confirm(`Remove "${term}" from this deck?`)) return

    try {
        await deckStore.removeLexeme(deckId, term)
    } catch (e: any) {
        editError.value = e.message || 'Failed to remove lexeme'
    }
}
</script>

<template>
    <div class="deck-detail">
        <div v-if="deckStore.loading" class="loading">
            <div class="spinner"></div>
            <p>Loading deck...</p>
        </div>

        <div v-else-if="deck" class="deck-content">
            <div class="deck-header">
                <div>
                    <h1>{{ deck.title }}</h1>
                    <div class="tags">
                        <span v-for="tag in deck.tags" :key="tag" class="tag tag-primary">
                            {{ tag }}
                        </span>
                    </div>
                </div>
                <button @click="$router.back()" class="btn btn-secondary">
                    Back to List
                </button>
            </div>

            <div class="cards-row">
                <!-- Lexemes List -->
                <div class="card">
                    <h2>Lexemes ({{ deck.lexemes.length }})</h2>
                    <div class="lexemes-grid">
                        <div v-for="(lexeme, index) in deck.lexemes" :key="index" class="lexeme-card">
                            <div class="lexeme-term">{{ lexeme.term }}</div>
                            <div class="lexeme-meaning">{{ lexeme.meaning }}</div>
                            <div class="lexeme-pos">{{ lexeme.POS }}</div>
                            <button @click="handleRemoveLexeme(lexeme.term)" class="btn-remove" title="Remove word">
                                ×
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Edit Deck -->
                <div class="card">
                    <h2>Edit Deck with AI</h2>
                    <p class="help-text">
                        Tell the AI how to modify your deck. Examples:<br />
                        • "Add 10 more common adjectives"<br />
                        • "Remove verbs related to food"<br />
                        • "Add greetings and farewells"
                    </p>

                    <div class="form-group">
                        <textarea v-model="editInstruction" class="form-control"
                            placeholder="Add more words, remove specific words, etc..." rows="3"
                            :disabled="isEditing"></textarea>
                    </div>

                    <button @click="handleEdit" class="btn btn-primary"
                        :disabled="isEditing || !editInstruction.trim()">
                        {{ isEditing ? 'Processing...' : 'Apply Changes' }}
                    </button>

                    <div v-if="editError" class="error-message mt-2">
                        {{ editError }}
                    </div>
                </div>
            </div>

            <!-- Generate Flashcards -->
            <div class="card study-section">
                <h2>Generate Flashcards</h2>
                <p class="help-text">
                    Choose a mode and generate flashcards to start studying
                </p>

                <div class="mode-selector">
                    <label class="mode-option">
                        <input type="radio" v-model="selectedMode" value="simple" />
                        <div class="mode-card">
                            <h3>Simple Mode</h3>
                            <p>Direct meaning recall questions</p>
                        </div>
                    </label>

                    <label class="mode-option">
                        <input type="radio" v-model="selectedMode" value="master" />
                        <div class="mode-card">
                            <h3>Master Mode</h3>
                            <p>Contextual usage and fill-in-the-blank</p>
                        </div>
                    </label>
                </div>

                <button @click="generateAndStudy" class="btn btn-primary btn-lg" :disabled="generatingFlashcards">
                    {{ generatingFlashcards ? 'Generating...' : 'Generate & Study' }}
                </button>
            </div>
        </div>
    </div>
</template>

<style scoped>
.deck-detail {
    max-width: 1200px;
    margin: 0 auto;
}

.deck-header {
    display: flex;
    justify-content: space-between;
    align-items: start;
    margin-bottom: 2rem;
}

.deck-header h1 {
    font-size: 2rem;
    color: #2d3748;
    margin-bottom: 0.5rem;
}

.tags {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
}

.cards-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
}

@media (max-width: 768px) {
    .cards-row {
        grid-template-columns: 1fr;
    }
}

.card h2 {
    font-size: 1.5rem;
    margin-bottom: 1rem;
    color: #2d3748;
}

.help-text {
    color: #718096;
    font-size: 0.875rem;
    margin-bottom: 1rem;
    line-height: 1.6;
}

.lexemes-grid {
    max-height: 500px;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
}

.lexeme-card {
    background: #f7fafc;
    padding: 1rem;
    border-radius: 8px;
    display: grid;
    grid-template-columns: 1fr 2fr auto auto;
    gap: 1rem;
    align-items: center;
    position: relative;
}

.btn-remove {
    background: transparent;
    border: none;
    color: #e53e3e;
    font-size: 1.5rem;
    cursor: pointer;
    padding: 0.25rem 0.5rem;
    line-height: 1;
    border-radius: 4px;
    transition: all 0.2s;
}

.btn-remove:hover {
    background: #fed7d7;
    color: #c53030;
}

.lexeme-term {
    font-weight: 600;
    color: #2d3748;
}

.lexeme-meaning {
    color: #4a5568;
}

.lexeme-pos {
    background: #e2e8f0;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.875rem;
}

.error-message {
    background: #fed7d7;
    color: #c53030;
    padding: 0.75rem;
    border-radius: 8px;
}

.study-section {
    text-align: center;
}

.mode-selector {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 2rem;
}

.mode-option {
    cursor: pointer;
}

.mode-option input[type="radio"] {
    display: none;
}

.mode-card {
    background: #f7fafc;
    padding: 1.5rem;
    border-radius: 8px;
    border: 2px solid #e2e8f0;
    transition: all 0.3s;
}

.mode-option input[type="radio"]:checked+.mode-card {
    border-color: #667eea;
    background: #edf2f7;
}

.mode-card h3 {
    font-size: 1.25rem;
    margin-bottom: 0.5rem;
    color: #2d3748;
}

.mode-card p {
    color: #718096;
    font-size: 0.875rem;
}

.btn-lg {
    padding: 1rem 2rem;
    font-size: 1.125rem;
}
</style>
