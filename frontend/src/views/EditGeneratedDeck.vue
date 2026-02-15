<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDeckStore } from '../stores/deckStore'
import type { CreateDeckResponse, Lexeme } from '../types/index'
import { marked } from 'marked'

// Configure marked for safe rendering
marked.setOptions({
    breaks: true,
    gfm: true
})

// Helper function to render markdown
const renderMarkdown = (text: string): string => {
    return marked.parse(text) as string
}

const router = useRouter()
const deckStore = useDeckStore()

// Deck data from route state or fallback
const generatedDeck = ref<CreateDeckResponse | null>(null)
const editInstruction = ref<string>('')
const isEditing = ref<boolean>(false)
const editError = ref<string>('')

// Message history for context
interface ChatMessage {
    role: 'user' | 'assistant'
    content: string
}

const messageHistory = ref<ChatMessage[]>([])

// Pending changes state
const hasPendingChanges = ref<boolean>(false)
const pendingAction = ref<'add' | 'remove' | 'edit' | null>(null)
const pendingAdditions = ref<Lexeme[]>([])
const pendingRemovals = ref<Lexeme[]>([])
const originalLexemes = ref<Lexeme[]>([])

onMounted(() => {
    // Get deck data from route state
    const state = history.state as any
    if (state?.generatedDeck) {
        generatedDeck.value = state.generatedDeck
        originalLexemes.value = [...state.generatedDeck.lexemes]

        // Add initial creation message to history
        if (state.initialMessage) {
            messageHistory.value.push({
                role: 'user',
                content: state.initialMessage
            })
            messageHistory.value.push({
                role: 'assistant',
                content: `Created deck "${state.generatedDeck.title}" with ${state.generatedDeck.lexemes.length} lexemes.`
            })
        }
    } else {
        // No deck data, redirect back to create
        router.push('/create')
    }
})

const handleEdit = async (): Promise<void> => {
    if (!editInstruction.value.trim() || !generatedDeck.value) return

    isEditing.value = true
    editError.value = ''

    try {
        // Add user message to history
        messageHistory.value.push({
            role: 'user',
            content: editInstruction.value
        })

        const result = await deckStore.editDeckWithAI(
            {
                title: generatedDeck.value.title,
                tags: generatedDeck.value.tags,
                lexemes: generatedDeck.value.lexemes
            },
            editInstruction.value,
            messageHistory.value
        )

        // Store original state and set pending changes
        originalLexemes.value = [...generatedDeck.value.lexemes]
        pendingAction.value = result.action

        if (result.action === 'add') {
            pendingAdditions.value = result.updated_lexemes
            pendingRemovals.value = []
            messageHistory.value.push({
                role: 'assistant',
                content: `Adding ${result.updated_lexemes.length} new lexeme(s).`
            })
        } else if (result.action === 'remove') {
            const termsToRemove = result.updated_lexemes.map((l: Lexeme) => l.term)
            pendingRemovals.value = generatedDeck.value.lexemes.filter((l: Lexeme) =>
                termsToRemove.includes(l.term)
            )
            pendingAdditions.value = []
            messageHistory.value.push({
                role: 'assistant',
                content: `Removing ${pendingRemovals.value.length} lexeme(s).`
            })
        } else if (result.action === 'edit') {
            // For edits, show old as removal and new as addition
            const editedTerms = result.updated_lexemes.map((l: Lexeme) => l.term)
            pendingRemovals.value = generatedDeck.value.lexemes.filter((l: Lexeme) =>
                editedTerms.includes(l.term)
            )
            pendingAdditions.value = result.updated_lexemes
            messageHistory.value.push({
                role: 'assistant',
                content: `Editing ${result.updated_lexemes.length} lexeme(s).`
            })
        }

        hasPendingChanges.value = true
        editInstruction.value = ''
    } catch (e: any) {
        editError.value = e.message || 'Failed to edit deck'
        // Remove the user message if there was an error
        messageHistory.value.pop()
    } finally {
        isEditing.value = false
    }
}

const commitChanges = (): void => {
    if (!generatedDeck.value || !hasPendingChanges.value) return

    let updatedLexemes = [...generatedDeck.value.lexemes]

    if (pendingAction.value === 'add') {
        updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
    } else if (pendingAction.value === 'remove') {
        const termsToRemove = pendingRemovals.value.map((l: Lexeme) => l.term)
        updatedLexemes = updatedLexemes.filter((l: Lexeme) => !termsToRemove.includes(l.term))
    } else if (pendingAction.value === 'edit') {
        // Remove old versions and add new ones
        const termsToUpdate = pendingAdditions.value.map((l: Lexeme) => l.term)
        updatedLexemes = updatedLexemes.filter((l: Lexeme) => !termsToUpdate.includes(l.term))
        updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
    }

    generatedDeck.value.lexemes = updatedLexemes
    clearPendingChanges()
}

const undoChanges = (): void => {
    clearPendingChanges()
    // Remove last two messages (user instruction and assistant response)
    if (messageHistory.value.length >= 2) {
        messageHistory.value.splice(-2)
    }
}

const clearPendingChanges = (): void => {
    hasPendingChanges.value = false
    pendingAction.value = null
    pendingAdditions.value = []
    pendingRemovals.value = []
}

const handleRemoveLexeme = (term: string): void => {
    if (!generatedDeck.value) return
    if (!confirm(`Remove "${term}" from this deck?`)) return

    generatedDeck.value.lexemes = generatedDeck.value.lexemes.filter(l => l.term !== term)
}

const saveDeck = async () => {
    if (!generatedDeck.value) return

    try {
        const deck = await deckStore.createDeck(generatedDeck.value)
        router.push(`/deck/${deck._id}`)
    } catch (e: any) {
        editError.value = e.message || 'Failed to save deck'
    }
}

const goBack = () => {
    if (confirm('Are you sure? Your generated deck will be lost.')) {
        router.push('/create')
    }
}

// Language display helper
const languageNames: Record<string, string> = {
    de: 'German',
    es: 'Spanish',
    fr: 'French',
    it: 'Italian',
    pt: 'Portuguese',
    nl: 'Dutch',
    ja: 'Japanese',
    zh: 'Chinese',
    ko: 'Korean',
}

const getLanguageName = (code: string): string => {
    return languageNames[code] || code.toUpperCase()
}

// Computed list combining current + pending changes for preview
const previewLexemes = computed(() => {
    if (!generatedDeck.value) return []
    if (!hasPendingChanges.value) return generatedDeck.value.lexemes

    let preview = [...generatedDeck.value.lexemes]

    if (pendingAction.value === 'add') {
        preview = [...preview, ...pendingAdditions.value]
    } else if (pendingAction.value === 'remove') {
        const termsToRemove = pendingRemovals.value.map(l => l.term)
        preview = preview.filter(l => !termsToRemove.includes(l.term))
    } else if (pendingAction.value === 'edit') {
        const termsToUpdate = pendingAdditions.value.map(l => l.term)
        preview = preview.filter(l => !termsToUpdate.includes(l.term))
        preview = [...preview, ...pendingAdditions.value]
    }

    return preview
})
</script>

<template>
    <div class="max-w-5xl mx-auto">
        <div class="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6 sm:mb-8">
            <h1 class="text-2xl sm:text-3xl font-bold text-foreground">Edit Generated Deck</h1>
            <button @click="goBack" class="btn btn-secondary w-full sm:w-auto">← Back to Create</button>
        </div>

        <div v-if="generatedDeck" class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <!-- Left Column: Deck Info & Lexemes -->
            <div class="card">
                <h2 class="text-xl sm:text-2xl font-semibold mb-4 text-foreground">Deck Preview</h2>

                <div class="form-group">
                    <label>Deck Title</label>
                    <input v-model="generatedDeck.title" class="form-control" type="text" />
                </div>

                <div class="form-group">
                    <label>Tags</label>
                    <div class="flex flex-wrap gap-2 items-center">
                        <span v-for="(tag, index) in generatedDeck.tags" :key="index" class="tag tag-primary">
                            {{ tag }}
                        </span>
                        <span v-if="generatedDeck.language"
                            class="tag bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            🌐 {{ getLanguageName(generatedDeck.language) }}
                        </span>
                    </div>
                </div>

                <div class="form-group">
                    <label>Lexemes ({{ previewLexemes.length }})</label>
                    <div class="max-h-100 sm:max-h-125 overflow-y-auto flex flex-col gap-2 sm:gap-3">
                        <div v-for="(lexeme, index) in previewLexemes" :key="`${lexeme.term}-${index}`" :class="[
                            'bg-card p-3 sm:p-4 rounded-lg flex flex-col sm:grid sm:grid-cols-[1fr_2fr_auto_auto] gap-2 sm:gap-3 items-start sm:items-center',
                            pendingAdditions.some(l => l.term === lexeme.term) ? 'border-2 border-green-500' : '',
                            pendingRemovals.some(l => l.term === lexeme.term) ? 'border-2 border-red-500 opacity-50' : ''
                        ]">
                            <div class="font-semibold text-foreground text-base sm:text-lg">{{ lexeme.term }}</div>
                            <div class="text-sm text-muted-foreground">{{ lexeme.meaning }}</div>
                            <div class="bg-secondary px-3 py-1 rounded-full text-sm text-secondary-foreground">
                                {{ lexeme.POS }}
                            </div>
                            <button @click="handleRemoveLexeme(lexeme.term)"
                                class="text-destructive text-xl cursor-pointer p-1 rounded hover:bg-destructive/10"
                                type="button" title="Remove lexeme">✕</button>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4 mt-6">
                    <button @click="saveDeck" class="btn btn-primary">
                        💾 Save Deck
                    </button>
                </div>
            </div>

            <!-- Right Column: AI Chat Interface -->
            <div class="card">
                <h2 class="text-xl sm:text-2xl font-semibold mb-4 text-foreground">AI Assistant</h2>
                <p class="text-muted-foreground mb-4">
                    Chat with the AI to refine your deck. You can ask to add, remove, or edit lexemes.
                </p>

                <!-- Chat History -->
                <div class="mb-4 bg-secondary rounded-lg p-3 sm:p-4 max-h-62.5 sm:max-h-75 overflow-y-auto">
                    <div v-for="(message, index) in messageHistory" :key="index" :class="[
                        'mb-3 p-3 rounded-lg text-sm',
                        message.role === 'user' ? 'bg-primary text-primary-foreground ml-4 sm:ml-8' : 'bg-card text-foreground mr-4 sm:mr-8'
                    ]">
                        <div class="text-xs font-semibold mb-1 opacity-70">
                            {{ message.role === 'user' ? '👤 You' : '🤖 AI' }}
                        </div>
                        <!-- User messages as plain text -->
                        <div v-if="message.role === 'user'" class="text-sm">{{ message.content }}</div>
                        <!-- AI assistant messages with markdown rendering -->
                        <div v-else class="text-sm markdown-content" v-html="renderMarkdown(message.content)"></div>
                    </div>
                    <div v-if="messageHistory.length === 0" class="text-muted-foreground text-sm text-center py-4">
                        No conversation yet. Start by asking the AI to modify your deck!
                    </div>
                </div>

                <!-- Pending Changes Alert -->
                <div v-if="hasPendingChanges"
                    class="bg-yellow-100 dark:bg-yellow-900/30 border-2 border-yellow-500 rounded-lg p-4 mb-4">
                    <div class="flex justify-between items-start mb-3">
                        <div>
                            <strong class="text-yellow-900 dark:text-yellow-200">Pending Changes</strong>
                            <p class="text-sm text-yellow-800 dark:text-yellow-300 mt-1">
                                <span v-if="pendingAction === 'add'">Adding {{ pendingAdditions.length }}
                                    lexeme(s)</span>
                                <span v-if="pendingAction === 'remove'">Removing {{ pendingRemovals.length }}
                                    lexeme(s)</span>
                                <span v-if="pendingAction === 'edit'">Editing {{ pendingAdditions.length }}
                                    lexeme(s)</span>
                            </p>
                        </div>
                    </div>
                    <div class="flex gap-2">
                        <button @click="commitChanges" class="btn btn-primary btn-sm">
                            ✓ Commit Changes
                        </button>
                        <button @click="undoChanges" class="btn btn-secondary btn-sm">
                            ↩ Undo
                        </button>
                    </div>
                </div>

                <!-- Edit Input -->
                <div class="form-group">
                    <label for="edit-instruction">Your instruction</label>
                    <textarea id="edit-instruction" v-model="editInstruction" class="form-control"
                        placeholder="E.g., 'Add articles to all German nouns' or 'Remove all verbs'" rows="4"
                        :disabled="isEditing" @keydown.enter.ctrl="handleEdit"></textarea>
                    <p class="text-xs text-muted-foreground mt-1">Tip: Press Ctrl+Enter to send</p>
                </div>

                <button @click="handleEdit" class="btn btn-primary w-full"
                    :disabled="isEditing || !editInstruction.trim()">
                    {{ isEditing ? 'Processing...' : '💬 Send to AI' }}
                </button>

                <div v-if="editError" class="bg-destructive/10 text-destructive p-4 rounded-lg mt-4">
                    {{ editError }}
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
/* Minimal scoped styles - Tailwind handles most */
.btn-sm {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
}

/* Markdown content styling */
.markdown-content {
    line-height: 1.6;
}

.markdown-content :deep(p) {
    margin: 0.5em 0;
}

.markdown-content :deep(p:first-child) {
    margin-top: 0;
}

.markdown-content :deep(p:last-child) {
    margin-bottom: 0;
}

.markdown-content :deep(strong) {
    font-weight: 600;
    color: inherit;
}

.markdown-content :deep(em) {
    font-style: italic;
}

.markdown-content :deep(code) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.125rem 0.25rem;
    border-radius: 0.25rem;
    font-size: 0.875em;
    font-family: monospace;
}

.markdown-content :deep(pre) {
    background-color: rgba(0, 0, 0, 0.1);
    padding: 0.75rem;
    border-radius: 0.375rem;
    overflow-x: auto;
    margin: 0.5em 0;
}

.markdown-content :deep(pre code) {
    background-color: transparent;
    padding: 0;
}

.markdown-content :deep(ul),
.markdown-content :deep(ol) {
    margin: 0.5em 0;
    padding-left: 1.5em;
}

.markdown-content :deep(li) {
    margin: 0.25em 0;
}

.markdown-content :deep(blockquote) {
    border-left: 3px solid currentColor;
    padding-left: 1em;
    margin: 0.5em 0;
    opacity: 0.8;
}

.markdown-content :deep(a) {
    color: inherit;
    text-decoration: underline;
}
</style>
