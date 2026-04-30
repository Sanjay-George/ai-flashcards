import { ref } from 'vue'
import type { ChatMessage, DeckPromptContext, EditDeckResponse, EditLexeme, Lexeme } from '../types'

type PendingAction = 'add' | 'remove' | 'edit'

interface DeckSnapshot {
    title: string
    tags: string[]
    lexemes: Lexeme[]
}

interface UseDeckAiEditLoopOptions {
    getDeckSnapshot: () => DeckSnapshot | null
    getDeckContext?: () => DeckPromptContext | null
    runEdit: (
        deckSnapshot: DeckSnapshot,
        instruction: string,
        messageHistory: ChatMessage[],
        deckContext?: DeckPromptContext | null
    ) => Promise<EditDeckResponse>
    applyCommittedLexemes: (updatedLexemes: Lexeme[], instruction: string) => Promise<void> | void
}

const normalizeText = (value: string): string => value.trim().toLowerCase()

const toLexeme = (lexeme: EditLexeme): Lexeme => ({
    term: lexeme.term,
    meaning: lexeme.meaning,
    POS: lexeme.POS,
})

const resolveEditAction = (
    action: string | undefined,
    updatedLexemes: EditLexeme[]
): PendingAction => {
    const normalized = (action || '').trim().toLowerCase()
    if (normalized === 'add' || normalized === 'remove' || normalized === 'edit') {
        return normalized
    }

    if (normalized.includes('edit') || normalized.includes('update') || normalized.includes('modify')) {
        return 'edit'
    }
    if (normalized.includes('remove') || normalized.includes('delete')) {
        return 'remove'
    }

    if (updatedLexemes.some((lexeme) => !!lexeme.replace_term?.trim())) {
        return 'edit'
    }

    return 'add'
}

const findEditedOriginalLexemes = (existing: Lexeme[], updated: EditLexeme[]): Lexeme[] => {
    const consumed = new Set<number>()
    const matchedOriginals: Lexeme[] = []

    const findMatchIndex = (candidate: EditLexeme): number => {
        if (candidate.replace_term) {
            const replaceTerm = normalizeText(candidate.replace_term)
            const explicitReplace = existing.findIndex((lexeme, index) =>
                !consumed.has(index) && normalizeText(lexeme.term) === replaceTerm
            )
            if (explicitReplace !== -1) return explicitReplace
        }

        const sameTerm = existing.findIndex((lexeme, index) =>
            !consumed.has(index) && normalizeText(lexeme.term) === normalizeText(candidate.term)
        )
        if (sameTerm !== -1) return sameTerm

        const sameMeaningAndPos = existing.findIndex((lexeme, index) =>
            !consumed.has(index) &&
            normalizeText(lexeme.meaning) === normalizeText(candidate.meaning) &&
            normalizeText(lexeme.POS) === normalizeText(candidate.POS)
        )
        if (sameMeaningAndPos !== -1) return sameMeaningAndPos

        return -1
    }

    for (const updatedLexeme of updated) {
        const matchIndex = findMatchIndex(updatedLexeme)
        if (matchIndex !== -1) {
            consumed.add(matchIndex)
            matchedOriginals.push(existing[matchIndex])
        }
    }

    return matchedOriginals
}

export const useDeckAiEditLoop = (options: UseDeckAiEditLoopOptions) => {
    const editInstruction = ref<string>('')
    const isEditing = ref<boolean>(false)
    const editError = ref<string>('')

    const messageHistory = ref<ChatMessage[]>([])

    const hasPendingChanges = ref<boolean>(false)
    const pendingAction = ref<PendingAction | null>(null)
    const pendingAdditions = ref<Lexeme[]>([])
    const pendingRemovals = ref<Lexeme[]>([])
    const pendingInstruction = ref<string>('')

    const clearPendingChanges = (): void => {
        hasPendingChanges.value = false
        pendingAction.value = null
        pendingAdditions.value = []
        pendingRemovals.value = []
        pendingInstruction.value = ''
    }

    const buildUpdatedLexemes = (currentLexemes: Lexeme[]): Lexeme[] => {
        let updatedLexemes = [...currentLexemes]

        if (pendingAction.value === 'add') {
            updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
        } else if (pendingAction.value === 'remove') {
            const termsToRemove = new Set(pendingRemovals.value.map((lexeme) => normalizeText(lexeme.term)))
            updatedLexemes = updatedLexemes.filter((lexeme) => !termsToRemove.has(normalizeText(lexeme.term)))
        } else if (pendingAction.value === 'edit') {
            const termsToRemove = new Set(pendingRemovals.value.map((lexeme) => normalizeText(lexeme.term)))
            updatedLexemes = updatedLexemes.filter((lexeme) => !termsToRemove.has(normalizeText(lexeme.term)))
            updatedLexemes = [...updatedLexemes, ...pendingAdditions.value]
        }

        return updatedLexemes
    }

    const handleEdit = async (): Promise<void> => {
        const instruction = editInstruction.value.trim()
        const snapshot = options.getDeckSnapshot()
        if (!instruction || !snapshot) return

        isEditing.value = true
        editError.value = ''

        try {
            messageHistory.value.push({
                role: 'user',
                content: instruction,
            })

            const result = await options.runEdit(
                {
                    title: snapshot.title,
                    tags: snapshot.tags,
                    lexemes: snapshot.lexemes,
                },
                instruction,
                messageHistory.value,
                options.getDeckContext?.()
            )

            const baseAction = resolveEditAction(result.action, result.updated_lexemes)
            const matchedForEdit = findEditedOriginalLexemes(snapshot.lexemes, result.updated_lexemes)
            const sanitizedUpdatedLexemes = result.updated_lexemes.map(toLexeme)
            const hasExplicitReplaceMap = result.updated_lexemes.some((lexeme) => !!lexeme.replace_term?.trim())
            const resolvedAction =
                baseAction === 'add' && (hasExplicitReplaceMap || matchedForEdit.length > 0)
                    ? 'edit'
                    : baseAction

            pendingAction.value = resolvedAction

            if (resolvedAction === 'add') {
                pendingAdditions.value = sanitizedUpdatedLexemes
                pendingRemovals.value = []
                messageHistory.value.push({
                    role: 'assistant',
                    content: `Adding ${sanitizedUpdatedLexemes.length} new lexeme(s).`,
                })
            } else if (resolvedAction === 'remove') {
                const termsToRemove = new Set(sanitizedUpdatedLexemes.map((lexeme) => normalizeText(lexeme.term)))
                pendingRemovals.value = snapshot.lexemes.filter((lexeme) =>
                    termsToRemove.has(normalizeText(lexeme.term))
                )
                pendingAdditions.value = []
                messageHistory.value.push({
                    role: 'assistant',
                    content: `Removing ${pendingRemovals.value.length} lexeme(s).`,
                })
            } else {
                pendingRemovals.value = matchedForEdit
                pendingAdditions.value = sanitizedUpdatedLexemes
                messageHistory.value.push({
                    role: 'assistant',
                    content: `Editing ${sanitizedUpdatedLexemes.length} lexeme(s).`,
                })
            }

            hasPendingChanges.value = true
            pendingInstruction.value = instruction
            editInstruction.value = ''
        } catch (e: unknown) {
            editError.value = (e as Error)?.message || 'Failed to edit deck'
            messageHistory.value.pop()
        } finally {
            isEditing.value = false
        }
    }

    const commitChanges = async (): Promise<void> => {
        const snapshot = options.getDeckSnapshot()
        if (!snapshot || !hasPendingChanges.value) return

        try {
            const updatedLexemes = buildUpdatedLexemes(snapshot.lexemes)
            await options.applyCommittedLexemes(updatedLexemes, pendingInstruction.value)
            clearPendingChanges()
        } catch (e: unknown) {
            editError.value = (e as Error)?.message || 'Failed to apply changes'
        }
    }

    const undoChanges = (): void => {
        clearPendingChanges()
        if (messageHistory.value.length >= 2) {
            messageHistory.value.splice(-2)
        }
    }

    return {
        editInstruction,
        isEditing,
        editError,
        messageHistory,
        hasPendingChanges,
        pendingAction,
        pendingAdditions,
        pendingRemovals,
        handleEdit,
        commitChanges,
        undoChanges,
    }
}
